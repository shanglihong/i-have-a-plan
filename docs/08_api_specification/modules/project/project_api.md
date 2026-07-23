# 2.1 项目生命周期 API 规范 (Project Domain)

> [!NOTE]
> 本模块定义了阅读项目与计划项目的创建、列表查询、详情获取、元数据修改以及生命周期状态切换 (归档) 的核心接口，属于项目与任务领域 (`domain/project`)。
>
> 业务规范参考：[业务模型文档](../../../03_business_modeling/business_model.md)

---

## 核心架构原则与范式

> [!IMPORTANT]
> **1. 统一三层范式 (`Project -> TaskChain -> Task`)**
> 系统底层统一遵循 `Project -> TaskChain -> Task` 范式。`TaskChain` 作为通用中观容器，消除不同项目类型在 DB 与 API 上的结构差异。
> * **阅读项目表现 (1 Chapter = 1 Task Chain)**：电子书解析后的每个独立章节精准实例化为一个 `TaskChain` (类型为 `READING_CHAPTER`)。
> * **计划项目表现**：由 Skill 模版或 LLM 解构生成的阶段性功能模块/里程碑实例化为 `TaskChain` (类型为 `PLAN_STAGE`)；若为纯扁平列表，底层自动挂载隐式 `TaskChain` (类型为 `DEFAULT`)。
>
> **2. 极简三态生命周期与 Agent 句柄解耦**
> 项目的持久化业务状态定义为极简三态：`INIT` (初始化) / `ACTIVE` (活跃) / `ARCHIVED` (已归档)。
> 软件闲置或 24 小时无交互时，数据库状态保持真实的 `ACTIVE` 语义，仅在物理层解绑 Agent 句柄。解绑与还原由底层 Agent 调度服务静默处理。

---

## 接口列表

### 1. 创建双轨项目

* **接口路径**：`POST /api/projects`
* **通信协议**：REST
* **功能描述**：创建“阅读项目”或“计划项目”。阅读项目要求使用 `multipart/form-data` 以支持电子书文件上传与自动解析初始化；计划项目使用 `application/json`。

#### 请求载荷 (JSON - 针对计划项目 `type = PLAN`)

| 属性名     | 类型              | 必填/可选 | 含义与说明             |
| :--------- | :---------------- | :-------- | :--------------------- |
| `title`    | string            | 必填      | 计划项目名称           |
| `type`     | string            | 必填      | 固定值 `"PLAN"`        |
| `deadline` | string (ISO-8601) | 可选      | 截止时间约束           |
| `skill_id` | string (UUID)     | 可选      | 关联/注入的技能模板 ID |

```json
{
  "title": "Linux 内核协议栈重构计划",
  "type": "PLAN",
  "deadline": "2026-12-31T23:59:59Z",
  "skill_id": "skill_9b8a7c6f-5e4d-3c2b-1a0f-9e8d7c6b5a4f"
}
```

#### 请求载荷 (FormData - 针对阅读项目 `type = READING`)

| 属性名     | 类型              | 必填/可选 | 含义与说明                                   |
| :--------- | :---------------- | :-------- | :------------------------------------------- |
| `title`    | string            | 必填      | 阅读项目/书籍标题                            |
| `type`     | string            | 必填      | 固定值 `"READING"`                           |
| `deadline` | string (ISO-8601) | 可选      | 预计阅读完成截止时间                         |
| `file`     | File / Blob       | 必填      | 上传的电子书实体文件 (PDF / EPUB / TXT / MD) |

#### 响应 (201 Created - 计划项目)

```json
{
  "id": "proj_9b8a7c6f-5e4d-3c2b-1a0f-9e8d7c6b5a4f",
  "title": "Linux 内核协议栈重构计划",
  "type": "PLAN",
  "status": "INIT",
  "assigned_agent_id": "agent_sup_001",
  "created_at": "2026-07-23T10:00:00Z",
  "updated_at": "2026-07-23T10:00:00Z"
}
```

#### 响应 (201 Created - 阅读项目)

```json
{
  "id": "proj_1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "title": "深入理解 Linux 内核架构与网络协议栈",
  "type": "READING",
  "status": "INIT",
  "assigned_agent_id": "agent_read_001",
  "book_id": "bk_8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c",
  "parsing_status": "PENDING",
  "created_at": "2026-07-23T10:00:00Z",
  "updated_at": "2026-07-23T10:00:00Z"
}
```

---

### 2. 获取项目列表

* **接口路径**：`GET /api/projects`
* **通信协议**：REST
* **功能描述**：获取当前用户的项目列表，支持基于状态与类型进行过滤，默认按修改时间倒序 (`updated_at DESC`) 排列，分页方式为基于 Offset 的 Dashboard 分页。

#### 请求参数

| 参数名 | 类型 | 必填/可选 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `status` | string | 可选 | - | 状态过滤 (`INIT` / `ACTIVE` / `ARCHIVED`) |
| `type` | string | 可选 | - | 项目类型过滤 (`READING` / `PLAN`) |
| `sort_by` | string | 可选 | `updated_at` | 排序属性字段 (`updated_at` / `created_at` / `deadline`) |
| `order` | string | 可选 | `desc` | 排序方向 (`desc` 倒序 / `asc` 正序) |
| `page` | integer | 可选 | 1 | 页码 (从 1 开始) |
| `size` | integer | 可选 | 20 | 每页数量 (默认 20) |

#### 响应 (200 OK)

