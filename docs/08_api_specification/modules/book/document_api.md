# 2.3 书籍与物理锚点 API 规范 (Book Domain)

> [!NOTE]
> 本模块定义了书籍描述元数据获取、目录大纲树查询以及章节 ContentBlock 正文懒加载 API，属于书籍与物理锚点领域 (`domain/book`)。
>
> - **关于书籍解析**：当用户创建 `READING` 模式项目 (`POST /api/projects`) 时，接入层将上传文件落盘至沙箱，并向事件总线广播 `BookParseRequestedEvent(book_id, project_id, file_name, file_path)` 内部事件，由 `BookParsingEngineService` 异步监听完成策略解析。
> - **关于物理原文锚点解算 (SourceAnchor)**：阅读器场景下的视觉高亮与三层容错重锚定在前端载入章节 ContentBlock 时由前端 JS 内存实时解算完成（无需发 HTTP 请求，保证 0 延时与 DOM 精准高亮）；后端仅提供 SourceAnchor 的持久化存储与 Agent 侧内部解算服务。
> - **关于章节已读打卡**：电子书的每个章节在底层对应关联一个 `Task` 任务。标记章节已读通过 Task 模块接口 `PATCH /api/tasks/{task_id}` 提交 `{"status": "COMPLETED"}`，系统自动更新总阅读进度大盘。

---

## 接口列表

| 接口名称 | HTTP Method | 接口路径 | 功能描述 |
| :--- | :--- | :--- | :--- |
| **获取书籍元数据** | `GET` | `/api/books/{book_id}` | 获取书籍基本元数据、格式、解析状态及审计统计 |
| **获取书籍目录大纲树** | `GET` | `/api/books/{book_id}/toc` | 获取抹平格式差异的通用 `parsed_structure` 递归目录树索引 |
| **获取章节 ContentBlock 正文切片** | `GET` | `/api/books/{book_id}/chapters/{chapter_id}` | 懒加载特定章节正文中的原子 ContentBlock 切片数组（支持分页） |

---

## 公共错误响应规范

所有接口错误响应遵循 RFC 7807 Problem Details 格式：

```json
{
  "type": "book-not-found",
  "title": "Book Not Found",
  "status": 404,
  "detail": "未找到图书: bk_88776655",
  "instance": "/api/books/bk_88776655",
  "error_code": "BOOK_NOT_FOUND"
}
```

### 错误码速查表

| HTTP 状态码 | `error_code` | 异常类 | 触发场景 |
| :--- | :--- | :--- | :--- |
| `404 Not Found` | `BOOK_NOT_FOUND` | `BookNotFoundException` | 查询不存在的 `book_id` |
| `404 Not Found` | `CHAPTER_NOT_FOUND` | `ChapterNotFoundException` | 查询不存在的 `chapter_id` |
| `400 Bad Request` | `UNSUPPORTED_BOOK_FORMAT` | `UnsupportedBookFormatException` | 上传非 `.pdf/.epub/.txt/.md` 格式文件 |
| `409 Conflict` | `INVALID_STATE_TRANSITION` | `InvalidStateTransitionException` | 触发非法解析状态机转换 |
| `422 Unprocessable Entity` | `BOOK_PARSING_FAILED` | `BookParsingFailedException` | 解析引擎遇到损坏结构或加密文件，或章节内容读取时书籍尚未解析完成 |

---

## 详细接口规范

### 1. 获取书籍元数据

