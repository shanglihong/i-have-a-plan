"""公共领域枚举模块"""

from enum import Enum


class SortOrder(str, Enum):
    """通用排序方向枚举"""

    ASC = "asc"
    DESC = "desc"
