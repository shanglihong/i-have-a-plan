# 辅助阅读与知识技能沉淀系统交互链路 v1.0

本文档基于 [业务模型规范](../03_business_modeling/business_model.md) 与 [交互状态规范 v1.0](flow_state_spec-v1.0.md) 编写，旨在明确系统中核心概念、角色互动以及关键交互链路的时序过程与流程约束，为后续系统架构、前端原型及数据模型设计提供坚实的契约底座。

---

## 一、 项目核心交互时序图 (Core Sequence Diagrams)

### 1. 阅读项目交互

> [!NOTE]
> **阅读项目统一模型范式**：
> 系统遵循 `Project -> Task Chain -> Task` 统一三层范式。阅读项目的底层逻辑与计划项目一致，本质同样是一个 Task 项目——电子书解析后的各个章节大纲被自动实例化为 `Task Chain`（`READING_CHAPTER`），章节内的段落精读、划词讨论与内化实践对应微观可执行单元 `Task`。

#### 1.1 图书解析与阅读项目初始化交互时序

展示用户上传电子书后，系统物理切片、异步大纲生成、根据章节自动拆解 Task 任务树、绑定伴读 Agent 并推送通知自动转为 `ACTIVE` 状态的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 选择电子书并提交创建阅读项目
    FE->>BE: 提交创建请求 (上传文件、绑定参数、截止时间)
    BE->>BE: 保存文件、创建 Book & Project 记录 (状态: PARSING)
    BE->>BE: 解析图书目录，按章节自动拆解生成 Task Chain (READING_CHAPTER) 与默认阅读 Task，绑定伴读 Agent
    BE-->>FE: 推送解析与 Task 自动拆解完成通知 (parsed_structure 就绪，状态自动转 ACTIVE)
```

> [!NOTE]
> **旁路建图与伴读隔离契约 (PA-02 & PA-05)**：
> 图书解析过程仅生成阅读所需的文本切片与大纲结构，知识图谱抽取为后台闲时旁路服务，不阻塞 Book 状态转为 `COMPLETED`。伴读 Agent 在独立沙箱中物理隔离运行，仅能通过管道进行文字交互。

---

#### 1.2 阅读项目浏览与内容阅读交互时序

展示用户加载阅读项目列表、点击查看图书目录大纲，以及点击目录章节查看具体正文切片内容的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 访问阅读项目列表
    FE->>BE: 请求阅读项目列表
    BE-->>FE: 返回项目列表与状态数据 (含 ACTIVE / PARSING 等)

    User->>FE: 点击选择处于 ACTIVE 状态的阅读项目
    FE->>BE: 请求图书大纲目录树
    BE-->>FE: 返回级联大纲目录结构 (parsed_structure)

    User->>FE: 点击大纲目录中的具体章节
    FE->>BE: 请求对应章节的正文内容切片
    BE-->>FE: 返回章节正文切片与绑定的笔记/讨论数据
    FE->>FE: 展现章节正文切片与关联读思数据
```

---

#### 1.3 素材笔记沉淀与原文双向锚点定位交互时序

展示用户在阅读时通过“章节末推荐引导”或“划词动作”生成笔记、注入内化 Task，以及系统基于 `Source Anchor` 进行双向跳转定位的关键交互过程。

> [!NOTE]
> **阅读项目笔记与 Task 关联契约**：
> 阅读项目中的笔记与计划项目一样，均统一物理关联至对应的微观 `Task` 实体（如绑定本章节/本段落的阅读 Task），同时携带有物理原文锚点 `Source Anchor`。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    alt 场景 A: 章节末推荐引导与内化 Task 注入
        FE->>FE: 监测阅读进度达到章节末且未读，展示推荐气泡
        User->>FE: 点击气泡发起伴读对话
        FE->>BE: 请求启发式思考题
        BE-->>FE: 返回思考题与引导卡片
        User->>FE: 点击卡片“加入执行计划” (一键生成内化 Task)
        FE->>BE: 提交创建内化实践 Task 请求
        BE->>BE: 生成内化 Task (状态: PENDING) 并更新章节已读状态
        BE-->>FE: 返回 Task 创建成功与新进度数据
    else 场景 B: 划词 Discuss 与记笔记
        User->>FE: 划选正文文本
        alt 划词记笔记
            User->>FE: 点击“记笔记”并输入感悟
            FE->>BE: 提交笔记数据 (关联 Task ID 与 Source Anchor，物理加密 - PA-06)
            BE-->>FE: 返回保存结果
        else 划词 Discuss
            User->>FE: 点击“Discuss”并发起提问
            FE->>BE: 提交对话上下文
            BE-->>FE: 返回解答 (支持存为笔记卡片)
        end
    else 场景 C: Trace-to-Source 双向定位
        User->>FE: 点击笔记的 [定位原文] 按钮
        FE->>FE: 跳转定位至对应正文段落 (主偏移失效时执行字符匹配定位)
    end
