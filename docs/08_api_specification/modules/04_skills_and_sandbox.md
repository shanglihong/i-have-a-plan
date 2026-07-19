# 2.4 技能提炼与沙箱验证模块 API 规范 (Skills & Sandbox)

> [!NOTE]
> 本模块定义了技能向量检索、Trace-to-Skill 提炼编译以及沙箱拓扑环路校验 (PA-03 门禁) 的核心接口。

---

## 接口列表

### 1. 语义检索技能 (防抖检索)

* **接口路径**：`GET /api/skills/search`
* **功能描述**：用于计划项目创建时的技能推荐（走密集向量查询）。
* **请求参数**：`?query=如何写论文&limit=3`
* **响应 (200 OK)**：返回 `status = ACTIVE` 的推荐技能卡片对象数组。

```json
{
  "items": [
    {
      "id": "skill_01",
      "title": "Linux 内核模块分析与调试",
      "category": "系统底层",
      "nodesCount": 14
    }
  ]
}
```

---

### 2. 触发提炼编译 (Trace-to-Skill)

* **接口路径**：`POST /api/skills/compile`
* **功能描述**：发起 L1/L2/L3 任意级别的编译请求。建立短连接 SSE 推送编译状态。

#### 请求载荷 (JSON)
```json
{
  "project_id": "uuid",
  "scope_type": "SINGLE_NOTE",
  "reference_ids": ["note_id_1", "note_id_2"]
}
```

#### SSE 响应流载荷
```text
event: progress
data: { "status": "COMPILING", "detail": "正在推导拓扑依赖..." }

event: progress
data: { "status": "COMPLETED", "sandbox_skill_id": "uuid" }
```

---

### 3. 批准入库校验 (PA-03 阻断门禁)

> [!WARNING]
> 本接口承载沙箱卡片连线的防死锁职责。

* **接口路径**：`POST /api/skills/{id}/approve`
* **功能描述**：前端发起批准请求，后端执行严格的拓扑排序算法。若校验通过，文件从 `sandbox` 物理移动至 `active` 目录。

#### 响应 (200 OK)
校验通过，返回：
```json
{
  "status": "ACTIVE"
}
```

#### 响应 (400 Bad Request)
检测到环路，阻断入库并返回 RFC 7807 标准错误。`extension_fields.cycle_path` 必填，驱动前端画布连线呈现红色抖动警示。

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
