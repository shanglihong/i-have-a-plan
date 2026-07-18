# 数据模型与领域驱动设计规范 (v1.0)

> [!IMPORTANT]
> 本文档基于 DDD (领域驱动设计) 原则，依据业务模型和交互规范提取数据模型。本文档不仅定义了领域边界，还严格区分了持久化实体对象 (DO)、上下文领域对象 (Domain Object) 与前端使用对象 (VO) 的字段边界。

---

## 一、 领域限界上下文 (Bounded Contexts)

根据系统的业务属性，整体划分为四大限界上下文：

1. **项目与任务上下文 (Project & Task Context)**：核心业务域，负责项目生命周期、任务树和状态流转调度。
2. **笔记与知识上下文 (Note & Knowledge Context)**：核心业务域，管理用户在阅读和实战过程中产生的“融合阅读笔记”与“经验笔记”。
3. **技能沙箱上下文 (Skill & Sandbox Context)**：支撑域，管理通过提炼产生的方法论（Skill）以及环路校验的隔离环境。
4. **图谱与检索上下文 (Graph & Retrieval Context)**：基础设施/支撑域，处理异步抽取的知识节点、标签融合及检索关系。

---

## 二、 全局数据策略 (Global Data Policies)

依据底层业务裁决，数据模型严格遵循以下两项全局策略：
1. **单租户本地化 (Single Tenant & Local-First)**：本系统作为本地优先工具，底座不引入多用户（User / Account）或鉴权体系实体。所有模型数据依赖本地 SQLite 与物理文件，保持极简单用户架构。
2. **硬删除机制 (Hard Delete)**：为追求极致轻量并释放本地磁盘空间，不采用软删除（无 `is_deleted` 字段）。当用户主动执行笔记移除或沙箱废除时，系统将直接执行物理文件连同数据库索引的硬级联删除。
3. **分层对象映射隔离 (DO vs Domain vs VO)**：
   - **实体对象 (Data Object - DO)**：仅包含基础数据类型与主外键 ID，严格与底层持久化数据库表结构映射。
   - **上下文对象 (Domain Object)**：继承 DO 基础属性，在内存中装载充血模型集合（如 `List<Task>`），承载核心业务逻辑。脱离数据库束缚，体现聚合根的强一致性边界。
   - **前端使用对象 (View Object - VO / DTO)**：发送给前端渲染使用。剔除沉重的内存集合对象，附加仅供 UI 渲染的衍生字段与状态标识（如 `_ui_progress`），保障前后端彻底分离。

---

## 三、 实体与分层数据模型详解

### 1. 项目与任务上下文 (Project & Task Context)

#### 1.1 Project（项目 - 实体/聚合根）
**定义**：一切学习与执行任务的最高层级承载容器，是一个具有唯一标识的独立实体。

* **(1) 实体对象 (ProjectDO)** - 落库模型

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `id` | String | 唯一标识 (UUID) | 全局主键 |
| `title` | String | 项目名称 | - |
| `type` | Enum | `READING` / `PLAN` | - |
| `status` | Enum | `INIT` / `ACTIVE` / `SUSPENDED` / `ARCHIVED` | - |
| `deadline` | DateTime | 截止时间硬约束 | - |
| `assigned_agent_id` | String | 绑定的沙箱 Agent ID | PA-05 隔离 |
| `created_at` / `updated_at`| DateTime | 审计时间 | - |

