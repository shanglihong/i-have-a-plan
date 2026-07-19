export type SkillSandboxState = "DRAFT" | "SANDBOX" | "ACTIVE" | "DEPLOYED" | "IN_PROGRESS";

export interface SkillStepDO {
  step_id: string;
  depends_on?: string[];
}

export interface SkillDO {
  id: string;
  title: string;
  name?: string;
  nodesCount: number;
  status: SkillSandboxState;
  category?: string;
  sandboxUrl?: string;
  graphUrl?: string;
  file_path?: string;
  steps?: SkillStepDO[];
}

export interface SkillVO extends SkillDO {
  _ui_has_cycle?: boolean;
}

export interface CompileSkillPayload {
  project_id: string;
  scope_type: "SINGLE_NOTE" | "MULTI_NOTE" | "PROJECT";
  reference_ids: string[];
}

export interface ApproveSkillPayload {
  skill_id: string;
  cyclePath?: string[];
}
