# API 接口与通信协议规范 v1.0

> [!IMPORTANT]
> 本文档定义了前端与后端通信的核心 API 契约，基于《系统架构边界规范》与《前端交互规范》落地。
> **核心架构决策**：
> 1. **路由风格**：采用 RESTful + RPC 子资源混合模式，统一使用 `/api/` 作为根路径前缀（不带版本号）。
> 2. **SSE 连接机制**：采用**按需短生命周期流式连接**，请求完毕即断开连接，避免服务端句柄泄漏。
> 3. **分页策略**：全局采用混合分页策略，瀑布流数据使用 Cursor，大盘列表使用 Offset。
> 4. **异常规范**：统一采用 RFC 7807 标准返回带扩展字段的错误上下文。

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

## 二、 核心 API 接口定义

### 2.1 项目与生命周期模块 (Projects & Lifecycle)

#### 1. 创建双轨项目

* **接口路径**：`POST /api/projects`
* **通信协议**：REST
* **功能描述**：创建“阅读项目”或“计划项目”。阅读项目要求使用 `multipart/form-data` 以支持文件上传，计划项目使用 `application/json`。

**请求载荷 (JSON - 针对计划项目)**
```json
{
  "title": "项目名称",
  "type": "PLAN",
  "deadline": "2026-12-31T23:59:59Z",
  "skill_id": "string (可选注入的技能模板 ID)"
}
```

**请求载荷 (FormData - 针对阅读项目)**
* `title`: string
* `type`: "READING"
* `deadline`: "2026-12-31T23:59:59Z"
* `file`: Blob (文档实体文件)

**响应 (201 Created)**
```json
{
  "id": "project_uuid",
  "title": "项目名称",
  "type": "PLAN",
  "status": "ACTIVE",
  "created_at": "2026-07-18T10:00:00Z"
}
```

#### 2. 获取项目大盘列表

* **接口路径**：`GET /api/projects`
* **功能描述**：获取当前用户的项目列表，支持基于状态过滤。
* **请求参数**：`?status=ACTIVE&page=1&size=20`
* **响应 (200 OK)**：返回前述“基于 Offset 的分页”数据结构。

#### 3. 项目状态管理 (RPC 子资源路由)

| 操作 | HTTP Method | 接口路径 | 请求 Payload | 响应 | 业务约束 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **项目归档** | `POST` | `/api/projects/{id}/archive` | `{ "experience_content": "string (可选)" }` | `{ "status": "ARCHIVED", "has_mutation": true }` | 触发闲时建图与技能进化沙箱派生。 |
| **项目休眠** | `POST` | `/api/projects/{id}/suspend` | 无 | `{ "status": "SUSPENDED" }` | 序列化上下文，安全释放 LLM 连接。 |
| **一键唤醒** | `POST` | `/api/projects/{id}/resume` | 无 | `{ "status": "ACTIVE" }` | 触发前端水波纹重载，反序列化会话。 |

---

### 2.2 文档解析与知识图谱模块 (Documents & Graph)

#### 1. 订阅文档解析 SSE 进度流

* **接口路径**：`GET /api/projects/{id}/parse-stream`
* **功能描述**：文档上传后，前端请求此接口建立**短生命周期 SSE 连接**。接收解析与切片向量化的实时进度，用于渲染大纲波光骨架屏。完成时后端主动切断连接。

**SSE 响应流载荷**
```text
event: progress
data: { "parsed_chunks": 10, "total_chunks": 100, "status": "PARSING" }

event: progress
data: { "status": "READY", "tree_skeleton": [ ... ] }
```

#### 2. 触发闲时图谱构建

* **接口路径**：`POST /api/graph/sync`
* **功能描述**：遵循 PA-02 契约，手动或闲时触发 Graph RAG 的增量合并。
* **请求体**：`{ "project_id": "string" }`
* **响应 (202 Accepted)**：返回后台任务队列 `task_id`。

#### 3. Quick Peek 跨节点追溯

* **接口路径**：`GET /api/graph/peek`
* **功能描述**：全屏图谱视图中，点击节点无跳跃溯源，获取原文或历史笔记内容。
* **请求参数**：`?node_id=uuid`
* **响应 (200 OK)**
```json
{
  "node_id": "uuid",
  "type": "READING_NOTE",
  "content": "富文本内容...",
  "source_anchor": {
    "project_id": "uuid",
    "page_or_chapter_id": "string"
  }
}
```

---

### 2.3 伴读对话与融合笔记模块 (Discuss & Notes)

#### 1. 提交流式伴读对话 (Discuss)

* **接口路径**：`POST /api/discuss`
* **功能描述**：提交用户提问，建立**按需短连接 SSE** 推送大模型回复流。回答结束后连接释放。

