# API 核心契约规范 (v1.0)

> [!IMPORTANT]
> 本文档定义了前端与后端通信的核心 API 契约，基于《系统架构边界规范》与《前端交互规范》落地。
> **核心架构决策**：
> 1. **路由风格**：采用 RESTful + RPC 子资源混合模式，统一使用 `/api/` 作为根路径前缀（不带版本号）。
> 2. **SSE 连接机制**：采用**按需短生命周期流式连接**，请求完毕即断开连接，避免服务端句柄泄漏。
> 3. **分页策略**：全局采用混合分页策略，瀑布流数据使用 Cursor，大盘列表使用 Offset。
> 4. **异常规范**：统一采用 RFC 7807 标准返回带扩展字段的错误上下文。
> 5. **模块化存放**：所有具体的 API 接口定义按业务领域物理拆分存放于 [modules/](./modules/) 目录。

---

## 一、 全局协议与数据规范

### 1. 异常状态透传标准 (RFC 7807)

所有非 2xx 的响应，必须统一返回基于 RFC 7807 (Problem Details for HTTP APIs) 标准的结构，以便前台解析复杂的交互死锁（如沙箱拓扑环路）。

```json
{
  "type": "https://i-have-a-plan/errors/book-not-found",
  "title": "Book Not Found",
  "status": 404,
  "detail": "未找到图书: bk_88776655",
  "instance": "/api/books/bk_88776655",
  "extension_fields": {
    "error_code": "BOOK_NOT_FOUND"
  }
}
```

#### 常用领域异常类型映射表

| 领域错误类型 | HTTP 状态码 | type 字段标识 | 说明 |
| :--- | :--- | :--- | :--- |
| `BOOK_NOT_FOUND` | 404 | `https://i-have-a-plan/errors/book-not-found` | 指定图书元数据或记录不存在 |
| `CHAPTER_NOT_FOUND` | 404 | `https://i-have-a-plan/errors/chapter-not-found` | 章节内容切片未找到 |
| `UNSUPPORTED_BOOK_FORMAT` | 400 | `https://i-have-a-plan/errors/unsupported-book-format` | 不支持的格式类型 |
| `INVALID_STATE_TRANSITION` | 409 | `https://i-have-a-plan/errors/invalid-state-transition` | 非法的状态机流转 |
| `BOOK_PARSING_FAILED` | 422 | `https://i-have-a-plan/errors/book-parsing-failed` | 书籍文件解析过程失败 |
| `validation-error` | 422 | `https://i-have-a-plan/errors/validation-error` | 请求参数校验失败 |
| `internal-server-error` | 500 | `https://i-have-a-plan/errors/internal-server-error` | 未捕获的内部服务器错误 |

### 2. 混合分页策略数据结构

> [!TIP]
> 不同的展现形式对应不同的底层分页策略，严禁混用。

**A. 基于 Offset 的分页 (适用于 Dashboard 大盘项目列表)**

请求参数示例：`GET /api/projects?page=1&size=20`

```json
{
  "items": [ ... ],
  "total": 100,
  "page": 1,
  "size": 20,
  "has_next": true
}
```

**B. 基于 Cursor 的分页 (适用于融合笔记卡片瀑布流)**

请求参数示例：`GET /api/projects/{id}/notes?cursor=xxx&limit=20`

```json
{
  "items": [ ... ],
  "next_cursor": "base64_encoded_string_or_null",
  "has_next": true
}
```

---

## 二、 模块化 API 接口索引目录

具体的 API 接口契约均已按 **DDD 业务领域划分** 物理拆分存放于 [modules/](./modules/) 目录下：

| 领域分类 | 规范文档 (点击查看明细) | 业务领域与核心职责 | 包含的接口概览 |
| :--- | :--- | :--- | :--- |
| **项目与任务领域** | **[project_api.md](./modules/project/project_api.md)** | **项目生命周期** | `POST /api/projects` (创建双轨项目)<br>`GET /api/projects` (获取项目列表)<br>`GET /api/projects/{id}/detail` (项目详情与任务树)<br>`PATCH /api/projects/{id}` (修改项目元数据)<br>`POST /api/projects/{id}/archive` (归档与经验复盘) |
| **项目与任务领域** | **[task_api.md](./modules/project/task_api.md)** | **任务顺延与状态调度** | `POST /api/tasks/reschedule` (拓扑顺延计算)<br>`PATCH /api/tasks/{id}` (更新原子任务状态) |
| **书籍与物理锚点领域** | **[document_api.md](./modules/book/document_api.md)** | **文档流式解析** | `GET /api/projects/{id}/parse-stream` (解析与大纲 SSE) |
| **笔记与知识库领域** | **[note_api.md](./modules/note/note_api.md)** | **伴读对话与融合笔记** | `POST /api/discuss` (伴读对话 SSE)<br>`POST /api/notes` (创建融合笔记)<br>`GET /api/projects/{id}/notes` (获取笔记列表) |
| **笔记与知识库领域** | **[knowledge_base_api.md](./modules/note/knowledge_base_api.md)** | **知识库管理与目录** | `GET /api/knowledge-bases` (获取知识库列表)<br>`POST /api/knowledge-bases` (新建知识库)<br>`PUT /api/knowledge-bases/{id}` (更新知识库)<br>`DELETE /api/knowledge-bases/{id}` (删除知识库) |
| **技能与沙箱领域** | **[skill_api.md](./modules/skill/skill_api.md)** | **技能提炼与沙箱验证** | `GET /api/skills/search` (语义检索技能)<br>`POST /api/skills/compile` (提炼编译 SSE)<br>`POST /api/skills/{id}/approve` (PA-03 门禁校验) |
| **旁路图谱与向量领域** | **[graph_api.md](./modules/graph/graph_api.md)** | **旁路图谱与追溯** | `POST /api/graph/sync` (触发闲时建图)<br>`GET /api/graph/peek` (Quick Peek 追溯) |
| **工作台与全局服务** | **[dashboard_api.md](./modules/system/dashboard_api.md)** | **大盘工作台与汇总统计** | `GET /api/dashboard/stats` (工作台指标汇总)<br>`GET /api/notes/featured` (大盘精选金句笔记)<br>`GET /api/skills/active` (活跃技能引擎列表) |
| **工作台与全局服务** | **[search_api.md](./modules/system/search_api.md)** | **全站全局搜索** | `GET /api/search` (聚合全站全局搜索) |

