import base64
import json
from datetime import datetime
from typing import Tuple


def encode_cursor(created_at: datetime, biz_id: str) -> str:
    """编码游标：将时间戳转为微秒整数，并以字符串形式安全存储"""
    ts_us_str = str(int(created_at.timestamp() * 1_000_000))
    payload = json.dumps({"ts": ts_us_str, "id": biz_id})
    return base64.b64encode(payload.encode("utf-8")).decode("utf-8")


def decode_cursor(cursor_str: str) -> Tuple[int, str]:
    """解码游标：返回微秒级时间戳（整数）和 ID"""
    try:
        decoded = base64.b64decode(cursor_str.encode("utf-8")).decode("utf-8")
        data = json.loads(decoded)
        return int(data["ts"]), str(data["id"])
    except Exception:
        return 0, ""