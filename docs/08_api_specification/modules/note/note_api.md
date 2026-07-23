# 2.4 伴读对话与融合笔记 API 规范 (Note Domain)

> [!NOTE]
> 本模块定义了 AI 伴读流式对话 (Discuss) 以及“划词高亮/对话转存”两通道融合笔记管理接口，属于笔记与知识库领域 (`domain/note`)。

---

## 接口列表

### 1. 提交流式伴读对话 (Discuss)

* **接口路径**：`POST /api/discuss`
* **功能描述**：提交用户提问，建立**按需短连接 SSE** 推送大模型回复流。回答结束后连接释放。

#### 请求载荷 (JSON)
```json
{
  "project_id": "uuid",
  "query": "用户的输入问题",
  "context_anchor": {
    "page_or_chapter_id": "string",
    "feature_text": "可选的高亮截取上下文"
  }
}
```

#### SSE 响应流载荷
```text
event: chunk
data: { "text": "大模型回复的片段...", "is_done": false }

event: chunk
data: { "text": "", "is_done": true, "task_recommendation": { "title": "推荐的落地任务" } }
```

---

### 2. 创建融合笔记

* **接口路径**：`POST /api/notes`
* **功能描述**：支持“划词高亮记笔记”与“对话一键转存笔记”双通道实体保存。

#### 请求载荷 (JSON)
```json
{
  "project_id": "uuid",
  "content": "富文本/Markdown内容",
  "source_anchor": {
    "page_or_chapter_id": "string",
    "start_offset": 120,
    "end_offset": 300,
    "feature_text": "首尾容错特征字符"
  }
}
```

#### 响应 (201 Created)
```json
{
  "id": "note_uuid_9918",
  "status": "CREATED",
  "created_at": "2026-07-19T10:00:00Z"
}
```

---

### 3. 获取融合笔记列表 (读思流加载)

* **接口路径**：`GET /api/projects/{id}/notes`
* **功能描述**：用于右侧读思面板的瀑布流数据拉取，强制使用 Cursor 分页。
* **请求参数**：`?cursor=xxx&limit=15`
* **响应 (200 OK)**

```json
{
  "items": [
    {
      "id": "note_01",
      "content": "笔记富文本内容...",
      "createdAt": "10分钟前",
      "anchor": "P.42"
    }
  ],
  "next_cursor": "base64_encoded_string_or_null",
  "has_next": false
}
```
