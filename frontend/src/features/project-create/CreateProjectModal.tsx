import { ProjectType } from "../../shared/types";
import { CreateReadingProjectModal } from "./CreateReadingProjectModal";
import { CreatePlanProjectModal } from "./CreatePlanProjectModal";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  createType?: ProjectType; // "READING" | "PLAN"
}

export function CreateProjectModal({
  open,
  onClose,
  createType = "READING",
}: CreateProjectModalProps) {
  return createType === "READING" ? (
    <CreateReadingProjectModal open={open} onClose={onClose} />
  ) : (
    <CreatePlanProjectModal open={open} onClose={onClose} />
  );
}
