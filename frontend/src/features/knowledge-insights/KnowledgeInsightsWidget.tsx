import { useNavigate } from "react-router-dom";
import { Quote, ChevronRight, BookmarkCheck } from "lucide-react";
import { useFeaturedNotesQuery } from "../../entities";

export function KnowledgeInsightsWidget() {
  const navigate = useNavigate();
  const { data: notesData, isLoading } = useFeaturedNotesQuery();
  const notes = notesData?.items || [];

  return (
    <div className="glass rounded-2xl p-5 border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
      {/* Background Subtle Watermark Quote */}
      <Quote
        size={90}
        className="absolute -right-4 -bottom-4 text-violet-500/5 pointer-events-none rotate-12"
      />

      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Quote size={13} className="text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">
            最新笔记金句提炼
          </h3>
        </div>
        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
          {isLoading ? "加载中" : `${notes.length} 篇精选`}
        </span>
      </div>

      <div className="space-y-3 relative z-10">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-slate-400 font-mono">
            金句提炼加载中...
          </div>
        ) : (
          notes.slice(0, 2).map((note) => (
            <div
              key={note.id}
              className="p-3.5 rounded-xl bg-slate-900/70 border border-white/6 space-y-2.5 hover:border-violet-500/30 transition-all duration-200 group"
            >
              <p className="text-xs text-slate-300 italic leading-relaxed font-normal group-hover:text-slate-100 transition-colors">
                “{note.quote || note.content}”
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-white/5">
                <span className="text-cyan-400 font-medium flex items-center gap-1">
                  <BookmarkCheck size={11} />
                  {note.anchor}
                </span>
                <span>{note.createdAt}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate("/project/read/1")}
        className="w-full py-2.5 text-xs font-semibold text-slate-300 hover:text-cyan-300 bg-slate-900/60 hover:bg-slate-800 rounded-xl border border-white/8 hover:border-cyan-500/30 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-sm group"
      >
        <span>在《深度学习基础》中查看全部笔记</span>
        <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
      </button>
    </div>
  );
}
