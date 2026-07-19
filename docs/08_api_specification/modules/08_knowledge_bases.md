# 2.8 知识库管理模块 API 规范 (Knowledge Bases)

> [!NOTE]
> 本模块定义了知识库 (Knowledge Base) 的创建、列表获取、更新与删除等管理接口，用于支持项目的归档分类与目录结构划分。

---

## 接口列表

### 1. 获取知识库列表

* **接口路径**：`GET /api/knowledge-bases`
* **通信协议**：REST
* **功能描述**：获取当前系统中的所有知识库列表及关联项目数量统计。

#### 响应 (200 OK)
```json
{
  "items": [
    {
      "id": "kb_sys_01",
      "name": "Linux 内核与系统底层",
      "description": "专注 Linux 内核机制、C 语言驱动、网络协议栈开发与性能调优",
      "project_count": 12,
      "updated_at": "2026-07-18T10:00:00Z"
    },
    {
      "id": "kb_ai_02",
      "name": "Graph RAG 与大模型应用",
      "description": "沉淀 Agent 架构、Knowledge Graph 检索增强与提示词工程",
      "project_count": 8,
      "updated_at": "2026-07-19T08:30:00Z"
    }
  ],
  "total": 2
}
```

---

### 2. 创建新知识库

* **接口路径**：`POST /api/knowledge-bases`
* **通信协议**：REST
* **功能描述**：创建一个全新的知识库归档节点。

#### 请求载荷 (JSON)
```json
{
  "name": "分布式系统与高并发架构",
  "description": "涵盖 Consensus 算法、Raft、RPC 框架与分库分表实践"
}
```

#### 响应 (201 Created)
```json
{
  "id": "kb_dist_03",
  "name": "分布式系统与高并发架构",
  "description": "涵盖 Consensus 算法、Raft、RPC 框架与分库分表实践",
  "project_count": 0,
  "created_at": "2026-07-19T15:00:00Z"
}
```

---

### 3. 更新知识库信息

* **接口路径**：`PUT /api/knowledge-bases/{id}`
* **通信协议**：REST
* **功能描述**：修改已有知识库的名称或描述信息。

#### 请求载荷 (JSON)
```json
{
  "name": "分布式系统与云原生架构",
  "description": "涵盖 Raft、Kubernetes、Service Mesh 与云原生实践"
}
```

#### 响应 (200 OK)
```json
{
  "id": "kb_dist_03",
  "name": "分布式系统与云原生架构",
  "description": "涵盖 Raft、Kubernetes、Service Mesh 与云原生实践",
  "updated_at": "2026-07-19T15:10:00Z"
}
```

---

### 4. 删除知识库

* **接口路径**：`DELETE /api/knowledge-bases/{id}`
* **通信协议**：REST
* **功能描述**：删除指定的知识库节点。

#### 响应 (200 OK)
```json
{
  "id": "kb_dist_03",
  "deleted": true
}
```
