import { useNavigate } from "react-router-dom";
import { Quote, BookmarkCheck, ArrowUpRight } from "lucide-react";
import { useFeaturedNotesQuery } from "../../entities";

export function KnowledgeInsightsWidget() {
  const navigate = useNavigate();
  const { data: notesData, isLoading } = useFeaturedNotesQuery();
  const notes = notesData?.items || [];

  // 点击跳转至指定项目的阅读工作区
  const handleNavigateToProject = (projectId: string) => {
    navigate(`/project/read/${projectId}`);
  };

  return (
    <div className="glass rounded-2xl p-5 border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
      {/* Background Subtle Watermark Quote */}
      <Quote
        size={90}
        className="absolute -right-4 -bottom-4 text-violet-500/5 pointer-events-none rotate-12"
      />

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Quote size={13} className="text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">
            最新笔记金句提炼
          </h3>
        </div>
        <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-mono font-medium">
          {isLoading ? "加载中" : `${notes.length} 篇精选`}
        </span>
      </div>

      {/* Notes List with Direct Interactive Navigation */}
      <div className="space-y-3 relative z-10">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-slate-400 font-mono">
            金句提炼加载中...
          </div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 font-mono">
            暂无精选金句笔记
          </div>
        ) : (
          notes.slice(0, 2).map((note) => {
            const noteProjectId = note.project_id || note.projectId || "1";
            return (
              <div
                key={note.id}
                onClick={() => handleNavigateToProject(noteProjectId)}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-white/6 space-y-2.5 hover:border-violet-500/40 hover:bg-slate-800/80 transition-all duration-200 cursor-pointer group active:scale-[0.995]"
                title="点击前往该笔记对应项目的阅读工作区"
              >
                <p className="text-xs text-slate-300 italic leading-relaxed font-normal group-hover:text-slate-100 transition-colors">
                  “{note.quote || note.content}”
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1.5 border-t border-white/5">
                  <span className="text-cyan-400 font-medium flex items-center gap-1 group-hover:text-cyan-300 transition-colors">
                    <BookmarkCheck size={11} />
                    {note.anchor}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 group-hover:text-violet-400 transition-colors">
                    <span>{note.createdAt}</span>
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


