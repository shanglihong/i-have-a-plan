# 前端组件处理与状态流转规范 v1.0

> [!IMPORTANT]
> 本文档定义了基于 FSD (Feature-Sliced Design) 架构的组件切片逻辑。
> **基建契约**：项目 `Shared` 层的 UI 积木将基于 **shadcn/ui** (Tailwind CSS + Radix UI) 构建，从而提供无头 (Headless) 的无障碍交互与极致的样式定制自由度。

## 一、 Shared 层基础组件规范 (UI 积木)

`Shared` 层组件必须是绝对“纯洁 (Dumb)”的，不包含任何业务逻辑，不可引入 `Zustand` 或 `React Query`。

| 组件名 | 基于 shadcn/ui 组件 | 功能扩展与定制约束 |
| :--- | :--- | :--- |
| **`Button`** | `Button` | 扩展 `variant="glass"`（毛玻璃磨砂效果）用于悬浮菜单；扩展 `isLoading` 状态替代原生 `disabled`。 |
| **`Modal`** | `Dialog` / `AlertDialog`| 强制背景必须加入 `backdrop-blur-sm` 高斯模糊遮罩；拦截 `Esc` 和外部点击，确保 PA-07 等心流不被打断。 |
| **`Toast`** | `Sonner` / `Toast` | 定制错误级别颜色；对于强阻断错误（如拓扑死锁），禁止使用 Toast，必须抛弃给 Modal。 |
| **`Popover`** | `Popover` | 用于微型弱打扰气泡与悬浮菜单。通过 `framer-motion` 加入 300ms 渐进滑出 (Slide In) 动效。 |

---

## 二、 Entities 层领域实体组件 (Domain Cards)

`Entities` 层将后端 Pydantic 数据结构投影为前端只读或带有底层 CRUD 钩子的卡片组件。

### 1. `TaskEntity` (任务实体)

* **展示组件**：`<PlanTaskCard />`
* **Props 输入**：`task: Task` (来源于后端 REST)
* **状态映射**：
  * 若 `task.status === 'BLOCKED'`：背景渲染 `bg-red-50`，文本 `text-red-600`。
  * 若 `task.isReadOnly === true`（项目归档态）：全部复选框与拖拽手柄 `pointer-events-none opacity-60`。
* **数据绑定钩子**：封装 `useUpdateTaskStatus()`，内部调用 `PATCH /api/tasks/{id}`，成功后调用 `queryClient.invalidateQueries({ queryKey: ['tasks'] })` 刷新列表。

### 2. `NoteEntity` (融合笔记实体)

* **展示组件**：`<UnifiedNoteCard />`
* **Props 输入**：`note: Note` (区分主观笔记或对话上下文)
* **UI 特征**：
  * 头部包含相对物理锚点链接标签。
  * 卡片中部渲染微透明淡绿色的原文引用代码块。
* **数据绑定钩子**：封装 `useCreateNote()`，内部调用 `POST /api/notes`。前端组件内的富文本变更需引入 **500ms 防抖 (Debounce)** 后再调用钩子，防止过度提交。

---

## 三、 Features 层智能交互模块 (Smart Modules)

`Features` 层的组件高度内聚，它们知道如何将 `Entities` 和 `Shared` 拼装起来，并与全局 `Zustand` UI 状态或网络流进行深度交互。

### 1. `ReadingWorkspace` (沉浸式阅读特征)

* **内部依赖**：`OutlineTree` (大纲), `DocumentReader` (阅读器主视口)。
* **状态流转**：
  * **波光骨架屏**：当后端 `GET /api/projects/{id}/parse-stream` 返回 `status: "PARSING"` 时，渲染骨架屏。
  * **划词悬浮菜单**：监听文本 `onSelect`，计算 DOM 坐标 `{x, y}`，通过 `Zustand` 的 `setFloatingMenuPosition` 状态唤出 `<FloatingActionMenu />`。

### 2. `DiscussPanel` (启发式伴读面板)

* **网络流绑定**：
  * 点击发送或提问后，调用 `POST /api/discuss` 接口建立 SSE 长连接。
  * **事件响应**：监听 `event: chunk`，将推送的字符串增量拼接到当前对话卡片的 `content` 状态中，驱动底层的 Markdown 渲染器产生“打字机 (Typewriter)”动效。
* **一键存笔记特效**：
  * 点击 `[存为笔记]`，通过 `framer-motion` 派发抛物线粒子动画，并在动画 `onComplete` 回调中调用 `NoteEntity` 的 `useCreateNote()` 生成实体。

### 3. `PlanGanttBoard` (基于拓扑编排的甘特看板)

* **拖拽与连线阻断拦截 (PA-03 核心实现)**：
  * 基于 `@dnd-kit/core` 捕获卡片拖拽连线事件。
  * **本地拦截**：在调用后端前，引入本地 `detectCycle(nodes, edges)` 工具函数。若检测成环，立即中断网络提交。
  * **阻断渲染**：触发 `Zustand` 状态 `setCycleErrorPath(path)`，受影响的 `TaskCard` 通过 Tailwind 类名 `animate-shake ring-2 ring-red-500` 发光抖动，禁用 `<ApproveButton />`。

### 4. `GlobalGraphCanvas` (全局力导向图谱)

* **渲染引擎**：基于 `react-force-graph` 或 `d3.js`，通过 WebGL 加速渲染大规模节点。
* **数据衰变视觉映射**：
  * 当节点属性 `is_falsified === true` 时，节点材质透明度设为 `0.4`，连线采用虚线 `stroke-dasharray="5,5"`，渲染知识被证伪的“新陈代谢”视觉。
* **Quick Peek 溯源**：点击节点，不进行 React Router 跳转，而是更新 `Zustand` 的 `activePeekNodeId`。触发根布局的 `<QuickPeekModal />` 居中弹出（带毛玻璃遮罩）。

---

## 四、 全局状态管理划分 (State Registry)

| 领域 | 状态库选型 | 核心纳管数据 |
| :--- | :--- | :--- |
| **服务器状态同步** | `TanStack Query` | 双轨项目列表、笔记瀑布流 (Cursor)、任务拓扑树、图谱节点快照。负责拉取、Loading 展示与后台失效刷新。 |
| **纯 UI 交互状态** | `Zustand` (多 Store 切片) | `useLayoutStore` (双栏/三栏宽度)、`useFocusStore` (当前高亮定位的物理锚点 ID)、`useFloatingMenuStore` (右键/划词菜单的位置 x/y)。 |
