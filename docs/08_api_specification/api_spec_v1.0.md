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
  "type": "https://api.example.com/errors/topology-cycle",
  "title": "Topological Cycle Detected",
  "status": 400,
  "detail": "依赖解析失败，检测到步骤循环依赖。",
  "instance": "/api/skills/sandbox-123/approve",
  "extension_fields": {
    "cycle_path": ["task_A", "task_B", "task_A"]
  }
}
```

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

具体的 API 接口契约均已按领域划分存放在 [modules/](./modules/) 目录下：

| 模块序号 | 模块规范文档 (点击查看明细) | 业务领域与核心职责 | 包含的接口概览 |
| :--- | :--- | :--- | :--- |
| **2.1** | **[01_projects_lifecycle.md](./modules/01_projects_lifecycle.md)** | **项目与生命周期** | `POST /api/projects` (创建双轨项目)<br>`GET /api/projects` (获取项目列表)<br>`POST /api/projects/{id}/archive` (归档)<br>`POST /api/projects/{id}/suspend` (休眠)<br>`POST /api/projects/{id}/resume` (唤醒) |
| **2.2** | **[02_documents_and_graph.md](./modules/02_documents_and_graph.md)** | **文档解析与知识图谱** | `GET /api/projects/{id}/parse-stream` (解析 SSE)<br>`POST /api/graph/sync` (触发闲时建图)<br>`GET /api/graph/peek` (Quick Peek 追溯) |
| **2.3** | **[03_discuss_and_notes.md](./modules/03_discuss_and_notes.md)** | **伴读对话与融合笔记** | `POST /api/discuss` (伴读对话 SSE)<br>`POST /api/notes` (创建融合笔记)<br>`GET /api/projects/{id}/notes` (获取笔记列表) |
| **2.4** | **[04_skills_and_sandbox.md](./modules/04_skills_and_sandbox.md)** | **技能提炼与沙箱验证** | `GET /api/skills/search` (语义检索技能)<br>`POST /api/skills/compile` (提炼编译 SSE)<br>`POST /api/skills/{id}/approve` (PA-03 门禁校验) |
| **2.5** | **[05_tasks_and_planning.md](./modules/05_tasks_and_planning.md)** | **计划与任务调度** | `POST /api/tasks/reschedule` (拓扑顺延计算)<br>`PATCH /api/tasks/{id}` (更新原子任务状态) |
| **2.6** | **[06_dashboard_aggregation.md](./modules/06_dashboard_aggregation.md)** | **大盘工作台与汇总统计** | `GET /api/dashboard/stats` (工作台指标汇总)<br>`GET /api/notes/featured` (大盘精选金句笔记)<br>`GET /api/skills/active` (活跃技能引擎列表) |
