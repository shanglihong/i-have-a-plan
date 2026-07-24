# 2.5 知识库 API 规范 (Knowledge Domain)

> [!NOTE]
> 本模块定义了知识库 (Knowledge Base) 的创建、全局包含笔记的列表获取、单体详情查询、元数据更新与级联安全删除等 API，属于知识库领域 (`domain/knowledge`)。
> * **关于一次性获取全量**：访问 `GET /api/knowledge-bases` 即可直接一次性获取所有知识库节点及其各自归档收录的沉淀笔记 (`SynthesizedNote`) 嵌套列表，无需额外发起多级子查询请求。
> * **关于物理存储隔离**：每个知识库在创建时会在沙箱磁盘自动创建独立物理文件夹结构，用于隔离长效跨项目资产。
> * **关于笔记归档解绑**：删除知识库不会物理销毁已收录的沉淀笔记，仅解除其 `knowledge_base_id` 外键归档关联。
> * **关于冷启动自愈**：如遇非正常断电或崩溃导致物理目录与数据库不一致，冷启动时后台自愈线程会自动修复孤岛目录。
> * **后端详细设计**：可参考 [知识库领域后端设计规范](../../10_backend_implementation_plan/knowledge/knowledge_backend_design_spec_v1.0.md)。

---

## 接口列表

| 接口名称 | HTTP Method | 接口路径 | 功能描述 |
| :--- | :--- | :--- | :--- |
| **获取知识库列表 (含笔记)** | `GET` | `/api/knowledge-bases` | 一次性获取当前系统中的所有知识库列表及其下归档收录的所有沉淀笔记 |
| **创建新知识库** | `POST` | `/api/knowledge-bases` | 创建全新的知识库归档节点并初始化物理沙箱存储目录 |
| **获取知识库详情** | `GET` | `/api/knowledge-bases/{id}` | 查询单个知识库的详细元数据配置及归档笔记清单 |
| **更新知识库信息** | `PUT` | `/api/knowledge-bases/{id}` | 修改指定知识库的名称或描述信息 |
| **删除知识库** | `DELETE` | `/api/knowledge-bases/{id}` | 安全删除知识库节点，解除关联笔记归档并清理空目录 |

---

## 详细接口规范

### 1. 获取知识库列表 (含笔记)

