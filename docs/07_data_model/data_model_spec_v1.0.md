# 数据模型与领域驱动设计规范 (v1.0)

> [!IMPORTANT]
> 本文档基于 DDD (领域驱动设计) 原则，依据 [业务模型规范](../03_business_modeling/business_model.md)、[交互状态规范](../04_interaction_design/flow_state_spec-v1.0.md) 及 [后端架构设计规范](../06_system_architecture/architecture_backend_design_spec_v1.0.md) 编写。
> 本文档不仅明确了领域边界，还严格区分了持久化实体对象 (DO)、上下文领域对象 (Domain Object) 与前端使用对象 (VO) 的字段边界，为前后端开发提供统一的契约底座。

---

## 一、 领域限界上下文 (Bounded Contexts)

根据系统的业务属性，整体划分为四大限界上下文：

1. **项目与任务上下文 (Project & Task Context)**：核心业务域，负责项目生命周期（包含 `READING`/`PLAN` 双轨）、统一三层范式 (`Project -> Task Chain -> Task`) 的中观与微观任务树管理、调度与电子书 `Book` 解析大纲树映射。
2. **笔记与知识上下文 (Note & Knowledge Context)**：核心业务域，管理 `MaterialNote`（素材笔记）、`SynthesizedNote`（沉淀笔记与结项复盘经验）、`KnowledgeBase`（长效跨项目知识资产库）以及 `SourceAnchor`（物理原文锚点与三层定位解算）。
3. **技能沙箱上下文 (Skill & Sandbox Context)**：支撑域，管理通过提炼产生的方法论 `Skill`（聚合根）、`SkillStep`（步骤节点）以及负责四大职责隔离与拓扑死锁阻断的 `SandboxContext`（沙箱隔离中枢）。
4. **图谱与检索上下文 (Graph & Retrieval Context)**：旁路/基础设施域，包含 `VectorChunkIndex`（`sqlite-vec` 密集向量切片索引缓存）、`GraphNode`（知识原子节点）、`TagSuperNode`（全局标签超节点）以及 `GraphEdge`（认知关系边）。

---

## 二、 全局数据策略 (Global Data Policies)

依据底层业务裁决，数据模型严格遵循以下三项全局策略：

1. **单租户本地化 (Single Tenant & Local-First)**：本系统作为本地优先工具，底座不引入多用户 (User / Account) 或鉴权体系实体。所有模型数据依赖本地 SQLite 与物理文件，保持极简单用户架构。
2. **硬删除机制 (Hard Delete)**：为追求极致轻量并释放本地磁盘空间，不采用软删除（无 `is_deleted` 字段）。当用户主动执行笔记移除或沙箱废除时，系统将直接执行物理文件连同数据库索引的硬级联删除。
3. **分层对象映射隔离 (DO vs Domain vs VO)**：
   - **实体对象 (Data Object - DO)**：仅包含基础数据类型与主外键 ID，严格与底层持久化数据库表结构映射。
   - **上下文对象 (Domain Object)**：继承 DO 基础属性，在内存中装载充血模型集合（如 `tasks`, `steps`），承载核心业务逻辑。脱离数据库束缚，体现聚合根的强一致性边界。
   - **前端使用对象 (View Object - VO / DTO)**：发送给前端渲染使用。剔除沉重的内存集合对象，附加仅供 UI 渲染的衍生字段与状态标识（如 `_ui_progress`, `_ui_has_cycle`），保障前后端彻底分离。

---

## 三、 实体与分层数据模型详解

### 1. 项目与任务上下文 (Project & Task Context)

#### 1.1 Project（项目 - 实体/聚合根）
**定义**：一切学习与执行任务的最高层级承载容器。分为“阅读项目 (READING)”与“计划项目 (PLAN)”双轨，共用统一生命周期状态机。

