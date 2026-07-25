"""全局通用领域异常基类模块 (自描述 RFC 7807 协议)"""

from __future__ import annotations


class DomainException(Exception):
    """
    通用领域异常基类。
    
    所有业务领域异常继承此类后，可通过类属性或实例初始化参数自描述 RFC 7807 字段，
    使得 API 接入层的 error_handler 无需硬编码任何特定领域异常判断。
    """

    error_type: str = "domain-error"
    title: str = "Domain Exception"
    status_code: int = 400

    def __init__(
        self,
        detail: str = "",
        error_type: str | None = None,
        title: str | None = None,
        status_code: int | None = None,
        extension_fields: dict | None = None,
    ) -> None:
        self.detail = detail or str(self)
        if error_type:
            self.error_type = error_type
        if title:
            self.title = title
        if status_code is not None:
            self.status_code = status_code
        self.extension_fields = extension_fields or {}
        super().__init__(self.detail)
