// ─── 阅读工作台统一 UI/UX 设计 Token 与标识常量 ───────────────────────────────────────────

export const READING_TOKENS = {
  // 字号与排版阶梯标识 (Typography Tokens)
  typography: {
    // 主正文与对话气泡：对齐 15px - 16px 精读比例
    body: "text-[15px] sm:text-base leading-relaxed font-sans text-slate-200",
    // 章节/模块标题
    title: "text-base sm:text-lg font-bold font-sans tracking-tight text-slate-100",
    // 辅助提示与芯片卡片：13px - 14px
    subtext: "text-xs sm:text-sm font-sans text-slate-300",
    // 元数据/时间戳/快捷键说明：12px Mono
    meta: "text-xs font-mono text-slate-500",
    // 动作与按钮标签：12px Medium，强制单行水平对齐，绝不换行变形
    action: "inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap text-xs font-medium font-sans text-slate-400 hover:text-slate-200 transition-colors cursor-pointer",
  },

  // 容器与卡片质感标识 (Surface Tokens)
  surface: {
    // 统一基础卡片 (AI 对话框 & 笔记卡片)
    card: "bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl shadow-xs",
    // 统一可悬浮交互卡片 (轻量通透，降低边框噪点)
    hoverCard: "bg-[#0F172A]/60 hover:bg-[#121C30]/90 border border-slate-800/40 hover:border-cyan-500/30 rounded-2xl shadow-xs hover:shadow-sm transition-all duration-200",
    // 用户消息气泡
    userBubble: "bg-[#131C2E] border border-cyan-500/30 text-slate-100 rounded-2xl rounded-tr-xs shadow-sm font-sans font-normal",
    // 圈选划线原文 (Quote Snippet Container - 清晰高对比与非斜体)
    quote: "bg-[#0C1A1A]/90 border-l-3 border-l-emerald-400 border-t border-r border-b border-emerald-500/30 text-emerald-100 text-xs sm:text-[13px] font-sans not-italic leading-relaxed rounded-r-xl shadow-inner",
    // 思考感悟 (Thought Block Container)
    thought: "bg-[#0B101D]/90 border border-slate-800/90 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 rounded-xl p-2.5 transition-all shadow-inner",
    // 章节/原文定位 Tag
    anchorBadge: "text-xs font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded-lg font-medium shrink-0 whitespace-nowrap",
    // 启发式提问 Prompt Chip
    promptChip: "px-3 py-1.5 text-xs sm:text-sm font-sans text-slate-300 hover:text-cyan-300 bg-slate-900/80 hover:bg-cyan-950/60 border border-slate-800/90 hover:border-cyan-500/40 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap",
    // 浮动推荐/引导提示卡片 (Recommendation Floating Bubble Card)
    recommendationBubble: "bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/50 backdrop-blur-xl select-none",
    // 提炼技能主行动按钮
    recommendationAction: "flex-1 shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-cyan-200 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-400 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs group",
  },
} as const
