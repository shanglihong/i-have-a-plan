# 2.7 旁路图谱与 Quick Peek API 规范 (Graph Domain)

> [!NOTE]
> 本模块定义了 Graph RAG 闲时构建触发以及全屏图谱视图下无跳跃追溯 Quick Peek 的接口，属于旁路图谱与向量领域 (`domain/graph`)。

---

## 接口列表

### 1. 触发闲时图谱构建

* **接口路径**：`POST /api/graph/sync`
* **功能描述**：遵循 PA-02 契约，手动或闲时触发 Graph RAG 的增量合并。
* **请求体**：`{ "project_id": "string" }`
* **响应 (202 Accepted)**：返回后台任务队列 `task_id`。

```json
{
  "task_id": "task_sync_991823"
}
```

---

### 2. Quick Peek 跨节点追溯

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
