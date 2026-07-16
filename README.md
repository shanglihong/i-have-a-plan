# i-have-a-plan

> **我有一个计划 (i-have-a-plan)**：一个基于 AI Agent 技术的智能阅读辅导、个人第二大脑（知识图谱）构建与方法论技能沉淀的闭环计划管理系统。

---

## 项目文档生命周期体系 (Docs Tree)

项目开发与设计遵循标准化生命周期规范，所有核心文档均归档于 `docs/` 目录中。各层级文档与已产出文件树状索引如下：

* **[docs/](./docs/)**
  * ├── **[01_business_research/](./docs/01_business_research/)** `[已落定 - 阶段归档]` (业务调研、反向防御与 Lead 技术决策)
    * ├── [business_research.md](./docs/01_business_research/business_research.md) (正向场景目标、技术对比与混合架构调研报告)
    * ├── [business_research_adversarial.md](./docs/01_business_research/business_research_adversarial.md) (反向安全防御、难点评估矩阵与折中决策报告)
    * └── [business_summary.md](./docs/01_business_research/business_summary.md) (Lead 评审裁决、核心边界定义与三道防线报告)
  * ├── **[02_competitor_analysis/](./docs/02_competitor_analysis/)** `[待启动]` (竞品分析与产品差异化定位)
  * ├── **[03_business_modeling/](./docs/03_business_modeling/)** `[待启动]` (业务问题与核心领域建模)
  * ├── **[04_interaction_design/](./docs/04_interaction_design/)** `[待启动]` (系统核心交互链路与时序设计)
  * ├── **[05_ux_specification/](./docs/05_ux_specification/)** `[待启动]` (页面原型与各交互状态规范设计)
  * ├── **[06_system_architecture/](./docs/06_system_architecture/)** `[待启动]` (系统技术栈与全局拓扑架构设计)
  * ├── **[07_data_model/](./docs/07_data_model/)** `[待启动]` (数据实体模型与数据库表结构设计)
  * ├── **[08_api_specification/](./docs/08_api_specification/)** `[待启动]` (前后端强解耦的交互 API 契约设计)
  * ├── **[09_frontend_implementation_plan/](./docs/09_frontend_implementation_plan/)** `[待启动]` (前端编写实现计划与独立测试用例)
  * ├── **[10_backend_implementation_plan/](./docs/10_backend_implementation_plan/)** `[待启动]` (后端编写实现计划与安全防线落地)
  * └── **[11_integration_and_deployment/](./docs/11_integration_and_deployment/)** `[待启动]` (联调集成、自动化测试与 CI/CD 部署)

---

## 智能体技能体系 (Agent Skills Tree)

本项目中沉淀的智能体技能（Agent Skills）与研发协作规范归档于 `.agents/` 目录下，用于指导 Agent 执行工程全生命周期的任务拆解、规则引导与评审裁决：

* **[.agents/](./.agents/)**
  * ├── [AGENTS.md](./.agents/AGENTS.md) (多 Agent 职责、前后端强解耦边界与协作铁律契约)
  * └── **[skills/](./.agents/skills/)** (智能体专属技能库)
    * └── **[project_lifecycle_management/](./.agents/skills/project_lifecycle_management/)** `[已启用]` (工程生命周期流程控制与多 Agent 协作技能)
      * ├── [SKILL.md](./.agents/skills/project_lifecycle_management/SKILL.md) (生命周期通用高层步骤索引)
      * └── **[references/](./.agents/skills/project_lifecycle_management/references/)** (各生命周期步骤的详细执行规范与设计模板)
        * ├── [step1_initialization.md](./.agents/skills/project_lifecycle_management/references/step1_initialization.md) (Step 1：物理工程初始化与目录层级创建规范)
        * ├── [step2_project_rules.md](./.agents/skills/project_lifecycle_management/references/step2_project_rules.md) (Step 2：引导用户添加及持久化项目级规则规范)
        * ├── [step3_business_research.md](./.agents/skills/project_lifecycle_management/references/step3_business_research.md) (Step 3：正向业务调研成文、反向防御审查规范)
        * └── [lead_review.md](./.agents/skills/project_lifecycle_management/references/lead_review.md) (通用 Lead 评审与决策前置总结五段式模板规范)
