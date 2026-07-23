"""书籍与物理锚点领域服务模块"""

from typing import Optional
from app.domain.book.entities import SourceAnchor


class AnchorResolutionService:
    """三层定位解算服务 (DOM / CFI / Paragraph Hash)"""

    @staticmethod
    def resolve_anchor_offset(anchor: SourceAnchor) -> Optional[int]:
        """根据三层定位解算文本偏移量"""
        # 存根：后续填充具体的算法逻辑
        return 0