```

---

#### 1.4 24小时超时优雅休眠与一键唤醒交互时序 (PA-04 契约)

展示用户长时间无交互时阅读项目自动释放连接持久化会话，以及用户重新访问时进行一键唤醒重载的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    Note over BE: 24 小时无交互
    BE->>BE: 持久化上下文与 Trace 栈，释放 Agent 句柄 (状态: SUSPENDED)

    User->>FE: 访问已休眠的阅读项目 (提示“会话已休眠”)
    User->>FE: 点击 [一键唤醒]
    FE->>BE: 请求唤醒会话
    BE->>BE: 重建 Agent 沙箱上下文 (状态转为 ACTIVE)
    BE-->>FE: 返回唤醒成功通知
```

---

#### 1.5 AI 伴读与沙箱 Agent 双模交互时序

展示用户在阅读正文时发起划词 Discuss 被动解答（含 SSE 流式响应与 Action Cards 附带）、章节末尾 5% 范围触发对话流内部主动推送（Active Messages），以及伴读对话一键转存思考笔记与双向高亮追溯的完整交互过程。

> [!IMPORTANT]
> **伴读交互原则 (PA-05 & PA-08)**：
> 1. **对话流内部主动推送**：伴读 Agent 避免在主视图中使用阻塞式弹窗打扰用户。章节末尾 5%（95% 滚动位置）的主动推送直接插入侧边栏对话流底部，单章限制推送 1 次。
> 2. **智能转笔记与双向追溯**：伴读回答卡片一键转化为 `MaterialNote`（`source_type="COMPANION_CONVERTED"`），后端自动持久化关联的 `SourceAnchor` 物理原文快照，支持阅读器与笔记面板的双向闪烁跳转。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端
    participant Runner as Agent 沙箱 (PA-05)

    alt 场景 A: 划词 Discuss 被动解答 (SSE 流式响应)
        User->>FE: 划选正文文本并点击 [Discuss with AI]
        FE->>BE: 发起流式对话 POST /api/v1/agent/chat/stream (mode="READING_COMPANION", trigger_type="DISCUSS")
        BE->>BE: ContextBuilder 组装动态 Prompt (选中文本 + 邻近 Block + 章节 Summary)
        BE->>Runner: 通过受限 Pipe 通道发送 Prompt
        loop SSE Token 增量推送
            Runner-->>BE: 产生 Token Chunk
            BE-->>FE: SSE 推送 event: message, data: { type: "TOKEN", content: Chunk }
            FE->>FE: 实时增量渲染伴读回答
        end
        Runner-->>BE: 产生 Action Cards (启发追问 / 一键转笔记)
        BE-->>FE: SSE 推送 event: message, data: { type: "ACTION_CARDS", cards: [...] }
        BE-->>FE: SSE 推送 event: done
    else 场景 B: 章节末尾 5% 对话流主动推送 (Active Message)
        FE->>FE: 监听阅读器滚动进度达到 95% (章节末尾 5% 范围)
        FE->>BE: 发起流式对话 POST /api/v1/agent/chat/stream (mode="READING_COMPANION", trigger_type="CHAPTER_END_95")
        BE->>BE: 校验单章单次频控规则，组装章节 Summary 上下文
        BE->>Runner: 执行沙箱提问组装
        Runner-->>BE: 返回启发性小结与费曼重述测试卡片
        BE-->>FE: 返回 Active Message 数据包
        FE->>FE: 在伴读侧边栏对话流底部插入主动推送消息 (无打扰静默呈现)
    else 场景 C: 伴读对话一键转存思考笔记 (AgentMessage -> MaterialNote)
        User->>FE: 点击伴读回复卡片下方的 [转存为笔记]
        FE->>BE: 提交转存请求 POST /api/v1/agent/message/convert-to-note (携带 message_id 与转述)
        BE->>BE: 创建 MaterialNote (source_type="COMPANION_CONVERTED") 并持久化 SourceAnchor
        BE-->>FE: 返回 note_id 与创建成功通知 (201 Created)
        FE->>FE: 侧边栏笔记面板实时插入新笔记卡片，支持点击 [定位原文] 触发物理高亮
    end
