"""FastAPI 应用入口"""

from fastapi import FastAPI


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用实例"""
    app = FastAPI(
        title="i-have-a-plan API",
        version="0.1.0",
        description="i-have-a-plan 后端系统 API",
    )
    return app


app = create_app()
