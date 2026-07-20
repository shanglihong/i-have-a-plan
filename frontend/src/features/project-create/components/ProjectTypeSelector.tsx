import { BookOpen, ListChecks } from "lucide-react";
import { motion } from "framer-motion";
import { ProjectType } from "../../../shared/types";

interface TypeOption {
  value: ProjectType;
  label: string;
  description: string;
  icon: React.ReactNode;
  activeClass: string;
  idleClass: string;
  badgeClass: string;
}

const PROJECT_TYPE_OPTIONS: TypeOption[] = [
  {
    value: "READING",
    label: "阅读精读轨",
    description: "上传 PDF / MD / TXT 文档，建立切片精读与知识图谱",
    icon: <BookOpen size={20} />,
    activeClass:
      "border-cyan-500/70 bg-cyan-500/10 ring-1 ring-cyan-500/30 text-cyan-300",
    idleClass:
      "border-slate-700/60 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800/60",
    badgeClass: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
  },
  {
    value: "PLAN",
    label: "计划执行轨",
    description: "注入技能模板，构建任务依赖拓扑与目标追踪",
    icon: <ListChecks size={20} />,
    activeClass:
      "border-violet-500/70 bg-violet-500/10 ring-1 ring-violet-500/30 text-violet-300",
    idleClass:
      "border-slate-700/60 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800/60",
    badgeClass: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
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
      <label className="text-xs text-slate-300 mb-2 block font-medium">
        项目类型
      </label>
      <div className="grid grid-cols-2 gap-3">
        {PROJECT_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-left ${isSelected ? option.activeClass : option.idleClass
                }`}
            >
              {/* 图标徽章 */}
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${isSelected
                    ? option.badgeClass
                    : "bg-slate-800/80 text-slate-400"
                  }`}
              >
                {option.icon}
              </span>

              {/* 文字区 */}
              <div>
                <p className="text-sm font-medium leading-none mb-1">
                  {option.label}
                </p>
                <p
                  className={`text-xs leading-snug transition-colors duration-200 ${isSelected ? "text-current opacity-80" : "text-slate-400"
                    }`}
                >
                  {option.description}
                </p>
              </div>

              {/* 选中指示点 */}
              {isSelected && (
                <motion.span
                  layoutId="type-selected-dot"
                  className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${option.value === "READING" ? "bg-cyan-400" : "bg-violet-400"
                    }`}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

