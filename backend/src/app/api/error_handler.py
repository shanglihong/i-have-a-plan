"""
接入层 - 通用 RFC 7807 异常处理器

所有非 2xx 响应均统一返回 RFC 7807 格式（Problem Details for HTTP APIs）。
通过自描述的 DomainException 基类，自动提取 error_type、title、status_code 和 extension_fields，
避免在接入层为各个具体领域异常编写硬编码转换逻辑。
"""
from __future__ import annotations

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.domain.exceptions import DomainException


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
            error_type=getattr(exc, "error_type", "domain-error"),
            title=getattr(exc, "title", "Domain Exception"),
            status_code=getattr(exc, "status_code", status.HTTP_400_BAD_REQUEST),
            detail=getattr(exc, "detail", str(exc)),
            extension_fields=getattr(exc, "extension_fields", None),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        detail_msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return _problem_response(
            request,
            error_type="http-error",
            title="HTTP Exception",
            status_code=exc.status_code,
            detail=detail_msg,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return _problem_response(
            request,
            error_type="internal-server-error",
            title="Internal Server Error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部发生未知错误",
        )



