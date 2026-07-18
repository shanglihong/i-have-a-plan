# 后端系统核心模块架构设计规范 v1.0

> [!IMPORTANT]
> 本文档基于 [《前后端功能边界与通信协议规范》](./frontend_backend_boundary_spec_v1.0.md) 以及 [《系统业务建模》](../03_business_modeling/business_model.md) 编写。
> **架构核心基调**：摒弃传统中心化 SaaS Web 服务架构，系统以**本地化独立软件包 (Local-First Software Package)** 的形态运行。根据最新技术裁决，后端遵循**六边形架构 (Hexagonal Architecture)** 与**领域驱动设计 (DDD)** 规范，将纯业务逻辑与底层技术支撑（如隔离沙箱、存储机制）严格物理解耦。

## 一、 系统架构定位与技术栈选型

考虑到系统的强隐私要求、离线运行诉求以及“开箱即用”的数据迁移体验，后端系统采取轻量级嵌入式设计。

### 1. 核心选型决策
* **基础语言与应用框架**：**Python + FastAPI**
  * 完美支持异步并发与 SSE (Server-Sent Events) 流式输出，无缝接入 Python 原生 AI 生态。
* **AI 调度引擎**：**LangChain + LangGraph**
  * 用于编排复杂的伴读、提炼编译逻辑及 RAG 工作流；依托 LangGraph 支撑“人机协同沙箱 (Human-in-the-loop)”的状态流转。
* **数据存储与持久化**：**项目制本地物理文件夹 + SQLite**
  * 抛弃中心化数据库，所有业务实体（笔记、图谱节点、配置）存放在独立的物理 `.sqlite` 文件中，落于对应的 Project 文件夹下，实现极简数据迁移。
* **异步守护队列**：**Python 内置异步队列 (`asyncio`)**
  * 无须部署 RabbitMQ 等外部中间件，直接在后台守护进程中处理闲时构建任务。

---

## 二、 核心架构解构 (基于六边形架构)

> [!IMPORTANT]
> 遵循端口与适配器模式，系统自内向外严格分为四个层级，核心目标是**彻底将“业务大脑”与“技术底座（沙箱、存储等）”剥离**。

| 架构分层 (自内向外) | 核心定位与职责 | 设计约束与特点 |
| :--- | :--- | :--- |
| **1. 领域层 (Domain Layer)** | **纯业务逻辑大脑**<br>定义核心实体（如笔记、技能、任务链）与领域服务（如拓扑排序、跨域事件）。 | **最严格约束**：绝对屏蔽框架、LLM 和物理 I/O，保持最内层业务纯粹性。 |
| **2. 应用层 (Application Layer)** | **业务外观与智能中枢**<br>作为工作流编排器，收敛所有的 LangGraph Agent 交互与业务用例协调。 | **依赖反转**：通过接口 (Port) 调用基础设施，不对底层组件进行硬编码。 |
| **3. 基础设施层 (Infrastructure Layer)** | **技术支撑底座 (被动适配器)**<br>提供具体技术实现：本地沙箱隔离机制、文件/SQLite 存储引擎、大模型适配。 | **受控调用**：仅作为被动支撑方，负责数据持久化、安全性拦截与外部通信。 |
| **4. 接入层 (Driving Adapters)** | **通信入口 (主动适配器)**<br>依托 FastAPI 提供 RESTful API 与 SSE 流式通信推流。 | **边界转化**：负责接收前端触发，将外部数据转化为内部领域语言并驱动应用层。 |

> [!NOTE]
> **防腐接口 (Ports) 的代码放置规范 (契约编程)**
> 遵循“务实派分层”理念，防腐接口的定义完全归属于“调用方（即六边形内部）”：
> * **领域级接口 (Domain Ports)**：如 `RepositoryPort`（仓储接口）。定义在 **Domain 层**。允许 Domain Service 依赖这些接口执行必要的数据校验，由基础设施层负责实现和运行时注入。
> * **应用级接口 (Application Ports)**：如 `LLMPort`（模型通信）、`SandboxPort`（沙箱隔离）。定义在 **App 层**。由业务用例 (Use Cases) 统筹调用，Domain 层对这些纯技术驱动的能力完全无感知。

---

## 三、 核心架构图解 (Architecture Diagrams)

### 1. 六边形系统全局架构图 (Hexagonal Architecture)
展示内外层的解耦关系，突出业务逻辑（核心域）与技术基础设施（沙箱、存储）的物理抽离。

