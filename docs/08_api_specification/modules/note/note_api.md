# 2.4 融合笔记 API 规范 (Note Domain)

> [!NOTE]
> 本模块定义了划词高亮/伴读转化素材笔记 (`MaterialNote`) 以及跨项目素材笔记检索与飞书式 Block 提炼合并与更新 API，属于笔记与知识库领域 (`domain/note`)。
> * **关于流式伴读对话 (Discuss)**：流式伴读问答与 SSE 对话流接口统一由 [Agent 领域 API 规范](../agent/agent_api.md) (`POST /api/v1/agent/chat/stream`) 负责承载。Note 领域仅负责对划词高亮及 Agent 对话回答进行笔记卡片化持久化与管理。
> * **关于更新沉淀笔记**：更新沉淀笔记使用专门的 `PUT /api/notes/synthesize/{id}` 接口，后端接收最新 Block 块数组重新编译并原子覆盖物理沙箱 `.md` 文件。
> * **关于跨项目查询**：获取素材笔记列表使用通用路径 `GET /api/notes/material`，支持跨项目全局拉取，`project_id` 仅作为可选过滤条件。
> * **后端详细设计**：可参考 [笔记领域后端设计规范](../../10_backend_implementation_plan/note/note_backend_design_spec_v1.0.md)。

---

## 接口列表

| 接口名称 | HTTP Method | 接口路径 | 功能描述 |
| :--- | :--- | :--- | :--- |
| **创建素材笔记** | `POST` | `/api/notes/material` | 支持“划词高亮”与“伴读对话转存”生成素材笔记实体并持久化 SourceAnchor |
| **查询素材笔记列表 (支持跨项目)** | `GET` | `/api/notes/material` | 游标分页获取素材笔记列表，支持全局跨项目检索，`project_id` 为可选过滤条件 |
| **提炼创建沉淀笔记 (飞书式 Block)** | `POST` | `/api/notes/synthesize` | 创建类似飞书云文档的自由 Block 块级沉淀笔记，落盘为 Markdown 离线文件 |
| **获取沉淀笔记详情** | `GET` | `/api/notes/synthesize/{id}` | 获取单个沉淀笔记的元数据、解析后的 Block 节点数组与物理 Markdown 内容 |
| **更新沉淀笔记内容 (飞书式 Block)** | `PUT` | `/api/notes/synthesize/{id}` | 更新已有沉淀笔记的标题或 Block 节点结构，原子重命名重新落盘 Markdown 文件 |
| **删除沉淀笔记** | `DELETE` | `/api/notes/synthesize/{id}` | 物理擦除磁盘上的 Markdown 笔记文件并清理数据库元数据与引用关系 |

---

## 详细接口规范

### 1. 创建素材笔记

* **接口路径**：`POST /api/notes/material`
* **功能描述**：支持“划词高亮记笔记”与“对话一键转存笔记”双通道素材卡片持久化。

#### 请求载荷 (`JSON`)
```json
{
  "project_id": "proj_112233",
  "task_id": "task_8899",
  "source_type": "BOOK_BLOCK",
  "raw_quote": "神经网络是一种模仿生物神经网络结构...",
  "user_interpretation": "需要重点关注其权重更新推导",
  "context_reflection": "在我的毕设模型中可以借鉴",
  "source_anchor": {
    "book_id": "bk_88776655",
    "chapter_id": "chap_01",
    "start_offset": 120,
    "end_offset": 300,
    "feature_text": "神经网络是一种模仿..."
  }
}
```

#### 响应载荷 (`201 Created`)
```json
{
  "code": 201,
  "message": "created",
  "data": {
    "id": "mat_note_9918",
    "project_id": "proj_112233",
    "task_id": "task_8899",
    "source_type": "BOOK_BLOCK",
    "raw_quote": "神经网络是一种模仿生物神经网络结构...",
    "user_interpretation": "需要重点关注其权重更新推导",
    "created_at": "2026-07-19T10:00:00Z"
  }
}
```

---

### 2. 查询素材笔记列表 (支持跨项目)

* **接口路径**：`GET /api/notes/material`
* **Query Parameters**:
  * `project_id`: `String` (可选) - 过滤指定项目。省略时表示跨项目全局拉取。
  * `cursor`: `String` (可选) - 分页游标。
  * `limit`: `Integer` (可选, 默认 15) - 每页数量。
  * `keyword`: `String` (可选) - 检索关键字。
