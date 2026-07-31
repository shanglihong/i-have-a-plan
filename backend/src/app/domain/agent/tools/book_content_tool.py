"""图书片段正文查询 Agent 工具模块"""

from langchain_core.tools import tool
from app.domain.agent.tools.tool_ports import BookContentBlock, BookQueryPort


def make_get_book_content_tool(book_query_port: BookQueryPort):
    """工厂：创建书籍内容查询工具，注入 BookQueryPort 依赖"""

    @tool
    async def get_book_content(block_id: str, book_id: str) -> BookContentBlock:
        """【AI Tool】根据锚点切片 ID 及所属书籍 ID 检索并获取书籍的原文片段与上下文元数据。

        [调用场景与触发条件]
        - 当你需要阅读、引用或深度分析书籍中的具体段落或章节内容时调用。
        - 当上下文或用户提问中包含文本块/切片锚点 ID（block_id）和书籍 ID（book_id）需要拉取原文时调用。

        Args:
            block_id: 待查询切片块的唯一标识符（例如 "block_123"）。
            book_id: 所属书籍的唯一标识符（例如 "book_456"）。

        Returns:
            BookContentBlock: 结构化的书籍切片对象，包含正文及元数据。
        """
        return await book_query_port.get_content_block_by_id(block_id=block_id, book_id=book_id)

    return get_book_content
