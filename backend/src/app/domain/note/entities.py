"""
笔记与知识上下文 - 核心实体定义

遵循 File-first 存储契约：
  - 笔记内容以 Markdown 物理落盘
  - 数据库仅存储索引与关系（content_path 指向物理文件）
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class UnifiedReadingNote(SQLModel, table=True):
    """融合阅读笔记 DO - 聚合根"""

    __tablename__ = "unified_reading_note"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    project_id: str = Field(foreign_key="project.id", index=True)
    # 物理 Markdown 文件路径（File-first 核心字段）
    content_path: str
    # tags 存储为逗号分隔字符串，仓储层负责序列化
    tags_csv: str = Field(default="")
    # source_anchor 存储为 JSON 字符串（页码、偏移、特征字）
    source_anchor_json: str = Field(default="{}")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ExperienceNote(SQLModel, table=True):
    """经验笔记 DO - 聚合根（项目归档时生成）"""

    __tablename__ = "experience_note"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    project_id: str = Field(foreign_key="project.id", index=True)
    associated_skill_id: Optional[str] = Field(default=None, foreign_key="skill.id")
    # 物理 Markdown 文件路径
    content_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Domain Objects (内存充血模型)
# ---------------------------------------------------------------------------


class UnifiedReadingNoteDomain:
    """融合笔记充血模型 - 装载真实内容与标签节点"""

    def __init__(self, do: UnifiedReadingNote) -> None:
        self.do = do
        # 内存加载的真实 Markdown 文本（从 content_path 读取）
        self.content: str = ""
        self.tags: list[str] = do.tags_csv.split(",") if do.tags_csv else []

    @property
    def id(self) -> str:
        return self.do.id