```mermaid
graph TD
    subgraph DrivingAdapters ["主动适配器 (接入层)"]
        REST["REST API (FastAPI)"]
        SSE["SSE Streaming (FastAPI)"]
    end

    subgraph Hexagon ["系统边界 (六边形内部)"]
        subgraph AppLayer ["应用层 (Application Layer)"]
            UC1["伴读与沉淀笔记流编排"]
            UC2["Trace-to-Skill 编译流"]
            UC3["归档与图谱增量流"]
            UC4["项目初始化与任务拆解流"]
        end

        subgraph DomainLayer ["领域层 (Domain Layer)"]
            NTD["独立笔记领域<br>(物理锚点, File-first)"]
            SCS["技能提炼领域<br>(DAG 死锁校验算法)"]
            PTO["项目与任务领域<br>(状态机, 重调度算法)"]
            GPH["知识图谱领域<br>(异步 RAG, 知识代谢)"]
            EventBus(("领域内部事件分发"))
        end
        
        subgraph Ports ["防腐接口层 (Ports)"]
            Port_EventBus(("EventBus Port<br>(事件总线接口)"))
            Port_LLM["LLM Port<br>(大模型接口)"]
            Port_Sandbox["Sandbox Port<br>(安全沙箱接口)"]
            Port_DB["Repository Port<br>(仓储接口)"]
        end
        
        %% 应用层业务编排 (向下调用领域层)
        UC1 -->|"沉淀"| NTD
        UC2 -->|"依赖校验"| SCS
        UC3 -->|"流转状态"| PTO
        UC4 -->|"按 Skill 拆解"| PTO
        
        %% 领域事件流转 (内部解耦分发)
        NTD -.->|"NoteUpdated"| EventBus
        PTO -.->|"ProjectArchived"| EventBus
        EventBus -.->|"异步触发增量"| GPH
        EventBus -.->|"触发技能沉淀"| SCS
        
        %% 防腐抽离：核心业务统一下沉依赖接口层
        AppLayer -.->|"端口调用 (大模型/沙箱/仓储)"| Ports
        DomainLayer -.->|"端口调用 (事件总线/仓储)"| Ports
    end

    subgraph DrivenAdapters ["被动适配器 (基础设施层)"]
        subgraph EventBusAdapter ["事件总线适配器 (EventBus)"]
            AsyncioBus["后台异步任务队列<br>(asyncio task)"]
        end
        subgraph AIAdapter ["大模型适配器 (LLM)"]
            LLM["大模型通信接口<br>(LangChain API)"]
        end
        subgraph SandboxAdapter ["安全隔离适配器 (Sandbox)"]
            Sandbox["本地沙箱引擎<br>(目录 Chroot, 工具白名单)"]
        end
        subgraph StorageAdapter ["存储适配器 (Storage)"]
            FileStorage["本地物理文件存储<br>(Markdown File-first)"]
        end
        subgraph CacheAdapter ["持久化与缓存适配器 (Cache/DB)"]
            SQLiteDB["SQLite 数据库<br>(元数据检索与向量图谱)"]
        end
    end

    %% 驱动流 (主动适配器单向驱动应用层)
    DrivingAdapters -->|"触发业务编排"| AppLayer
    
    %% 基础设施实现端口 (层级映射)
    Port_EventBus --> AsyncioBus
    Port_LLM --> LLM
    Port_Sandbox --> Sandbox
    Port_DB --> FileStorage
    Port_DB --> SQLiteDB
    
    %% 沙箱底层 I/O (基础设施内部依赖)
    Sandbox -.->|"受限文件 I/O"| FileStorage
    Sandbox -.->|"受限数据库查询"| SQLiteDB
```

### 2. 限界上下文与实体边界交互图 (Bounded Context Map)
展示各个限界上下文（Domain）的边界划分、内部核心实体，以及跨上下文（Context Mapping）的事件流转与交互契约。