**请求载荷 (JSON)**
```json
{
  "project_id": "uuid",
  "query": "用户的输入问题",
  "context_anchor": {
    "page_or_chapter_id": "string",
    "feature_text": "可选的高亮截取上下文"
  }
}
```

**SSE 响应流载荷**
```text
event: chunk
data: { "text": "大模型回复的片段...", "is_done": false }

event: chunk
data: { "text": "", "is_done": true, "task_recommendation": { "title": "推荐的落地任务" } }
```

#### 2. 创建融合笔记

* **接口路径**：`POST /api/notes`
* **功能描述**：支持“划词高亮记笔记”与“对话一键转存笔记”双通道实体保存。

**请求载荷 (JSON)**
```json
{
  "project_id": "uuid",
  "content": "富文本/Markdown内容",
  "source_anchor": {
    "page_or_chapter_id": "string",
    "start_offset": 120,
    "end_offset": 300,
    "feature_text": "首尾容错特征字符"
  }
}
```
* **响应 (201 Created)**：返回包含新生成的 `note_id` 与状态信息。

#### 3. 获取融合笔记列表 (读思流加载)

* **接口路径**：`GET /api/projects/{id}/notes`
* **功能描述**：用于右侧读思面板的瀑布流数据拉取，强制使用 Cursor 分页。
* **请求参数**：`?cursor=xxx&limit=15`
* **响应 (200 OK)**：返回前述“基于 Cursor 的分页”数据结构。

---

### 2.4 技能提炼与沙箱验证模块 (Skills & Sandbox)

#### 1. 语义检索技能 (防抖检索)

* **接口路径**：`GET /api/skills/search`
* **功能描述**：用于计划项目创建时的技能推荐（走密集向量查询）。
* **请求参数**：`?query=如何写论文&limit=3`
* **响应 (200 OK)**：返回 `status = ACTIVE` 的推荐技能卡片对象数组。

#### 2. 触发提炼编译 (Trace-to-Skill)

* **接口路径**：`POST /api/skills/compile`
* **功能描述**：发起 L1/L2/L3 任意级别的编译请求。建立短连接 SSE 推送编译状态。

**请求载荷 (JSON)**
```json
{
  "project_id": "uuid",
  "scope_type": "SINGLE_NOTE",
  "reference_ids": ["note_id_1", "note_id_2"]
}
```

**SSE 响应流载荷**
```text
event: progress
data: { "status": "COMPILING", "detail": "正在推导拓扑依赖..." }

event: progress
data: { "status": "COMPLETED", "sandbox_skill_id": "uuid" }
```

#### 3. 批准入库校验 (PA-03 阻断门禁)

> [!WARNING]
> 本接口承载沙箱卡片连线的防死锁职责。

* **接口路径**：`POST /api/skills/{id}/approve`
* **功能描述**：前端发起批准请求，后端执行严格的拓扑排序算法。若校验通过，文件从 `sandbox` 物理移动至 `active` 目录。
* **响应 (200 OK)**：校验通过，返回 `{ "status": "ACTIVE" }`
* **响应 (400 Bad Request)**：检测到环路，阻断入库并返回 RFC 7807 标准错误。`extension_fields.cycle_path` 必填，驱动前端画布连线呈现红色抖动警示。

---

### 2.5 计划与任务调度模块 (Tasks & Planning)

#### 1. 拓扑重调度计算 (顺延)

* **接口路径**：`POST /api/tasks/reschedule`
* **功能描述**：用户手动或一键顺延逾期任务，后端通过图算法递归推导所有依赖子任务的新截止时间，并开启事务批量落盘。

**请求载荷 (JSON)**
```json
{
  "task_id": "uuid",
  "postpone_days": 3
}
```

**响应 (200 OK)**
```json
{
  "rescheduled_count": 5,
  "affected_tasks": [
    { "task_id": "uuid1", "new_deadline": "2026-07-20T10:00:00Z" },
    { "task_id": "uuid2", "new_deadline": "2026-07-22T10:00:00Z" }
  ]
}
```
* **前端联动契约**：收到 `200 OK` 后，前端 React Query 须立即执行 `invalidateQueries()` 无感刷新任务树。

#### 2. 更新原子任务状态

* **接口路径**：`PATCH /api/tasks/{id}`
* **请求载荷 (JSON)**：`{ "status": "RUNNING" }`
* **响应 (200 OK)**：
```json
{
  "id": "uuid",
  "status": "RUNNING",
  "unlocked_task_ids": ["uuid_child_1"] 
}
```
*注：若当前任务标记为 `COMPLETED`，响应体会携带因此次完成而满足了全部前置依赖、被自动解锁的子任务 ID 列表 `unlocked_task_ids`，前端籍此解灰对应卡片。*