```json
{
  "items": [
    {
      "id": "proj_001",
      "title": "深入理解 Linux 内核架构与网络协议栈",
      "type": "READING",
      "status": "ACTIVE",
      "progress": 75,
      "deadline": "2026-08-30T23:59:59Z",
      "assigned_agent_id": "agent_read_001",
      "tags": ["内核", "C语言", "网络"],
      "created_at": "2026-07-18T10:00:00Z",
      "updated_at": "2026-07-23T11:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "size": 20,
  "has_next": true
}
```

---

### 3. 获取项目详情与任务树

* **接口路径**：`GET /api/projects/{id}/detail`
* **通信协议**：REST
* **功能描述**：获取单个项目的完整聚合数据，包含项目元数据、总体进度、绑定的 Agent ID、关联书籍信息 (若为阅读项目) 以及挂载的 `TaskChain` / `Task` 完整三层范式结构。

#### 路径参数

| 参数名 | 类型          | 含义与说明       |
| :----- | :------------ | :--------------- |
| `id`   | string (UUID) | 项目全局唯一标识 |

#### 响应 (200 OK)

```json
{
  "id": "proj_001",
  "title": "深入理解 Linux 内核架构与网络协议栈",
  "type": "READING",
  "status": "ACTIVE",
  "progress": 75,
  "deadline": "2026-08-30T23:59:59Z",
  "assigned_agent_id": "agent_read_001",
  "book": {
    "id": "bk_8f7e6d5c",
    "file_name": "Linux_Kernel_Architecture.pdf",
    "parsing_status": "COMPLETED",
    "total_chapters": 12,
    "total_word_count": 350000
  },
  "task_chains": [
    {
      "id": "chain_01",
      "title": "第一章：网络协议栈初始化",
      "type": "READING_CHAPTER",
      "sequence_order": 1,
      "status": "COMPLETED",
      "book_id": "bk_8f7e6d5c",
      "chapter_id": "chap_01",
      "tasks": [
        {
          "id": "task_101",
          "title": "阅读套接字 sk_buff 分配机制",
          "description": "精读第 15 页并对比 socket.c 实现",
          "sequence_order": 1,
          "status": "COMPLETED",
          "depends_on_task_ids": []
        },
        {
          "id": "task_102",
          "title": "梳理协议栈内存池申请流程",
          "description": "完成转述卡片并挂载素材笔记",
          "sequence_order": 2,
          "status": "RUNNING",
          "depends_on_task_ids": ["task_101"]
        }
      ]
    }
  ],
  "created_at": "2026-07-18T10:00:00Z",
  "updated_at": "2026-07-23T11:30:00Z"
}
```

---

### 4. 更新项目元数据

* **接口路径**：`PATCH /api/projects/{id}`
* **通信协议**：REST
* **功能描述**：更新项目的属性信息，例如修改项目名称、调整截止时间等。

#### 路径参数

| 参数名 | 类型          | 含义与说明 |
| :----- | :------------ | :--------- |
| `id`   | string (UUID) | 项目 ID    |

#### 请求载荷

```json
{
  "title": "深入理解 Linux 内核架构与网络协议栈 (精读版)",
  "deadline": "2026-09-15T23:59:59Z"
}
```

#### 响应 (200 OK)

```json
{
  "id": "proj_001",
  "title": "深入理解 Linux 内核架构与网络协议栈 (精读版)",
  "type": "READING",
  "status": "ACTIVE",
  "deadline": "2026-09-15T23:59:59Z",
  "updated_at": "2026-07-23T12:00:00Z"
}
```

---

### 5. 项目归档

* **接口路径**：`POST /api/projects/{id}/archive`
* **通信协议**：REST
* **功能描述**：将已完成或终止的项目置为归档 (`ARCHIVED`) 状态。项目状态扭转成功后，系统自动向前端发送 `PROJECT_ARCHIVED` 消息通知，消息卡片上带有【生成经验笔记】交互按钮。

#### 路径参数

| 参数名 | 类型          | 含义与说明 |
| :----- | :------------ | :--------- |
| `id`   | string (UUID) | 项目 ID    |

#### 响应 (200 OK)

```json
{
  "id": "proj_001",
  "status": "ARCHIVED",
  "updated_at": "2026-07-23T12:00:00Z"
}
```

---

### 6. 生成归档经验笔记

* **接口路径**：`POST /api/projects/{id}/experience-note`
* **通信协议**：REST
* **功能描述**：当用户在项目归档消息卡片上点击【生成经验笔记】按钮时调用此接口。系统生成 `EXPERIENCE` 类型的沉淀笔记 (`SynthesizedNote`)，将其挂载至归档项目，并触发旁路闲时知识图谱的建立与实战边构建。

#### 路径参数

| 参数名 | 类型          | 含义与说明 |
| :----- | :------------ | :--------- |
| `id`   | string (UUID) | 项目 ID    |

#### 请求载荷 (JSON)

| 属性名               | 类型   | 必填/可选 | 含义与说明                                                         |
| :------------------- | :----- | :-------- | :----------------------------------------------------------------- |
| `experience_content` | string | 可选      | 复盘总结与经验笔记文本内容 (可选，未提供时系统基于 Trace 自动提取) |

```json
{
  "experience_content": "通过本次内核重构项目，掌握了 sk_buff 的零拷贝优化技巧与内存池管理经验。"
}
```

#### 响应 (201 Created)

```json
{
  "project_id": "proj_001",
  "experience_note_id": "note_exp_9b8a7c6f-5e4d-3c2b-1a0f",
  "created_at": "2026-07-23T12:00:00Z"
}
```
