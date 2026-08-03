"""测试 LangChainLLMService 对 LLMGraphRAGExtractorPort 接口的适配实现"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.infrastructure.llm.graph_rag_extractor import (
    LangChainGraphRAGExtractorAdapter,
    GraphExtractionResultSchema,
    ExtractedEntitySchema,
    ExtractedRelationSchema,
)


@pytest.mark.asyncio
async def test_compute_embedding_fallback():
    # 测试未配置或无有效 key 时的 0 向量容错降级
    service = LangChainGraphRAGExtractorAdapter()
    service.embeddings = None

    vector = await service.compute_embedding("测试段落文本")
    assert len(vector) == 1536
    assert vector[0] == 0.0


@pytest.mark.asyncio
async def test_compute_embedding_success():
    service = LangChainGraphRAGExtractorAdapter()
    mock_embeddings = MagicMock()
    mock_embeddings.aembed_query = AsyncMock(return_value=[0.1] * 1536)
    service.embeddings = mock_embeddings

    vector = await service.compute_embedding("测试文本")
    assert len(vector) == 1536
    assert vector[0] == 0.1
    mock_embeddings.aembed_query.assert_called_once_with("测试文本")


@pytest.mark.asyncio
async def test_extract_entities_and_relations_success():
    service = LangChainGraphRAGExtractorAdapter()
    mock_llm = MagicMock()
    
    expected_result = GraphExtractionResultSchema(
        entities=[
            ExtractedEntitySchema(name="第一性原理", entity_type="CONCEPT", summary="剖析物理本质")
        ],
        relations=[
            ExtractedRelationSchema(
                source_node_name="第一性原理",
                target_node_name="归纳法",
                relation_type="FALSIFIE",
                weight=0.9,
            )
        ],
        tags=["哲学", "思考框架"],
    )

    mock_structured_llm = MagicMock()
    mock_structured_llm.ainvoke = AsyncMock(return_value=expected_result)
    mock_llm.with_structured_output = MagicMock(return_value=mock_structured_llm)
    service.llm = mock_llm

    entities, relations, tags = await service.extract_entities_and_relations(
        text="第一性原理指打破经验依赖...", existing_nodes_context=["归纳法"]
    )

    assert len(entities) == 1
    assert entities[0].name == "第一性原理"
    assert entities[0].entity_type == "CONCEPT"

    assert len(relations) == 1
    assert relations[0].source_node_name == "第一性原理"
    assert relations[0].relation_type == "FALSIFIE"

    assert tags == ["哲学", "思考框架"]


def test_graph_extraction_schema_alias_and_id_resolution():
    """测试当 LLM 返回非标准 Key (type, from, to) 以及使用 E1/E2 临时 ID 时，Pydantic Schema 能否正常别名解析与关联还原"""
    raw_data = {
        "entities": [
            {"id": "E1", "type": "CONCEPT", "name": "泥土"},
            {"id": "E2", "type": "CONCEPT", "name": "土地"},
            {"id": "E3", "type": "CONCEPT", "name": "乡下人"},
            {"id": "E4", "type": "METHODOLOGY", "name": "种地"},
            {"id": "E5", "type": "CONCEPT", "name": "水土不服"},
            {"id": "E6", "type": "CONCEPT", "name": "风俗"},
        ],
        "relations": [
            {"id": "R1", "from": "E1", "to": "E2", "type": "ASSOCIATES"},
            {"id": "R2", "from": "E3", "to": "E1", "type": "ASSOCIATES"},
            {"id": "R3", "from": "E4", "to": "E1", "type": "ASSOCIATES"},
            {"id": "R4", "from": "E5", "to": "E1", "type": "ASSOCIATES"},
            {"id": "R5", "from": "E6", "to": "E1", "type": "ASSOCIATES"},
        ],
        "tags": ["乡土社会", "土地崇拜", "文化象征"],
    }

    result = GraphExtractionResultSchema.model_validate(raw_data)
    assert len(result.entities) == 6
    assert result.entities[0].name == "泥土"
    assert result.entities[0].entity_type == "CONCEPT"

    assert len(result.relations) == 5
    assert result.relations[0].source_node_name == "泥土"
    assert result.relations[0].target_node_name == "土地"
    assert result.relations[0].relation_type == "ASSOCIATES"

    assert result.relations[1].source_node_name == "乡下人"
    assert result.relations[1].target_node_name == "泥土"

