# 2.2 计划与任务调度 API 规范 (Project Domain)

> [!NOTE]
> 本模块定义了任务拓扑顺延计算以及原子任务状态流转控制接口，属于项目与任务领域 (`domain/project`)。

---

## 接口列表

### 1. 拓扑重调度计算 (顺延)

* **接口路径**：`POST /api/tasks/reschedule`
* **功能描述**：用户手动或一键顺延逾期任务，后端通过图算法递归推导所有依赖子任务的新截止时间，并开启事务批量落盘。

#### 请求载荷 (JSON)
```json
{
  "task_id": "uuid",
  "postpone_days": 3
}
```

#### 响应 (200 OK)
```json
{
  "rescheduled_count": 5,
  "affected_tasks": [
    { "task_id": "uuid1", "new_deadline": "2026-07-20T10:00:00Z" },
    { "task_id": "uuid2", "new_deadline": "2026-07-22T10:00:00Z" }
  ]
}
```

> [!IMPORTANT]
> **前端联动契约**：收到 `200 OK` 后，前端 React Query 须立即执行 `invalidateQueries()` 无感刷新任务树。

---

### 2. 更新原子任务状态

* **接口路径**：`PATCH /api/tasks/{id}`
* **功能描述**：更新指定任务的操作状态。

#### 请求载荷 (JSON)
```json
{
  "status": "RUNNING"
}
```

#### 响应 (200 OK)
```json
{
  "id": "uuid",
  "status": "RUNNING",
  "unlocked_task_ids": ["uuid_child_1"]
}
```

> [!NOTE]
> 若当前任务标记为 `COMPLETED`，响应体会携带因此次完成而满足了全部前置依赖、被自动解锁的子任务 ID 列表 `unlocked_task_ids`，前端籍此解灰对应卡片。
