"""笔记与知识库仓储、文件及跨领域防腐接口模块"""

from pathlib import Path
from abc import abstractmethod
from typing import Optional, List
from app.domain.base import DomainPort
from app.domain.note.entities import MaterialNote, SynthesizedNote, KnowledgeBase


class MaterialNoteRepositoryPort(DomainPort):
    """素材笔记仓储防腐接口"""

    @abstractmethod
    async def save_material(self, note: MaterialNote) -> None:
        """保存或更新素材笔记"""
        ...

    @abstractmethod
    async def find_material_by_id(self, note_id: str) -> Optional[MaterialNote]:
        """按 ID 查询素材笔记"""
        ...

    @abstractmethod
    async def list_material_notes_cursor(
        self,
        project_id: Optional[str],
        cursor: Optional[str],
        limit: int,
        keyword: Optional[str] = None
    ) -> List[MaterialNote]:
        """按游标查询素材笔记 (当 project_id 为 None 时执行全局跨项目查询)"""
        ...

    @abstractmethod
    async def delete_material(self, note_id: str) -> bool:
        """物理删除素材笔记"""
        ...


class SynthesizedNoteRepositoryPort(DomainPort):
    """沉淀笔记仓储防腐接口"""

    @abstractmethod
    async def save_synthesized(self, note: SynthesizedNote) -> None:
        """保存或更新沉淀笔记元数据与多对多引用关系"""
        ...

    @abstractmethod
    async def find_synthesized_by_id(self, note_id: str) -> Optional[SynthesizedNote]:
        """按 ID 获取沉淀笔记元数据以及关联的素材笔记 ID 列表"""
        ...

    @abstractmethod
    async def list_by_project(self, project_id: str) -> List[SynthesizedNote]:
        """根据项目 ID 获取沉淀笔记列表"""
        ...

    @abstractmethod
    async def delete_synthesized(self, note_id: str) -> bool:
        """删除沉淀笔记元数据与引用关系"""
        ...

    @abstractmethod
    async def clear_knowledge_base_id_batch(self, kb_id: str) -> None:
        """批量清空关联的知识库 ID (仅置空，不删除)"""
        ...

    @abstractmethod
    async def list_unpromoted_experience_notes(self) -> List[SynthesizedNote]:
        """获取未成功广播事件的复盘经验笔记 (自愈补发用)"""
        ...

    @abstractmethod
    async def list_all_synthesized_notes(self) -> List[SynthesizedNote]:
        """列出所有沉淀笔记元数据 (自愈比对用)"""
        ...

    @abstractmethod
    async def find_by_kb_id(self, kb_id: str) -> List[SynthesizedNote]:
        """查询关联到指定知识库的所有沉淀笔记列表"""
        ...


class NoteFileStoragePort(DomainPort):
    """笔记 Markdown 物理文件存储接口"""

    @abstractmethod
    async def write_markdown_file_atomic(self, file_path: str, content: str) -> str:
        """先写临时的 .tmp 文件，完成刷盘后调用 replace 原子覆盖"""
        ...

    @abstractmethod
    async def read_markdown_file(self, file_path: str) -> str:
        """从磁盘读取 Markdown 文本"""
        ...

    @abstractmethod
    async def delete_markdown_file(self, file_path: str) -> None:
        """物理删除 Markdown 文件"""
        ...

    @abstractmethod
    async def scan_all_physical_files(self, notes_dir: Path) -> List[str]:
        """扫描 data/notes 下的所有物理相对路径 (自愈比对用)"""
        ...

    @abstractmethod
    async def clean_temporary_files(self, notes_dir: Path) -> List[str]:
        """清理 data/notes 下的所有残留 .md.tmp 脏文件，返回被清理的文件路径列表"""
        ...


class KnowledgeBaseRepositoryPort(DomainPort):
    """知识库仓储防腐接口"""

    @abstractmethod
    async def save(self, kb: KnowledgeBase) -> None:
        """保存或更新知识库"""
        ...

    @abstractmethod
    async def find_by_id(self, kb_id: str) -> Optional[KnowledgeBase]:
        """按 ID 查询知识库"""
        ...

    @abstractmethod
    async def list_all(self) -> List[KnowledgeBase]:
        """查询所有知识库"""
        ...

    @abstractmethod
    async def delete(self, kb_id: str) -> bool:
        """删除知识库"""
        ...
