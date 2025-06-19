import base64
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
from botocore.exceptions import ClientError
from bs4 import BeautifulSoup
from fastapi import status
from loguru import logger

from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.utils.path import split_s3_path


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


def ping_host(url: str) -> bool:
    url = urllib.parse.unquote(url)
    
    if not url.startswith("http") and not url.startswith("https"):
        url = "http://" + url

    try:
        response = httpx.get(url, timeout=5)
        # 检查状态码是否在有效范围内
        return response.status_code < 500
    except httpx.RequestError:
        return False
    except Exception:
        raise AppEx(
            code=ErrorCode.PING_50000_ERROR,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    
async def validate_path_accessibility(path: str, endpoint: str, ak: str, sk: str):
    from vis3.internal.client.s3_reader import S3Reader

    is_endpoint_valid = ping_host(endpoint)

    if not is_endpoint_valid:
        return False

    client = S3Reader.get_client(
        ak=ak,
        sk=sk,
        endpoint=endpoint,
        region_name=None,
    )
    bucket_name, prefix = split_s3_path(path)

    def _list_objects():
        return client.list_objects(Bucket=bucket_name, Prefix=prefix, MaxKeys=1)

    try:
        res = await S3Reader._run_in_executor(_list_objects)
        contents = res.get("Contents", [])
        logger.info(contents)
    except ClientError:
        return False

    return True


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
