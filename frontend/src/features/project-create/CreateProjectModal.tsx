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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!projectTitle.trim()) {
      setFormError("请输入项目名称");
      return;
    }

    if (createType === "READING" && !selectedFile) {
      setFormError("阅读项目必须上传关联的 PDF / MD / TXT 文档");
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
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-950/75 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-2xl p-6 w-full max-w-[520px] shadow-2xl my-8 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    创建双轨项目
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    支持阅读精读轨（文档上传）与计划执行轨（技能注入）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 错误提示条 */}
              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 flex items-start gap-2 text-red-300 text-xs">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 双轨类型切换卡片 */}
              <ProjectTypeSelector
                selectedType={createType}
                onSelect={(t) => {
                  setCreateType(t);
                  setFormError(null);
                }}
              />

              {/* 公共基础信息域 */}
              <div className="space-y-4 mb-5">
                <div>
                  <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                    项目名称 <span className="text-cyan-400">*</span>
                  </label>
                  <input
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
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
                  />
                </div>

                {/* 期望截止日期 */}
                <div>
                  <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                    期望截止日期
                  </label>
                  <DarkDatePicker
                    value={deadline}
                    onChange={(val) => setDeadline(val)}
                    color={createType === "READING" ? "cyan" : "violet"}
                  />
                </div>

                {/* 文件上传 (READING) */}
                {createType === "READING" && (
                  <div>
                    <label className="text-xs text-slate-300 mb-1.5 block font-medium">
                      实体文档上传 (file) <span className="text-cyan-400">*</span>
                    </label>
                    <FileDropzone
                      selectedFile={selectedFile}
                      onFileSelect={handleFileChange}
                      onFileRemove={() => setSelectedFile(null)}
                    />
                  </div>
                )}

                {/* 技能模板注入 (PLAN) */}
                {createType === "PLAN" && (
                  <PresetSkillSelector
                    selectedSkillId={selectedSkillId}
                    onSelectSkill={(id) => setSelectedSkillId(id)}
                  />
                )}
              </div>

              {/* 操作按钮组 */}
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-sm text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    createType === "READING"
                      ? "text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 ring-1 ring-cyan-500/40"
                      : "text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 ring-1 ring-violet-500/40"
                  } ${createProjectMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {createProjectMutation.isPending ? (
                    "创建中..."
                  ) : (
                    <>
                      <Plus size={14} />
                      创建{createType === "READING" ? "阅读" : "计划"}项目
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
