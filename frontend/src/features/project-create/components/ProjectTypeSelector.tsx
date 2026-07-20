import { BookOpen, ListChecks } from "lucide-react";
import { ProjectType } from "../../../shared/types";
import { Select, SelectOption } from "../../../shared/ui";

const PROJECT_TYPE_OPTIONS: SelectOption<ProjectType>[] = [
  {
    value: "READING",
    label: "阅读项目 (READING) - 上传 PDF/MD 文档建立切片阅读",
    icon: <BookOpen size={15} className="text-cyan-400" />,
  },
  {
    value: "PLAN",
    label: "计划项目 (PLAN) - 注入技能模板构建任务依赖拓扑",
    icon: <ListChecks size={15} className="text-violet-400" />,
  },
];

interface ProjectTypeSelectorProps {
  selectedType: ProjectType;
  onSelect: (type: ProjectType) => void;
}

export function ProjectTypeSelector({
  selectedType,
  onSelect,
}: ProjectTypeSelectorProps) {
  return (
    <div className="mb-5">
      <label className="text-xs text-slate-300 mb-1.5 block font-medium">
        项目双轨类型
      </label>
      <Select<ProjectType>
        value={selectedType}
        onChange={onSelect}
        options={PROJECT_TYPE_OPTIONS}
        className="w-full"
        size="md"
        ariaLabel="选择项目双轨类型"
      />
    </div>
  );
}

