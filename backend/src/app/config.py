"""
全局应用配置 (pydantic-settings)

所有配置从环境变量读取，可通过 .env 文件覆盖。
优先级：环境变量 > .env 文件 > 默认值
"""
from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用全局配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # 服务配置
    app_title: str = "i-have-a-plan"
    app_version: str = "0.1.0"
    debug: bool = Field(default=False)
    port: int = Field(default=8000)

    # 数据库配置
    database_url: str = Field(
        default="",
        description="留空时使用 ~/.i-have-a-plan/data.db 默认路径",
    )
    sql_echo: bool = Field(default=False)

    # 沙箱配置
    sandbox_root: Path = Field(
        default=Path.home() / ".i-have-a-plan" / "sandbox",
        description="沙箱受限根目录，所有 Agent 文件操作限制在此目录内",
    )

    # LLM 配置（骨架阶段可为空）
    openai_api_key: str = Field(default="", description="OpenAI API Key")
    llm_model: str = Field(default="gpt-4o-mini")


# 全局单例
settings = Settings()
