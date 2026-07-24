# 2.8 统一 Agent 领域与沙箱 API 规范 (Agent Domain)

> [!NOTE]
> 本模块定义了系统内统一 Agent 领域 (`domain/agent`) 的相关 API 规范。
> * **统一 Agent 领域架构**：整合电子书伴读（Companion）、计划 Task 自动拆解与建树（Task Breakdown）、技能沙箱调度（Skill Mounting）以及消息转笔记沉淀等所有 Agent 交互能力。
> * **安全沙箱隔离 (PA-05)**：Agent 在物理受限沙箱 Runner 中运行，无 Shell 执行与外部网络特权。所有流式对话响应均通过 SSE (`text/event-stream`) 协议下发至接入层。
> * **模式扩展**：支持 `READING_COMPANION` (伴读解惑)、`TASK_BREAKDOWN` (Task 自动拆解与建树)、`CHAPTER_SUMMARY` (章节末尾主动引导) 等模式。

---

## 接口列表

| 接口名称 | HTTP Method | 接口路径 | 功能描述 |
| :--- | :--- | :--- | :--- |
| **Agent 流式对话 (SSE)** | `POST` | `/api/v1/agent/chat/stream` | 统一的 Agent 流式对话接口（支持伴读解惑、Task 自动拆解建树与章节 95% 主动推送） |
| **Agent 对话一键转笔记** | `POST` | `/api/v1/agent/message/convert-to-note` | 将特定 Agent 对话消息转化为 MaterialNote，并自动保存物理段落锚点 |
| **获取 Agent 历史对话列表** | `GET` | `/api/v1/agent/sessions/{session_id}/messages` | 拉取当前 Agent 会话的分页历史消息流 |

---

## 详细接口规范

### 1. Agent 流式对话 (SSE)

* **接口路径**：`POST /api/v1/agent/chat/stream`
* **Content-Type**：`application/json`
* **Accept**：`text/event-stream`
* **功能描述**：统一的 Agent 流式对话接口。根据 `mode` 区分业务场景：
  * `mode="READING_COMPANION"`：划词 Discuss 解惑或章节末尾 95% 引导。
  * `mode="TASK_BREAKDOWN"`：计划工作台对话，沟通目标并自动拆解 TaskChain/Task 树。

#### 请求载荷 (`Request Body` - 场景 A: 伴读解惑)
```json
{
  "project_id": "proj_112233",
  "book_id": "bk_88776655",
  "chapter_id": "chap_03",
  "mode": "READING_COMPANION",
  "trigger_type": "DISCUSS",
  "skill_id": "skill_deep_learning",
  "content": "请帮我解读一下这段关于反向传播算法的推理推导",
  "source_anchor": {
    "block_id": "block_102",
    "start_offset": 12,
    "end_offset": 85,
    "selected_text": "在全连接层中，梯度的链式法则展开如下公式..."
  }
}
```

#### 请求载荷 (`Request Body` - 场景 B: Task 自动拆解与建树)
```json
{
  "project_id": "proj_998877",
  "mode": "TASK_BREAKDOWN",
  "skill_id": "skill_rust_learning",
  "content": "我想在 2 周内掌握 Rust 语法并完成一个命令行 CLI 工具"
}
```

#### 响应载荷 (`200 OK` - `text/event-stream`)
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: message
data: {"type": "TOKEN", "content": "已根据 Rust 技能模板为你拆解了 2 个学习阶段与 6 个微观 Task..."}

event: message
data: {"type": "TASK_TREE", "data": {"task_chains": [{"title": "第一阶段：所有权与借用", "tasks": [{"title": "阅读 Rust Book 第 4 章", "deadline_days": 3}]}]}}

event: done
data: {"message_id": "msg_998877", "session_id": "sess_443322", "created_at": "2026-07-23T14:48:00Z"}
```

---

### 2. Agent 对话一键转笔记

* **接口路径**：`POST /api/v1/agent/message/convert-to-note`
* **功能描述**：将指定的 Agent 对话消息转化为 `MaterialNote` 思考笔记，并自动绑定相关的段落 `SourceAnchor`。

#### 请求载荷 (`Request Body`)
```json
{
  "project_id": "proj_112233",
  "message_id": "msg_998877",
  "user_paraphrase": "关于链式法则的解答：梯度传播顺次相乘，深层容易发生爆炸或消失。"
}
```

#### 响应载荷 (`201 Created`)
```json
{
  "code": 201,
  "message": "note converted successfully",
  "data": {
    "note_id": "mnote_665544",
    "project_id": "proj_112233",
    "discuss_message_id": "msg_998877",
    "source_type": "COMPANION_CONVERTED",
    "paraphrase": "关于链式法则的解答：梯度传播顺次相乘，深层容易发生爆炸或消失。",
    "source_anchor_id": "anchor_112233",
    "created_at": "2026-07-23T14:48:20Z"
  }
}
```

---

### 3. 获取 Agent 历史对话列表

* **接口路径**：`GET /api/v1/agent/sessions/{session_id}/messages`
* **查询参数**：
  * `page`: 页码（默认 1）
  * `page_size`: 每页条数（默认 20）

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "msg_998877",
        "sender_type": "AGENT",
        "content": "反向传播算法的核心在于...",
        "trigger_type": "DISCUSS",
        "action_cards": [],
        "created_at": "2026-07-23T14:48:00Z"
      }
    ]
  }
}
```