* **接口路径**：`GET /api/knowledge-bases`
* **功能描述**：获取系统内所有已创建的知识库列表，响应载荷中直接嵌套返回每个知识库下归档收录的所有沉淀笔记 (`SynthesizedNote`)。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "kb_sys_01",
        "name": "Linux 内核与系统底层",
        "description": "专注 Linux 内核机制、C 语言驱动、网络协议栈开发与性能调优",
        "directory_path": "sandbox/vaults/kb_sys_01",
        "project_count": 12,
        "note_count": 2,
        "created_at": "2026-07-18T10:00:00Z",
        "updated_at": "2026-07-18T10:00:00Z",
        "notes": [
          {
            "id": "sn_1001",
            "title": "Linux 内核中断处理机制与 Bottom Half 总结",
            "summary": "详细解构 Linux 内核软中断 (Softirq)、Tasklet 与 Workqueue 的协同工作模式",
            "type": "GENERAL",
            "source_project_id": "proj_9988",
            "source_project_name": "Linux 驱动开发实战",
            "referenced_material_note_count": 8,
            "created_at": "2026-07-20T14:30:00Z",
            "updated_at": "2026-07-21T09:15:00Z"
          },
          {
            "id": "sn_1002",
            "title": "网卡驱动零拷贝复盘经验总结",
            "summary": "针对网卡环形缓冲区 (Ring Buffer) 溢出与 DMA 内存解算实战心得",
            "type": "EXPERIENCE",
            "source_project_id": "proj_9988",
            "source_project_name": "Linux 驱动开发实战",
            "referenced_material_note_count": 5,
            "created_at": "2026-07-22T16:00:00Z",
            "updated_at": "2026-07-22T16:00:00Z"
          }
        ]
      },
      {
        "id": "kb_ai_02",
        "name": "Graph RAG 与大模型应用",
        "description": "沉淀 Agent 架构、Knowledge Graph 检索增强与提示词工程",
        "directory_path": "sandbox/vaults/kb_ai_02",
        "project_count": 8,
        "note_count": 0,
        "created_at": "2026-07-19T08:30:00Z",
        "updated_at": "2026-07-19T08:30:00Z",
        "notes": []
      }
    ],
    "total": 2
  }
}
```

---

### 2. 创建新知识库

* **接口路径**：`POST /api/knowledge-bases`
* **功能描述**：创建一个全新的知识库归档节点，在物理沙箱分配独立隔离目录并完成持久化。

#### 请求载荷 (`JSON`)
```json
{
  "name": "分布式系统与高并发架构",
  "description": "涵盖 Consensus 算法、Raft、RPC 框架与分库分表实践"
}
```

#### 响应载荷 (`201 Created`)
```json
{
  "code": 201,
  "message": "created",
  "data": {
    "id": "kb_dist_03",
    "name": "分布式系统与高并发架构",
    "description": "涵盖 Consensus 算法、Raft、RPC 框架与分库分表实践",
    "directory_path": "sandbox/vaults/kb_dist_03",
    "project_count": 0,
    "note_count": 0,
    "created_at": "2026-07-19T15:00:00Z",
    "updated_at": "2026-07-19T15:00:00Z",
    "notes": []
  }
}
```

---

### 3. 获取知识库详情

* **接口路径**：`GET /api/knowledge-bases/{id}`
* **功能描述**：查询单个知识库的详细元数据以及该知识库收录的沉淀笔记列表。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "kb_dist_03",
    "name": "分布式系统与高并发架构",
    "description": "涵盖 Consensus 算法、Raft、RPC 框架与分库分表实践",
    "directory_path": "sandbox/vaults/kb_dist_03",
    "project_count": 2,
    "note_count": 1,
    "created_at": "2026-07-19T15:00:00Z",
    "updated_at": "2026-07-20T10:00:00Z",
    "notes": [
      {
        "id": "sn_2001",
        "title": "Raft 算法日志复制与 Leader 选举心跳机制解构",
        "summary": "分析 Raft 论文中 Term 脑裂防护与 Log Matching 不变性约束",
        "type": "GENERAL",
        "source_project_id": "proj_7766",
        "source_project_name": "Raft 协议实现",
        "referenced_material_note_count": 12,
        "created_at": "2026-07-20T10:00:00Z",
        "updated_at": "2026-07-20T10:00:00Z"
      }
    ]
  }
}
```

---

### 4. 更新知识库信息

* **接口路径**：`PUT /api/knowledge-bases/{id}`
* **功能描述**：修改指定知识库的名称或描述文本。物理隔离目录路径维持不变以确保数据链接稳定。

#### 请求载荷 (`JSON`)
```json
{
  "name": "分布式系统与云原生架构",
  "description": "涵盖 Raft、Kubernetes、Service Mesh 与云原生实践"
}
```

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "kb_dist_03",
    "name": "分布式系统与云原生架构",
    "description": "涵盖 Raft、Kubernetes、Service Mesh 与云原生实践",
    "directory_path": "sandbox/vaults/kb_dist_03",
    "project_count": 2,
    "note_count": 1,
    "created_at": "2026-07-19T15:00:00Z",
    "updated_at": "2026-07-20T11:20:00Z"
  }
}
```

---

### 5. 删除知识库

* **接口路径**：`DELETE /api/knowledge-bases/{id}`
* **功能描述**：安全移除知识库节点。系统会自动解除已归档笔记的绑定外键，并在磁盘目录为空时清理物理文件夹。

#### 响应载荷 (`200 OK`)
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "kb_dist_03",
    "deleted": true
  }
}
```