```mermaid
graph TD
    %% 限界上下文 (Bounded Contexts)
    
    subgraph ProjectDomain ["项目与任务上下文 (Project Context)"]
        P_Proj["Project (聚合根)"]
        P_TC["TaskChain (实体)"]
        P_Task["Task (实体)"]
        
        P_Proj -->|管理| P_TC
        P_TC -->|拆解为| P_Task
        P_Task -->|前置依赖 DAG| P_Task
    end

    subgraph NoteDomain ["独立笔记上下文 (Note Context)"]
        K_URN["UnifiedReadingNote (笔记实体)"]
        K_EN["ExperienceNote (经验实体)"]
        K_SA["SourceAnchor (物理锚点)"]
        
        K_URN -->|绑定| K_SA
    end

    subgraph GraphDomain ["知识图谱上下文 (Graph Context)"]
        K_Graph["GraphNode (图谱节点)"]
        K_Tag["TagSuperNode (标签超节点)"]
        
        K_Graph -->|认知边含证伪| K_Graph
        K_Graph -->|聚类至| K_Tag
    end

    subgraph SkillDomain ["技能编译上下文 (Skill Context)"]
        S_Skill["Skill (聚合根)"]
        S_DAG["DAG Validator (领域服务)"]
        
        S_Skill -->|请求死锁校验| S_DAG
    end

    %% 上下文映射 (Context Mapping) 与跨界边界交互
    
    %% 外部交互 / 项目域映射 (归属与沉淀)
    P_Proj -->|"【项目归档事件】<br>生成复盘"| K_EN
    P_Proj -.->|"【实体物理/逻辑归属】"| K_URN
    
    %% 笔记域 -> 图谱域 (异步事件)
    K_URN -->|"【NoteUpdatedEvent】<br>后台异步触发提取"| K_Graph
    K_EN -->|"【NoteUpdatedEvent】<br>后台异步触发提取"| K_Graph

    %% 笔记域/图谱域 -> 技能域 (提炼沉淀与修正)
    K_EN -->|"【方法论提炼事件】<br>Trace-to-Skill 沉淀"| S_Skill
    K_EN -.->|"【知识代谢预警】<br>触发既有技能修正"| S_Skill
    K_Graph -.->|"【查询请求】<br>提供 RAG 事实依据"| S_Skill
    
    %% 项目域 -> 技能域 (运行时调用与拆解)
    P_Proj -.->|"【项目初始化】<br>应用 Skill 拆解生成任务树"| S_Skill
    P_Task -.->|"【运行时调度】<br>代理调用技能执行"| S_Skill
```

### 3. 核心领域实体关系图 (Domain ERD)
展示核心领域层在 SQLite 中的数据模型逻辑关联，其中特别强化了“经验反哺”与“知识代谢”的链路。

```mermaid
classDiagram
    direction TB
    
    namespace 项目与任务领域_ProjectDomain {
        class Project_项目
        class TaskChain_任务链
        class Task_任务
    }

    namespace 独立笔记领域_NoteDomain {
        class UnifiedReadingNote_融合笔记
        class ExperienceNote_经验笔记
        class SourceAnchor_物理锚点
    }

    namespace 知识图谱领域_GraphDomain {
        class GraphNode_图谱节点
        class TagSuperNode_标签超节点
    }

    namespace 技能提炼领域_SkillDomain {
        class Skill_技能
    }

    %% 项目与任务领域内部关系
    Project_项目 "1" *-- "*" TaskChain_任务链 : 管理
    TaskChain_任务链 "1" *-- "*" Task_任务 : 拆解为
    Task_任务 "*" --> "*" Task_任务 : 前置依赖 (DAG)

    %% 跨域关联：项目 -> 笔记
    Project_项目 "1" --> "*" UnifiedReadingNote_融合笔记 : 沉淀
    Project_项目 "1" --> "0..1" ExperienceNote_经验笔记 : 归档时生成
    
    %% 笔记领域内部关系
    UnifiedReadingNote_融合笔记 "*" *-- "1" SourceAnchor_物理锚点 : 绑定
    
    %% 跨域关联：笔记 -> 图谱 (异步提取)
    UnifiedReadingNote_融合笔记 "*" --> "*" GraphNode_图谱节点 : 提取为
    ExperienceNote_经验笔记 "*" --> "*" GraphNode_图谱节点 : 提取为
    
    %% 图谱领域内部关系
    GraphNode_图谱节点 "*" --> "*" GraphNode_图谱节点 : 认知关系边 (含证伪)
    GraphNode_图谱节点 "*" --> "1" TagSuperNode_标签超节点 : 聚类对齐至

    %% 跨域关联：经验 -> 技能
    ExperienceNote_经验笔记 "*" --> "*" Skill_技能 : 提炼沉淀 / 触发修订
```

---

## 四、 对齐核心 I/O 流的职责映射

基于解耦后的架构，后端在响应前端触发的核心链路时的层级流转如下：

| 交互核心流 | 架构层级流转路径 (Layer Flow) |
| :--- | :--- |
| **划词写笔记与一键转存** | `接入层` 鉴权 -> `应用层` 编排入库逻辑 -> `领域层` 校验笔记实体与锚点合法性 -> `本地存储引擎` 执行 SQLite 落盘。 |
| **Trace-to-Skill 编译流** | `接入层` SSE 建立 -> `应用层` 协调大模型抽取与推流 -> `领域层` 进行步骤 DAG 排序 -> `沙箱引擎` 拦截非法 I/O 后安全落盘。 |
| **半自动重调度计算流** | `接入层` REST 接收拖拽 -> `应用层` 发起重排 -> `领域层` 拓扑遍历计算出所有受影响的任务链新 Deadline -> `存储引擎` 事务落盘。 |
| **归档与经验沉淀流** | `接入层` 接收复盘 -> `应用层` 挂载异步任务 -> `领域层` 检测认知缺陷产生 Mutation -> `沙箱引擎` 安全生成修改草稿。 |
