"""旁路图谱冷启动自愈巡检模块 (GraphHealing)"""

import logging
from dataclasses import dataclass
from typing import List, Dict

from app.container import AppContainer
from app.domain.graph.entities import SourceTypeEnum

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PhysicalBlockCandidate:
    """物理切片自愈检测候选元数据模型"""

    block_id: str
    source_type: SourceTypeEnum
    project_id: str = ""
    book_id: str = ""


def _flatten_toc(nodes: list) -> list:
    flat = []
    for n in nodes:
        flat.append(n)
        if hasattr(n, "children") and n.children:
            flat.extend(_flatten_toc(n.children))
    return flat


class GraphHealing:
    """旁路图谱与 RAG 任务自愈与缺失切片补全服务"""

    def __init__(self, container: AppContainer):
        self.container = container

    async def handle(
        self,
        timeout_minutes: int = 15,
        chunk_size: int = 500,
    ) -> None:
        logger.info("旁路图谱冷启动物理自愈校验启动...")

        # 阶段 A: 扫描并重置悬挂死锁的任务
        reset_count = await self.container.graph_query_service.reset_stale_tasks(
            timeout_minutes
        )

        # 阶段 B: 从各领域收集真实的物理切片候选元数据
        candidates: List[PhysicalBlockCandidate] = []

        # 1) 素材笔记领域切片
        material_notes = await self.container.note_query_service.list_material_notes_cursor(
            project_id=None, cursor=None, limit=100
        )
        if material_notes:
            for note in material_notes:
                candidates.append(
                    PhysicalBlockCandidate(
                        block_id=note.id,
                        source_type=SourceTypeEnum.NOTE_CARD,
                        project_id=note.project_id or "",
                    )
                )

        # 2) 图书领域解析完成的段落切片
        completed_books = await self.container.book_service.get_completed_list(size=5)
        if completed_books:
            for book in completed_books:
                if not book.toc_tree:
                    continue
                all_nodes = _flatten_toc(book.toc_tree)
                for node in all_nodes:
                    chapter_id = node.target_chapter_id or node.id
                    if chapter_id:
                        chapter_content = await self.container.book_content_service.get_chapter_content(
                            book_id=book.id, chapter_id=chapter_id, limit=100
                        )
                        for block in chapter_content.blocks:
                            candidates.append(
                                PhysicalBlockCandidate(
                                    block_id=block.block_id,
                                    source_type=SourceTypeEnum.BOOK_BLOCK,
                                    project_id=book.project_id,
                                    book_id=book.id,
                                )
                            )

        candidate_map: Dict[str, PhysicalBlockCandidate] = {
            c.block_id: c for c in candidates
        }
        all_block_ids = list(candidate_map.keys())

        recovered_count = 0

        # 阶段 C: 分批检查并补齐缺失记录
        for i in range(0, len(all_block_ids), chunk_size):
            chunk_ids = all_block_ids[i : i + chunk_size]
            if not chunk_ids:
                continue

            missing_block_ids = (
                await self.container.graph_state_service.get_missing_block_ids(
                    chunk_ids
                )
            )

            for missing_id in missing_block_ids:
                if candidate := candidate_map.get(missing_id):
                    await self.container.graph_sync_service.enqueue_block(
                        block_id=candidate.block_id,
                        source_type=candidate.source_type,
                        project_id=candidate.project_id,
                        book_id=candidate.book_id,
                    )
                    recovered_count += 1

        logger.info(
            f"旁路图谱自愈校验完成，重置僵尸任务: {reset_count}，补齐缺失切片: {recovered_count}"
        )
