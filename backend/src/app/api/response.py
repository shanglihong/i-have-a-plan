"""接入层 - 统一 API 响应封装"""

from enum import IntEnum
from typing import Generic, TypeVar, Optional, Any
from fastapi import status
from pydantic import BaseModel, Field


class ResponseCode(IntEnum):
    """业务与 HTTP 常用响应状态码枚举"""
    SUCCESS = status.HTTP_200_OK
    CREATED = status.HTTP_201_CREATED


T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = Field(default=ResponseCode.SUCCESS, description="状态码")
    message: str = Field(default="success", description="响应说明")
    data: Optional[T] = Field(default=None, description="响应数据")


def success_response(
    data: Any = None,
    code: int | ResponseCode = ResponseCode.SUCCESS,
    message: str = "success"
) -> dict:
    """构建统一格式的成功响应字典"""
    if hasattr(data, "model_dump"):
        data = data.model_dump()
    code_val = code.value if isinstance(code, IntEnum) else int(code)
    return {
        "code": code_val,
        "message": message,
        "data": data
    }
