# 2.3 文档解析与切片 API 规范 (Book Domain)

> [!NOTE]
> 本模块定义了文档流式解析进度 SSE 订阅接口，用于驱动物理大纲树生成与波光骨架屏呈现，属于书籍与物理锚点领域 (`domain/book`)。

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
