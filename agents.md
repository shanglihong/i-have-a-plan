# 多 Agent 协作规范 (Multi-Agent Cooperation Specification)

为了在多 Agent 开发模式下保证开发流程的高内聚与低耦合，明确各 Agent 的职责边界，特制定本协作规范。所有参与本项目的 Agent 必须严格遵守。

## 一、 真理之源（Source of Truth）原则

凡是涉及业务实体、API 协议、数据库表结构或系统架构的设计变更，必须遵循“先规范，后代码”的流转机制。

*   **严禁直接修改代码**：严禁在未更新相应规范文档前，直接对代码进行修改。
*   **流转机制**：所有设计变更必须首先在 [docs](docs) 目录的相应规范中提出修改（例如接口变更在 [docs/08_api_specification](docs/08_api_specification) 中修改），通过审查并确认后，代码级 Agent 才能按照新的规范开展代码开发和实现。

## 二、 前后端强解耦自治

为了实现前后端独立自治，前端与后端 Agent 之间需要确立明确的职责划分与唯一契约。

*   **前端 Agent 限制**：前端 Agent 仅允许读写 [frontend](frontend) 目录下的文件。严禁读写 [backend](backend) 下的任何代码。
*   **后端 Agent 限制**：后端 Agent 仅允许读写 [backend](backend) 目录下的文件。严禁读写 [frontend](frontend) 下的任何代码。
*   **唯一契约**：前端与后端的唯一联调和协议桥梁是 [docs/08_api_specification](docs/08_api_specification) 中定义的 API 规范。一切交互逻辑与数据契约皆以该目录下的规范为准。

## 三、 本规范的修改

本规范作为多 Agent 协作的基础边界，未经人类用户许可，Agent 严禁擅自修改。
