import base64
import ipaddress
import json
import os
import re
import shutil
import tempfile
import time
import urllib.parse
import zipfile
from contextlib import contextmanager

import httpx
import orjson
import pkg_resources
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    EndpointConnectionError,
    SSLError,
)
from botocore.parsers import ResponseParserError
from bs4 import BeautifulSoup
from loguru import logger

from vis3.internal.common.exceptions import AppEx, ErrorCode, translate_s3_exception
from vis3.internal.utils.path import normalize_endpoint, split_s3_path


@contextmanager
def timer(operation: str):
    start = time.time()
    yield
    duration = time.time() - start
    # 毫秒
    logger.debug(f"{operation} took {duration * 1000:.2f} ms")


def is_valid_ip(ip: str) -> bool:
    pattern = re.compile(
        r"""
        ^
        (?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}
        (?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])
        $
    """,
        re.VERBOSE,
    )
    return pattern.match(ip) is not None


# 是否需要直接读取文件内容，图片、视频、音频、pdf、epub类型直接调用预览接口
def should_not_read_as_raw(mimetype: str):
    result = (
        mimetype.startswith("image/")
        or mimetype.startswith("video/")
        or mimetype.startswith("audio/")
        or mimetype.startswith("application/pdf")
        or mimetype.startswith("application/epub")
    )

    return result


def is_ip_or_single_label_host(endpoint: str) -> bool:
    """判断 Endpoint 主机名是否为 IP 或单段内网主机名（如 localhost）"""
    try:
        hostname = urllib.parse.urlparse(endpoint).hostname or ""
    except ValueError:
        return False
    if not hostname:
        return False
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return "." not in hostname


def _diagnostic_from_app_ex(ex: AppEx) -> dict:
    return {
        "err_code": ex.code,
        "error_key": ex.error_key,
        "msg": ex.msg,
        "detail": ex.detail,
        "suggestion": ex.suggestion,
    }


async def ping_host(url: str, verify_ssl: bool = True) -> dict:
    """异步检测 S3 Endpoint 连通性，返回结构化诊断结果而不抛出 500"""
    try:
        normalized = normalize_endpoint(url)
    except AppEx as ex:
        return {"reachable": False, **_diagnostic_from_app_ex(ex)}

    try:
        async with httpx.AsyncClient(
            timeout=5.0, verify=verify_ssl, follow_redirects=False
        ) as client:
            response = await client.get(normalized)

        if response.status_code < 500 or response.status_code == 501:
            return {"reachable": True, "status_code": response.status_code}

        return {
            "reachable": False,
            "err_code": ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE.err_code,
            "error_key": ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE.error_key,
            "msg": ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE.default_msg,
            "detail": f"Endpoint responded with HTTP {response.status_code}",
            "suggestion": "Check whether the S3 gateway service at this endpoint is healthy.",
        }
    except httpx.TimeoutException as exc:
        return {
            "reachable": False,
            "err_code": ErrorCode.S3_CLIENT_40007_TIMEOUT.err_code,
            "error_key": ErrorCode.S3_CLIENT_40007_TIMEOUT.error_key,
            "msg": ErrorCode.S3_CLIENT_40007_TIMEOUT.default_msg,
            "detail": str(exc) or "Connection to endpoint timed out",
            "suggestion": "Check network reachability, firewall rules, and endpoint port.",
        }
    except httpx.InvalidURL as exc:
        return {
            "reachable": False,
            "err_code": ErrorCode.BUCKET_30009_INVALID_ENDPOINT.err_code,
            "error_key": ErrorCode.BUCKET_30009_INVALID_ENDPOINT.error_key,
            "msg": ErrorCode.BUCKET_30009_INVALID_ENDPOINT.default_msg,
            "detail": str(exc),
            "suggestion": "Check endpoint URL format.",
        }
    except httpx.RequestError as exc:
        err_text = str(exc)
        is_ssl = "ssl" in err_text.lower() or "certificate" in err_text.lower()
        code = (
            ErrorCode.S3_CLIENT_40006_SSL_ERROR
            if is_ssl
            else ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE
        )
        suggestion = (
            "SSL/TLS verification failed. For private or self-signed certificates, disable 'Verify SSL' in Advanced Options."
            if is_ssl
            else "Cannot reach endpoint. Check URL, DNS, port, and network connectivity."
        )
        return {
            "reachable": False,
            "err_code": code.err_code,
            "error_key": code.error_key,
            "msg": code.default_msg,
            "detail": err_text,
            "suggestion": suggestion,
        }


