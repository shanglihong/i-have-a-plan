"""沙箱文件存储适配器 (File-first 原子落盘与盘查)"""

import hashlib
import json
import os
import shutil
import uuid
from typing import Optional, Dict, List, Any
from app.domain.book.ports import BookFileStoragePort

from collections import OrderedDict

BASE_SANDBOX_DIR = os.getenv("SANDBOX_DIR", ".sandbox/books")


class LocalBookFileStorageAdapter(BookFileStoragePort):
    """基于本地文件系统的沙箱适配器"""

    def __init__(self, base_dir: str = BASE_SANDBOX_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_dir_from_storage_path(self, storage_path: str) -> str:
        if not storage_path:
            return self.base_dir
        if os.path.isdir(storage_path):
            d = storage_path
        elif os.path.splitext(storage_path)[1] != "":
            d = os.path.dirname(storage_path) or self.base_dir
        else:
            if not os.path.isabs(storage_path) and not storage_path.startswith(self.base_dir):
                d = os.path.join(self.base_dir, storage_path)
            else:
                d = storage_path
        os.makedirs(d, exist_ok=True)
        return d

    async def save_parsed_content_json(
        self,
        storage_path: str,
        chapter_blocks_data: Dict[str, List[Dict[str, Any]]]
    ) -> str:
        book_dir = self._get_dir_from_storage_path(storage_path)
        target_path = os.path.join(book_dir, "parsed_content.json")
        tmp_path = os.path.join(book_dir, "parsed_content.json.tmp")

        json_bytes = json.dumps(chapter_blocks_data, ensure_ascii=False, indent=2).encode("utf-8")
        expected_hash = hashlib.sha256(json_bytes).hexdigest()

        # 1. 写入临时文件
        with open(tmp_path, "wb") as f:
            f.write(json_bytes)

        # 2. 校验 SHA256 Hash
        with open(tmp_path, "rb") as f:
            actual_hash = hashlib.sha256(f.read()).hexdigest()

        if expected_hash != actual_hash:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise IOError(f"写盘校验 Hash 失败 (Expected {expected_hash}, Actual {actual_hash})")

        # 3. 原子重命名替换
        os.replace(tmp_path, target_path)
        return target_path

    async def read_chapter_blocks(self, content_json_path: str, chapter_id: str) -> List[Dict[str, Any]]:
        all_data = await self.read_all_parsed_content(content_json_path)
        return all_data.get(chapter_id, [])

    async def read_all_parsed_content(self, content_json_path: str) -> Dict[str, List[Dict[str, Any]]]:
        if not os.path.exists(content_json_path):
            return {}
        with open(content_json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    async def check_file_hash_and_existence(self, file_path: str) -> bool:
        if not file_path or not os.path.exists(file_path):
            return False
        if os.path.getsize(file_path) == 0:
            return False
        return True

    async def delete_book_sandbox_dir(self, storage_path: str) -> None:
        if not storage_path:
            return
        book_dir = self._get_dir_from_storage_path(storage_path)
        if os.path.exists(book_dir):
            shutil.rmtree(book_dir, ignore_errors=True)
