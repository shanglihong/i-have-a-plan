# 2.6 技能与沙箱 API 规范 (Skill Domain)

> [!NOTE]
> 本模块定义了技能语义向量检索、Trace-to-Skill 提炼编译、沙箱拓扑环路校验 (PA-03 门禁) 以及技能管理中心 (CRUD) 的核心接口，属于技能与沙箱领域 (`domain/skill`)。
> * **关于语义向量检索**：前端在创建项目弹窗中进行 300ms 防抖控制后触发 `GET /api/skills/search`，后端进行 Dense Vector 匹配并返回 `ACTIVE` 状态候选技能卡片供用户手动挑选。
> * **关于提炼编译异步处理**：`POST /api/skills/compile` 采用纯后台事件驱动解耦模式，提交后立即返回 `202 Accepted`。后台完成 `SKILL.md` 写入沙箱后广播 `SkillCompiledEvent`，由 `Notification Domain` 异步推送消息通知。
> * **关于拓扑死锁阻断与直接覆盖**：`POST /api/skills/{id}/approve` 执行 Kahn 算法校验。检测到闭环返回 RFC 7807 错误驱动前端连线变红抖动；解算通过后将文件移入 `skills/active/` 目录并直接覆盖更新原 Skill 内容。
> * **后端详细设计**：可参考 [技能与沙箱领域后端设计规范](../../10_backend_implementation_plan/skill/skill_backend_design_spec_v1.0.md)。

---

## 接口列表

| 接口名称 | HTTP Method | 接口路径 | 功能描述 |
| :--- | :--- | :--- | :--- |
| **语义向量检索技能** | `GET` | `/api/skills/search` | 响应前端防抖搜索，基于 Dense Vector 密集向量索引匹配 `ACTIVE` 技能供用户挑选 |
| **触发提炼编译 (Trace-to-Skill)** | `POST` | `/api/skills/compile` | 提交多源上下文触发 L1/L2/L3 提炼，返回 202 异步任务，后台落盘后发送消息通知 |
| **批准入库校验 (PA-03 阻断门禁)** | `POST` | `/api/skills/{id}/approve` | 执行 PA-03 拓扑解算防死锁；通过后移入 active 目录并直接覆盖更新原 Skill |
| **获取技能管理列表** | `GET` | `/api/skills` | 按状态 (`ACTIVE` / `SANDBOX` / `MUTATED_DRAFT`) 分页拉取技能管理列表 |
| **获取技能详情 (含拓扑图结构)** | `GET` | `/api/skills/{id}` | 获取单个技能聚合根元数据、步骤树及 `topology_graph` (含 nodes 与 edges) |
| **更新技能/沙箱内容** | `PUT` | `/api/skills/{id}` | 在沙箱编辑器或管理面板修改技能元数据及步骤逻辑，同步更新物理磁盘文件 |
| **删除技能** | `DELETE` | `/api/skills/{id}` | 物理删除 `SKILL.md` 文件，同步擦除 SQLite 记录及向量数据库 Embedding 索引 |

---

## 详细接口规范

### 1. 语义向量检索技能 (挑选推荐)

* **接口路径**：`GET /api/skills/search`
* **Query Parameters**:
  * `query`: `String` (必填) - 检索关键字（由前端防抖 300ms 后发起）。
  * `limit`: `Integer` (可选, 默认 3) - 匹配推荐数量。