def _extract_region_hint(exc: ClientError) -> str | None:
    response = exc.response or {}
    err_info = response.get("Error", {}) or {}
    headers = (response.get("ResponseMetadata", {}) or {}).get("HTTPHeaders", {}) or {}
    region = err_info.get("Region") or headers.get("x-amz-bucket-region")
    return str(region).strip() if region else None


def _is_more_informative_s3_error(candidate: Exception, current: Exception | None) -> bool:
    if current is None:
        return True
    # 真正连上 S3 网关并收到 ClientError 的信息价值高于域名/SSL 失败
    if isinstance(candidate, ClientError) and not isinstance(current, ClientError):
        return True
    if isinstance(current, (EndpointConnectionError, SSLError)) and not isinstance(
        candidate, (EndpointConnectionError, SSLError)
    ):
        return True
    return False


async def validate_path_accessibility(
    path: str,
    endpoint: str,
    ak: str,
    sk: str,
    addressing_style: str = "auto",
    region: str | None = None,
    signature_version: str = "auto",
    verify_ssl: bool = True,
) -> dict:
    """探测 S3 路径可访问性与兼容配置，返回结构化诊断对象"""
    from vis3.internal.client.s3_reader import S3Reader

    try:
        normalized_endpoint = normalize_endpoint(endpoint)
    except AppEx as ex:
        return {"accessible": False, **_diagnostic_from_app_ex(ex)}

    bucket_name, prefix = split_s3_path(path)
    if not bucket_name:
        return {
            "accessible": False,
            **_diagnostic_from_app_ex(
                AppEx(
                    code=ErrorCode.BUCKET_30003_INVALID_PATH,
                    detail="S3 path must include a valid bucket name, e.g. s3://my-bucket/",
                )
            ),
        }

    style = (addressing_style or "auto").lower()
    if style in ("virtual", "path"):
        style_candidates = [style]
    else:
        prefer_path = (
            is_ip_or_single_label_host(normalized_endpoint)
            or (normalized_endpoint.startswith("https://") and "." in bucket_name)
        )
        style_candidates = ["path", "virtual"] if prefer_path else ["virtual", "path"]

    sig = (signature_version or "auto").lower()
    sig_candidates = [sig] if sig in ("s3v4", "s3") else ["s3v4", "s3"]
    base_region = (region or "").strip() or "us-east-1"

    best_exc: Exception | None = None

    async def _try_list(
        test_style: str, test_region: str, test_sig: str
    ) -> tuple[bool, Exception | None]:
        client = S3Reader.get_client(
            ak=ak,
            sk=sk,
            endpoint=normalized_endpoint,
            region_name=test_region,
            addressing_style=test_style,
            signature_version=test_sig,
            verify_ssl=verify_ssl,
            connect_timeout=5,
            read_timeout=15,
            max_attempts=1,
        )

        def _list_objects():
            return client.list_objects(Bucket=bucket_name, Prefix=prefix, MaxKeys=1)

        try:
            res = await S3Reader._run_in_executor(_list_objects)
            logger.debug(f"S3 probe succeeded ({test_style}, {test_region}, {test_sig}): {len(res.get('Contents', []))} keys")
            return True, None
        except (ClientError, BotoCoreError, ResponseParserError, ValueError) as exc:
            return False, exc

    for test_style in style_candidates:
        for sig_idx, test_sig in enumerate(sig_candidates):
            ok, exc = await _try_list(test_style, base_region, test_sig)
            if ok:
                return {
                    "accessible": True,
                    "detected_config": {
                        "addressing_style": test_style,
                        "region": base_region,
                        "signature_version": test_sig,
                        "verify_ssl": verify_ssl,
                    },
                }

            if exc is not None:
                if _is_more_informative_s3_error(exc, best_exc):
                    best_exc = exc

                # 若 S3 返回明确的 Region 提示，立即使用该 Region 重试一次
                if isinstance(exc, ClientError):
                    hinted_region = _extract_region_hint(exc)
                    if hinted_region and hinted_region != base_region:
                        ok_region, exc_region = await _try_list(
                            test_style, hinted_region, test_sig
                        )
                        if ok_region:
                            return {
                                "accessible": True,
                                "detected_config": {
                                    "addressing_style": test_style,
                                    "region": hinted_region,
                                    "signature_version": test_sig,
                                    "verify_ssl": verify_ssl,
                                },
                            }
                        if exc_region is not None and _is_more_informative_s3_error(
                            exc_region, best_exc
                        ):
                            best_exc = exc_region

                    err_code = str((exc.response or {}).get("Error", {}).get("Code", ""))
                    # 仅在疑似签名版本不兼容时尝试降级到 s3 (V2)，避免无意义重试
                    if (
                        sig_idx == 0
                        and len(sig_candidates) > 1
                        and err_code
                        in {
                            "SignatureDoesNotMatch",
                            "AuthorizationHeaderMalformed",
                            "InvalidRequest",
                            "NotImplemented",
                        }
                    ):
                        continue

            break

    translated = translate_s3_exception(
        best_exc or RuntimeError("S3 accessibility check failed"),
        bucket=bucket_name,
        key=prefix,
        endpoint=normalized_endpoint,
    )
    return {"accessible": False, **_diagnostic_from_app_ex(translated)}


