# 前端人机交互流程与 UI 设计规范 v1.0

> [!IMPORTANT]
> 本文档细化了前台核心交互流 (End-to-End Flow) 与错误兜底机制在 UI 层的最终呈现与代码执行策略。

## 一、 沉浸式伴读与知识提取交互流

### 1. 划词溯源与脉冲定位 (Trace-to-Source)

在融合笔记卡片列表中，用户点击引用头部触发原文定位：

1. **事件捕获**：`<UnifiedNoteCard />` 触发 `onTraceToSource(anchor)` 事件，通过 Zustand 将 `targetAnchor` 分发给。
2. **平滑滚动 (Smooth Scroll)**：左侧 `<DocumentReader />` 侦听状态变化，调用原生 DOM API `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`，确保目标段落位居视口中央。
3. **脉冲闪烁动效 (Pulse Highlight)**：利用 Framer Motion 给目标 DOM 包裹动画：
   ```tsx
   <motion.div
     initial={{ backgroundColor: 'transparent' }}
     animate={{ backgroundColor: ['#fef3c7', 'transparent', '#fef3c7', 'transparent'] }}
     transition={{ duration: 1.5, times: [0, 0.5, 1, 1.5] }}
   >
     {content}
   </motion.div>
   ```
4. **容错重计算**：若基于段落 ID 定位失败（如后端文件变更），本地前端即刻启用首尾特征字符比对计算（Levenshtein 距离），并在成功后通过微型 Toast 提示“已模糊匹配至相近段落”。

### 2. 章节末推荐气泡与防干扰机制

为兼顾引导与心流，严格控制推荐气泡的出现时机：

* **触发检测**：阅读器容器绑定 `onScroll` 事件，并包裹 100ms 节流阀 (Throttle)。当 `(scrollTop + clientHeight) / scrollHeight >= 0.95` 时，触发气泡显示状态为 `true`。
* **视觉交互**：气泡 `<RecommendationBubble />` 从右下角向上滑出 (`translateY(100%) -> translateY(0)`)，呈现磨砂玻璃质感。
* **忽略销毁**：当滚动高度跨入下一个章节（DOM 节点交叉观察器 IntersectionObserver 触发），气泡状态自动置为 `false`，平滑向下滑出销毁，做到“过时不扰”。

---

## 二、 计划重调度与沙箱编辑交互流

### 1. 一键顺延与任务拓扑图

* **逾期阻塞高亮**：
  逾期未完成任务，状态被推断为 `BLOCKED`，卡片外框应用 `ring-red-500`，截止时间文字渲染为强警示色并叠加 0.5Hz 的透明度呼吸效果。
* **重调度交互**：
  点击悬浮的“重调度”快捷按钮。下拉菜单提供顺延天数输入框。提交 `POST /api/tasks/reschedule` 后，前端不做复杂的本地图计算，直接通过 React Query 的 `invalidateQueries()` 触发全量树结构重刷，此时相关卡片从红色的 `BLOCKED` 恢复为正常的 `RUNNING` 蓝灰底色。

### 2. 技能提炼与沙箱编译 (Trace-to-Skill)

* **发起提炼 (微观与宏观)**：
  * 微观：选中划词内容，极简输入名称，调用 `POST /api/skills/compile`。
  * 宏观（归档时）：点击 `[萃取全书/项目技能树]`。
* **加载态反馈**：由于 L3 级别萃取可能耗时极长，前端禁用全屏 Loading。代之以在页面右上角呼出一个“后台编译中”的微缩拓扑节点连线动画卡片。
* **完成与跳转**：当 SSE 流推送 `status: "COMPLETED"` 时，动画卡片变绿并变为可点击按钮：“新技能编译完成，点击前往沙箱审批”。

---

## 三、 全局异常与错误反馈交互规范 (Error Handling)

基于后端返回的 **RFC 7807** 问题细节标准，前端按级别实施差异化的 UI 反馈，绝不让用户看到原始的系统报错。

### 1. 错误展现分级与映射 (Error Presentation Hierarchy)

| RFC 7807 `status` / `type` | 前端组件形态 | 交互行为与约束 |
| :--- | :--- | :--- |
| **2xx 伴随临时波动** / `warnings` | `<Sonner Toast />` (顶部/右侧) | 3-5 秒后自动消失，不遮挡主视口。 |
| **400 / 422 参数校验错误** | **Inline Form Validation** (表单红字) | 解析 `extension_fields.invalid_params`，精准使对应的输入框边框变红（附加轻微水平 Shake 抖动），错误文案挂载于输入框正下方。 |
| **沙箱死锁 (`errors/topology-cycle`)** | **Inline Visual Alteration** (原位阻断发光) | 禁止使用 Toast。解析 `cycle_path`，直接在画布中将成环节点变红、连线变红色虚线，彻底冻结“批准入库”提交按钮。 |
| **403 越权 / 配额耗尽** | `<AlertDialog />` (居中模态遮罩) | 背景强高斯模糊 (`backdrop-blur-md`)。必须提供“去升级/去处理”的主按钮 (Call To Action)，并解析 `extension_fields.upgrade_url` 执行跳转。 |

### 2. 未知异常兜底机制 (Fallback & Crash Report)

* **网络断开/500 服务端异常**：
  对于非 RFC 7807 规范的崩溃返回，利用全局 Axios Interceptor 拦截。
  * UI 呈现为全局友好的 Toast：“连接至知识中枢的神经网络正在波动，请稍后重试”。
  * 提供隐藏入口：Toast 右下角提供一个极小的复制图标，点击可复制完整的 `TraceID` 供报障使用。
* **组件崩溃隔离**：
  利用 React 的 `<ErrorBoundary />` 包裹各大区块（如阅读器、甘特图）。若某个图表组件渲染引发 JS 错误，仅在该区块渲染柔和的插画及“局部区块崩溃，点击重试”按钮，**坚决杜绝全局页面白屏**。
