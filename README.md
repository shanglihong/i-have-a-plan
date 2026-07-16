# i-have-a-plan

> **我有一个计划 (i-have-a-plan)**：一个基于 AI Agent 技术的智能阅读辅导、个人第二大脑（知识图谱）构建与方法论技能沉淀的闭环计划管理系统。

---

## 项目文档生命周期体系 (Docs Tree)

项目开发与设计遵循标准化生命周期规范，所有核心文档均归档于 `docs/` 目录中。目录、交付文件与说明映射如下：

| 规范阶段与目录路径 (Directory) | 交付文件 (Files) | 职责与说明 (Description) |
| :--- | :--- | :--- |
| **[`docs/01_business_research/`](./docs/01_business_research/)** | <ul><li>[`business_research.md`](./docs/01_business_research/business_research.md) (正向调研)</li><li>[`business_research_adversarial.md`](./docs/01_business_research/business_research_adversarial.md) (反向防御)</li><li>[`business_summary.md`](./docs/01_business_research/business_summary.md) (Lead 裁决)</li></ul> | 业务正向调研、反向质疑与决策归档 (已落定) |
| **[`docs/02_competitor_analysis/`](./docs/02_competitor_analysis/)** | - | 竞品功能调研与产品差异化定位 |
| **[`docs/03_business_modeling/`](./docs/03_business_modeling/)** | - | 核心业务实体、任务链与技能领域建模 |
| **[`docs/04_interaction_design/`](./docs/04_interaction_design/)** | - | 人机协同交互链路时序与路由控制流设计 |
| **[`docs/05_ux_specification/`](./docs/05_ux_specification/)** | - | 多状态交互页面原型及组件级 UX 规范 |
| **[`docs/06_system_architecture/`](./docs/06_system_architecture/)** | - | 系统技术栈选型与全局拓扑架构设计 |
| **[`docs/07_data_model/`](./docs/07_data_model/)** | - | 关系与图数据库表结构设计与关系定义 |
| **[`docs/08_api_specification/`](./docs/08_api_specification/)** | - | 前后端强解耦的交互 API 协议契约定义 |
| **[`docs/09_frontend_implementation_plan/`](./docs/09_frontend_implementation_plan/)** | - | 前端组件开发排期与独立单元测试用例 |
| **[`docs/10_backend_implementation_plan/`](./docs/10_backend_implementation_plan/)** | - | 核心领域服务开发时序与状态机安全防线 |
| **[`docs/11_integration_and_deployment/`](./docs/11_integration_and_deployment/)** | - | 前后端联调、自动化测试与 CI/CD 部署 |

---

## 智能体技能体系 (Agent Skills Tree)

本项目中沉淀的智能体技能（Agent Skills）与研发协作规范归档于 `.agents/` 目录下，用于指导 Agent 执行工程全生命周期的任务拆解、规则引导与评审裁决：

| 技能分类与目录路径 (Directory) | 具体规范与脚本 (Files) | 职责与说明 (Description) |
| :--- | :--- | :--- |
| **[`./.agents/`](./.agents/)** | <ul><li>[`AGENTS.md`](./.agents/AGENTS.md) (协作铁律)</li></ul> | 多 Agent 职责划分与前后端解耦边界契约 |
| **[`./.agents/skills/project_lifecycle_management/`](./.agents/skills/project_lifecycle_management/)** | <ul><li>[`SKILL.md`](./.agents/skills/project_lifecycle_management/SKILL.md) (生命周期)</li></ul> | 项目生命周期通用流程控制高层索引规范 |
| **[`./.agents/skills/project_lifecycle_management/references/`](./.agents/skills/project_lifecycle_management/references/)** | <ul><li>[`step1_initialization.md`](./.agents/skills/project_lifecycle_management/references/step1_initialization.md) (初始化)</li><li>[`step2_project_rules.md`](./.agents/skills/project_lifecycle_management/references/step2_project_rules.md) (规则引导)</li><li>[`step3_business_research.md`](./.agents/skills/project_lifecycle_management/references/step3_business_research.md) (业务调研)</li><li>[`lead_review.md`](./.agents/skills/project_lifecycle_management/references/lead_review.md) (Lead 模板)</li></ul> | 各生命周期详细执行参考标准与设计模板 |
