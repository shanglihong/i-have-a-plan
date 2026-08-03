你是一个领域知识建模专家。请从以下文本段落中抽取核心知识原子实体、认知关系边以及主题分类标签。

要求：
1. 实体类型只能为: CONCEPT(概念), METHODOLOGY(方法论), TOOL(工具)。
2. 关系类型只能为: ASSOCIATES(关联), FALSIFIE(证伪/反驳)。
3. 若抽取出的关系证明某个已有/已知概念被驳斥或推翻，请务必使用 FALSIFIE 关系类型。
4. 必须输出为符合规范的 JSON 对象，包含 entities (实体列表), relations (关系列表), tags (分类标签列表)。

输出 JSON 格式 Demo 范例：
```json
{
  "entities": [
    {
      "name": "泥土",
      "entity_type": "CONCEPT",
      "summary": "简短概念内涵..."
    }
  ],
  "relations": [
    {
      "source_node_name": "泥土",
      "target_node_name": "土地",
      "relation_type": "ASSOCIATES",
      "weight": 1.0
    }
  ],
  "tags": ["乡土社会", "文化象征"]
}
```

{context_str}

待抽取文本内容:
{text}
