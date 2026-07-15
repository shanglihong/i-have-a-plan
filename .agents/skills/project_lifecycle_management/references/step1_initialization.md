# Step 1: 项目工程物理初始化与多 Agent 协作规范 (详细标准)

本规范为项目生命周期 Step 1 的具体执行细则。

## 一、标准目录结构初始化 (SOP)

### 1. 物理结构划分
在仓库根目录下，必须明确划分以下三个模块：
*   `frontend/`：前端模块目录。
*   `backend/`：后端模块目录。
*   `docs/`：项目规范文档目录，作为整个项目的“真理之源（Source of Truth）”。

### 2. docs/ 的 11 个分层子目录定义
在 `docs/` 目录下，必须按顺序创建以下 11 个英文命名并带有两位数字序号前缀的子目录。此排序表示了标准的软件工程设计与流转顺序：
1.  `docs/01_business_research/` —— 业务调研
2.  `docs/02_competitor_analysis/` —— 竞品分析
3.  `docs/03_business_modeling/` —— 业务问题建模
4.  `docs/04_interaction_design/` —— 核心交互链路设计
5.  `docs/05_ux_specification/` —— 产品原型规范
6.  `docs/06_system_architecture/` —— 系统架构设计
7.  `docs/07_data_model/` —— 数据模型
8.  `docs/08_api_specification/` —— API规范与协议契约
9.  `docs/09_frontend_implementation_plan/` —— 前端实现计划
10. `docs/10_backend_implementation_plan/` —— 后端实现计划
11. `docs/11_integration_and_deployment/` —— 联调以及发布部署

### 3. 占位与追踪约定
*   **绝对禁止预置大纲模板**。各目录在初始化阶段必须保持为空。
*   为了防止 Git 忽略空目录，必须在 `frontend/`、`backend/` 以及 `docs/` 下的 11 个子目录中分别创建一个空的 `.gitkeep` 占位文件。

---

## 二、多 Agent 职责与协作边界

为了确保在多 Agent 开发模式下，开发流的强内聚与松耦合，必须在项目根目录下生成 `agents.md`，硬性约束以下协作机制：

### 1. 真理之源（Source of Truth）原则
*   **先规范，后代码**：凡是涉及业务实体、API 协议、数据库表结构或系统架构的设计变更，**严禁直接修改代码**。
*   **流转机制**：必须首先在 `docs/` 目录的相应规范中提出修改并通过审查后，代码级 Agent 才能进行开发实现。

### 2. 前后端强解耦自治
*   **前端限制**：前端 Agent 仅允许读写 `frontend/` 目录下的文件。严禁读写 `backend/` 下的任何代码。
*   **后端限制**：后端 Agent 仅允许读写 `backend/` 目录下的文件。严禁读写 `frontend/` 下的任何代码。
*   **唯一契约**：前端与后端的唯一联调和协议桥梁是 `docs/08_api_specification` 中定义的 API 规范。
