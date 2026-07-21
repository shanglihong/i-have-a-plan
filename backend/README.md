# 后端工程骨架搭建实施计划

## 背景与目标

基于 [后端架构设计规范 v1.0](../../docs/06_system_architecture/architecture_backend_design_spec_v1.0.md)，在已有的 `backend/` 空目录中搭建完整的工程骨架。骨架严格遵循**六边形架构 (Hexagonal Architecture) + DDD** 分层约定，可直接运行一个 Hello World 级别的健康检查 API 验证通路。

**技术选型对齐（已确认）**

| 维度 | 选型 |
| :--- | :--- |
| 语言版本 | Python 3.12 |
| 包管理 | uv |
| Web 框架 | FastAPI + Uvicorn |
| AI 编排 | LangChain + LangGraph |
| 数据库 ORM | SQLModel（SQLAlchemy + Pydantic 封装） |
| 数据库迁移 | 手写 SQL DDL（不引入 Alembic） |
| 异步任务 | asyncio 内置队列 |
| 测试框架 | pytest + pytest-asyncio |
| 骨架深度 | 完整 Hello World API（可直接运行验证） |

---

## 目录结构设计

```
backend/
├── pyproject.toml              # uv 项目声明，含所有依赖
├── .python-version             # 锁定 Python 3.12
├── README.md                   # 开发启动说明
├── Makefile                    # 常用命令快捷键
│
├── src/
│   └── app/
│       ├── main.py             # FastAPI 应用入口，挂载路由与静态文件
│       ├── config.py           # 全局配置（端口、数据库路径等）
│       │
│       ├── domain/             # 领域层 - 纯业务逻辑，零框架依赖
│       │   ├── __init__.py
│       │   ├── ports/          # 领域级防腐接口 (Repository Ports)
│       │   │   ├── __init__.py
│       │   │   └── repository_port.py
│       │   ├── project/        # 项目与任务上下文
│       │   │   ├── __init__.py
│       │   │   ├── entities.py # ProjectDO / TaskDO 实体定义
│       │   │   └── domain_service.py # 拓扑排序、状态机等纯领域服务
│       │   ├── note/           # 笔记上下文
│       │   │   ├── __init__.py
│       │   │   └── entities.py
│       │   ├── skill/          # 技能沙箱上下文
│       │   │   ├── __init__.py
│       │   │   └── entities.py
│       │   └── graph/          # 知识图谱上下文
│       │       ├── __init__.py
│       │       └── entities.py
│       │
│       ├── application/        # 应用层 - 用例编排，依赖反转
│       │   ├── __init__.py
│       │   ├── ports/          # 应用级防腐接口 (LLM / Sandbox Ports)
│       │   │   ├── __init__.py
│       │   │   ├── llm_port.py
│       │   │   └── sandbox_port.py
│       │   └── use_cases/      # 业务用例
│       │       ├── __init__.py
│       │       └── project_use_cases.py
│       │
│       ├── infrastructure/     # 基础设施层 - 技术实现（被动适配器）
│       │   ├── __init__.py
│       │   ├── db/             # SQLite 存储引擎
│       │   │   ├── __init__.py
│       │   │   ├── database.py # SQLModel 引擎初始化与 Session 管理
│       │   │   ├── schema.sql  # 手写 DDL（全量建表脚本）
│       │   │   └── repositories/  # 仓储实现（实现 Domain Ports）
│       │   │       ├── __init__.py
│       │   │       └── project_repository.py
│       │   ├── llm/            # LLM 适配器
│       │   │   ├── __init__.py
│       │   │   └── langchain_llm_adapter.py
│       │   ├── sandbox/        # 沙箱适配器（占位）
│       │   │   ├── __init__.py
│       │   │   └── local_sandbox_adapter.py
│       │   └── event_bus/      # asyncio 事件总线
│       │       ├── __init__.py
│       │       └── asyncio_event_bus.py
│       │
│       └── api/                # 接入层 - FastAPI 路由（主动适配器）
│           ├── __init__.py
│           ├── deps.py         # FastAPI Depends 依赖注入定义
│           ├── error_handler.py# 全局 RFC 7807 异常拦截
│           └── routers/        # 按业务领域分路由文件
│               ├── __init__.py
│               ├── health.py   # GET /api/health (Hello World 验证)
│               ├── projects.py # /api/projects
│               ├── notes.py    # /api/notes
│               ├── skills.py   # /api/skills
│               ├── tasks.py    # /api/tasks
│               └── dashboard.py# /api/dashboard
│
└── tests/
    ├── __init__.py
    ├── conftest.py             # pytest 全局 Fixtures（内存 DB、Mock 注入）
    ├── unit/                   # 纯领域层单元测试
    │   └── test_project_domain.py
    └── integration/            # API 集成测试（TestClient）
        └── test_health_api.py
```

