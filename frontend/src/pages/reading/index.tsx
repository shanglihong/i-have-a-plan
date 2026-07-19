import {
  useParams,
  useNavigate,
} from "react-router-dom";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api";
import { useLayoutStore, useFocusStore, useFloatingMenuStore } from "../../shared/store";

import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Network,
  Cpu,
  Search,
  Bell,
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Bookmark,
  Zap,
  Archive,
  Play,
  MoreHorizontal,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  FileText,
  MessageSquare,
  Sparkles,
  Target,
  Map,
  Settings,
  TrendingUp,
  Circle,
  Minus,
  ChevronsRight,
  Lock,
  Unlock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

import { StatusBadge, ProgressBar } from "../../shared/ui";
import { SuspendedOverlay } from "../../features";

// ─── Reading Workspace ────────────────────────────────────────────────────────

export default function ReadingWorkspacePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeChapter, setActiveChapter] = useState("ch3");
  
  const outlineOpen = useLayoutStore(s => s.outlineOpen);
  const setOutlineOpen = useLayoutStore(s => s.setOutlineOpen);
  const discussOpen = useLayoutStore(s => s.discussOpen);
  const setDiscussOpen = useLayoutStore(s => s.setDiscussOpen);

  const targetAnchor = useFocusStore(s => s.targetAnchor);
  const setTargetAnchor = useFocusStore(s => s.setTargetAnchor);

  const floatingMenu = useFloatingMenuStore(s => s.menu);
  const setFloatingMenu = useFloatingMenuStore(s => s.setMenu);

  const [discussMsg, setDiscussMsg] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "你好！我已阅读本章内容。关于**注意力机制**，你有什么想深入探讨的地方吗？",
      done: true,
    },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);
  
  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`);
      return res.data;
    }
  });

  const { data: notesData } = useQuery({
    queryKey: ['project-notes', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/notes`);
      return res.data;
    }
  });
  const notes = notesData?.items || [];

  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post(`/notes`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', id] });
    }
  });

  const chapters = [
    {
      id: "ch1",
      label: "第1章：感知机与历史",
      level: 0,
      done: true,
    },
    {
      id: "ch2",
      label: "第2章：多层网络",
      level: 0,
      done: true,
    },
    {
      id: "ch3",
      label: "第3章：反向传播",
      level: 0,
      active: true,
    },
    { id: "ch3-1", label: "3.1 链式法则推导", level: 1 },
    { id: "ch3-2", label: "3.2 梯度消失分析", level: 1 },
    { id: "ch3-3", label: "3.3 BatchNorm 缓解", level: 1 },
    { id: "ch4", label: "第4章：卷积网络", level: 0 },
    {
      id: "ch5",
      label: "第5章：注意力与Transformer",
      level: 0,
    },
  ];

  useEffect(() => {
    if (targetAnchor && readerRef.current) {
      // Find element containing the anchor text (simplified for demo)
      const elements = Array.from(readerRef.current.querySelectorAll('h1, h2, p, div'));
      const targetEl = elements.find(el => el.textContent?.includes(targetAnchor.split(' · ')[1] || targetAnchor));
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [targetAnchor]);

  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setFloatingMenu(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setFloatingMenu(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect =
      readerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setFloatingMenu({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      text,
    });
  }, [setFloatingMenu]);

  const sendMessage = () => {
    if (!discussMsg.trim()) return;
    const userMsg = discussMsg;
    setDiscussMsg("");
    setMessages((m) => [
      ...m,
      { role: "user", content: userMsg, done: true },
    ]);
    setStreaming(true);

    const reply =
      "这是一个很好的问题。**反向传播算法**的核心是利用链式求导法则，将输出层的误差信号逐层传递回输入层。关键在于：每一层的梯度都是当前层局部梯度与后续层梯度的乘积。当激活函数（如 Sigmoid）的导数区间在 (0, 0.25) 时，多层连乘后梯度会指数级缩小，这就是**梯度消失**的根源。";
    let i = 0;
    setMessages((m) => [
      ...m,
      { role: "assistant", content: "", done: false },
    ]);
    const interval = setInterval(() => {
      i += 3;
      setMessages((m) => {
        const last = [...m];
        last[last.length - 1] = {
          role: "assistant",
          content: reply.slice(0, i),
          done: false,
        };
        return last;
      });
      if (i >= reply.length) {
        clearInterval(interval);
        setStreaming(false);
        setMessages((m) => {
          const last = [...m];
          last[last.length - 1].done = true;
          return last;
        });
      }
    }, 30);
  };

  const traceNote = (noteAnchor: string) => {
    setTargetAnchor(noteAnchor);
    setTimeout(() => setTargetAnchor(null), 2000);
  };

  // Scroll detection for recommendation bubble
  const handleScroll = useCallback(() => {
    if (!readerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      readerRef.current;
    setShowBubble(
      (scrollTop + clientHeight) / scrollHeight >= 0.7,
    );
  }, []);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Outline */}
      <AnimatePresence initial={false}>
        {outlineOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-white/5 overflow-hidden shrink-0"
          >
            <div className="w-[220px] h-full flex flex-col">
              <div className="p-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    深度学习基础理论精读
                  </span>
                  <button
                    onClick={() => setOutlineOpen(false)}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                </div>
                {/* Dual progress bar */}
                <div className="mt-3 space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                      <span>阅读进度</span>
                      <span>68%</span>
                    </div>
                    <ProgressBar value={68} color="cyan" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                      <span>切片解析</span>
                      <span>82%</span>
                    </div>
                    <ProgressBar value={82} color="violet" />
                  </div>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 px-2">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChapter(ch.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 mb-0.5
                      ${activeChapter === ch.id ? "bg-cyan-500/15 text-cyan-300" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}
                      ${ch.level === 1 ? "ml-3 text-[11px]" : ""}`}
                  >
                    {ch.done ? (
                      <CheckCircle2
                        size={10}
                        className="text-emerald-400 shrink-0"
                      />
                    ) : ch.active ? (
                      <Circle
                        size={10}
                        className="text-cyan-400 shrink-0"
                      />
                    ) : (
                      <Circle
                        size={10}
                        className="text-slate-700 shrink-0"
                      />
                    )}
                    <span className="leading-snug">
                      {ch.label}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Center: Reader */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 overflow-hidden relative">
        {!outlineOpen && (
          <button
            onClick={() => setOutlineOpen(true)}
            className="absolute left-3 top-3 z-10 p-1.5 glass rounded-lg text-slate-500 hover:text-slate-300 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        )}

        <div className="p-3 border-b border-white/5 flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500">
            第3章 · 反向传播算法
          </span>
          <div className="flex-1" />
          <span className="text-[10px] font-mono text-slate-600">
            预计耗时 ~24 min
          </span>
          <StatusBadge status="ACTIVE" />
        </div>

        <div
          ref={readerRef}
          className="flex-1 overflow-y-auto px-8 py-6 relative"
          onMouseUp={handleTextSelect}
          onScroll={handleScroll}
        >
          {/* Floating selection menu */}
          <AnimatePresence>
            {floatingMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="absolute z-20 glass rounded-lg shadow-xl px-1 py-1 flex items-center gap-0.5"
                style={{
                  left: floatingMenu.x - 70,
                  top: floatingMenu.y - 48,
                }}
              >
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-md transition-all"
                  onClick={() => setFloatingMenu(null)}
                >
                  <MessageSquare size={11} /> 讨论
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-md transition-all"
                  onClick={() => {
                    createNoteMutation.mutate({ content: floatingMenu.text, anchor: '当前选中内容' });
                    setFloatingMenu(null);
                  }}
                >
                  <Bookmark size={11} /> 记笔记
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Article content */}
          <article className="max-w-[640px] mx-auto">
            <h1 className="text-xl font-semibold text-slate-100 mb-2">
              第三章：反向传播算法
            </h1>
            <p className="text-xs text-slate-600 mb-6 font-mono">
              深度学习基础理论精读 · Chapter 3
            </p>

            <p className="text-sm text-slate-300 leading-7 mb-4">
              反向传播（Backpropagation）是训练人工神经网络的基础算法，由
              Rumelhart、Hinton 和 Williams 于 1986
              年系统性地提出并推广。其本质是利用微积分中的
              <span className="bg-emerald-500/15 text-emerald-300 px-1 rounded">
                链式法则（Chain Rule）
              </span>
              ，高效计算损失函数关于网络中每一个参数的偏导数。
            </p>

            <h2 className="text-base font-semibold text-slate-200 mb-3 mt-6">
              3.1 链式法则的核心推导
            </h2>
            <p className="text-sm text-slate-300 leading-7 mb-4">
              设神经网络为一个复合函数{" "}
              <code className="text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
                L = f(g(h(x)))
              </code>
              ，则根据链式法则，损失 L 对输入 x
              的梯度为三个局部梯度的连乘。这意味着，网络越深，需要相乘的局部梯度就越多。
            </p>

            <div
              className={`my-4 p-4 bg-white/3 ring-1 ring-white/8 rounded-xl transition-all duration-700 ${targetAnchor === "第5章 · 激活函数" ? "pulse-highlight ring-cyan-500/30" : ""}`}
            >
              <p className="text-sm text-slate-300 leading-7">
                当激活函数选用 Sigmoid 时，其导数的最大值仅为
                0.25。当层数超过 5
                层时，梯度会衰减至接近于零——这便是臭名昭著的
                <strong className="text-slate-100">
                  梯度消失问题（Vanishing Gradient Problem）
                </strong>
                。
              </p>
            </div>

            <h2 className="text-base font-semibold text-slate-200 mb-3 mt-6">
              3.2 梯度消失的量化分析
            </h2>
            <p className="text-sm text-slate-300 leading-7 mb-4">
              假设每层 Sigmoid 激活函数的局部梯度均为其最大值
              0.25，那么对于一个 10
              层网络，第一层接收到的梯度信号强度仅为输出层的{" "}
              <code className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono text-xs">
                0.25^10 ≈ 9.5 × 10⁻⁷
              </code>
              ，几乎为零，导致浅层参数根本无法被有效更新。
            </p>

            <h2 className="text-base font-semibold text-slate-200 mb-3 mt-6">
              3.3 BatchNorm 的缓解机制
            </h2>
            <p className="text-sm text-slate-300 leading-7 mb-4">
              批量归一化（Batch
              Normalization）通过对每一层的输入进行标准化，将激活值强制约束在梯度较大的区域，从而显著改善了深层网络的训练稳定性。配合
              ReLU
              激活函数，现代深度网络已经能够稳定训练超过百层。
            </p>

            <div className="h-20" />
          </article>
        </div>

        {/* Recommendation bubble */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 right-4 glass rounded-xl p-3 max-w-[260px] shadow-xl"
            >
              <div className="flex items-start gap-2">
                <Sparkles
                  size={14}
                  className="text-cyan-400 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs text-slate-300 leading-snug">
                    本章核心概念与你的笔记「梯度消失问题」高度相关，建议提炼为技能卡片。
                  </p>
                  <button className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                    提炼技能 →
                  </button>
                </div>
                <button
                  onClick={() => setShowBubble(false)}
                  className="text-slate-600 hover:text-slate-400 shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Notes + Discuss */}
      <AnimatePresence initial={false}>
        {discussOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="w-[300px] h-full flex flex-col">
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex gap-1">
                  <button className="px-2.5 py-1 text-xs text-cyan-300 bg-cyan-500/15 rounded-md ring-1 ring-cyan-500/30">
                    笔记
                  </button>
                  <button className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-300 rounded-md transition-colors">
                    伴读
                  </button>
                </div>
                <button
                  onClick={() => setDiscussOpen(false)}
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Notes waterfall */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {notes.map((note: any) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => traceNote(note.anchor)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        <Target size={10} /> {note.anchor}
                      </button>
                      <span className="text-[10px] text-slate-700">
                        {note.createdAt}
                      </span>
                    </div>
                    {note.quote && (
                      <blockquote className="text-[11px] text-emerald-300/70 bg-emerald-500/8 px-2.5 py-2 rounded-lg mb-2 italic leading-snug border-l-2 border-emerald-500/30">
                        "{note.quote}"
                      </blockquote>
                    )}
                    <p
                      className="text-xs text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: note.content.replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="text-slate-100">$1</strong>',
                        ),
                      }}
                    />
                  </motion.div>
                ))}

                <button className="w-full py-2.5 text-xs text-slate-600 hover:text-slate-400 border border-dashed border-white/8 rounded-xl hover:border-white/15 transition-all flex items-center justify-center gap-1.5">
                  <Plus size={12} /> 新建笔记
                </button>
              </div>

              {/* Discuss input */}
              <div className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    value={discussMsg}
                    onChange={(e) =>
                      setDiscussMsg(e.target.value)
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && sendMessage()
                    }
                    placeholder="向伴读 AI 提问…"
                    className="flex-1 bg-white/5 ring-1 ring-white/8 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:ring-cyan-500/40 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={streaming}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/40 transition-all disabled:opacity-50"
                  >
                    <Send size={13} />
                  </button>
                </div>

                {/* Message bubbles preview */}
                {messages.length > 0 && (
                  <div ref={chatRef} className="mt-3 space-y-2 max-h-[180px] overflow-y-auto">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-slate-300"} ${!msg.done ? "cursor-blink" : ""}`}
                          dangerouslySetInnerHTML={{
                            __html: msg.content.replace(
                              /\*\*(.*?)\*\*/g,
                              '<strong class="text-slate-100">$1</strong>',
                            ),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!discussOpen && (
        <button
          onClick={() => setDiscussOpen(true)}
          className="absolute right-3 top-12 z-10 p-1.5 glass rounded-lg text-slate-500 hover:text-slate-300 transition-all"
        >
          <MessageSquare size={14} />
        </button>
      )}
    </div>
  );
}

