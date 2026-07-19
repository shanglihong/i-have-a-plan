import { useState, useRef } from "react"
import { UploadCloud, FileText, Trash2 } from "lucide-react"

export interface FileDropzoneProps {
  selectedFile: File | null
  onFileSelect: (files: FileList | null) => void
  onFileRemove: () => void
  accept?: string
  maxSizeMB?: number
  className?: string
}

/**
 * 暗黑拟态文件拖拽上传组件 (FileDropzone)
 */
export function FileDropzone({
  selectedFile,
  onFileSelect,
  onFileRemove,
  accept = ".pdf,.md,.markdown,.txt",
  maxSizeMB = 50,
  className = "",
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => onFileSelect(e.target.files)}
        accept={accept}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            onFileSelect(e.dataTransfer.files)
          }}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-cyan-400 bg-cyan-500/10"
              : "border-slate-700/80 hover:border-slate-500 bg-slate-900/40"
          }`}
        >
          <UploadCloud size={28} className="mx-auto text-cyan-400 mb-2 opacity-80" />
          <p className="text-xs font-medium text-slate-200">
            点击或拖拽上传 PDF / MD 文档
          </p>
          <p className="text-xs text-slate-400 mt-1">
            支持 {accept} 格式，最大不超过 {maxSizeMB}MB
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-300">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-200 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFileRemove}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="移除文件"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
