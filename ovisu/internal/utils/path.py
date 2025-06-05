import re

__re_s3_path = re.compile("^s3a?://([^/]+)(?:/(.*))?$")


def is_s3_path(path: str) -> bool:
    return path.startswith("s3://") or path.startswith("s3a://")


def ensure_s3a_path(path: str) -> str:
    if not path.startswith("s3://"):
        return path
    return "s3a://" + path[len("s3://") :]


def ensure_s3_path(path: str) -> str:
    if not path.startswith("s3a://"):
        return path
    return "s3://" + path[len("s3a://") :]


def split_s3_path(path: str):
    "split bucket and key from path"
    m = __re_s3_path.match(path)
    if m is None:
        return "", ""
    return m.group(1), (m.group(2) or "")


__re_bytes_1 = re.compile("^([0-9]+),([0-9]+)$")


def extract_bytes_range(path: str):
    offset, length = 0, 0

    if path.find("?bytes=") > 0:
        path, param = path.split("?bytes=")
        m = __re_bytes_1.match(param)
        if m is not None:
            offset = int(m.group(1))
            length = int(m.group(2))
    return path, offset, length