---

## 分层文件内容规划

### 接入层 (api/)

- `health.py`：`GET /api/health` 返回 `{"status": "ok", "version": "0.1.0"}`，作为运行验证基准。
- `error_handler.py`：全局注册 `RequestValidationError` 与自定义 `DomainException` 的 RFC 7807 格式处理器。
- `deps.py`：集中定义 `get_db_session`、`get_project_repository` 等 FastAPI `Depends` 函数。
- 各业务路由文件预置占位路由（返回 `{"message": "not implemented"}`）。

### 应用层 (application/)

- `llm_port.py`：定义 `LLMPort` 抽象基类，含 `async def stream_chat(prompt: str) -> AsyncIterator[str]`。
- `sandbox_port.py`：定义 `SandboxPort` 抽象基类。
- `project_use_cases.py`：定义 `ProjectUseCases` 类，构造函数接收 Repository Port 显式注入，预置 `create_project` 方法骨架。

### 领域层 (domain/)

- `entities.py`：使用 `SQLModel` 定义 DO 实体，如 `class Project(SQLModel, table=True)`，字段严格对齐数据模型规范。
- `repository_port.py`：定义抽象类 `ProjectRepositoryPort`，声明 `get_by_id`、`save` 等抽象方法。
- `domain_service.py`：预置 `topological_sort(tasks: list[Task]) -> list[Task]` 方法骨架（占位注释说明算法意图）。

### 基础设施层 (infrastructure/)

- `database.py`：初始化 SQLite 引擎，提供 `get_session()` 依赖函数，初始化时执行 `schema.sql` 建表。
- `schema.sql`：手写全量 DDL，包含 `project`、`task`、`unified_reading_note`、`skill`、`graph_node`、`graph_edge` 六张表。
- `project_repository.py`：实现 `ProjectRepositoryPort`，包含真实 SQLModel CRUD 实现。
- `asyncio_event_bus.py`：封装 `asyncio.Queue` 实现 `publish/subscribe` 基础事件分发。

### 测试层 (tests/)

- `conftest.py`：配置内存 SQLite 测试引擎，重写 `get_db_session` 依赖实现隔离。
- `test_health_api.py`：使用 `TestClient` 调用 `GET /api/health` 断言 200 与响应体。
- `test_project_domain.py`：测试领域层拓扑排序逻辑（无任何外部依赖）。

---

## 关键配置文件

### pyproject.toml（核心依赖）

```toml
[project]
name = "i-have-a-plan-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "sqlmodel>=0.0.22",
    "aiosqlite>=0.20",
    "langchain>=0.3",
    "langgraph>=0.2",
    "pydantic-settings>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "httpx>=0.27",       # TestClient 异步支持
]
```

### Makefile（开发命令）

```makefile
dev:
    uv run uvicorn src.app.main:app --reload --port 8000

test:
    uv run pytest tests/ -v

install:
    uv sync --all-extras
```

---

## 验证计划

### 自动化测试

```bash
cd backend
uv run pytest tests/ -v
```

期望：`test_health_api.py` 绿灯，验证 FastAPI 路由 + 依赖注入整个通路打通。

### 手动验证

```bash
cd backend && uv run uvicorn src.app.main:app --reload --port 8000
curl http://localhost:8000/api/health
# 预期响应: {"status": "ok", "version": "0.1.0"}
```

---

## 开放决策项

> [!NOTE]
> 以下问题当前采用推荐默认值，若后续有调整请在确认阶段注明。

1. **SQLite 文件路径**：骨架中默认写入 `~/.i-have-a-plan/data.db`（遵循 Local-First 理念，与前端 Electron/浏览器工作目录解耦）。
2. **LangChain/LangGraph 版本**：待 AI 功能真正落地时再精确锁定，骨架仅声明版本范围。
3. **PyInstaller 打包**：本骨架阶段不处理，打包脚本将在集成部署阶段 (`docs/11_integration_and_deployment/`) 单独规划。
