"""基于 LangChain 与 OpenAIEmbeddings 的旁路图谱与 Vector 结构化抽取适配器"""

import os
import re
import logging
from pathlib import Path
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field, AliasChoices, model_validator
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.output_parsers import PydanticOutputParser

from app.domain.graph.ports import LLMGraphRAGExtractorPort
from app.domain.graph.entities import ExtractedEntity, ExtractedRelation

logger = logging.getLogger(__name__)

PROMPT_FILE = Path(__file__).parent / "prompts" / "graph_extraction.md"


class ExtractedEntitySchema(BaseModel):
    id: Optional[str] = Field(default=None, description="实体临时标识 ID，如 E1")
    name: str = Field(description="实体概念或工具方法名称，如'第一性原理'")
    entity_type: str = Field(
        validation_alias=AliasChoices("entity_type", "type"),
        description="实体类型: CONCEPT(概念), METHODOLOGY(方法论), TOOL(工具)",
    )
    summary: str = Field(default="", description="实体简短摘要与概念内涵")


class ExtractedRelationSchema(BaseModel):
    id: Optional[str] = Field(default=None, description="关系临时标识 ID，如 R1")
    source_node_name: str = Field(
        validation_alias=AliasChoices("source_node_name", "from", "source", "source_node"),
        description="源节点实体名称",
    )
    target_node_name: str = Field(
        validation_alias=AliasChoices("target_node_name", "to", "target", "target_node"),
        description="目标节点实体名称",
    )
    relation_type: str = Field(
        validation_alias=AliasChoices("relation_type", "type"),
        description="关系类型: ASSOCIATES(关联), FALSIFIE(证伪/反驳)",
    )
    weight: float = Field(default=1.0, description="关系强度权重 0.1~1.0")


class GraphExtractionResultSchema(BaseModel):
    entities: List[ExtractedEntitySchema] = Field(default_factory=list, description="抽取的知识节点列表")
    relations: List[ExtractedRelationSchema] = Field(default_factory=list, description="抽取的认知关系边列表")
    tags: List[str] = Field(default_factory=list, description="分类与主题标签列表")

    @model_validator(mode="after")
    def resolve_entity_id_references(self) -> "GraphExtractionResultSchema":
        """自动将使用临时 ID (如 E1, E2) 关联的关系映射恢复为对应实体的真实名称"""
        id_to_name = {e.id: e.name for e in self.entities if e.id and e.name}
        if id_to_name:
            for rel in self.relations:
                if rel.source_node_name in id_to_name:
                    rel.source_node_name = id_to_name[rel.source_node_name]
                if rel.target_node_name in id_to_name:
                    rel.target_node_name = id_to_name[rel.target_node_name]
        return self


OUTPUT_PARSER = PydanticOutputParser(pydantic_object=GraphExtractionResultSchema)


class LangChainGraphRAGExtractorAdapter(LLMGraphRAGExtractorPort):
    """基于 LangChain/OpenAI 的旁路图谱向量计算与 LLM 知识结构化抽取适配器"""

    def __init__(self) -> None:
        # 1. LLM 对话模型配置
        llm_api_key = os.getenv("OPENAI_API_KEY")
        llm_api_base = os.getenv("OPENAI_API_BASE")
        llm_model_name = os.getenv("LLM_MODEL_NAME") or "deepseek-chat"

        # 2. Embedding 向量模型配置（优先读取专用的 EMBEDDING_* 环境变量，回退兼容通用 OPENAI_* 配置）
        embedding_api_key = os.getenv("EMBEDDING_API_KEY") or llm_api_key
        embedding_api_base = os.getenv("EMBEDDING_API_BASE") or llm_api_base
        embedding_model_name = (
            os.getenv("EMBEDDING_MODEL_NAME")
            or os.getenv("OPENAI_EMBEDDING_MODEL")
            or "text-embedding-3-small"
        )

        if llm_api_key:
            self.llm = ChatOpenAI(
                model=llm_model_name,
                api_key=llm_api_key,
                base_url=llm_api_base,
                temperature=0.1,
                timeout=60.0,
                max_retries=1,
            )
        else:
            self.llm = None

        if embedding_api_key:
            self.embeddings = OpenAIEmbeddings(
                model=embedding_model_name,
                api_key=embedding_api_key,
                base_url=embedding_api_base,
            )
        else:
            self.embeddings = None

    async def compute_embedding(self, text: str) -> List[float]:
        """计算文本的 Dense Vector (1536 维 Float 列表)，支持 0 向量容错降级"""
        if not text:
            return [0.0] * 1536

        if self.embeddings is not None:
            try:
                result = await self.embeddings.aembed_query(text)
                logger.info(f"[LangChainGraphRAGExtractorAdapter] 计算文本 Embedding 成功，维度: {len(result)}")
                return result
            except Exception as e:
                logger.warning(
                    f"[LangChainGraphRAGExtractorAdapter] 计算文本 Embedding 失败，降级返回 0 向量: error={str(e)}"
                )
        else:
            logger.warning("[LangChainGraphRAGExtractorAdapter] 未配置 OPENAI_API_KEY，降级返回 0 向量")

        return [0.0] * 1536

    async def extract_entities_and_relations(
        self, text: str, existing_nodes_context: List[str]
    ) -> Tuple[List[ExtractedEntity], List[ExtractedRelation], List[str]]:
        """输入富文本与已知节点上下文，调用 LLM 结构化抽取实体、关系及标签"""
        if not text or not self.llm:
            return [], [], []

        try:
            context_str = (
                f"\n已知相关概念节点: {', '.join(existing_nodes_context)}"
                if existing_nodes_context
                else ""
            )

            if PROMPT_FILE.exists():
                template = PROMPT_FILE.read_text(encoding="utf-8")
                prompt = template.replace("{context_str}", context_str).replace("{text}", text)
            else:
                prompt = f"请从以下文本段落中抽取核心知识原子实体、认知关系边以及主题分类标签：\n{context_str}\n\n待抽取文本内容:\n{text}"

            response = await self.llm.ainvoke(prompt)
            content = response.content if hasattr(response, "content") else str(response)

            # 正则提取最外层的 JSON 字符串，兼容 Markdown 代码块 (```json ... ```) 与 Thinking Mode 的推导过程文本
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            clean_content = json_match.group(0) if json_match else content
            result: Optional[GraphExtractionResultSchema] = OUTPUT_PARSER.parse(clean_content)

            if not result:
                return [], [], []
            logger.info(f"[LangChainGraphRAGExtractorAdapter] 结构化抽取实体与关系成功，实体数: {len(result.entities)}，关系数: {len(result.relations)}，标签数: {len(result.tags)}")

            extracted_entities = [
                ExtractedEntity(
                    name=item.name,
                    entity_type=item.entity_type,
                    summary=item.summary,
                )
                for item in result.entities
                if item.name
            ]

            extracted_relations = [
                ExtractedRelation(
                    source_node_name=item.source_node_name,
                    target_node_name=item.target_node_name,
                    relation_type=item.relation_type,
                    weight=item.weight,
                )
                for item in result.relations
                if item.source_node_name and item.target_node_name
            ]

            return extracted_entities, extracted_relations, result.tags or []

        except Exception as e:
            logger.error(
                f"[LangChainGraphRAGExtractorAdapter] 结构化抽取实体与关系失败: error={str(e)}",
                exc_info=True,
            )
            return [], [], []
