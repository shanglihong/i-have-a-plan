import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, AlertCircle } from "lucide-react";

import { ProjectType } from "../../shared/types";
import { DarkDatePicker, FileDropzone } from "../../shared/ui";
import { useCreateProjectMutation } from "../../entities";
import { ProjectTypeSelector } from "./components/ProjectTypeSelector";
import { PresetSkillSelector } from "./components/PresetSkillSelector";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const getOneWeekLaterDateString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
};

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const [createType, setCreateType] = useState<ProjectType>("READING");
  const [projectTitle, setProjectTitle] = useState("");
  const [deadline, setDeadline] = useState<string>(getOneWeekLaterDateString);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setProjectTitle("");
    setDeadline(getOneWeekLaterDateString());
    setSelectedFile(null);
    setSelectedSkillId("");
    setFormError(null);
  };

  const createProjectMutation = useCreateProjectMutation();
  const isPending = createProjectMutation.isPending;

  // focus ring 颜色跟随当前选中的项目类型
  const focusRingClass =
    createType === "READING"
      ? "focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
      : "focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/40";

  const accentColor = createType === "READING" ? "text-cyan-400" : "text-violet-400";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!projectTitle.trim()) {
      setFormError("请输入项目名称");
      return;
    }

    if (createType === "READING" && !selectedFile) {
      setFormError("阅读项目必须上传关联文档（PDF / MD / TXT）");
      return;
    }

    if (createType === "READING") {
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
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-950/70 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass rounded-2xl p-6 w-full max-w-[500px] shadow-2xl my-8 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              {/* 头部 */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-100 leading-tight">
                    创建项目
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    选择类型，填写基本信息后创建
                  </p>
                </div>
                {/* 扩大触碰区至约 36px，符合 WCAG 最小目标尺寸 */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="text-slate-400 hover:text-slate-100 transition-colors p-2 -mr-1 -mt-0.5 rounded-lg hover:bg-white/8 cursor-pointer"
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

              {/* 项目类型选择 */}
              <ProjectTypeSelector
                selectedType={createType}
                onSelect={(t) => {
                  setCreateType(t);
                  setFormError(null);
                }}
              />

              {/* 基础信息域 */}
              <div className="space-y-4 mb-5">
                {/* 项目名称 —— label 与 input 关联，focus 色跟随类型 */}
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
                      createType === "READING"
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
                    color={createType === "READING" ? "cyan" : "violet"}
                  />
                </div>

                {/* 条件区块：切换时带动画 */}
                <AnimatePresence mode="wait">
                  {createType === "READING" && (
                    <motion.div
                      key="file-upload"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                    >
                      <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                        关联文档{" "}
                        <span className="text-cyan-400">*</span>
                        <span className="text-slate-400 font-normal ml-1">
                          PDF / MD / TXT
                        </span>
                      </label>
                      <FileDropzone
                        selectedFile={selectedFile}
                        onFileSelect={handleFileChange}
                        onFileRemove={() => setSelectedFile(null)}
                      />
                    </motion.div>
                  )}

                  {createType === "PLAN" && (
                    <motion.div
                      key="skill-selector"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                    >
                      <PresetSkillSelector
                        selectedSkillId={selectedSkillId}
                        onSelectSkill={(id) => setSelectedSkillId(id)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 操作按钮组 */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 hover:text-slate-200 transition-all cursor-pointer"
                >
                  取消
                </button>
                <motion.button
                  type="submit"
                  disabled={isPending}
                  whileTap={!isPending ? { scale: 0.97 } : {}}
                  transition={{ duration: 0.12 }}
                  className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    createType === "READING"
                      ? "text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-500/40"
                      : "text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 ring-1 ring-violet-500/40"
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
                      <Plus size={14} />
                      创建{createType === "READING" ? "阅读" : "计划"}项目
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
