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
    "value": 4,
    "badge": "本周 +2",
    "desc": "2 个关键里程碑推进中"
  },
  "total_notes": {
    "value": 119,
    "badge": "精读 12 篇",
    "desc": "已锚定 380+ 选区切片"
  },
  "extracted_skills": {
    "value": 8,
    "badge": "已同步沙箱",
    "desc": "关联 5 个核心领域节点"
  },
  "graph_nodes": {
    "value": 236,
    "badge": "1 依赖关注",
    "desc": "图谱依赖关系拓扑已更新"
  }
}
```

---

### 2. 获取大盘精选金句笔记

* **接口路径**：`GET /api/notes/featured`
* **功能描述**：获取全局最新的精选提炼笔记与高亮金句切片列表，用于工作台侧边栏知识洞察展示。

#### 响应 (200 OK)
```json
{
  "items": [
    {
      "id": "note_01",
      "quote": "梯度消失的根源在于 Sigmoid 导数区间在 (0, 0.25)，多层连乘后指数衰减。",
      "anchor": "深度学习基础 P.42",
      "createdAt": "10分钟前",
      "projectId": "proj_1"
    },
    {
      "id": "note_02",
      "quote": "Graph RAG 通过将文本切片构建为实体-关系图谱，利用拓扑社区发现算法提升复杂推理召回率。",
      "anchor": "Graph RAG 论文精读 Chapter 3",
      "createdAt": "1小时前",
      "projectId": "proj_2"
    }
  ]
}
```

---

### 3. 获取活跃技能引擎列表

* **接口路径**：`GET /api/skills/active`
* **功能描述**：获取当前系统处于部署状态或沙箱演进中的技能引擎列表，用于工作台快捷入口与状态联动。

#### 响应 (200 OK)
```json
{
  "items": [
    {
      "id": "skill_01",
      "title": "Graph RAG 知识检索系统架构",
      "nodesCount": 9,
      "status": "DEPLOYED",
      "sandboxUrl": "/skills/sandbox/skill-1"
    },
    {
      "id": "skill_02",
      "title": "Linux 内核模块调试 Skill",
      "nodesCount": 14,
      "status": "IN_PROGRESS",
      "graphUrl": "/graph"
    }
  ]
}
```
