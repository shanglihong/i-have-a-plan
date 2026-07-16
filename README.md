# i-have-a-plan

> **我有一个计划 (i-have-a-plan)**：一个基于 AI Agent 技术的智能阅读辅导、个人第二大脑（知识图谱）构建与方法论技能沉淀的闭环计划管理系统。

---

## 项目文档生命周期体系 (Docs Tree)

项目开发与设计遵循标准化生命周期规范，所有核心文档均归档于 `docs/` 目录中。各层级文档与已产出文件树状索引如下：

```text
docs/
├── 01_business_research/ ............ 业务调研与决策 (已落定)
│   ├── business_research.md ......... 正向调研报告
│   ├── business_research_adversarial.md . 反向审查与防御
│   └── business_summary.md .......... Lead 裁决与总结
├── 02_competitor_analysis/ .......... 竞品分析 (待启动)
├── 03_business_modeling/ ............ 业务建模 (待启动)
├── 04_interaction_design/ ........... 核心交互设计 (待启动)
├── 05_ux_specification/ ............. 原型与 UX 规范 (待启动)
├── 06_system_architecture/ .......... 系统架构设计 (待启动)
├── 07_data_model/ ................... 数据模型设计 (待启动)
├── 08_api_specification/ ............ API 规范与协议 (待启动)
├── 09_frontend_implementation_plan/ . 前端实现计划 (待启动)
├── 10_backend_implementation_plan/ .. 后端实现计划 (待启动)
└── 11_integration_and_deployment/ ... 联调与发布部署 (待启动)
```

---

## 智能体技能体系 (Agent Skills Tree)

本项目中沉淀的智能体技能（Agent Skills）与研发协作规范归档于 `.agents/` 目录下，用于指导 Agent 执行工程全生命周期的任务拆解、规则引导与评审裁决：

```text
.agents/
├── AGENTS.md ........................ Agent 职责与协作契约
└── skills/ .......................... 智能体技能库
    └── project_lifecycle_management/  项目生命周期管理 (已启用)
        ├── SKILL.md ................. 生命周期步骤索引
        └── references/ .............. 生命周期各步规范
            ├── step1_initialization.md  Step 1: 项目物理初始化
            ├── step2_project_rules.md  Step 2: 引导项目规则定义
            ├── step3_business_research.md  Step 3: 业务调研与反向审查
            └── lead_review.md ....... Lead 评审与决策总结模板
```
