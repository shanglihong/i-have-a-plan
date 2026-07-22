import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, AlertCircle, BookOpen, ListChecks, Info } from "lucide-react";

import { ProjectType } from "../../shared/types";
import { DarkDatePicker, FileDropzone } from "../../shared/ui";
import { useCreateProjectMutation } from "../../entities";
import { PresetSkillSelector } from "./components/PresetSkillSelector";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  createType?: ProjectType; // "READING" | "PLAN"
}

const getOneWeekLaterDateString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
};

export function CreateProjectModal({
  open,
  onClose,
  createType = "READING",
}: CreateProjectModalProps) {
  const [projectTitle, setProjectTitle] = useState("");
  const [deadline, setDeadline] = useState<string>(getOneWeekLaterDateString);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormError(null);
    }
  }, [open, createType]);

  const resetForm = () => {
    setProjectTitle("");
    setDeadline(getOneWeekLaterDateString());
    setSelectedFile(null);
    setSelectedSkillId("");
    setFormError(null);
  };

  const createProjectMutation = useCreateProjectMutation();
  const isPending = createProjectMutation.isPending;

  const isReading = createType === "READING";

  // focus ring 颜色与强调色
  const focusRingClass = isReading
    ? "focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
    : "focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40";

  const accentColor = isReading ? "text-cyan-400" : "text-violet-400";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!projectTitle.trim()) {
      setFormError("请输入项目名称");
      return;
    }

    if (isReading && !selectedFile) {
      setFormError("阅读项目必须上传关联文档（PDF / MD / TXT）");
      return;
    }

    if (isReading) {
      createProjectMutation.mutate(
        {
          title: projectTitle,
          type: "READING",
          deadline,
          file: selectedFile || undefined,
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
    } else {
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
    }
  };

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setFormError(null);
      if (!projectTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setProjectTitle(nameWithoutExt);
      }
    }
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
            aria-labelledby="create-project-title"
            className="glass rounded-2xl p-6 w-full max-w-[480px] max-h-[85vh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] shadow-2xl my-auto border border-white/10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              {/* 头部：类型图标与标题描述 */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isReading
                        ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                        : "bg-violet-500/15 border-violet-500/30 text-violet-300"
                    }`}
                  >
                    {isReading ? <BookOpen size={18} /> : <ListChecks size={18} />}
                  </div>
                  <div>
                    <h2
                      id="create-project-title"
                      className="text-base font-bold text-slate-100 leading-tight"
                    >
                      创建{isReading ? "阅读精读" : "计划执行"}项目
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {isReading
                        ? "上传文档资料，建立切片精读与知识图谱"
                        : "选择技能模板，构建任务依赖拓扑与目标追踪"}
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

              {/* 阅读项目功能提示 */}
              {isReading && (
                <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-2.5 text-xs text-cyan-300/90 leading-relaxed">
                  <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    提示：阅读项目生成的精读计划也将作为一个计划项目进行管理与履约追踪。
                  </span>
                </div>
              )}

              {/* 基础信息域 */}
              <div className="space-y-4 mb-6">
                {/* 项目名称 */}
                <div>
                  <label
                    htmlFor="project-title"
                    className="text-xs text-slate-300 mb-1.5 block font-medium"
                  >
                    项目名称 <span className={accentColor}>*</span>
                  </label>
                  <input
                    id="project-title"
                    type="text"
                    value={projectTitle}
                    onChange={(e) => {
                      setProjectTitle(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder={
                      isReading
                        ? "如：深入理解 Linux 内核架构"
                        : "如：Graph RAG 引擎落地计划"
                    }
                    className={`w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all ${focusRingClass}`}
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
                    color={isReading ? "cyan" : "violet"}
                  />
                </div>

                {/* 专一表单区块 */}
                {isReading ? (
                  <div>
                    <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                      关联文档 <span className="text-cyan-400">*</span>
                      <span className="text-slate-400 font-normal ml-1">
                        PDF / MD / TXT
                      </span>
                    </label>
                    <FileDropzone
                      selectedFile={selectedFile}
                      onFileSelect={handleFileChange}
                      onFileRemove={() => setSelectedFile(null)}
                    />
                  </div>
                ) : (
                  <div>
                    <PresetSkillSelector
                      selectedSkillId={selectedSkillId}
                      onSelectSkill={(id) => setSelectedSkillId(id)}
                    />
                  </div>
                )}
              </div>

              {/* 操作按钮组 */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 hover:text-slate-200 transition-all cursor-pointer font-medium"
                >
                  取消
                </button>
                <motion.button
                  type="submit"
                  disabled={isPending}
                  whileTap={!isPending ? { scale: 0.97 } : {}}
                  transition={{ duration: 0.12 }}
                  className={`flex-1 py-2.5 text-sm rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isReading
                      ? "text-cyan-950 bg-cyan-400 hover:bg-cyan-300 font-bold shadow-lg shadow-cyan-500/20"
                      : "text-violet-950 bg-violet-400 hover:bg-violet-300 font-bold shadow-lg shadow-violet-500/20"
                  } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isPending ? (
                    <span className="flex items-center gap-1.5">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.8,
                          ease: "linear",
                        }}
                        className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"
                      />
                      创建中
                    </span>
                  ) : (
                    <>
                      <Plus size={15} />
                      创建{isReading ? "阅读" : "计划"}项目
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
