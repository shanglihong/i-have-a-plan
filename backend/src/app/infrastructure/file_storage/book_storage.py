"""图书文件存储适配器 (File-first 原子落盘与读取)"""

import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Optional, Dict, List, Any
from app.domain.book.ports import BookFileStoragePort

class LocalBookFileStorageAdapter(BookFileStoragePort):
    """基于本地文件系统的图书存储适配器"""
    def _get_dir(self, path: str) -> str:
        if os.path.isdir(path):
            print(path)
        elif os.path.splitext(path)[1] != "":
            path = os.path.dirname(path)
        os.makedirs(path, exist_ok=True)
        return path

    async def save_parsed_content_json(
        self,
        storage_path: str,
        chapter_blocks_data: Dict[str, List[Dict[str, Any]]]
    ) -> str:
        book_dir = self._get_dir(storage_path)
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

    async def delete_parsed_content(self, target_path: str) -> None:
        """删除图书解析文件"""
        if not target_path:
            return
        file_path = Path(target_path)
        file_path.unlink(missing_ok=True)

    async def delete_book_dir(self, storage_path: str) -> None:
        """清理图书存储目录"""
        if not storage_path:
            return
        book_dir = self._get_dir(storage_path)
        if os.path.exists(book_dir):
            shutil.rmtree(book_dir, ignore_errors=True)


