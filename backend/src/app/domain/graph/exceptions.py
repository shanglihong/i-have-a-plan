"""旁路图谱与 RAG 领域异常定义模块 (遵循自描述 RFC 7807 协议)"""

from app.domain.exceptions import DomainException


class GraphDomainException(DomainException):
    """旁路图谱与向量领域基类异常"""

    error_type: str = "graph-domain-error"
    title: str = "Graph Domain Error"
    status_code: int = 400

    def __init__(self, message: str, error_code: str = "GRAPH_DOMAIN_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(
            detail=message,
            extension_fields={"error_code": error_code},
        )


class GraphNodeNotFoundException(GraphDomainException):
    """图谱节点未找到异常"""

    error_type: str = "graph-node-not-found"
    title: str = "Graph Node Not Found"
    status_code: int = 404

    def __init__(self, node_id: str):
        super().__init__(
            f"指定的图谱节点 {node_id} 不存在或已被清理。",
            error_code="GRAPH_NODE_NOT_FOUND",
        )


class GraphEdgeNotFoundException(GraphDomainException):
    """认知关系边未找到异常"""

    error_type: str = "graph-edge-not-found"
    title: str = "Graph Edge Not Found"
    status_code: int = 404

    def __init__(self, edge_id: str):
        super().__init__(
            f"指定的认知关系边 {edge_id} 不存在。",
            error_code="GRAPH_EDGE_NOT_FOUND",
        )


class GraphTaskNotFoundException(GraphDomainException):
    """排队增量任务未找到异常"""

    error_type: str = "graph-task-not-found"
    title: str = "Graph Pending Task Not Found"
    status_code: int = 404

    def __init__(self, task_id: str):
        super().__init__(
            f"图谱增量排队任务 {task_id} 不存在。",
            error_code="GRAPH_TASK_NOT_FOUND",
        )


class GraphSyncFailedException(GraphDomainException):
    """图谱同步或向量建图失败异常"""

    error_type: str = "graph-sync-failed"
    title: str = "Graph Sync Failed"
    status_code: int = 500

    def __init__(self, reason: str):
        super().__init__(
            f"图谱同步建图失败: {reason}",
            error_code="GRAPH_SYNC_FAILED",
        )
