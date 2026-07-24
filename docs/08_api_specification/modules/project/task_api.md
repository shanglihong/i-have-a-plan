# 任务模块 (Task Module) API 规范 v1.0

> [!NOTE]
> 本文档定义了项目限界上下文 (`domain/project`) 内部 **Task 模块**（包含 `TaskChain` 中观任务链与 `Task` 微观任务）的所有 REST API 契约，遵循 OpenAPI 3.0 / REST 规范。

---

## 接口概要映射表

| 序号 | 接口路径 | HTTP Method | 功能描述 | 请求类型 | 成功响应 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `/api/projects/{id}/task-tree` | `GET` | 获取项目完整任务树结构 | - | `200 OK` (`TaskTreeResponse`) |
| 2 | `/api/projects/{id}/tasks` | `GET` | 项目 Task 列表多条件过滤查询 | Query Params | `200 OK` (`List[TaskVO]`) |
| 3 | `/api/task-chains` | `POST` | 创建中观任务链 (`TaskChain`) | `application/json` | `201 Created` (`TaskChainVO`) |
| 4 | `/api/tasks` | `POST` | 创建微观原子任务 (`Task`) | `application/json` | `201 Created` (`TaskVO`) |
| 5 | `/api/tasks/{id}/status` | `PATCH` | 更新 Task 状态 (自动解锁与重算) | `application/json` | `200 OK` (`TaskStatusUpdateResponse`) |
| 6 | `/api/task-chains/{id}/recalculate-progress` | `POST` | 手动触发刷新校准任务链进度 | - | `200 OK` (`ProcessedProgressDTO`) |
| 7 | `/api/tasks/{id}/notes` | `GET` | 查看 Task 挂载的素材笔记列表 (支持过滤) | Query Params | `200 OK` (`List[MaterialNoteVO]`) |
| 8 | `/api/tasks/{id}/notes` | `POST` | Task 详情直接撰写笔记或绑定已有素材笔记 | `application/json` | `201 Created` (`AttachNoteResponse`) |
| 9 | `/api/tasks/{id}/notes/{note_id}` | `DELETE` | 解绑 Task 与素材笔记关联 | - | `204 No Content` |

---

## 详细接口规范

### 1. 获取项目完整任务树结构

* **接口路径**：`GET /api/projects/{id}/task-tree`
* **功能描述**：获取特定项目下的所有任务链 `TaskChain` 及微观任务 `Task` 树状结构。

#### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | 是 | 项目 ID (`project_id`) |