* **功能描述**：游标分页获取素材笔记卡片列表。支持全局跨项目检索与项目内过滤。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
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
}
```

---

### 3. 提炼创建沉淀笔记 (飞书式 Block)

* **接口路径**：`POST /api/notes/synthesize`
* **功能描述**：支持类似飞书云文档的自由 Block 块级编排创作，可选择性插入带有快照和软引用的素材笔记卡片 (`MATERIAL_REF`)，最终写盘为 Block-Flavored Markdown 沉淀笔记 (`SynthesizedNote`)。

#### 请求载荷 (`JSON`)
```json
{
  "project_id": "proj_112233",
  "title": "神经网络反向传播算法深度总结",
  "note_type": "GENERAL",
  "blocks": [
    {
      "block_type": "HEADING",
      "content": "反向传播算法推导"
    },
    {
      "block_type": "PARAGRAPH",
      "content": "通过对多源素材笔记的提炼与推导，我们建立了如下核心认知..."
    },
    {
      "block_type": "MATERIAL_REF",
      "material_note_id": "mat_note_9918",
      "quote_snapshot": "神经网络是一种模仿生物神经网络结构...",
      "interpretation_snapshot": "需要重点关注其权重更新推导"
    }
  ],
  "content_markdown": "# 反向传播算法推导\n\n通过对多源素材笔记的提炼..."
}
```

#### 响应载荷 (`201 Created`)
```json
{
  "code": 201,
  "message": "created",
  "data": {
    "id": "syn_note_8811",
    "project_id": "proj_112233",
    "title": "神经网络反向传播算法深度总结",
    "note_type": "GENERAL",
    "file_path": "sandbox/notes/syn_note_8811.md",
    "referenced_material_count": 1,
    "created_at": "2026-07-20T11:00:00Z"
  }
}
```

---

### 4. 获取沉淀笔记详情

* **接口路径**：`GET /api/notes/synthesize/{id}`
* **功能描述**：获取单个沉淀笔记的元数据、反解析后的 Block 节点树以及底层的 Markdown 原文。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "syn_note_8811",
    "project_id": "proj_112233",
    "title": "神经网络反向传播算法深度总结",
    "note_type": "GENERAL",
    "file_path": "sandbox/notes/syn_note_8811.md",
    "blocks": [
      {
        "block_id": "blk_01",
        "block_type": "HEADING",
        "content": "反向传播算法推导"
      },
      {
        "block_id": "blk_02",
        "block_type": "PARAGRAPH",
        "content": "通过对多源素材笔记的提炼与推导，我们建立了如下核心认知..."
      },
      {
        "block_id": "blk_03",
        "block_type": "MATERIAL_REF",
        "material_note_id": "mat_note_9918",
        "quote_snapshot": "神经网络是一种模仿生物神经网络结构...",
        "interpretation_snapshot": "需要重点关注其权重更新推导"
      }
    ],
    "created_at": "2026-07-20T11:00:00Z",
    "updated_at": "2026-07-20T11:00:00Z"
  }
}
```

---

### 5. 更新沉淀笔记内容 (飞书式 Block)

* **接口路径**：`PUT /api/notes/synthesize/{id}`
* **功能描述**：更新已有的沉淀笔记。接收编辑后的 Block 节点数组或最新标题，由后端重新编译并调用原子物理刷盘覆盖 Markdown 文件，更新 SQLite 关系元数据。

#### 请求载荷 (`JSON`)
```json
{
  "title": "神经网络反向传播算法与梯度下降深度总结",
  "blocks": [
    {
      "block_id": "blk_01",
      "block_type": "HEADING",
      "content": "反向传播算法与梯度下降"
    },
    {
      "block_id": "blk_02",
      "block_type": "PARAGRAPH",
      "content": "修改补充：通过链式法则推导梯度向量..."
    },
    {
      "block_id": "blk_03",
      "block_type": "MATERIAL_REF",
      "material_note_id": "mat_note_9918",
      "quote_snapshot": "神经网络是一种模仿生物神经网络结构...",
      "interpretation_snapshot": "需要重点关注其权重更新推导"
    }
  ],
  "content_markdown": "# 反向传播算法与梯度下降\n\n修改补充：通过链式法则推导梯度向量..."
}
```

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "syn_note_8811",
    "project_id": "proj_112233",
    "title": "神经网络反向传播算法与梯度下降深度总结",
    "note_type": "GENERAL",
    "file_path": "sandbox/notes/syn_note_8811.md",
    "updated_at": "2026-07-20T14:20:00Z"
  }
}
```

---

### 6. 删除沉淀笔记

* **接口路径**：`DELETE /api/notes/synthesize/{id}`
* **功能描述**：彻底物理擦除沙箱磁盘上的 `.md` 笔记文件，并清理 SQLite 数据库元数据与素材引用软关系。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "syn_note_8811",
    "deleted": true
  }
}
```
