"""
接入层 - 全局 RFC 7807 异常处理器

所有非 2xx 响应均统一返回 RFC 7807 格式（Problem Details for HTTP APIs）。
前端可通过 type 字段区分错误类型并处理复杂交互死锁（如沙箱拓扑环路）。
"""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.domain.project.domain_service import TopologyCycleError
from app.application.ports.sandbox_port import SandboxViolationError


class DomainException(Exception):
    """通用领域异常基类，携带 RFC 7807 所需字段"""

    def __init__(
        self,
        error_type: str,
        title: str,
        status_code: int = 400,
        detail: str = "",
        extension_fields: dict | None = None,
    ) -> None:
        self.error_type = error_type
        self.title = title
        self.status_code = status_code
        self.detail = detail
        self.extension_fields = extension_fields or {}
        super().__init__(detail)


def _problem_response(
    request: Request,
    error_type: str,
    title: str,
    status_code: int,
    detail: str,
    extension_fields: dict | None = None,
) -> JSONResponse:
    body = {
        "type": f"https://i-have-a-plan/errors/{error_type}",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": str(request.url),
    }
    if extension_fields:
        body["extension_fields"] = extension_fields
    return JSONResponse(content=body, status_code=status_code)


def register_error_handlers(app: FastAPI) -> None:
    """在 FastAPI 应用上注册所有全局异常处理器"""

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _problem_response(
            request,
            error_type="validation-error",
            title="Request Validation Error",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="请求参数校验失败",
            extension_fields={"errors": exc.errors()},
        )

    @app.exception_handler(DomainException)
    async def domain_exception_handler(
        request: Request, exc: DomainException
    ) -> JSONResponse:
        return _problem_response(
            request,
            error_type=exc.error_type,
            title=exc.title,
            status_code=exc.status_code,
            detail=exc.detail,
            extension_fields=exc.extension_fields,
        )

    @app.exception_handler(TopologyCycleError)
    async def topology_cycle_handler(
        request: Request, exc: TopologyCycleError
    ) -> JSONResponse:
        return _problem_response(
            request,
            error_type="topology-cycle",
            title="Topological Cycle Detected",
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="依赖解析失败，检测到步骤循环依赖。",
            extension_fields={"cycle_path": exc.cycle_path},
        )

    @app.exception_handler(SandboxViolationError)
    async def sandbox_violation_handler(
        request: Request, exc: SandboxViolationError
    ) -> JSONResponse:
        return _problem_response(
            request,
            error_type="sandbox-violation",
            title="Sandbox Security Violation",
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
