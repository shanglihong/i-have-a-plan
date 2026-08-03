import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, AlertCircle, BookOpen, Info } from "lucide-react";

import { DarkDatePicker, FileDropzone, Button } from "../../shared/ui";
import { useCreateProjectMutation } from "../../entities";

interface CreateReadingProjectModalProps {
  open: boolean;
  onClose: () => void;
}

const getOneWeekLaterDateString = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split("T")[0];
};

export function CreateReadingProjectModal({
  open,
  onClose,
}: CreateReadingProjectModalProps) {
  const [projectTitle, setProjectTitle] = useState("");
  const [deadline, setDeadline] = useState<string>(getOneWeekLaterDateString);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    setSelectedFile(null);
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

    if (!selectedFile) {
      setFormError("阅读项目必须上传关联文档（PDF / MD / TXT）");
      return;
    }

    createProjectMutation.mutate(
      {
        title: projectTitle,
        type: "READING",
        deadline,
        file: selectedFile,
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
            aria-labelledby="create-reading-project-title"
            className="glass rounded-2xl p-6 w-full max-w-[580px] max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl my-auto border border-white/10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              {/* 头部：类型图标与标题描述 */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-cyan-500/15 border-cyan-500/30 text-cyan-300">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2
                      id="create-reading-project-title"
                      className="text-base font-bold text-slate-100 leading-tight"
                    >
                      创建阅读精读项目
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      上传文档资料，建立切片精读与知识图谱
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
              <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-2.5 text-xs text-cyan-300/90 leading-relaxed">
                <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  提示：阅读项目生成的精读计划也将作为一个计划项目进行管理与履约追踪。
                </span>
              </div>

              {/* 基础信息域 */}
              <div className="space-y-4 mb-6">
                {/* 项目名称 */}
                <div>
                  <label
                    htmlFor="reading-project-title"
                    className="text-xs text-slate-300 mb-1.5 block font-medium"
                  >
                    项目名称 <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    id="reading-project-title"
                    type="text"
                    value={projectTitle}
                    onChange={(e) => {
                      setProjectTitle(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="如：深入理解 Linux 内核架构"
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
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
                    color="cyan"
                  />
                </div>

                {/* 关联文档上传 */}
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
                  variant="cyan"
                  isLoading={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    "创建中"
                  ) : (
                    <>
                      <Plus size={15} />
                      创建阅读项目
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
