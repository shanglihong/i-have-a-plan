# 2.7 全局搜索模块 API 规范 (Global Search)

> [!NOTE]
> 本模块定义了系统全站全局检索（包含项目、融合笔记、知识图谱节点及技能）的核心 API 契约，供顶部导航栏及快捷检索组件使用。

---

## 接口列表

### 1. 聚合全局搜索

* **接口路径**：`GET /api/search`
* **功能描述**：根据用户输入的关键词，聚合检索全站可访问的项目、融合笔记、知识图谱节点与技能引擎，支持分类筛选。

#### 请求参数 (Query Parameters)

| 参数名 | 类型 | 是否必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | 是 | - | 搜索关键词（如 `"神经网络"`） |
| `category` | `string` | 否 | `all` | 筛选类别：`all` (全部)、`project` (项目)、`note` (融合笔记)、`graph` (知识图谱)、`skill` (技能) |
| `limit` | `number` | 否 | `10` | 返回匹配条数上限 |

#### 响应 (200 OK)

```json
{
  "query": "神经网络",
  "total": 3,
  "results": [
    {
      "id": "proj_1",
      "type": "project",
      "title": "深度学习论文研读项目",
      "snippet": "包含卷积**神经网络**与 Transformer 架构分析...",
      "target_url": "/projects/proj_1",
      "updated_at": "2026-07-18T10:00:00Z"
    },
    {
      "id": "note_01",
      "type": "note",
      "title": "BP 反向传播算法推导笔记",
      "snippet": "多层前馈**神经网络**的梯度下降推导细节...",
      "target_url": "/reading?projectId=proj_1&noteId=note_01",
      "updated_at": "2026-07-19T08:30:00Z"
    },
    {
      "id": "node_502",
      "type": "graph",
      "title": "图神经网络 (GNN)",
      "snippet": "知识图谱节点 - 实体概念",
      "target_url": "/graph?nodeId=node_502",
      "updated_at": "2026-07-17T15:20:00Z"
    }
  ]
}
```