#### 响应 (200 OK)
```json
{
  "project_id": "proj_99812",
  "project_progress": 45.0,
  "chains": [
    {
      "id": "chain_01",
      "project_id": "proj_99812",
      "title": "第一阶段: 基础阅读与大纲梳理",
      "sequence_order": 1,
      "status": "RUNNING",
      "type": "READING_CHAPTER",
      "progress": 50.0,
      "tasks": [
        {
          "id": "task_101",
          "task_chain_id": "chain_01",
          "title": "阅读第一章精读",
          "description": "梳理章节核心理论框架",
          "sequence_order": 1,
          "status": "COMPLETED",
          "parent_task_id": null,
          "depends_on_task_ids": [],
          "attached_note_count": 2,
          "created_at": "2026-07-24T10:00:00Z"
        },
        {
          "id": "task_102",
          "task_chain_id": "chain_01",
          "title": "完成第一章思考练习",
          "description": "解答章节末尾思考题",
          "sequence_order": 2,
          "status": "RUNNING",
          "parent_task_id": null,
          "depends_on_task_ids": ["task_101"],
          "attached_note_count": 0,
          "created_at": "2026-07-24T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

### 2. 项目 Task 列表多条件过滤查询

* **接口路径**：`GET /api/projects/{id}/tasks`
* **功能描述**：根据状态、归属 TaskChain 或关键字等多维条件过滤查询项目下的 Task 列表。

#### Query 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `status` | `string` | 否 | 状态过滤 (`PENDING` / `RUNNING` / `COMPLETED` / `BLOCKED`) |
| `task_chain_id` | `string` | 否 | 过滤特定 TaskChain 下的任务 |
| `search_keyword` | `string` | 否 | 按标题或描述模糊检索 |

#### 响应 (200 OK)
```json
[
  {
    "id": "task_102",
    "task_chain_id": "chain_01",
    "title": "完成第一章思考练习",
    "description": "解答章节末尾思考题",
    "sequence_order": 2,
    "status": "RUNNING",
    "parent_task_id": null,
    "depends_on_task_ids": ["task_101"],
    "attached_note_count": 0,
    "created_at": "2026-07-24T10:00:00Z"
  }
]
```

---

### 3. 创建中观任务链 (`TaskChain`)

* **接口路径**：`POST /api/task-chains`
* **功能描述**：在指定项目下手动或通过 Agent 创建新的中观任务链容器。

#### 请求载荷 (JSON)
```json
{
  "project_id": "proj_99812",
  "title": "第二阶段: 实践项目搭建",
  "type": "PLAN_STAGE",
  "sequence_order": 2
}
```

#### 响应 (201 Created)
```json
{
  "id": "chain_02",
  "project_id": "proj_99812",
  "title": "第二阶段: 实践项目搭建",
  "sequence_order": 2,
  "status": "PENDING",
  "type": "PLAN_STAGE",
  "tasks": [],
  "progress": 0.0
}
```

---

### 4. 创建微观原子任务 (`Task`)

* **接口路径**：`POST /api/tasks`
* **功能描述**：在任务链下创建具体的微观 Task，支持指定前置依赖任务 ID (`depends_on_task_ids`)。

#### 请求载荷 (JSON)
```json
{
  "task_chain_id": "chain_02",
  "title": "初始化代码仓库与环境",
  "description": "使用模板生成脚手架",
  "sequence_order": 1,
  "parent_task_id": null,
  "depends_on_task_ids": ["task_102"],
  "deadline": "2026-07-30T18:00:00Z"
}
```

> [!IMPORTANT]
> 若指定的 `depends_on_task_ids` 前置任务中存在尚未 `COMPLETED` 的任务，新建 Task 的初始状态将被后端自动设置为 `BLOCKED`（锁定）。

#### 响应 (201 Created)
```json
{
  "id": "task_201",
  "task_chain_id": "chain_02",
  "title": "初始化代码仓库与环境",
  "description": "使用模板生成脚手架",
  "sequence_order": 1,
  "status": "BLOCKED",
  "parent_task_id": null,
  "depends_on_task_ids": ["task_102"],
  "attached_note_count": 0,
  "created_at": "2026-07-24T11:00:00Z"
}
```

---

### 5. 更新原子任务状态

* **接口路径**：`PATCH /api/tasks/{id}/status`
* **功能描述**：修改微观 Task 的状态，并在后端原子化触发 DAG 依赖解算与 TaskChain / Project 进度推导重算。

#### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | 是 | 任务 ID (`task_id`) |

#### 请求载荷 (JSON)
```json
{
  "status": "COMPLETED"
}
```

#### 响应 (200 OK)
```json
{
  "task_id": "task_102",
  "status": "COMPLETED",
  "unlocked_task_ids": ["task_201"],
  "chain_progress": 100.0,
  "project_progress": 60.0
}
```

> [!NOTE]
> 当状态更新为 `COMPLETED` 时，响应体将返回被自动解锁解除置灰的后置任务 ID 列表 `unlocked_task_ids`（例如 `task_201` 由 `BLOCKED -> PENDING`）。

---

### 6. 手动触发刷新校准任务链进度

* **接口路径**：`POST /api/task-chains/{id}/recalculate-progress`
* **功能描述**：用于强行校准或显式重算指定任务链及其归属项目的完成百分比进度。

#### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | 是 | 任务链 ID (`task_chain_id`) |

#### 响应 (200 OK)
```json
{
  "task_chain_id": "chain_01",
  "chain_status": "COMPLETED",
  "chain_progress": 100.0,
  "project_progress": 60.0
}
```

---

### 7. 查看 Task 详情卡片挂载的素材笔记列表

* **接口路径**：`GET /api/tasks/{id}/notes`
* **功能描述**：在 Task 卡片详情中展开查看该任务绑定的所有思考感悟与素材笔记卡片列表，支持按来源类型、关键字及标签过滤。

#### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | 是 | 任务 ID (`task_id`) |

#### Query 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `source_type` | `string` | 否 | 按笔记来源过滤 (`USER_THOUGHT` / `EXCERPT` / `AI_SUMMARY`) |
| `search_keyword` | `string` | 否 | 按思考感悟或划词原文模糊检索 |
| `tag` | `string` | 否 | 按场景标签过滤 |

#### 响应 (200 OK)
```json
[
  {
    "id": "note_881",
    "project_id": "proj_99812",
    "task_id": "task_101",
    "source_type": "USER_THOUGHT",
    "original_snippet": "有向无环图在调度系统中起到关键阻断作用",
    "paraphrase": "基于第一性原理，前置依赖不完成则无法推动下步执行",
    "scenario_context": "精读第一章笔记",
    "tags": ["核心思考", "DAG"],
    "created_at": "2026-07-24T10:30:00Z"
  }
]
```

---

### 8. Task 详情直接撰写笔记或绑定已有素材笔记

* **接口路径**：`POST /api/tasks/{id}/notes`
* **功能描述**：在 Task 详情卡片中**直接撰写并记录思考感悟笔记 (场景 A)**，或**关联绑定素材库中已有的笔记 (场景 B)**。

#### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | 是 | 任务 ID (`task_id`) |

#### 请求载荷 (场景 A: 直接撰写记录笔记)
```json
{
  "paraphrase": "学习了 Kahn 拓扑排序算法，可以在冷启动自愈中检测成环",
  "original_snippet": "Kahn algorithm uses in-degree counting.",
  "scenario_context": "Task 详情卡片感悟记录",
  "tags": ["算法", "自愈"]
}
```

#### 请求载荷 (场景 B: 绑定已有素材笔记)
```json
{
  "material_note_id": "note_881"
}
```

#### 响应 (201 Created)
```json
{
  "task_id": "task_101",
  "material_note_id": "note_882",
  "attached_note_count": 3
}
```

---

### 9. 解绑 Task 与素材笔记关联

* **接口路径**：`DELETE /api/tasks/{id}/notes/{note_id}`
* **功能描述**：从 Task 详情卡片中解除特定素材笔记的关联关系。

#### Path 参数
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | 是 | 任务 ID (`task_id`) |
| `note_id` | `string` | 是 | 素材笔记 ID (`material_note_id`) |

#### 响应 (204 No Content)
* 响应头返回 `204 No Content`，无 Response Body。