- **接口路径**：`GET /api/books/{book_id}`
- **功能描述**：查询指定书籍的描述信息、物理沙箱存储路径与全生命周期解析状态。

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `book_id` | `string` | 是 | 书籍唯一标识，格式为 `bk_` 前缀 + 8 位 hex |

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
    "created_at": "2026-07-23T14:00:00Z",
    "updated_at": "2026-07-23T14:02:15Z"
  }
}
```

#### 字段说明

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | `string` | 书籍唯一 ID |
| `project_id` | `string` | 关联的项目 ID |
| `file_name` | `string` | 原始上传文件名 |
| `file_type` | `string` | 文件格式，枚举值：`PDF` / `EPUB` / `TXT` / `MD` |
| `file_size` | `integer` | 文件字节大小 |
| `parsing_status` | `string` | 解析状态，枚举值见下表 |
| `total_chapters` | `integer` | 解析完成后的总章节数，解析中为 `0` |
| `total_word_count` | `integer` | 全书总字数，解析中为 `0` |
| `storage_path` | `string` | 原书物理沙箱路径 |
| `content_json_path` | `string` | 解析切片 JSON 文件路径，解析完成前为空字符串 |
| `created_at` | `string` | 创建时间，ISO 8601 格式 |
| `updated_at` | `string` | 最后更新时间，ISO 8601 格式 |

#### `parsing_status` 枚举值

| 枚举值 | 说明 |
| :--- | :--- |
| `PENDING` | 待处理，书籍记录已创建，等待触发解析 |
| `UPLOADING` | 文件上传中 |
| `PARSING` | 解析引擎异步解析进行中 |
| `COMPLETED` | 解析完成，`parsed_structure` 与 `parsed_content.json` 均已落盘 |
| `FAILED` | 解析失败，原因见日志或沙箱自愈校验结果 |

#### 错误响应

| 状态码 | `error_code` | 说明 |
| :--- | :--- | :--- |
| `404` | `BOOK_NOT_FOUND` | 指定 `book_id` 不存在 |

---

### 2. 获取书籍目录大纲树

- **接口路径**：`GET /api/books/{book_id}/toc`
- **功能描述**：获取从数据库中读取的轻量级通用 `parsed_structure` 目录树。由后端统一抹平 EPUB NCX/NAV 与 PDF Outline 差异，用于前端侧边栏或大纲树导航渲染。

> [!NOTE]
> 目录树存储于数据库 `books.parsed_structure` 字段（JSON 序列化），不涉及磁盘 IO，响应速度快。`parsed_structure` 为空列表时，表示书籍尚未解析完成。

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `book_id` | `string` | 是 | 书籍唯一标识 |

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

#### `TocNode` 节点字段说明

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `string` | 是 | 目录节点唯一 ID |
| `title` | `string` | 是 | 章节标题文本 |
| `level` | `integer` | 是 | 目录层级深度，从 `1` 起始 |
| `target_chapter_id` | `string` | 是 | 指向的章节 ID，用于懒加载章节内容 |
| `target_block_id` | `string` | 否 | 目标章节内的首个 ContentBlock ID，可用于精确滚动定位 |
| `target_page` | `integer` | 否 | PDF 场景下的目标页码，EPUB/TXT/MD 场景下为 `null` |
| `children` | `array` | 是 | 子节点数组，无子节点时为空数组 `[]` |

#### 错误响应

| 状态码 | `error_code` | 说明 |
| :--- | :--- | :--- |
| `404` | `BOOK_NOT_FOUND` | 指定 `book_id` 不存在 |

---

### 3. 获取章节 ContentBlock 正文切片

- **接口路径**：`GET /api/books/{book_id}/chapters/{chapter_id}`
- **功能描述**：根据 `chapter_id` 从沙箱 `parsed_content.json` 中懒加载（Lazy-load）指定章节的正文原子切片 (`ContentBlock`) 数组。支持 `offset` / `limit` 分页控制，服务层优先命中 LRU 内存缓存以减少磁盘 IO。

> [!IMPORTANT]
> 此接口要求书籍 `parsing_status` 必须为 `COMPLETED`。若状态为其他值，将返回 `422 BOOK_PARSING_FAILED` 错误。

#### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `book_id` | `string` | 是 | 书籍唯一标识 |
| `chapter_id` | `string` | 是 | 章节唯一标识，来源于 `TocNode.target_chapter_id` |

#### Query 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `offset` | `integer` | 否 | `0` | ContentBlock 切片起始索引（基于 0） |
| `limit` | `integer` | 否 | `50` | 单次返回最大 Block 数量 |

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

#### 响应体顶层字段说明

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `book_id` | `string` | 书籍 ID |
| `chapter_id` | `string` | 当前章节 ID |
| `chapter_index` | `integer` | 当前章节在全书中的顺序索引（基于 0） |
| `total_blocks` | `integer` | 该章节的 ContentBlock 总数 |
| `has_more` | `boolean` | 当前 `offset + limit` 是否仍有更多 Block |
| `prev_chapter_id` | `string / null` | 前一章节 ID，当前为第一章时为 `null` |
| `next_chapter_id` | `string / null` | 后一章节 ID，当前为最后一章时为 `null` |
| `blocks` | `array` | ContentBlock 切片数组 |

#### `ContentBlock` 字段说明

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `block_id` | `string` | 是 | 全书唯一 Block ID，格式通常为 `b_{chapter}_{seq}` |
| `block_type` | `string` | 是 | 块类型枚举值，见下表 |
| `sequence_index` | `integer` | 是 | Block 在章节内的顺序编号，从 `0` 起始 |
| `text` | `string` | 是 | 纯文本内容，用于锚点解算与全文检索 |
| `html_or_markdown` | `string / null` | 否 | 富文本表示；EPUB 为 HTML，Markdown/TXT 为 Markdown，PDF 为 `null` |
| `page_number` | `integer / null` | 否 | 所在页码，仅 PDF 格式有效，其他格式为 `null` |
| `bbox` | `array / null` | 否 | PDF 页面内坐标边界框 `[x, y, width, height]`，仅 PDF 有效，其他格式为 `null` |

#### `block_type` 枚举值

| 枚举值 | 说明 |
| :--- | :--- |
| `HEADING` | 标题块，对应 HTML `<h1>`-`<h6>` 或 Markdown `#` 语法 |
| `PARAGRAPH` | 普通正文段落 |
| `CODE` | 代码块 |
| `QUOTE` | 引用块 |
| `IMAGE` | 图片块，`text` 字段为图片 alt 描述 |
| `TABLE` | 表格块，`text` 字段为纯文本表格内容 |

#### 错误响应

| 状态码 | `error_code` | 说明 |
| :--- | :--- | :--- |
| `404` | `BOOK_NOT_FOUND` | 指定 `book_id` 不存在 |
| `404` | `CHAPTER_NOT_FOUND` | 指定 `chapter_id` 在解析内容中不存在 |
| `422` | `BOOK_PARSING_FAILED` | 书籍尚未解析完成（`parsing_status != COMPLETED`） |
