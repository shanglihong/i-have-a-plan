# 前后端功能边界与通信协议规范 v1.0

> [!IMPORTANT]
> 本文档基于 [《业务模型规范》](../03_business_modeling/business_model.md) 与 [《交互链路与状态规范》](../04_interaction_design/flow_state_spec-v1.0.md) 梳理，定义了前端系统与后端混合服务之间的职责边界。
> **架构契约**：本文档采用高度结构化的格式，明确定义各个核心业务流的**控制权发起方、核心数据载荷 (Payload) 以及状态扭转规则**，为下一阶段详细的 API 协议设计 (Step 10) 提供不可违背的指导标准。

## 一、 系统职责物理隔离边界

### 1. 前端专属职责 (本地计算与管控)
- **拓扑校验计算**：沙箱中的连线环路检测**必须**由前端在本地运行算法，阻断异常提交。
- **UI 防抖与限流**：富文本输入、窗口滚动等高频事件，必须由前端完成防抖（如 500ms）后才可派发网络请求。
- **DOM 模糊定位**：Trace-to-Source 的引文容错匹配由前端通过 JS 文本相似度计算在本地 DOM 树中完成，不依赖后端二次检索。

### 2. 后端专属职责 (持久化与会话管理)
- **数据一致性兜底**：管理所有实体的最终状态，并在接收到前端指令时进行鉴权与二次校验。
- **Agent 沙箱隔离管控**：维护大模型进程的物理安全与隔离。
- **会话超时守护**：24小时闲置检测与 Redis 持久化下线由后台 Daemon 守护进程严格控制。

---

## 二、 核心通信协议矩阵

| 业务场景大类 | 通信协议选型 | 前端核心处理机制 | 后端核心处理机制 |
| :--- | :--- | :--- | :--- |
| **状态扭转与数据 CRUD** | **REST API** (HTTP/1.1 or HTTP/2) | Promise 异步等待，处理 `20x` 与 `40x` 状态码。 | 接收 JSON 载荷，执行业务逻辑，返回标准 JSON 结构。 |
| **AI 伴读与编译流式输出**| **SSE (Server-Sent Events)** | 建立 `EventSource`，监听数据块流，实时驱动打字机渲染。 | 维持单向流连接，逐块 (Chunk) 推送 LLM 响应，结束时推送终止符。 |

---

## 三、 核心交互流 I/O 结构化定义 (Flow I/O Spec)

以下规范定义了核心链路的前后端数据交换契约，详细字段类型将在 Step 10 落实。

### 1. 划词写笔记与一键转存流
* **控制权发起方**：前端主导，防抖后发送。
* **输入载荷 (Frontend -> Backend / Payload)**：
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
* **输出响应 (Backend -> Frontend)**：
  ```json
  { "noteId": "string", "status": "SAVED", "timestamp": "number" }
  ```
* **状态扭转契约**：后端将内容落盘；前端收到 `noteId` 后将临时卡片转为已持久化状态，解除保存中 Loading。

### 2. Trace-to-Skill 提炼编译流
* **控制权发起方**：前端发起指令，后端接管处理并流式回调。
* **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  {
    "projectId": "string",
    "scopeType": "enum (CHAPTER / FULL_PROJECT)",
    "targetChapterId": "string (仅在 scopeType 为 CHAPTER 时需要)"
  }
  ```
* **输出响应 (Backend -> Frontend / SSE Stream)**：
  * **流式数据块**：包含编译进度的百分比及当前正在分析的知识点名称。
  * **终止数据块**：包含生成的 `skillId`，状态标记为 `sandbox`。
* **状态扭转契约**：前端通过 SSE 驱动编译进度条渲染；编译完成后，前端浮窗提示成功，引导用户跳转至沙箱组件区，后端将生成的 Markdown 文件锁定在隔离区。

### 3. 半自动重调度计算流 (顺延)
* **控制权发起方**：前端通过拖拽或顺延组件发起计算意图。
* **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  {
    "taskId": "string (逾期任务ID)",
    "postponeDays": "number (顺延天数)"
  }
  ```
* **输出响应 (Backend -> Frontend)**：
  ```json
  {
    "affectedTasks": [
      { "taskId": "string", "newDeadline": "timestamp" }
    ],
    "status": "RESCHEDULED"
  }
  ```
* **状态扭转契约**：后端通过依赖链算法找出所有受影响的后继任务，并统一更新时间；前端接收到受影响列表后，批量重绘看板，将被影响卡片的状态从 `BLOCKED` 恢复为 `RUNNING`。

### 4. 融合笔记懒加载供给流
* **控制权发起方**：前端基于用户滚动行为发起。
* **输入载荷 (Frontend -> Backend / Payload)**：
  ```json
  { "projectId": "string", "cursor": "string (分页游标)", "limit": "number" }
  ```
* **输出响应 (Backend -> Frontend)**：返回一个混合了“主观笔记”与“Agent对话”的异构数组，但对外包覆为统一的 `UnifiedNoteCard` 数据结构。
* **状态扭转契约**：后端必须在逻辑层完成异构数据的拉平与时间线排序；前端接收后无脑追加至瀑布流组件中，不再处理异构差异。
