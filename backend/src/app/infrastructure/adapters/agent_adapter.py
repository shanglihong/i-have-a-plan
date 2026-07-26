"""Agent 领域防腐接口适配器 (AgentDomainAdapter)"""

import uuid
from typing import Optional
from app.domain.agent.ports import AgentDomainPort


class AgentDomainAdapter(AgentDomainPort):
    """与 Agent 领域的集成适配器"""

    async def assemble_and_bind_agent(self, project_id: str, skill_id: Optional[str] = None) -> str:
        """根据 skill_id 组装监督 Agent 句柄"""
        agent_handle_id = f"agent_sup_{uuid.uuid4().hex[:6]}"
        return agent_handle_id

    async def assemble_and_bind_companion_agent(self, project_id: str, skill_id: Optional[str] = None) -> str:
        """根据策略组装伴读 Agent 句柄"""
        agent_handle_id = f"agent_read_{uuid.uuid4().hex[:6]}"
        return agent_handle_id