* **功能描述**：用于计划项目创建时用户在搜索框中输入的技能挑选推荐，基于 Dense Vector 密集向量索引进行语义模糊计算。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "skill_01",
        "name": "Linux 内核模块分析与调试",
        "description": "提供内核模块诊断、符号抽取与 GDB 调试指导",
        "category": "系统底层",
        "status": "ACTIVE",
        "nodes_count": 14
      }
    ]
  }
}
```

---

### 2. 触发提炼编译 (Trace-to-Skill)

* **接口路径**：`POST /api/skills/compile`
* **功能描述**：发起 L1/L2/L3 任意级别的提炼编译请求。提交后立即返回 202 Accepted 响应契约，后台 Worker 异步抽取文本并驱动 LLM 编译为 `SKILL.md` 写入沙箱，完成后广播 `SkillCompiledEvent` 触发消息通知。

#### 请求载荷 (`JSON`)
```json
{
  "project_id": "proj_112233",
  "scope_type": "SINGLE_NOTE",
  "reference_ids": ["note_id_1", "note_id_2"]
}
```

#### 响应载荷 (`202 Accepted`)
```json
{
  "code": 202,
  "message": "accepted",
  "data": {
    "task_id": "task_async_uuid_001",
    "sandbox_skill_id": "skill_sandbox_uuid_002",
    "status": "PROCESSING",
    "message": "已提交后台异步提炼，提炼完成后将通过系统消息通知提醒您"
  }
}
```

---

### 3. 批准入库校验 (PA-03 阻断门禁)

> [!WARNING]
> 本接口承载沙箱卡片连线的防死锁校验与跨介质原子移库职责。

* **接口路径**：`POST /api/skills/{id}/approve`
* **功能描述**：前端发起批准请求，后端执行严格的拓扑排序解算（Kahn 算法）。若无死锁闭环，物理文件从 `skills/sandbox/` 移至 `skills/active/` 目录，直接覆盖更新原 Skill 内容，状态切换为 `ACTIVE`。

#### 响应载荷 (`200 OK`)
拓扑解算校验通过，返回：
```json
{
  "code": 200,
  "message": "approved",
  "data": {
    "id": "skill_01",
    "status": "ACTIVE",
    "file_path": "skills/active/skill_01.md"
  }
}
```

#### 响应载荷 (`400 Bad Request` - PA-03 阻断门禁)
检测到依赖闭环，阻断入库并返回 RFC 7807 标准错误。`extension_fields.cycle_path` 必填，驱动前端画布连线呈现红色抖动警示与锁定提交按钮。

```json
{
  "type": "https://api.example.com/errors/topology-cycle",
  "title": "Topological Cycle Detected",
  "status": 400,
  "detail": "依赖解析失败，检测到步骤存在闭环循环依赖。",
  "instance": "/api/skills/sandbox-123/approve",
  "extension_fields": {
    "cycle_path": [
      "step_A",
      "step_B",
      "step_A"
    ]
  }
}
```

---

### 4. 获取技能管理列表

* **接口路径**：`GET /api/skills`
* **Query Parameters**:
  * `status`: `String` (可选) - 技能状态过滤（`ACTIVE` / `SANDBOX` / `MUTATED_DRAFT`）。
  * `order_by`: `String` (可选, 默认 `updated_at`) - 排序字段（`updated_at` / `created_at`）。
  * `order`: `String` (可选, 默认 `desc`) - 排序方向（`desc` 倒序 / `asc` 正序）。
  * `page`: `Integer` (可选, 默认 1) - 页码。
  * `limit`: `Integer` (可选, 默认 10) - 每页数量。
* **功能描述**：用于技能管理中心，支持按状态筛选与按更新时间倒序分页查询技能管理列表。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "id": "skill_02",
        "name": "Graph RAG 构图实战指南",
        "description": "针对实体与关系抽取、同义词对齐与证伪连线的方法论模版",
        "status": "ACTIVE",
        "version": "1.1.0",
        "created_at": "2026-07-24T11:30:00Z",
        "updated_at": "2026-07-24T14:30:00Z"
      },
      {
        "id": "skill_01",
        "name": "Linux 内核模块分析与调试",
        "description": "提供内核模块诊断与符号抽取方法论",
        "status": "ACTIVE",
        "version": "1.0.0",
        "created_at": "2026-07-24T10:00:00Z",
        "updated_at": "2026-07-24T14:00:00Z"
      }
    ]
  }
}
```

---

### 5. 获取技能详情 (含步骤树与拓扑死锁检测)

* **接口路径**：`GET /api/skills/{id}`
* **功能描述**：拉取单个技能聚合根元数据及其包含的完整 `SkillStep` 步骤树，并自动执行拓扑解算，组装返回 `has_cycle`（死锁标识）、`cycle_path`（死锁轨迹路径）及 `topology_graph`（`nodes` 与 `edges`），供前端画布渲染节点连线与发光抖动警示。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "skill_01",
    "name": "Linux 内核模块分析与调试",
    "description": "提供内核模块诊断与符号抽取方法论",
    "status": "ACTIVE",
    "version": "1.0.0",
    "file_path": "skills/active/skill_01.md",
    "has_cycle": false,
    "cycle_path": [],
    "steps": [
      {
        "id": "step_1",
        "title": "环境依赖探测",
        "instruction_prompt": "检查内核头文件软链接",
        "depends_on": []
      },
      {
        "id": "step_2",
        "title": "编译与符号抽取",
        "instruction_prompt": "执行 make 构建，提取 readelf 导出符号表",
        "depends_on": ["step_1"]
      }
    ],
    "topology_graph": {
      "nodes": [
        { "id": "step_1", "label": "环境依赖探测", "type": "step_node" },
        { "id": "step_2", "label": "编译与符号抽取", "type": "step_node" }
      ],
      "edges": [
        { "source": "step_1", "target": "step_2", "id": "edge_step_1_step_2" }
      ]
    }
  }
}
```

---

### 6. 更新技能/沙箱内容

* **接口路径**：`PUT /api/skills/{id}`
* **功能描述**：在沙箱卡片编辑器或管理中心修改技能元数据及步骤节点逻辑，同步更新物理磁盘 `SKILL.md` 文件。

#### 请求载荷 (`JSON`)
```json
{
  "name": "Linux 内核模块分析与调试",
  "description": "更新后的方法论简述",
  "steps": [
    {
      "id": "step_1",
      "title": "环境探测",
      "instruction_prompt": "更新后的 Prompt",
      "depends_on": []
    }
  ]
}
```

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "updated",
  "data": {
    "id": "skill_01",
    "name": "Linux 内核模块分析与调试",
    "status": "ACTIVE",
    "updated_at": "2026-07-24T14:30:00Z"
  }
}
```

---

### 7. 删除/废弃技能

* **接口路径**：`DELETE /api/skills/{id}`
* **功能描述**：物理删除沙箱/激活目录下的 `SKILL.md` 文件，同步擦除 SQLite 记录与向量数据库中的 Embedding 索引。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "deleted",
  "data": {
    "id": "skill_01",
    "status": "DELETED"
  }
}
```