```

---

### 2. 计划项目交互

#### 2.1 计划项目初始化与 Skill 任务拆解交互时序

展示用户创建计划项目时选择/搜索 Active 技能模板注入，通过监督 Agent 对话微调并确认需创建的 Task 任务树，最终将项目状态由 `INIT` 扭转为 `ACTIVE` 的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 选择/搜索关联 Skill 模板并提交创建计划项目 (输入项目名、截止时间)
    FE->>BE: 提交创建请求 (携带选定 Skill ID，创建 Project 记录，状态: INIT)
    BE->>BE: 绑定监督 Agent
    BE-->>FE: 返回预创建成功(状态: INIT)

    User->>FE: 在工作台中与监督 Agent 对话微调并确认需创建的 Task 任务树
    FE->>BE: 确认提交 Task 任务树请求
    BE->>BE: 物理生成 Task 树与依赖链，项目状态由 INIT 扭转为 ACTIVE
    BE-->>FE: 返回项目 ACTIVE 就绪通知 (开启看板/甘特图工作台)
```

---

#### 2.2 计划项目推进与 Task 笔记补充交互时序

展示用户在推进计划项目执行时，标记 Task 启动与完成状态、在 Task 卡片中补充记录笔记感悟，以及后端物理关联 Task ID 的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 标记任务开始执行 (状态转为 RUNNING)
    FE->>BE: 提交任务状态更新请求
    BE->>BE: 更新 Task 状态为 RUNNING
    BE-->>FE: 返回状态更新成功

    User->>FE: 在 Task 执行卡片中补充记笔记 (录入经验感悟与实践心得)
    FE->>BE: 提交笔记数据 (物理关联当前 Task ID，加密存储 - PA-06)
    BE->>BE: 保存笔记实体并绑定 Task 物理外键
    BE-->>FE: 返回笔记保存成功与关联展示

    User->>FE: 勾选完成当前任务 (状态转为 COMPLETED)
    FE->>BE: 提交任务完成请求
    BE->>BE: 更新 Task 状态为 COMPLETED，自动解锁 DAG 后继依赖 Task
    BE-->>FE: 返回完成成功与新解锁 Task 数据
```

---

#### 2.3 项目完结生成复盘 Task 与归档交互时序 (全项目通用机制)

展示当项目内所有常规 Task 完成后，系统自动创建末尾特殊复盘 Task（类型为 `RETROSPECTIVE`），引导用户在该 Task 中录入经验笔记（Experience Note）并勾选完成，进而触发项目归档、旁路构建 `Falsifies` 证伪边以及驱动底层 Skill 产生变异草稿（Skill Mutation）的关键交互过程。

> [!NOTE]
> **全项目通用复盘 Task 契约**：
> 明确当项目内所有常规 Task 完成后，系统仅推送完成通知并呈现复盘引导卡片；只有在用户**点击【复盘卡片】**后，才触发发送创建请求追加生成类型为 RETROSPECTIVE 的特殊 Task。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    BE->>BE: 检测到项目内所有常规 Task 均已 COMPLETED
    BE-->>FE: 推送全任务已完成通知与新增复盘 Task 卡片

    User->>FE: 点击进入 [项目复盘 Task]
    FE->>FE: 展示复盘导引卡片与项目历史笔记/Trace 汇总（复盘可以参考之前的任务卡片的笔记以及Trace信息）

    User->>FE: 在复盘 Task 中录入复盘经验笔记 (Experience Note) 并勾选完成
    FE->>BE: 提交复盘 Task 完成与复盘笔记数据
    BE->>BE: 保存复盘笔记实体，复盘 Task 状态转 COMPLETED
    BE->>BE: 释放 Agent 资源句柄，项目状态转为 ARCHIVED
    BE->>BE: 异步通知知识图谱提取实体 (PA-02) 与触发 Skill 变异草稿生成
    BE-->>FE: 返回项目归档成功通知 (页面转为强只读状态)
```

---

#### 2.4 任务逾期阻碍诊断与半自动重调度交互时序

展示任务超出截止时间后，系统标记 `BLOCKED` 状态、诊断阻碍瓶颈，以及用户通过“一键顺延”或“甘特图拖拽”进行半自动重调度的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    BE->>BE: 检测到任务逾期，标记状态为 BLOCKED
    BE-->>FE: 推送逾期变更通知
    FE->>FE: 标记逾期任务与阻塞瓶颈

    User->>FE: 点击 [重调度]
    alt 方案一: 一键顺延
        User->>FE: 输入顺延天数并提交
        FE->>BE: 请求顺延排期
        BE->>BE: 按拓扑依赖更新后继任务时间
    else 方案二: 甘特图拖拽
        User->>FE: 拖拽调整任务时间表并提交
        FE->>BE: 提交新排期时间表
    end

    BE-->>FE: 返回更新结果 (状态恢复 RUNNING)
    FE->>FE: 更新任务数据与排期视图