def convert_mobi_stream_to_html(mobi_content: bytes) -> str:
    import mobi

    """
	将mobi文件内容流转换为包含内嵌资源的HTML
	"""
    # 使用BytesIO创建一个内存中的文件对象
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mobi") as temp_file:
        temp_file.write(mobi_content)
        temp_file.flush()
        temp_file_path = temp_file.name

    # 使用 mobi 库将 MOBI 文件解包到临时目录
    mobi_temp_dir, _ = mobi.extract(temp_file_path)

    # 查找解包后的 EPUB 或 HTML 文件
    epub_file = None
    html_files = []
    image_files = {}

    # 收集所有图片文件
    for root, _, files in os.walk(mobi_temp_dir):
        for file in files:
            if file.endswith(".epub"):
                epub_file = os.path.join(root, file)
            elif file.endswith(".html"):
                html_files.append(os.path.join(root, file))
            elif file.lower().endswith((".jpg", ".jpeg", ".png", ".gif")):
                # 存储图片路径，以文件名为键
                image_files[file] = os.path.join(root, file)

    # 如果存在 EPUB 文件，则进一步解压 EPUB 文件
    if epub_file:
        with zipfile.ZipFile(epub_file, "r") as zip_ref:
            zip_ref.extractall(mobi_temp_dir)

        # 再次查找解压后的所有文件
        for root, _, files in os.walk(mobi_temp_dir):
            for file in files:
                if file.endswith(".html"):
                    html_files.append(os.path.join(root, file))
                elif file.lower().endswith((".jpg", ".jpeg", ".png", ".gif")):
                    # 存储图片路径，以文件名为键
                    image_files[file] = os.path.join(root, file)

    # 合并所有 HTML 文件内容
    html_content = ""
    for html_file in html_files:
        with open(html_file, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            soup = BeautifulSoup(content, "html.parser")

            # 处理图片标签，将图片转为base64嵌入
            for img_tag in soup.find_all("img"):
                src = img_tag.get("src")
                if src:
                    # 提取文件名
                    img_filename = os.path.basename(src)
                    if img_filename in image_files:
                        # 读取图片并转换为base64
                        try:
                            with open(image_files[img_filename], "rb") as img_file:
                                img_data = img_file.read()
                                img_type = os.path.splitext(img_filename)[1][1:].lower()
                                if img_type == "jpg":
                                    img_type = "jpeg"
                                base64_data = base64.b64encode(img_data).decode("utf-8")
                                # 更新图片源为base64
                                img_tag["src"] = (
                                    f"data:image/{img_type};base64,{base64_data}"
                                )
                        except Exception as e:
                            logger.error(f"处理图片时出错: {e}")
                            img_tag.replace_with(
                                soup.new_tag(
                                    "div",
                                    attrs={"class": "image-placeholder"},
                                    string="图片加载失败",
                                )
                            )
                    else:
                        # 如果找不到图片文件，显示占位符
                        img_tag.replace_with(
                            soup.new_tag(
                                "div",
                                attrs={"class": "image-placeholder"},
                                string="图片未找到",
                            )
                        )

            html_content += str(soup)

    # 删除临时文件
    shutil.rmtree(mobi_temp_dir)
    os.remove(temp_file_path)

    return html_content


def convert_epub_stream_to_html(epub_content: bytes) -> str:
    import ebooklib
    from ebooklib import epub

    book = None

    with tempfile.NamedTemporaryFile(delete=False, suffix=".epub") as temp_file:
        temp_file.write(epub_content)
        temp_file.flush()

        book = epub.read_epub(temp_file.name)

    html_content = ""
    # 收集所有图片资源
    image_resources = {}

    # 提取所有图片资源
    for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
        # 获取图片ID和内容
        image_id = item.get_id()
        image_content = item.get_content()
        image_type = item.media_type.split("/")[1]
        if image_type == "jpg":
            image_type = "jpeg"
        # 将图片内容转为base64
        base64_data = base64.b64encode(image_content).decode("utf-8")
        image_resources[image_id] = f"data:image/{image_type};base64,{base64_data}"

    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        content = item.get_content().decode("utf-8", errors="ignore")
        soup = BeautifulSoup(content, "html.parser")

        # 处理图片标签
        for img_tag in soup.find_all("img"):
            src = img_tag.get("src")
            if src:
                # EPUB中图片src通常使用相对路径或ID引用
                img_id = src.split("/")[-1]
                # 尝试查找匹配的图片资源
                for resource_id, resource_data in image_resources.items():
                    if img_id in resource_id or resource_id in img_id:
                        img_tag["src"] = resource_data
                        break
                else:
                    # 如果找不到图片资源
                    img_tag.replace_with(
                        soup.new_tag(
                            "div",
                            attrs={"class": "image-placeholder"},
                            string="图片未找到",
                        )
                    )

        # 删除a标签里的href
        for a_tag in soup.find_all("a"):
            a_tag.name = "span"
            if "href" in a_tag.attrs:
                del a_tag.attrs["href"]

        html_content += f"<section>{str(soup.body) if soup.body else ''}</section>"

    full_html = f"""
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>EPUB Preview</title>
		<style>
			body {{ font-family: Arial, sans-serif; line-height: 1.6; padding: 1rem 5rem; background-color: #f2f2f2; }}
			img {{ max-width: 100%; height: auto; }}
			section {{ background-color: #fff; padding: 2rem 4rem; margin-top: 2rem; }}
			section:first-child {{ margin-top: 0; }}
			.image-placeholder {{ padding: 1rem; background-color: #eee; text-align: center; color: #666; }}
		</style>
	</head>
	<body>
		{html_content}
	</body>
	</html>
	"""

    # 删除临时文件
    os.remove(temp_file.name)

    return full_html


def json_dumps(d: dict, **kwargs) -> str:
    if not kwargs and orjson:
        try:
            return orjson.dumps(d).decode("utf-8")
        except Exception:
            pass
    return json.dumps(d, ensure_ascii=False, **kwargs)

def update_sys_config(config: dict):
    frontend_public = os.path.join(
        pkg_resources.resource_filename('vis3.internal', 'statics'),
    )
    os.makedirs(frontend_public, exist_ok=True)

    with open(os.path.join(frontend_public, "sys-config.js"), "w", encoding="utf-8") as f:
        f.write(f"(function() {{ window.__CONFIG__ = {json_dumps(config)}; }})();")