* **(2) 上下文对象 (ProjectDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `tasks` | Array<TaskDomain> | 领域集合 | 内存装载下属任务树，用于领域层调度 |
| `notes` | Array<UnifiedReadingNoteDomain> | 领域集合 | 内存装载下挂笔记集合，用于大模型提炼 |

* **(3) 前端使用对象 (ProjectVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_progress` | Number | 总体阅读/执行进度 | 进度条渲染（公式实时计算） |
| `_ui_is_reloading`| Boolean| 重载唤醒状态 | 触发水波纹动画屏蔽层 |

#### 1.2 Task（任务 - 实体）
**定义**：项目下的执行步骤或阅读章节。生命周期依赖于 Project。

* **(1) 实体对象 (TaskDO)**

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `id` | String | 任务唯一标识 | 主键 |
| `project_id` | String | 归属项目 ID | 关联 Project |
| `title` | String | 任务或章节标题 | - |
| `status` | Enum | `PENDING` / `RUNNING` / `COMPLETED` / `BLOCKED`| - |
| `parent_task_id` | String | 父级任务 ID | 外键关联自身 |
| `deadline` | DateTime | 当前子任务截止时间 | - |
| `depends_on_task_ids` | Array<String>| 前置依赖任务 ID 列表 | 关联关系表 |

* **(2) 上下文对象 (TaskDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `sub_tasks` | Array<TaskDomain> | 领域集合 | 根据 `parent_task_id` 组装的树形子集 |
| `depends_on_tasks`| Array<TaskDomain> | 领域引用 | 根据 `depends_on_task_ids` 组装，用于解环校验 |

* **(3) 前端使用对象 (TaskVO)** (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_is_highlighted`| Boolean| 脉冲高亮状态 | Trace-to-source 定位时触发闪烁动效 |

---

### 2. 笔记与知识上下文 (Note & Knowledge Context)
> [!NOTE]
> 该上下文遵循 **File-first (文件优先)** 存储契约。所有笔记实体内容作为 Markdown 物理落盘，数据库仅存储索引与关系。

#### 2.1 UnifiedReadingNote（融合阅读笔记 - 实体/聚合根）
**定义**：结合主观感悟与 AI 伴读对话的综合笔记实体，具有独立生命周期。

* **(1) 实体对象 (UnifiedReadingNoteDO)**

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `id` | String | 笔记唯一标识 | 主键 |
| `project_id` | String | 归属的项目 ID | 关联 Project |
| `content_path` | String | 物理 MD 文件路径 | IO 定位 |
| `tags` | Array<String>| 全局扁平标签 | 关联标签表 |
| `source_anchor` | Object | 物理锚点(页码/偏移/特征字)| - |

* **(2) 上下文对象 (UnifiedReadingNoteDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `tag_nodes` | Array<TagSuperNode> | 领域集合 | 关联的标签实体超节点集合 |
| `content` | String | 领域属性 | 内存读取加载的真实 Markdown 文本流 |

* **(3) 前端使用对象 (UnifiedReadingNoteVO)** (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_is_editable` | Boolean | 可编辑状态 | 随项目归档状态决定，控制富文本框激活 |

#### 2.2 ExperienceNote（经验笔记 - 实体/聚合根）
**定义**：项目完结时复盘产生的实战经验实体，驱动知识进化。

* **(1) 实体对象 (ExperienceNoteDO)**

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `id` | String | 笔记唯一标识 | 主键 |
| `project_id` | String | 关联完结项目 ID | 关联 Project |
| `associated_skill_id`| String | (可选) 原版技能 ID | 关联 Skill |
| `content_path` | String | 物理 MD 文件路径 | IO 定位 |

* **(2) 上下文对象 (ExperienceNoteDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `associated_skill` | SkillDomain | 领域引用 | 实例化的原版技能对象，派生变异草稿 |
| `content` | String | 领域属性 | 内存加载的真实 Markdown 复盘文本 |

* **(3) 前端使用对象 (ExperienceNoteVO)** (同 DO)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| (无特殊衍生 UI 属性) | - | - | - |

---

### 3. 技能沙箱上下文 (Skill & Sandbox Context)

#### 3.1 Skill（技能模版 - 实体/聚合根）
**定义**：由非结构化知识编译为可指导 Agent 执行的结构化任务生成模板实体。

* **(1) 实体对象 (SkillDO)**

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `id` | String | 技能唯一标识 | 主键 |
| `name` | String | 技能名称 | - |
| `sandbox_state` | Enum | `DRAFT` / `SANDBOX` / `ACTIVE` | 生命周期状态 |
| `file_path` | String | 物理存储路径 (含 YAML) | IO 定位 |

* **(2) 上下文对象 (SkillDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `steps` | Array<SkillStepDomain>| 领域集合 | 从 MD 中解析装载的执行步骤集合 |

* **(3) 前端使用对象 (SkillVO)** (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_has_cycle` | Boolean | 环路死锁报警状态 | 控制编辑器画布发光抖动、禁用入库按钮 |

#### 3.2 SkillStep (步骤 - 实体)
* **(1) 实体对象 (SkillStepDO)**

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `step_id` | String | 步骤本地标识 | - |
| `depends_on` | Array<String>| 前置步骤 ID 列表 | 本地连线缓存 |

* **(2) 上下文对象 (SkillStepDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `depends_on_steps`| Array<SkillStepDomain>| 领域引用 | 组装为实例，用于 PA-03 拓扑解环 |

* **(3) 前端使用对象 (SkillStepVO)** (同 DO)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| (无特殊衍生 UI 属性) | - | - | - |

---

### 4. 图谱与检索上下文 (Graph & Retrieval Context)

#### 4.1 GraphNode（图谱节点 - 实体/聚合根）
* **(1) 实体对象 (GraphNodeDO)**

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `id` | String | 节点唯一标识 | 主键 |
| `name` | String | 实体名词 | - |
| `source_note_id` | String | 来源物理笔记 ID | 关联 Note |
| `is_falsified` | Boolean | 是否被经验证伪降级 | - |

* **(2) 上下文对象 (GraphNodeDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `source_note` | NoteDomain | 领域引用 | 物理笔记实例，用于漫游时 Quick Peek |
| `related_nodes` | Array<GraphNodeDomain>| 领域集合 | 组装出的网状邻居节点 (图论邻接表) |

* **(3) 前端使用对象 (GraphNodeVO)**

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_opacity` | Number | 视觉透明度 | 当被证伪时，前端强制降低透明度至 40% |

#### 4.2 GraphEdge（图谱连线关系 - 实体）
* **(1) 实体对象 (GraphEdgeDO)**

| 字段名 | 类型 | 含义描述 | 关联 / 约束 |
| :--- | :--- | :--- | :--- |
| `source_id` | String | 起始节点 ID | 关联 GraphNode |
| `target_id` | String | 目标节点 ID | 关联 GraphNode |
| `relation_type` | Enum | `ASSOCIATES` / `FALSIFIES` | - |

* **(2) 上下文对象 (GraphEdgeDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `source` | GraphNodeDomain| 领域引用 | 起始节点实体装载 |
| `target` | GraphNodeDomain| 领域引用 | 目标节点实体装载 |

* **(3) 前端使用对象 (GraphEdgeVO)**

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_line_style`| String | 连线视觉样式 | `FALSIFIES` 时渲染红色虚线/波浪线 |
