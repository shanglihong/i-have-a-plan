# 2.1 项目与生命周期模块 API 规范 (Projects & Lifecycle)

> [!NOTE]
> 本模块定义了阅读项目与计划项目的创建、获取列表以及生命周期状态切换 (归档、休眠、唤醒) 的核心接口。

---

## 接口列表

### 1. 创建双轨项目

* **接口路径**：`POST /api/projects`
* **通信协议**：REST
* **功能描述**：创建“阅读项目”或“计划项目”。阅读项目要求使用 `multipart/form-data` 以支持文件上传，计划项目使用 `application/json`。

#### 请求载荷 (JSON - 针对计划项目)
```json
{
  "title": "Linux 内核协议栈重构计划",
  "kb_id": "kb_sys_01",
  "kb_name": "Linux 内核与系统底层知识库",
  "type": "PLAN",
  "deadline": "2026-12-31T23:59:59Z",
  "skill_id": "string (可选注入的技能模板 ID)"
}
```

#### 请求载荷 (FormData - 针对阅读项目)
* `title`: string (关联项目/文档标题)
* `kb_id`: string (所属知识库 ID)
* `kb_name`: string (所属知识库名称 - 作为文件夹目录)
* `type`: "READING"
* `deadline`: "2026-12-31T23:59:59Z"
* `file`: Blob (文档实体文件)

#### 响应 (201 Created)
```json
{
  "id": "project_uuid",
  "title": "Linux 内核协议栈重构计划",
  "kb_id": "kb_sys_01",
  "kb_name": "Linux 内核与系统底层知识库",
  "type": "PLAN",
  "status": "ACTIVE",
  "created_at": "2026-07-18T10:00:00Z"
}
```

---

### 2. 获取项目大盘列表

* **接口路径**：`GET /api/projects`
* **功能描述**：获取当前用户的项目列表，支持基于状态过滤。
* **请求参数**：`?status=ACTIVE&page=1&size=20`
* **响应 (200 OK)**：返回 Offset 分页数据结构。

```json
{
  "items": [
    {
      "id": "1",
      "kb_id": "kb_sys_01",
      "kb_name": "Linux 内核与系统底层知识库",
      "title": "深入理解 Linux 内核架构与网络协议栈",
      "type": "READING",
      "status": "ACTIVE",
      "progress": 75,
      "deadline": "2026-08-30",
      "tags": ["内核", "C语言", "网络"],
      "notes": 42
    }
  ],
  "total": 100,
  "page": 1,
  "size": 20,
  "has_next": true
}
```



---

### 3. 项目状态管理 (RPC 子资源路由)

| 操作 | HTTP Method | 接口路径 | 请求 Payload | 响应 | 业务约束 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **项目归档** | `POST` | `/api/projects/{id}/archive` | `{ "experience_content": "string (可选)" }` | `{ "status": "ARCHIVED", "has_mutation": true }` | 触发闲时建图与技能进化沙箱派生。 |
| **项目休眠** | `POST` | `/api/projects/{id}/suspend` | 无 | `{ "status": "SUSPENDED" }` | 序列化上下文，安全释放 LLM 连接。 |
| **一键唤醒** | `POST` | `/api/projects/{id}/resume` | 无 | `{ "status": "ACTIVE" }` | 触发前端水波纹重载，反序列化会话。 |