* **(1) 实体对象 (ProjectDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 项目全局唯一标识 |
| `title` | String | 必填 | 项目名称 |
| `type` | Enum | 必填 | 项目类型：`READING` (阅读项目) / `PLAN` (计划项目) |
| `status` | Enum | 必填 | 生命周期状态：`INIT` / `ACTIVE` / `SUSPENDED` / `ARCHIVED` |
| `deadline` | DateTime | 可选 | 截止时间硬约束 |
| `assigned_agent_id` | String | 必填 | 绑定的沙箱伴读/监督 Agent ID (PA-05 隔离) |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (ProjectDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `task_chains` | Array<TaskChainDomain> | 领域集合 | 内存装载的中观任务链集合 (Project -> Task Chain -> Task) |
| `material_notes` | Array<MaterialNoteDomain> | 领域集合 | 内存装载的素材笔记集合 |
| `synthesized_notes` | Array<SynthesizedNoteDomain> | 领域集合 | 内存装载的沉淀笔记集合 |

* **(3) 前端使用对象 (ProjectVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_progress` | Number | 总体阅读/执行百分比进度 | 头部进度条渲染（公式实时解算） |
| `_ui_is_reloading` | Boolean | 重载唤醒状态 | 触发水波纹动画屏蔽层 |

---

#### 1.2 TaskChain（任务链 - 实体/通用中观容器）
**定义**：项目中观层级的通用容器（在阅读项目中表现为电子书章节大纲链 `READING_CHAPTER`，在计划项目中表现为阶段/功能模块任务链 `PLAN_STAGE`）。统一遵循 `Project -> Task Chain -> Task` 三层范式。

* **(1) 实体对象 (TaskChainDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 任务链唯一标识 |
| `project_id` | String | 外键 (Project) | 归属项目 ID |
| `book_id` | String | 可选 (Book) | 阅读项目关联的书籍 ID |
| `chapter_id` | String | 可选 | 关联书籍章节标识与阅读范围 |
| `title` | String | 必填 | 章节/阶段里程碑标题 |
| `sequence_order` | Number | 必填 | 中观链条物理排序序号 |
| `status` | Enum | 必填 | 状态：`PENDING` / `RUNNING` / `COMPLETED` / `BLOCKED` |
| `type` | Enum | 必填 | 业务类型：`READING_CHAPTER` / `PLAN_STAGE` / `DEFAULT` |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (TaskChainDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `tasks` | Array<TaskDomain> | 领域集合 | 包含的微观执行 Task 节点集合 |

* **(3) 前端使用对象 (TaskChainVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_progress` | Number | 中观链条完成进度百分比 | 章节/里程碑进度条渲染 |
| `_ui_is_active_chapter` | Boolean | 是否为当前阅读活跃章节 | 阅读器左侧大纲树高亮激活项 |

---

#### 1.3 Task（微观任务 - 实体）
**定义**：TaskChain 下具体的微观可执行单元（如段落精读、划词对话、卡片写笔记、代码编写等）。Task 间可通过 `depends_on_task_ids` 构建有向无环图 (DAG) 依赖。

* **(1) 实体对象 (TaskDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 任务微观唯一标识 |
| `task_chain_id` | String | 外键 (TaskChain) | 归属任务链 ID |
| `title` | String | 必填 | 任务具体名称 |
| `description` | String | 可选 | 任务详细执行要求与说明 |
| `sequence_order` | Number | 必填 | 同一 TaskChain 内的序号 |
| `status` | Enum | 必填 | 状态：`PENDING` / `RUNNING` / `COMPLETED` / `BLOCKED` |
| `parent_task_id` | String | 可选 (Task) | 子任务父节点 ID |
| `depends_on_task_ids` | Array<String> | JSON 数组 | 有向无环图 (DAG) 前置依赖 Task ID 列表 |
| `deadline` | DateTime | 可选 | 任务截止时间 |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (TaskDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `sub_tasks` | Array<TaskDomain> | 领域集合 | 根据 `parent_task_id` 组装的树形子集 |
| `depends_on_tasks` | Array<TaskDomain> | 领域引用 | 根据 `depends_on_task_ids` 组装，用于 DAG 依赖解算与锁死判断 |

* **(3) 前端使用对象 (TaskVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_is_highlighted` | Boolean | 脉冲高亮状态 | Trace-to-source 定位时触发闪烁动效 |
| `_ui_is_blocked` | Boolean | 前置依赖锁定状态 | 前置 Task 未完成时，前端呈锁死置灰态 |

---

#### 1.4 Book（书籍 - 实体/聚合根）
**定义**：承载物理源电子书及其全生命周期解析状态与通用解析物料的基础实体。遵循 File-first 原则，正文切片独立在沙箱磁盘落盘为 `parsed_content.json`，数据库仅存储 `parsed_structure` 目录树索引。

* **(1) 实体对象 (BookDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 书籍唯一标识 |
| `project_id` | String | 外键 (Project) | 关联阅读项目 ID |
| `file_name` | String | 必填 | 原始物理文件名 |
| `file_type` | Enum | 必填 | 格式：`PDF` / `EPUB` / `TXT` / `MD` |
| `file_size` | Number | 必填 | 文件字节大小 |
| `storage_path` | String | 必填 | 原书物理沙箱存储路径 |
| `content_json_path` | String | 必填 | 物理切片 `parsed_content.json` 磁盘路径 |
| `parsing_status` | Enum | 必填 | 状态：`PENDING` / `UPLOADING` / `PARSING` / `COMPLETED` / `FAILED` |
| `parsed_structure` | Object | JSON 结构 | 目录树 `TocNode` 数据库索引数据 |
| `total_chapters` | Number | 必填 | 提取的总章节数 |
| `total_word_count` | Number | 必填 | 全书总字数 |
| `error_message` | String | 可选 | 解析异常时的报错日志 |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (BookDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `toc_tree` | Array<TocNodeDomain> | 领域集合 | 从 `parsed_structure` 反序列化组装的递归目录树 |
| `active_chapters` | Map<String, BookChapterDomain> | 领域缓存 | 内存中按需懒加载缓存的底层章节切片 (Block 集合) |

* **(3) 前端使用对象 (BookVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_active_chapter_id` | String | 当前阅读活跃章节 ID | 驱动阅读器视角定位 |
| `_ui_reading_progress` | Number | 全书实时阅读百分比 | 顶部/底部进度条渲染 |
| `_ui_is_parsing` | Boolean | 解析进度水波纹控制 | 显示解析骨架屏与 Loading 波光动画 |

---

### 2. 笔记与知识上下文 (Note & Knowledge Context)

> [!NOTE]
> 该上下文遵循 **File-first (文件优先)** 存储契约。沉淀笔记与知识库资产内容作为 Markdown 物理落盘，数据库仅存储索引与关系。

#### 2.1 MaterialNote（素材笔记 - 实体/聚合根）
**定义**：原子级知识素材卡片，既可在阅读过程中基于原文片段生成，也可在 Task/计划项目执行过程中挂载到具体 Task 下记录思考。

* **(1) 实体对象 (MaterialNoteDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 素材笔记唯一标识 |
| `project_id` | String | 外键 (Project) | 归属项目 ID |
| `task_id` | String | 可选 (Task) | 关联的具体 Task ID |
| `book_id` | String | 可选 (Book) | 关联的书籍 ID |
| `source_anchor_id` | String | 可选 (SourceAnchor) | 关联物理原文段落锚点 ID |
| `original_snippet` | String | 可选 | 划词原文/参考资料片段快照 |
| `paraphrase` | String | 必填 | 个人转述与理解说明 |
| `scenario_context` | String | 可选 | 关联到自己的经历/应用情景 |
| `tags` | Array<String> | JSON 数组 | 全局扁平标签数组 |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (MaterialNoteDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `source_anchor` | SourceAnchorDomain | 领域引用 | 精准物理原文锚点实体装载 |
| `tag_nodes` | Array<TagSuperNodeDomain> | 领域集合 | 关联的全局标签超节点实体集合 |

* **(3) 前端使用对象 (MaterialNoteVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_is_highlighted` | Boolean | 脉冲高亮状态 | 反向定位到笔记卡片时触发闪烁动效 |
| `_ui_is_editable` | Boolean | 可编辑状态 | 随项目归档状态决定，控制富文本框激活状态 |

---

#### 2.2 SynthesizedNote（沉淀笔记 - 实体/聚合根）
**定义**：基于若干素材笔记与结构化思考文案组合而成的独立综合知识文档。包含 `GENERAL` (常规认知沉淀) 与 `EXPERIENCE` (结项经验总结) 两种类型。

* **(1) 实体对象 (SynthesizedNoteDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 沉淀笔记唯一标识 |
| `project_id` | String | 外键 (Project) | 归属项目 ID |
| `knowledge_base_id` | String | 可选 (KnowledgeBase) | 归属知识库 ID |
| `title` | String | 必填 | 沉淀笔记标题 |
| `type` | Enum | 必填 | 笔记类型：`GENERAL` (常规沉淀) / `EXPERIENCE` (结项经验总结) |
| `material_note_ids` | Array<String> | JSON 数组 | 绑定的素材笔记 ID 列表 |
| `content_path` | String | 必填 (File-first) | 物理 Markdown 文件相对路径 |
| `tags` | Array<String> | JSON 数组 | 全局扁平标签数组 |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (SynthesizedNoteDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `material_notes` | Array<MaterialNoteDomain> | 领域集合 | 依赖装载的素材笔记实体列表，支持浮窗追溯 |
| `content` | String | 领域属性 | 内存读取加载的真实 Markdown 全文 |

* **(3) 前端使用对象 (SynthesizedNoteVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_is_experience_review` | Boolean | 是否为结项复盘笔记 | 视觉卡片右上角展现“实战复盘”徽章标识 |

---

#### 2.3 KnowledgeBase（知识库容器 - 实体/聚合根）
**定义**：独立于单一项目生命周期的长效知识资产管理容器，用于统一分类收录、管理与组织沉淀笔记。

* **(1) 实体对象 (KnowledgeBaseDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 知识库唯一标识 |
| `title` | String | 必填 | 知识库名称 |
| `description` | String | 可选 | 知识库简述与分类说明 |
| `category` | String | 必填 | 主导领域分类 |
| `storage_path` | String | 必填 | 物理落盘磁盘文件夹路径 |
| `tags` | Array<String> | JSON 数组 | 全局标签数组 |
| `note_count` | Number | 默认 0 | 收录的沉淀笔记统计数量 |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (KnowledgeBaseDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `synthesized_notes` | Array<SynthesizedNoteDomain> | 领域集合 | 收录归档的沉淀笔记实体集合 |

* **(3) 前端使用对象 (KnowledgeBaseVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_category_label` | String | 格式化的分类标签 | 界面分类卡片图标与色块分配 |

---

#### 2.4 SourceAnchor（物理原文锚点 - 实体）
**定义**：记录素材笔记在阅读场景下对应的物理源文档中的精准段落位置、多维偏移坐标与文本快照，为划词记笔记和反向定位原文提供基准。

* **(1) 实体对象 (SourceAnchorDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 锚点唯一标识 |
| `book_id` | String | 外键 (Book) | 归属书籍 ID |
| `chapter_id` | String | 必填 | 所属章节/页 ID |
| `block_id` | String | 必填 | 归属段落 ContentBlock ID |
| `char_start_offset` | Number | 必填 | Block 内选中文本起始字符偏移 |
| `char_end_offset` | Number | 必填 | Block 内选中文本终止字符偏移 |
| `page_number` | Number | 可选 (PDF 专属) | PDF 物理页码 (1-based) |
| `pdf_rects` | Object | 可选 (PDF 专属) | PDF 多划词矩形框坐标 JSON `[x,y,w,h][]` |
| `epub_cfi` | String | 可选 (EPUB 专属) | EPUB CFI 锚点定位串 |
| `text_snippet` | String | 必填 | 划词选中的物理原文切片快照 |
| `prefix_context` | String | 必填 | 划词前置 20 字符上下文 |
| `suffix_context` | String | 必填 | 划词后置 20 字符上下文 |
| `content_hash` | String | 必填 | 快照与上下文校验 SHA-256 Hash |
| `created_at` | DateTime | 必填 | 锚点生成时间 |

* **(2) 上下文对象 (SourceAnchorDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `target_block` | ContentBlockDomain | 领域引用 | 反解映射装载的物理正文 ContentBlock 实例 |
| `resolution_status` | Enum | 领域解算状态 | 三层匹配解算后的状态：`EXACT` (精准) / `FUZZY_REANCHORED` (模糊重锚定) / `STALE_FALLBACK` (段落降级) |

* **(3) 前端使用对象 (SourceAnchorVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_is_highlighted` | Boolean | 激活高亮状态 | Trace-to-source 定位时触发段落/文字脉冲点亮动效 |
| `_ui_anchor_stale` | Boolean | 锚点偏移失效提示 | 当触发三层容错重锚定或段落降级时提示“原文位置微调” |

---

### 3. 技能沙箱上下文 (Skill & Sandbox Context)

#### 3.1 Skill（技能模版 - 实体/聚合根）
**定义**：由非结构化知识编译为可指导 Agent 执行的结构化任务生成模板实体。采用 `Skill 1 -- N SkillStep` 的聚合根与关联子实体模型。

* **(1) 实体对象 (SkillDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 技能唯一标识 |
| `name` | String | 必填 | 技能名称 |
| `description` | String | 必填 | 技能方法论简述与应用场景 |
| `version` | String | 必填 | 语义化版本号 (例如 `1.0.0`) |
| `author` | String | 必填 | 提炼者 (用户 / Agent 自动生成) |
| `status` | Enum | 必填 | 状态：`SANDBOX` (沙箱待审批) / `ACTIVE` (批准入库) / `MUTATED_DRAFT` (变异草稿) / `DEPRECATED` (废弃) |
| `source_type` | Enum | 必填 | 提炼来源：`SINGLE_NOTE` (单点) / `CHAPTER` (章节) / `BOOK_FULL` (全书) |
| `source_id` | String | 可选 | 关联的源实体 ID |
| `file_path` | String | 必填 | 物理存储路径 `SKILL.md` (含 YAML 元数据) |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (SkillDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `steps` | Array<SkillStepDomain> | 领域集合 | 从 Markdown 中解析装载的执行步骤集合 |

* **(3) 前端使用对象 (SkillVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_has_cycle` | Boolean | 依赖成环死锁标识 | 控制编辑器卡片发光抖动、连线变红 |
| `_ui_can_approve` | Boolean | 是否允许批准入库 | 拓扑解算通过且 `_ui_has_cycle == false` 时激活按钮 |

---

#### 3.2 SkillStep（技能步骤 - 关联子实体）
**定义**：Skill 聚合根下的具体微观步骤节点。

* **(1) 实体对象 (SkillStepDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 | 步骤本地唯一标识 (如 `step_1`) |
| `skill_id` | String | 外键 (Skill) | 归属的 Skill 聚合根 ID |
| `title` | String | 必填 | 步骤名称 / 节点标题 |
| `instruction_prompt` | String | 必填 | 该步骤的具体 Prompt 指令或操作大纲 |
| `depends_on` | Array<String> | JSON 数组 | 前置步骤 ID 数组 (用于定义步骤间的依赖有向边) |

* **(2) 上下文对象 (SkillStepDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `depends_on_steps` | Array<SkillStepDomain> | 领域引用 | 组装为步骤实例列表，用于 **PA-03** 拓扑解环校验 |

* **(3) 前端使用对象 (SkillStepVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_is_selected` | Boolean | 节点选中状态 | 沙箱卡片流编辑器中高亮边框渲染 |

---

#### 3.3 SandboxContext（沙箱隔离中枢 - 实体）
**定义**：贯穿系统运行安全隔离、审校校验、预处理暂存与隐私脱敏的核心通用支撑容器与安全隔离中枢实体。

* **(1) 实体对象 (SandboxContextDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 沙箱上下文全局唯一标识 |
| `type` | Enum | 必填 | 职责类型：`AGENT_RUNTIME` (Agent 运行) / `SKILL_VALIDATION` (技能审校) / `BOOK_PARSING` (解析暂存) / `PRIVACY_REDACTION` (脱敏隔离) |
| `target_entity_id` | String | 可选 | 绑定的目标实体 ID (Agent / Skill / Book / Note ID) |
| `security_level` | Enum | 必填 | 隔离等级：`STRICT_ISOLATED` (独立进程) / `READ_ONLY` (只读通道) / `EPHEMERAL_STAGING` (临时暂存) |
| `validation_status` | Enum | 必填 | 状态：`PENDING` (准备中) / `VALIDATED` (解算通过) / `DEADLOCK_BLOCKED` (死锁阻断) / `PARSED` (物料解析完成) |
| `isolation_policy` | Object | JSON 结构 | 安全策略 (如 `no_network: true`, `no_shell: true`) |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (SandboxContextDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域能力 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `topology_checker` | Object / Function | 拓扑算法能力 | 充血校验算子：执行拓扑解环，更新 `validation_status` |

* **(3) 前端使用对象 (SandboxContextVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_status_badge` | String | 沙箱状态徽章文本 | 右下角沙箱状态面板提示文字 |
| `_ui_error_alert` | String | 死锁/越权报错强提醒 | 当 `DEADLOCK_BLOCKED` 时展红色报警弹窗 |

---

### 4. 图谱与检索上下文 (Graph & Retrieval Context)

> [!IMPORTANT]
> 知识图谱与向量索引定位为**旁路消费服务 (Bypass Sidecar Engine)**，100% 异步隔离，不阻塞主业务 API 操作。

#### 4.1 VectorChunkIndex（密集向量切片索引 - 实体）
**定义**：驱动 Dense RAG 即时检索缓存的核心索引实体，存入 `sqlite-vec` 虚表。

* **(1) 实体对象 (VectorChunkIndexDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 向量切片全局唯一标识 |
| `source_type` | Enum | 必填 | 来源类型：`BOOK_BLOCK` (图书段落) / `NOTE_CARD` (思考笔记) / `DISCUSS_MSG` (伴读对话) |
| `source_id` | String | 必填 | 归属主体 ID (`book_id` / `note_id` / `session_id`) |
| `block_id` | String | 可选 | 物理段落块 ID (对应 `ContentBlock.block_id`，用于原文闪烁高亮) |
| `embedding` | Blob / FloatArray | 必填 | 文本切片生成的高维 Dense Vector (`sqlite-vec` 存储) |
| `text_hash` | String | 必填 | 原始文本哈希值 (SHA-256)，用于去重更新与增量缓存校验 |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (VectorChunkIndexDomain)** (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `cosine_distance` | Float | 领域计算 | 余弦距离得分（检索时计算填充） |

* **(3) 前端使用对象 (VectorChunkIndexVO)**
*(内部检索引擎专用模型，无直接 UI 衍生属性)*

---

#### 4.2 GraphNode（知识原子节点 - 实体/聚合根）
**定义**：图谱中的独立概念/实体节点，包含新陈代谢权重 `weight` 与状态降级特性。

* **(1) 实体对象 (GraphNodeDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 图谱节点唯一标识 |
| `name` | String | 必填 | 实体概念名称 |
| `entity_type` | Enum | 必填 | 实体类型：`CONCEPT` (概念) / `METHODOLOGY` (方法论) / `TOOL` (工具) |
| `source_id` | String | 外键 | 来源实体 ID (Book/Note ID) |
| `weight` | Float | 默认 1.0 | 置信度与代谢权重 (0.0 - 1.0) |
| `status` | Enum | 必填 | 状态：`ACTIVE` (活跃) / `FALSIFIED` (被证伪) / `DECAYED` (衰变) |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (GraphNodeDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `related_edges` | Array<GraphEdgeDomain> | 领域集合 | 组装的网状邻居关系边集合 (图论邻接表) |
| `tag_super_nodes` | Array<TagSuperNodeDomain> | 领域引用 | 所归属的全局标签超节点引用 |

* **(3) 前端使用对象 (GraphNodeVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_opacity` | Number | 视觉透明度 | 当 `weight < 0.4` 或处于 `DECAYED`/`FALSIFIED` 状态时，透明度自动降至 40% |
| `_ui_color_code` | String | 节点渲染色彩 | 根据 `entity_type` 与 `status` 映射节点的渲染颜色 |

---

#### 4.3 TagSuperNode（标签超节点 - 实体）
**定义**：在图谱中作为“超节点”聚拢散落笔记与实体的全局标签，支持 LLM 同义词对齐。

* **(1) 实体对象 (TagSuperNodeDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 标签超节点唯一标识 |
| `name` | String | 必填 | 规范化主标签名称 (如 `#人工智能`) |
| `synonym_tags` | Array<String> | JSON 数组 | 对齐合并的同义词标签列表 (如 `["#AI", "#人工智能"]`) |
| `node_count` | Number | 默认 0 | 聚合聚拢的节点/笔记统计数量 |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (TagSuperNodeDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `grouped_nodes` | Array<GraphNodeDomain> | 领域集合 | 被该超节点聚拢的 GraphNode 实体列表 |

* **(3) 前端使用对象 (TagSuperNodeVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_badge_color` | String | 超节点专属徽章颜色 | 图谱画布中突出大尺寸超节点视觉 |

---

#### 4.4 GraphEdge（认知关系边 - 实体）
**定义**：连接 GraphNode 节点之间的有向/无向认知关系边，包含包含、关联与证伪关系。

* **(1) 实体对象 (GraphEdgeDO)** - 落库模型

| 字段名 | 类型 | 约束 / 可选性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `id` | String | 主键 (UUID) | 关系边唯一标识 |
| `source_node_id` | String | 外键 (GraphNode) | 起始节点 ID |
| `target_node_id` | String | 外键 (GraphNode) | 目标节点 ID |
| `relation_type` | Enum | 必填 | 关系类型：`ASSOCIATES` (相关) / `FALSIFIES` (反驳/证伪) |
| `weight` | Float | 默认 1.0 | 关系边强度权重 (0.0 - 1.0) |
| `created_at` / `updated_at` | DateTime | 必填 | 系统审计时间戳 |

* **(2) 上下文对象 (GraphEdgeDomain)** - 内存充血模型 (继承 DO)

| 附加/覆写字段名 | 类型 | 领域属性 | 含义描述 |
| :--- | :--- | :--- | :--- |
| `source_node` | GraphNodeDomain | 领域引用 | 起始节点实体装载 |
| `target_node` | GraphNodeDomain | 领域引用 | 目标节点实体装载 |

* **(3) 前端使用对象 (GraphEdgeVO)** - 交互模型 (继承 DO 基础属性)

| 附加/覆写字段名 | 类型 | 含义描述 | 前端交互用途 |
| :--- | :--- | :--- | :--- |
| `_ui_line_style` | String | 连线视觉样式 | `ASSOCIATES` 渲染实线；`FALSIFIES` 渲染灰色/红色虚线 |
| `_ui_line_color` | String | 连线颜色 | 结合 `relation_type` 计算出的 HEX 颜色串 |

---

## 四、 实体关系汇总与约束对照

| 聚合根 / 实体 | 所属上下文 | 级联物理删除策略 (Hard Delete) | 核心存储介质 |
| :--- | :--- | :--- | :--- |
| `Project` | 项目与任务上下文 | 级联删除 `TaskChain`, `Task`, `Book` | SQLite 数据表 |
| `TaskChain` | 项目与任务上下文 | 级联删除下属 `Task` | SQLite 数据表 |
| `Task` | 项目与任务上下文 | 清理关联记录与 DAG 边 | SQLite 数据表 |
| `Book` | 项目与任务上下文 | 清理物理文件 `storage_path` 与 `parsed_content.json` | SQLite 数据表 + 磁盘文件 |
| `MaterialNote` | 笔记与知识上下文 | 级联断开 `SynthesizedNote` 组合 | SQLite 数据表 |
| `SynthesizedNote` | 笔记与知识上下文 | 级联物理删除 Markdown 文件 | SQLite 数据表 + 磁盘 Markdown 文件 |
| `KnowledgeBase` | 笔记与知识上下文 | 删除目录结构与归档文件 | SQLite 数据表 + 磁盘文件夹 |
| `SourceAnchor` | 笔记与知识上下文 | 硬删除关联索引 | SQLite 数据表 |
| `Skill` | 技能沙箱上下文 | 清理 `SKILL.md` 物理文件与 `SkillStep` | SQLite 数据表 + `SKILL.md` 文件 |
| `SandboxContext` | 技能沙箱上下文 | 强行销毁沙箱进程与句柄 | SQLite / 内存句柄 |
| `VectorChunkIndex` | 图谱与检索上下文 | 从 `sqlite-vec` 虚表中清除向量 | `sqlite-vec` 虚表 |
| `GraphNode` | 图谱与检索上下文 | 级联删除关联的 `GraphEdge` | SQLite 数据表 |
| `TagSuperNode` | 图谱与检索上下文 | 孤立超节点自动物理清除 | SQLite 数据表 |
| `GraphEdge` | 图谱与检索上下文 | 硬删除连线 | SQLite 数据表 |
