# 前后端功能边界与通信协议规范 v1.0

> [!IMPORTANT]
> 本文档基于 [《业务模型规范》](../03_business_modeling/business_model.md) 与 [《交互链路与状态规范》](../04_interaction_design/flow_state_spec-v1.0.md) 梳理。
> **三位一体架构契约**：本文档深度对齐了 [《后端核心逻辑架构规范》](./architecture_backend_design_spec_v1.0.md)（六边形架构）与 [《前端核心逻辑架构规范》](./architecture_frontend_design_spec_v1.0.md)（FSD 架构）。它明确定义了系统级的**跨层物理对接边界**、**类型与状态强制同步机制**，以及核心交互流的**端到端穿透路径**，为详细的 API 契约设计 (Step 10) 提供最高指导标准。

## 一、 系统职责物理隔离边界

> [!NOTE]
> 核心原则：前端负责高频交互体验与本地防错，后端作为真理之源 (Source of Truth) 负责最终一致性与隔离管控。

| 边界归属 | 核心职责项 | 约束规则 |
| :--- | :--- | :--- |
| **前端专属 (本地计算)** | **拓扑校验计算 (PA-03)** | 沙箱中的连线环路检测**必须**由前端 `Features` 层在本地运行算法，阻断异常提交。 |
| | **UI 防抖与限流** | 富文本输入、窗口滚动等高频事件，必须由前端完成防抖（如 500ms）后才可派发网络请求。 |
| | **DOM 模糊定位** | Trace-to-Source 的引文容错匹配由前端通过 JS 文本相似度计算在本地 DOM 树中完成，不依赖后端二次检索。 |
| | **本地脱敏处理 (PA-06)** | RAG 检索前对隐私数据进行本地脱敏，物理隔离敏感知识产权。 |
| **后端专属 (持久化管理)** | **数据一致性兜底** | 管理所有实体的最终状态，并在接收到前端指令时进行鉴权与二次校验。 |
| | **特权沙箱隔离 (PA-05)** | 维护伴读 Agent 与监督 Agent 的绝对物理隔离。Agent **严禁**拥有调用网络或执行本地 Shell 命令特权。 |
| | **会话超时守护 (PA-04)** | 24 小时闲置检测与 Redis 状态持久化下线由后台 Daemon 守护进程严格控制。 |
| | **图谱异步构建 (PA-02)** | 仅闲时后台触发 Graph RAG 增量合并，严禁高频同步以免造成 Token 滥用。 |

---

## 二、 架构对接与状态同步契约

为了彻底杜绝前后端“各自为政”导致的 Bug，确立以下系统级对接红线：

### 1. 架构层级的跨越界限 (Architectural Boundary Mapping)
前后端的网络通信不是随意的函数调用，必须严格遵循以下层级对撞：
* **前端发起方约束**：所有的网络请求必须且只能由前端的 **`Entities` 层 (业务实体抽象)** 利用底层的 `Shared/API` 实例发出。禁止页面或 UI 积木直接调用 `fetch` 或 `axios`。
* **后端接收方约束**：所有的请求必须且只能由后端的 **`Driving Adapters` 层 (接入层, FastAPI Router)** 接收，随后立即驱动内部的 `Application Layer` (应用层 / Use Cases)。
* **绝对红线**：前端绝对不允许通过任何手段绕过接入层去直连后端的 SQLite 数据库或 LangChain 引擎。

### 2. 强类型同源契约 (Type Synchronization)
* **真理之源**：后端的 **Domain 层 Pydantic Schema** 是系统中实体的唯一“真理之源”。
* **强约束映射**：前端的 TypeScript Interface 必须 100% 镜像后端的 Pydantic 定义。如果后端规定 `noteId` 是 `uuid`，前端不得将其定义为泛指的 `any`。前后端联调基于此强类型契约。

