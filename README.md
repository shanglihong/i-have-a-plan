# i-have-a-plan

> **我有一个计划 (i-have-a-plan)**：一个基于 AI Agent 技术的智能阅读辅导、个人第二大脑（知识图谱）构建与方法论技能沉淀的闭环计划管理系统。

---

## 项目文档生命周期体系 (Docs Tree)

项目开发与设计遵循标准化生命周期规范，所有核心文档均归档于 `docs/` 目录中。目录与交付文件索引映射如下：

| 规范阶段与目录路径 (Directory) | 交付文件与说明 (Files & Actions) |
| :--- | :--- |
| **[`docs/01_business_research/`](./docs/01_business_research/)**<br>*业务调研与决策：正向场景目标定义与反向安全防御审查阶段* | <ul><li>[`business_research.md`](./docs/01_business_research/business_research.md)<br>_正向场景目标、技术对比与混合架构调研报告_</li><li>[`business_research_adversarial.md`](./docs/01_business_research/business_research_adversarial.md)<br>_反向安全防御、难点评估矩阵与折中决策报告_</li><li>[`business_summary.md`](./docs/01_business_research/business_summary.md)<br>_Lead 评审裁决、核心边界定义与三道防线前置契约 (已落定)_</li></ul> |
| **[`docs/02_competitor_analysis/`](./docs/02_competitor_analysis/)**<br>*竞品分析：同类产品功能调研与差异化定位分析阶段* | - |
| **[`docs/03_business_modeling/`](./docs/03_business_modeling/)**<br>*业务问题建模：核心业务实体、任务链与技能领域逻辑提炼* | - |
| **[`docs/04_interaction_design/`](./docs/04_interaction_design/)**<br>*核心交互设计：人机协同交互流程时序与路由控制流设计* | - |
| **[`docs/05_ux_specification/`](./docs/05_ux_specification/)**<br>*原型与 UX 规范：多状态交互页面原型及组件级表现规范设计* | - |
| **[`docs/06_system_architecture/`](./docs/06_system_architecture/)**<br>*系统架构设计：技术栈评估选型、核心组件拓扑与图谱库规划* | - |
| **[`docs/07_data_model/`](./docs/07_data_model/)**<br>*数据模型设计：关系与图数据库表结构设计及 ERD 关系模型定义* | - |
| **[`docs/08_api_specification/`](./docs/08_api_specification/)**<br>*API 规范契约：前后端强解耦的 HTTP/WebSocket 协议边界定义* | - |
| **[`docs/09_frontend_implementation_plan/`](./docs/09_frontend_implementation_plan/)**<br>*前端实现计划：组件化开发排期、关键表现层状态与测试用例* | - |
| **[`docs/10_backend_implementation_plan/`](./docs/10_backend_implementation_plan/)**<br>*后端实现计划：核心领域服务开发时序与状态机安全防线落地* | - |
| **[`docs/11_integration_and_deployment/`](./docs/11_integration_and_deployment/)**<br>*联调与发布部署：集成测试方案、自动化校验与部署部署规范* | - |

---

## 智能体技能体系 (Agent Skills Tree)

本项目中沉淀的智能体技能（Agent Skills）与研发协作规范归档于 `.agents/` 目录下，用于指导 Agent 执行工程全生命周期的任务拆解、规则引导与评审裁决：

| 技能分类与目录路径 (Directory) | 具体规范与说明 (Files & Actions) |
| :--- | :--- |
| **[`./.agents/`](./.agents/)**<br>*智能体控制配置与通用规范目录* | <ul><li>[`AGENTS.md`](./.agents/AGENTS.md)<br>_多 Agent 职责划分、前后端解耦边界与协作铁律契约_</li></ul> |
| **[`./.agents/skills/project_lifecycle_management/`](./.agents/skills/project_lifecycle_management/)**<br>*项目工程全生命周期的通用步骤流程控制与多智能体协作技能* | <ul><li>[`SKILL.md`](./.agents/skills/project_lifecycle_management/SKILL.md)<br>_项目生命周期通用步骤控制与渐进指引高层索引规范_</li></ul> |
| **[`./.agents/skills/project_lifecycle_management/references/`](./.agents/skills/project_lifecycle_management/references/)**<br>*工程各生命周期步骤与评审决策的详细执行参考标准与设计模板* | <ul><li>[`step1_initialization.md`](./.agents/skills/project_lifecycle_management/references/step1_initialization.md)<br>_Step 1：物理工程物理初始化与标准层级目录创建规范_</li><li>[`step2_project_rules.md`](./.agents/skills/project_lifecycle_management/references/step2_project_rules.md)<br>_Step 2：引导用户添加并持久化项目级别 Rule 规范_</li><li>[`step3_business_research.md`](./.agents/skills/project_lifecycle_management/references/step3_business_research.md)<br>_Step 3：正向业务调研成文与反向安全防御审查规范_</li><li>[`lead_review.md`](./.agents/skills/project_lifecycle_management/references/lead_review.md)<br>_通用 Lead 评审与决策总结五段式模板规范 (已根据最新意见重构优化)_</li></ul> |
