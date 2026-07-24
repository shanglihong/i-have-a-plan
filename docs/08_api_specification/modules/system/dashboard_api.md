# 2.8 大盘工作台与汇总统计 API 规范 (System Domain)

> [!NOTE]
> 本模块定义了工作台 4 大统计指标汇总、大盘精选金句笔记以及活跃技能引擎动态的接口，属于系统工作台与聚合服务 (`System Domain / Aggregation`)。

---

## 接口列表

### 1. 获取工作台关键指标汇总

* **接口路径**：`GET /api/dashboard/stats`
* **功能描述**：获取当前工作台 4 大核心指标数据（进行中项目、累计笔记、已提炼技能、图谱节点）及其同比/环比微标信息。

#### 响应 (200 OK)
```json
{
  "active_projects": {
    "total_count": 4,
    "weekly_added_count": 2,
    "in_progress_milestones_count": 2
  },
  "total_notes": {
    "total_count": 119,
    "intensive_read_count": 12,
    "anchored_slices_count": 380
  },
  "extracted_skills": {
    "total_count": 8,
    "sandbox_synced_count": 3,
    "associated_nodes_count": 5
  },
  "graph_nodes": {
    "total_count": 236,
    "dependency_attention_count": 1,
    "falsified_nodes_count": 4
  }
}
```

---

### 2. 获取已激活技能引擎列表 (Skill Domain)

* **接口路径**：`GET /api/skills?status=ACTIVE&order_by=updated_at&order=desc`
* **功能描述**：获取当前系统中已处于激活应用状态 (`status=ACTIVE`) 的技能引擎列表，支持按更新时间倒序排列（默认 `order_by=updated_at&order=desc`），用于工作台快捷入口、侧边栏展示与项目装载。

#### 响应 (200 OK)
```json
{
  "items": [
    {
      "id": "skill_02",
      "name": "Graph RAG 构图实战指南",
      "description": "针对实体与关系抽取、同义词对齐与证伪连线的方法论模版",
      "version": "1.1.0",
      "status": "ACTIVE",
      "source_type": "BOOK_FULL",
      "updatedAt": "2026-07-24T12:00:00Z",
      "createdAt": "2026-07-24T11:30:00Z"
    },
    {
      "id": "skill_01",
      "name": "深度学习论文复盘方法论",
      "description": "基于 L2/L3 级三段式方法论编译的 Skill 模块",
      "version": "1.0.0",
      "status": "ACTIVE",
      "source_type": "CHAPTER",
      "updatedAt": "2026-07-24T10:30:00Z",
      "createdAt": "2026-07-24T10:00:00Z"
    }
  ]
}
```

---

### 3. 获取最新笔记

* **接口路径**：`GET /api/notes/material`
* **功能描述**：获取当前系统中的最新笔记列表，用于工作台快捷入口与状态联动。

#### 响应 (200 OK)
```json
{
  "items": [
      {
        "id": "mat_note_9918",
        "project_id": "proj_112233",
        "project_name": "深度学习应用实践",
        "task_id": "task_8899",
        "source_type": "BOOK_BLOCK",
        "raw_quote": "神经网络是一种模仿生物神经网络结构...",
        "user_interpretation": "需要重点关注其权重更新推导",
        "anchor_summary": "P.42 (Ch.01)",
        "created_at": "2026-07-19T10:00:00Z"
      }
    ],
    "next_cursor": "eyJpZCI6Im1hdF9ub3RlXzk5MTgiLCJ0cyI6MTc4NDQ2NDgwMH0=",
    "has_next": false
}
```