### 3. 数据状态刷新机制 (Cache Invalidation)
* **前端不篡改原则**：前端除了纯交互状态 (保存在 Zustand) 外，**禁止手动篡改**服务端返回的业务数据（如修改了任务名，前端不可直接 `task.name = newName`）。
* **React Query 协同失效**：当 POST/PUT/DELETE 类的 REST 请求成功收到 `200 OK` 响应后，前端的 React Query 必须立刻执行 `invalidateQueries({ queryKey: [...] })`，将缓存标记为过期，由底层自动发起无感知的后台刷新，以始终保持与后端的绝对一致。

---

## 三、 核心通信协议矩阵

| 业务场景大类 | 通信协议选型 | 前端 `Entities` 层处理机制 | 后端 `Driving Adapters` 处理机制 |
| :--- | :--- | :--- | :--- |
| **状态扭转与数据 CRUD** | **REST API** (HTTP/1.1 or HTTP/2) | 基于 React Query 发起 Promise 异步等待，静默处理缓存失效。 | FastAPI 接收 JSON 载荷，转交应用层执行逻辑，返回 Pydantic 序列化的 JSON。 |
| **AI 伴读与编译流式输出**| **SSE (Server-Sent Events)** | 建立 `EventSource` 监听数据块流，实时驱动 Zustand 状态与打字机渲染。 | FastAPI 返回 `EventSourceResponse`，单向维持长连接，逐块 (Chunk) 推送 LLM 响应流。 |

---

## 四、 核心交互流端到端穿透路径 (End-to-End Flow Spec)

> [!TIP]
> 以下规范定义了核心链路在整个“FSD 前端 ↔ 六边形后端”中的击穿路径与 Payload 数据交换契约。详细 API 字段将在 Step 10 落实。

### 1. 项目双轨初始化流 (Project Initialization Flow)

> **控制权发起方**：前端 `ReadingProjectForm` 或 `PlanProjectForm` 提交触发。

- **阅读项目路径**：
  前端 `Features/Project` -> 提交 `multipart/form-data` (包含文件 Blob 与截止时间) ---> 后端 `Driving Adapters` -> 后端存储并触发后台切片解析 ---> 后端建立 SSE 长连接返回解析进度。
  - **状态扭转**：前端 `OutlineTree` 根据 SSE 进度流渲染波光骨架屏，解析完毕后平滑渲染真实目录树。
- **计划项目路径**：
  前端 `Features/Project` -> 提交 JSON (包含 `deadline` 与 `skillId`) ---> 后端根据 Skill 编排生成任务树。
  - **响应载荷 (Backend -> Frontend)**：返回包含根任务及子依赖的主干骨架任务树数据，驱动前端渐进式渲染。

### 2. 语义技能检索流 (Semantic Skill Search Flow)

> **控制权发起方**：前端 `PlanProjectForm` 输入框防抖触发。

- **系统穿透路径**：
  前端 `Features/SkillSearch` -> `Entities/Skill` (发起 REST GET) ---> 后端 `Driving Adapters` -> 后端调用向量引擎进行语义匹配。
- **输入载荷 (Frontend -> Backend / Payload)**：`{ "query": "string (如'写论文')" }`
- **输出响应 (Backend -> Frontend)**：`[{ "skillId": "string", "name": "string", "description": "string" }]`

### 3. 启发式伴读与对话流 (Heuristic Discuss Flow)

> **控制权发起方**：前端 `FloatingActionMenu` 的 `onDiscuss` 或右侧 `DiscussPanel` 触发。

- **系统穿透路径**：
  前端 `Entities/Discuss` (发起请求) ---> 后端 `Driving Adapters` -> 后端 `Application/ChatUseCase` ---> 流式 SSE 返回 ---> 前端 `MessageBubble`。
- **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  {
    "projectId": "string",
    "query": "string",
    "contextAnchor": "object (可选的划词上下文)"
  }
  ```
- **状态扭转契约**：前端通过 SSE 接收 Chunk 推送，驱动 `MessageBubble` 的打字机动效。

### 4. 划词写笔记与一键转存流

> **控制权发起方**：前端主导，由 `FloatingActionMenu` (`onHighlightAndNote`) 或 `MessageBubble` (`onSaveAsNote`) 触发。

- **系统穿透路径**：
  前端 `Features/Reading` -> 前端 `Entities/Note` (发起 REST POST) ---> 后端 `Driving Adapters` -> 后端 `Application Layer` -> 后端 `Infrastructure/SQLite` 落盘。
- **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  {
    "projectId": "string",
    "content": "string (富文本内容)",
    "sourceAnchor": {
      "pageOrChapterId": "string",
      "startOffset": "number",
      "endOffset": "number",
      "featureText": "string (用于容错的首尾特征字符)"
    }
  }
  ```
