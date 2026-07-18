# 前端原型设计需求与交互规范 v1.0

> [!IMPORTANT]
> 本文档基于 [《交互链路与状态规范》](../04_interaction_design/flow_state_spec-v1.0.md) 与 [《业务模型规范》](../03_business_modeling/business_model.md) 推导，专为 **UI/UX 设计师** 与 **前端研发人员** 编写。
> **架构契约**：本文档采用严格的**“组件结构 -> 数据依赖 (输入) -> 交互事件 (输出)”**模型进行结构化表达，为后续组件库开发、状态管理与接口联调提供明确的标准输入。

## 一、 核心页面布局与线框结构 (Layout & Wireframing)

原型设计需遵循“沉浸、无干扰”的排版原则，核心页面结构如下：

### 1. 全局大盘与入口页 (Dashboard)
- **布局结构**：顶部导航栏（含全局搜索与新建按钮） + 主内容区。
- **主内容区**：横向卡片轮播 (最近访问) + 双栏项目列表 (阅读项目 / 计划项目)。
- **全局入口**：提供明显的悬浮或固定按钮，用于一键呼出“全局知识图谱画布”。

### 2. 沉浸式阅读工作台 (Reading Workspace)
- **布局结构**：自适应的双栏/三栏布局。
- **左侧边栏**：级联折叠的文档大纲树。
- **中栏 (主阅读区)**：顶部双维度进度条 + 居中的 PDF/Markdown 渲染容器。
- **右栏 (读思面板)**：瀑布流式融合笔记卡片列表 + 固定的 Discuss AI 输入框。

---

## 二、 核心 UI 组件结构化定义 (Component I/O Spec)

前端组件必须严格遵循以下状态输入（Props/State）与交互输出（Events/Emits）契约，以保证前后端数据流转的一致性。

### 1. 双维度动态进度条 (Dual-metric Progress Bar)
* **功能描述**：用于可视化展示用户的阅读与内化进度，支持联动跳转。
* **数据依赖 (输入 / Props)**：
  - `chapterReadRatio` (Number): 已读章节比例（0-1）。
  - `chunkParsedRatio` (Number): 文档切片解析比例（0-1）。
  - `chapterMarkers` (Array): 章节物理坐标系数组，用于渲染刻度。
* **交互事件 (输出 / Emits)**：
  - `onMarkerClick(chapterId)`: 用户点击特定刻度，触发阅读器向对应章节平滑滚动。
  - `onHoverMarker(chapterId)`: 触发悬浮气泡，展示章节标题与预估耗时。

### 2. 融合笔记卡片 (Unified Note Card)
* **功能描述**：承载主观笔记、原文高亮引用与 AI 辅导上下文的统一组件。
* **数据依赖 (输入 / Props)**：
  - `noteId` (String): 笔记唯一标识。
  - `sourceAnchor` (Object): 物理原文锚点数据（包含页码、段落ID、特征字符）。
  - `quoteContent` (String): 原文引文内容（呈现为微透明浅绿背景、斜体且不可编辑）。
  - `userContent` (String): 富文本内容。
  - `isReadOnly` (Boolean): 级联项目状态，决定卡片是否置灰且禁用输入。
* **交互事件 (输出 / Emits)**：
  - `onLocateSource(sourceAnchor)`: 点击卡片头部定位按钮，派发物理追溯事件。
  - `onContentChange(newContent)`: 富文本内容变更时触发，前端须在此事件外层包裹 **500ms 防抖 (Debounce)** 后再发给后端。

### 3. 微型弱打扰气泡 (Unintrusive Recommendation Bubble)
* **功能描述**：章节末尾或任务异常时的弱打扰提示，必须包含渐进式动效。
* **数据依赖 (输入 / Props)**：
  - `triggerCondition` (Boolean): 渲染触发开关（如：阅读滚动超过 95%）。
  - `message` (String): 提示文本（如“AI导师已整理本章方法论”）。
  - `actionType` (String): 点击后的动作映射策略。
* **交互事件 (输出 / Emits)**：
  - `onActionClick()`: 用户接受推荐，展开右侧对应面板或执行操作。
  - `onDismiss()`: 离开触发区域后自动触发的销毁事件。

### 4. 拓扑排序卡片节点 (Topological Node Card)
* **功能描述**：沙箱编辑器中的任务编排节点，支持拖拽连线。
* **数据依赖 (输入 / Props)**：
  - `nodeId` (String): 节点标识。
  - `hasCycleError` (Boolean): 当前节点是否处于死锁环路中。若为 `true`，激活红色高斯模糊与高频抖动动效。
  - `dependencies` (Array): 前置节点列表。
* **交互事件 (输出 / Emits)**：
  - `onConnectionCreate(sourceNodeId, targetNodeId)`: 用户建立连线，触发外层画布的拓扑排序算法。
  - `onConnectionDelete(edgeId)`: 断开连线，触发外层算法重新校验。

---

## 三、 状态响应与视觉映射机制 (State & Visual Mapping)

组件的 `isReadOnly` 与 `hasError` 等输入依赖，来源于全局状态机。前端需实现以下视觉映射：

| 实体状态 (State Input) | 界面视觉与交互限制 (Visual Output) |
| :--- | :--- |
| **Project.Status = `ACTIVE`** | 正常交互配色，所有组件处于激活态。 |
| **Project.Status = `SUSPENDED`**| 对应工作区被**毛玻璃遮罩** (`backdrop-filter: blur`) 覆盖，底层模糊且不可点击。呈现“一键唤醒”按钮，点击后派发重载事件，渲染**水波纹扩散动效**。 |
| **Project.Status = `ARCHIVED`** | 顶部渲染只读警告横幅。向所有子组件下发 `isReadOnly = true`，输入框与提交按钮深度置灰；鼠标指针全局渲染为 `not-allowed`。 |
| **Task.Status = `BLOCKED`** | 任务卡片底色变更为警告红，字体加粗并闪烁。暴露出悬浮的“重调度”快捷入口组件。 |
| **Document.Status = `PARSING`** | 大纲组件渲染为**波光骨架屏 (Skeleton)**，屏蔽点击事件，直至状态变更为就绪。 |
