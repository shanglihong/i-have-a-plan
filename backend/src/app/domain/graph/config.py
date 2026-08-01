"""旁路图谱与 RAG 领域配置参数模块"""

# 向量配置
EMBEDDING_DIMENSION: int = 1536

# 任务自愈与重试配置
STALE_PROCESSING_TIMEOUT_MINUTES: int = 15
MAX_RETRY_COUNT: int = 3