- **输出响应 (Backend -> Frontend)**：`{ "noteId": "string", "status": "SAVED" }`

### 5. Trace-to-Skill 提炼编译流

> **控制权发起方**：前端发起指令（微观单点源于 `FloatingActionMenu.onExtractSkill`，宏观源于项目视图一键触发）。

- **系统穿透路径**：
  前端 `Features/Skill` -> 前端 `Entities/Skill` (建立 SSE 监听) ---> 后端 `Driving Adapters` -> 后端 `Application/TraceToSkillUseCase` (驱动大模型) ---> 流式 SSE 返回 ---> 前端 `Entities/Skill` (逐帧存入 Zustand)。
- **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  {
    "projectId": "string",
    "scopeType": "enum (SINGLE_NOTE | CHAPTER | FULL_PROJECT)",
    "referenceId": "string (可选的 noteId 或 chapterId)"
  }
  ```
- **状态扭转契约**：前端通过 SSE 驱动编译进度条渲染；编译完成后收到终止符，前端浮窗提示成功，后端将生成的 Markdown 文件锁定在沙箱隔离区。

### 6. 半自动重调度计算流 (顺延)

> **控制权发起方**：前端拖拽或点击顺延触发。

- **系统穿透路径**：
  前端 `Features/Plan` (初筛，拦截环路) -> 前端 `Entities/Task` (发起 REST) ---> 后端 `Application Layer` -> 后端 `Domain/Project` (重调度图算法计算) -> 批量事务落盘。
- **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  {
    "taskId": "string (逾期任务ID)",
    "postponeDays": "number (顺延天数)"
  }
  ```
- **状态扭转契约**：前端 React Query 发起 `invalidateQueries` 使任务树缓存失效，重新拉取最新数据。受影响卡片的状态从 `BLOCKED` 恢复为 `RUNNING`。

### 7. 融合笔记懒加载供给流

> **控制权发起方**：前端滚动行为触发 (Infinite Scroll)。

- **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  { "projectId": "string", "cursor": "string", "limit": "number" }
  ```
- **输出响应 (Backend -> Frontend)**：返回一个异构数组（混合主观笔记与 Agent 对话），但基于 Pydantic 规范化为统一的 `UnifiedNoteCard` 结构。

### 8. 归档与经验沉淀流 (Experience & Mutation Flow)

> **控制权发起方**：前端用户点击归档并提交实战复盘。

- **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  { 
    "projectId": "string", 
    "experienceContent": "string"
  }
  ```
- **输出响应 (Backend -> Frontend)**：`{ "status": "ARCHIVED", "hasMutation": "boolean" }`
- **状态扭转契约**：后端触发后台 EventBus 开启闲时图谱构建（**PA-02**）；若经验指出旧 Skill 缺陷，后端静默在 Sandbox 派生修正草稿；前端接收到响应后，所有 `Features` 组件深度置灰，进入强只读模式。

### 9. 全局图谱漫游追溯流 (Quick Peek Flow)

> **控制权发起方**：前端无脑请求，捍卫心流。

- **输入载荷 (Frontend -> Backend / Payload)**：`{ "nodeId": "string" }`
- **输出响应 (Backend -> Frontend)**：
  ```json
  { 
    "type": "enum (READING_NOTE | EXPERIENCE_NOTE)", 
    "content": "string", 
    "sourceAnchor": "object" 
  }
  ```
- **状态扭转契约 (PA-07)**：后端查询 SQLite 元数据与全文索引。前端**绝不触发全屏跳转**，仅在当前画布上方呼出 Quick Peek 居中毛玻璃浮窗。
