# 2.2 文档解析与知识图谱模块 API 规范 (Documents & Graph)

> [!NOTE]
> 本模块定义了文档流式解析进度 SSE 订阅、Graph RAG 增量构建触发以及前端图谱 Quick Peek 无跳跃溯源的接口。

---

## 接口列表

### 1. 订阅文档解析 SSE 进度流

* **接口路径**：`GET /api/projects/{id}/parse-stream`
* **功能描述**：文档上传后，前端请求此接口建立**短生命周期 SSE 连接**。接收解析与切片向量化的实时进度，用于渲染大纲波光骨架屏。完成时后端主动切断连接。

#### SSE 响应流载荷
```text
event: progress
data: { "parsed_chunks": 10, "total_chunks": 100, "status": "PARSING" }

event: progress
data: { "status": "READY", "tree_skeleton": [ ... ] }
```

---

### 2. 触发闲时图谱构建

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

### 3. Quick Peek 跨节点追溯

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
