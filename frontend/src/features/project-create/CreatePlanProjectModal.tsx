import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, AlertCircle, ListChecks } from "lucide-react";

import { DarkDatePicker, Button } from "../../shared/ui";
import { useCreateProjectMutation } from "../../entities";
import { PresetSkillSelector } from "./components/PresetSkillSelector";

interface CreatePlanProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const getOneWeekLaterDateString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
};

export function CreatePlanProjectModal({
  open,
  onClose,
}: CreatePlanProjectModalProps) {
  const [projectTitle, setProjectTitle] = useState("");
  const [deadline, setDeadline] = useState<string>(getOneWeekLaterDateString);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormError(null);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const resetForm = () => {
    setProjectTitle("");
    setDeadline(getOneWeekLaterDateString());
    setSelectedSkillId("");
    setFormError(null);
  };

  const createProjectMutation = useCreateProjectMutation();
  const isPending = createProjectMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!projectTitle.trim()) {
      setFormError("请输入项目名称");
      return;
    }

    createProjectMutation.mutate(
      {
        title: projectTitle,
        type: "PLAN",
        deadline,
        skill_id: selectedSkillId || undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          onClose();
        },
        onError: (err: any) => {
          const detail =
            err?.response?.data?.detail || "创建项目失败，请检查输入或接口依赖";
          setFormError(detail);
        },
      }
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-950/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-plan-project-title"
            className="glass rounded-2xl p-6 w-full max-w-[480px] max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl my-auto border border-white/10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              {/* 头部：类型图标与标题描述 */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-violet-500/15 border-violet-500/30 text-violet-300">
                    <ListChecks size={18} />
                  </div>
                  <div>
                    <h2
                      id="create-plan-project-title"
                      className="text-base font-bold text-slate-100 leading-tight"
                    >
                      创建计划执行项目
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      选择技能模板，构建任务依赖拓扑与目标追踪
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 -mr-1 -mt-0.5 rounded-lg hover:bg-white/8 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* 错误提示 —— 带入场动画 */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4 p-3 rounded-lg bg-red-500/12 border border-red-500/25 flex items-start gap-2 text-red-300 text-xs">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 基础信息域 */}
              <div className="space-y-4 mb-6">
                {/* 项目名称 */}
                <div>
                  <label
                    htmlFor="plan-project-title"
                    className="text-xs text-slate-300 mb-1.5 block font-medium"
                  >
                    项目名称 <span className="text-violet-400">*</span>
                  </label>
                  <input
                    id="plan-project-title"
                    type="text"
                    value={projectTitle}
                    onChange={(e) => {
                      setProjectTitle(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="如：Graph RAG 引擎落地计划"
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40"
                  />
                </div>

                {/* 截止日期 */}
                <div>
                  <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                    截止日期
                  </label>
                  <DarkDatePicker
                    value={deadline}
                    onChange={(val) => setDeadline(val)}
                    color="violet"
                  />
                </div>

                {/* 预设技能选择器 */}
                <div>
                  <PresetSkillSelector
                    selectedSkillId={selectedSkillId}
                    onSelectSkill={(id) => setSelectedSkillId(id)}
                  />
                </div>
              </div>

              {/* 操作按钮组 */}
              <div className="flex gap-2.5 pt-1">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 text-slate-400 hover:text-slate-200"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="violet"
                  isLoading={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    "创建中"
                  ) : (
                    <>
                      <Plus size={15} />
                      创建计划项目
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
