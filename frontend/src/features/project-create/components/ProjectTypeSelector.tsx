import { BookOpen, ListChecks } from "lucide-react";
import { COLOR_MAP } from "../../../shared/constants";
import { ProjectType } from "../../../shared/types";

interface ProjectTypeOption {
  type: ProjectType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
  color: "cyan" | "violet";
}

const PROJECT_TYPES: ProjectTypeOption[] = [
  {
    type: "READING",
    icon: BookOpen,
    label: "阅读项目 (READING)",
    desc: "上传 PDF/MD 文档，建立切片阅读与关联笔记",
    color: "cyan",
  },
  {
    type: "PLAN",
    icon: ListChecks,
    label: "计划项目 (PLAN)",
    desc: "注入技能模板，构建任务依赖拓扑树",
    color: "violet",
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
    <div className="grid grid-cols-2 gap-3 mb-5">
      {PROJECT_TYPES.map((t) => {
        const isSelected = selectedType === t.type;
        const themeStyle = COLOR_MAP[t.color];
        const IconComp = t.icon;
        return (
          <div
            key={t.type}
            onClick={() => onSelect(t.type)}
            className={`p-3.5 rounded-xl ring-1 transition-all cursor-pointer group ${
              isSelected
                ? `${themeStyle.ring} bg-white/10`
                : "ring-white/10 hover:ring-white/20 bg-white/5"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg ${themeStyle.bg} flex items-center justify-center mb-2.5`}
            >
              <IconComp size={16} className={themeStyle.text} />
            </div>
            <p className="text-xs font-medium text-slate-200 mb-1">
              {t.label}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