```

---

### 3. 技能提炼与沙箱拓扑交互

> [!NOTE]
> **Trace-to-Skill 多源提炼契约**：
> 技能提炼支持跨来源上下文，L1（碎片单点）、L2（章节/板块）、L3（全书/项目）三级提炼的输入既可以是阅读项目的图书正文切片，也可以是用户积累的各类笔记内容（包含划词感悟、Discuss 问答记录与复盘经验笔记）。

#### 3.1 Trace-to-Skill 三级提炼与沙箱拓扑阻断交互时序 (PA-03 契约)

展示从多源上下文（图书正文或笔记内容）提炼 Prompt 技能，并在沙箱编辑器中进行依赖解算、环路阻断（禁用“批准入库”）及解环入库的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 点击技能提炼 (上下文可来自图书切片或笔记内容)
    FE->>BE: 提交关联多源上下文编译技能
    BE->>BE: 生成 SKILL.md 存入隔离沙箱
    BE-->>FE: 返回技能生成通知 (状态: SANDBOX)

    User->>FE: 编辑节点依赖关系
    FE->>FE: 校验拓扑 (若成环则提示死锁并禁用“批准入库”)

    User->>FE: 解除成环连线后点击 [批准入库]
    FE->>BE: 提交技能激活请求
    BE->>BE: 移入 active/ 目录 (状态转 ACTIVE)
    BE-->>FE: 返回激活成功通知
```

---

### 4. 知识库管理交互

#### 4.1 创建知识库目录交互时序

展示用户在知识库管理中心创建新目录/分类树节点，后端初始化目录记录并同步更新前端知识库目录树的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 点击 [新建目录] 并输入目录名称与父级节点
    FE->>BE: 提交创建知识库目录请求
    BE->>BE: 保存知识库目录实体记录
    BE-->>FE: 返回目录创建成功与最新知识库目录树数据
```

---

#### 4.2 沉淀笔记创建与素材笔记引用交互时序

展示用户在知识库中创建内化转述笔记（Synthesized Note）时，检索选择素材笔记（Material Note / Highlight Note）建立关联引用的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 点击 [新建沉淀笔记]
    FE->>BE: 请求素材笔记列表与可引用片段
    BE-->>FE: 返回素材笔记数据 (含原文切片与 Anchor)

    User->>FE: 勾选/搜索引用素材笔记，输入转述内化心得
    FE->>BE: 提交沉淀笔记创建请求 (关联素材笔记 ID 列表)
    BE->>BE: 保存沉淀笔记实体，建立与素材笔记的 Reference 关联
    BE-->>FE: 返回沉淀笔记创建成功与引用关联关系
```

---

#### 4.3 沉淀笔记转化为知识图谱节点与 Skill 技能交互时序

展示用户在知识库中选择沉淀笔记（Synthesized Note），触发将其提炼转化为知识图谱节点（GraphNode）以及转化编译为 Active Skill 技能的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 选择目标沉淀笔记 (Synthesized Note)
    alt 场景 A: 转化为知识图谱节点
        User->>FE: 点击 [提取为图谱节点]
        FE->>BE: 提交图谱节点提取请求 (包含笔记上下文)
        BE->>BE: 抽取概念实体与关系边，挂载至全局图谱 (PA-02)
        BE-->>FE: 返回图谱节点生成成功与 Quick Peek 追溯入口
    else 场景 B: 转化为 Skill 技能
        User->>FE: 点击 [提炼为 Skill] (Trace-to-Skill)
        FE->>BE: 提交编译 Skill 请求 (包含笔记上下文)
        BE->>BE: 生成 SKILL.md 存入隔离沙箱
        BE-->>FE: 返回技能生成通知 (引导进入沙箱拓扑编辑器)
    end
```

---

### 5. 知识图谱漫游交互

#### 5.1 全局图谱漫游与 Quick Peek 沉浸式追溯交互时序 (PA-07 契约)

展示用户在图谱中漫游时点击节点或证伪边，通过 Quick Peek 浮窗追溯上下文的关键交互过程。

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant FE as 前端
    participant BE as 后端

    User->>FE: 点击图谱节点或证伪边
    FE->>BE: 请求节点原文与历史笔记数据
    BE-->>FE: 返回富文本数据与关联锚点
    FE->>FE: 弹出 Quick Peek 浮窗展现内容 (不跳转页面 - PA-07)
    User->>FE: 阅览完毕后关闭浮窗
    FE->>FE: 销毁浮窗恢复图谱视口
```
