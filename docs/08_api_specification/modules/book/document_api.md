# 2.3 书籍与物理锚点 API 规范 (Book Domain)

> [!NOTE]
> 本模块定义了书籍描述元数据获取、目录大纲树查询以及章节 ContentBlock 正文懒加载 API，属于书籍与物理锚点领域 (`domain/book`)。
> * **关于书籍解析**：当用户创建 `READING` 模式项目 (`POST /api/projects`) 时，接入层将上传文件落盘至沙箱，并向事件总线广播 `BookParseRequestedEvent(project_id, file_name, file_path)` 内部事件，由 Book 领域异步监听完成策略解析。
> * **关于物理原文锚点解算 (SourceAnchor)**：阅读器场景下的视觉高亮与三层容错重锚定在前端载入章节 ContentBlock 时由前端 JS 内存实时解算完成（无需发 HTTP 请求，保证 0 延时与 DOM 精准高亮）；后端仅提供 SourceAnchor 的持久化存储与 Agent 侧内部解算服务。
> * **关于章节已读打卡**：电子书的每个章节在底层对应关联一个 `Task` 任务。标记章节已读通过 Task 模块接口 `PATCH /api/tasks/{task_id}` 提交 `{"status": "COMPLETED"}`，系统自动更新总阅读进度大盘。

---

## 接口列表

| 接口名称 | HTTP Method | 接口路径 | 功能描述 |
| :--- | :--- | :--- | :--- |
| **获取书籍元数据** | `GET` | `/api/books/{book_id}` | 获取书籍基本元数据、格式、解析状态及审计统计 |
| **获取书籍目录大纲树** | `GET` | `/api/books/{book_id}/toc` | 获取抹平格式差异的通用 `parsed_structure` 递归目录树索引 |
| **获取章节 ContentBlock 正文切片** | `GET` | `/api/books/{book_id}/chapters/{chapter_id}` | 懒加载特定章节正文中的原子 ContentBlock 切片数组（支持分页/块过滤） |

---

## 详细接口规范

### 1. 获取书籍元数据

* **接口路径**：`GET /api/books/{book_id}`
* **功能描述**：查询指定书籍的描述信息、物理沙箱存储路径与全生命周期解析状态。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "bk_88776655",
    "project_id": "proj_112233",
    "file_name": "Deep_Learning_Spec.pdf",
    "file_type": "PDF",
    "file_size": 15482091,
    "parsing_status": "COMPLETED",
    "total_chapters": 12,
    "total_word_count": 85400,
    "storage_path": "sandbox/books/bk_88776655/raw.pdf",
    "content_json_path": "sandbox/books/bk_88776655/parsed_content.json",
    "error_message": null,
    "created_at": "2026-07-23T14:00:00Z",
    "updated_at": "2026-07-23T14:02:15Z"
  }
}
```

---

### 2. 获取书籍目录大纲树

* **接口路径**：`GET /api/books/{book_id}/toc`
* **功能描述**：获取从数据库中读取的轻量级通用 `parsed_structure` 目录树。由后端统一抹平 EPUB NCX/NAV 与 PDF Outline 差异，用于前端侧边栏或大纲树导航渲染。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "book_id": "bk_88776655",
    "toc_tree": [
      {
        "id": "toc_chap_01",
        "title": "第一章 深度学习基础",
        "level": 1,
        "target_chapter_id": "chap_01",
        "target_block_id": "b_01_001",
        "target_page": 1,
        "children": [
          {
            "id": "toc_chap_01_01",
            "title": "1.1 神经网络导论",
            "level": 2,
            "target_chapter_id": "chap_01",
            "target_block_id": "b_01_010",
            "target_page": 3,
            "children": []
          }
        ]
      }
    ]
  }
}
```

---

### 3. 获取章节 ContentBlock 正文切片

* **接口路径**：`GET /api/books/{book_id}/chapters/{chapter_id}`
* **Query Parameters**:
  * `offset`: `Integer` (可选, 默认 0) - 切片起始索引
  * `limit`: `Integer` (可选, 默认 50) - 每次返回的最大 Block 数量
* **功能描述**：根据 `chapter_id` 从沙箱 `parsed_content.json` 中懒加载（Lazy-load）指定章节的正文原子切片 (`ContentBlock`) 数组。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "book_id": "bk_88776655",
    "chapter_id": "chap_01",
    "chapter_index": 0,
    "total_blocks": 45,
    "has_more": false,
    "prev_chapter_id": null,
    "next_chapter_id": "chap_02",
    "blocks": [
      {
        "block_id": "b_01_001",
        "block_type": "HEADING",
        "sequence_index": 0,
        "text": "第一章 深度学习基础",
        "html_or_markdown": "# 第一章 深度学习基础",
        "page_number": 1,
        "bbox": [100.0, 200.0, 400.0, 50.0]
      },
      {
        "block_id": "b_01_002",
        "block_type": "PARAGRAPH",
        "sequence_index": 1,
        "text": "神经网络是一种模仿生物神经网络结构与功能的计算模型...",
        "html_or_markdown": "<p>神经网络是一种模仿生物神经网络结构与功能的计算模型...</p>",
        "page_number": 1,
        "bbox": [100.0, 260.0, 400.0, 120.0]
      }
    ]
  }
}
```
