import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, Folder, BookOpen, Network, Zap, ArrowRight, CornerDownLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch } from './hooks/useGlobalSearch'
import type { SearchCategory, SearchResultItem } from '../../entities/search'

export interface GlobalSearchBarProps {
  onSearchChange?: (val: string) => void
}

const CATEGORY_TABS: { label: string; value: SearchCategory }[] = [
  { label: '全部', value: 'all' },
  { label: '项目', value: 'project' },
  { label: '笔记', value: 'note' },
  { label: '图谱', value: 'graph' },
  { label: '技能', value: 'skill' },
]

export function GlobalSearchBar({ onSearchChange }: GlobalSearchBarProps) {
  const navigate = useNavigate()
  const {
    searchOpen,
    searchVal,
    selectedCategory,
    loading,
    results,
    searchRef,
    searchInputRef,
    handleValueChange,
    handleCategoryChange,
    openSearch,
    closeSearch,
    clearSearch,
  } = useGlobalSearch({ onSearchChange })

  const getItemIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'project':
        return <Folder size={14} className="text-cyan-400 shrink-0" />
      case 'note':
        return <BookOpen size={14} className="text-emerald-400 shrink-0" />
      case 'graph':
        return <Network size={14} className="text-indigo-400 shrink-0" />
      case 'skill':
        return <Zap size={14} className="text-amber-400 shrink-0" />
      default:
        return <Search size={14} className="text-slate-400 shrink-0" />
    }
  }

  const getItemTagLabel = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'project':
        return '项目'
      case 'note':
        return '融合笔记'
      case 'graph':
        return '图谱节点'
      case 'skill':
        return '技能引擎'
      default:
        return '资源'
    }
  }

  const handleSelectResult = (targetUrl: string) => {
    closeSearch()
    navigate(targetUrl)
  }

  return (
    <div className="relative" ref={searchRef}>
      <AnimatePresence mode="wait">
        {searchOpen ? (
          <motion.div
            key="search-input"
            initial={{ width: 200, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 200, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#111827] border border-slate-700/80 rounded-xl shadow-xl focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/10 transition-all"
          >
            {loading ? (
              <Loader2 size={14} className="text-cyan-400 animate-spin shrink-0" />
            ) : (
              <Search size={14} className="text-slate-400 shrink-0" />
            )}
            <input
              ref={searchInputRef}
              autoFocus
              value={searchVal}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="搜索笔记、项目、图谱…"
              style={{ outline: 'none', boxShadow: 'none' }}
              className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 outline-none border-none focus:outline-none focus-visible:outline-none focus:ring-0 ring-0 shadow-none"
            />
            {searchVal ? (
              <button
                onClick={clearSearch}
                aria-label="清空搜索"
                className="cursor-pointer text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-white/10 transition-colors"
                title="清空"
              >
                <X size={13} />
              </button>
            ) : (
              <button
                onClick={closeSearch}
                aria-label="关闭搜索"
                className="cursor-pointer text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-white/10 transition-colors"
                title="关闭 (Esc)"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="search-button"
            onClick={openSearch}
            aria-label="打开全局搜索"
            className="h-9 px-2.5 flex items-center gap-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer text-xs group"
          >
            <Search size={15} className="group-hover:text-slate-200 transition-colors" />
            <span className="hidden md:inline-block text-slate-400 text-xs">搜索…</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs bg-white/10 border border-white/10 text-slate-300 px-1.5 py-0.5 rounded font-mono font-medium shadow-sm">
              ⌘K
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 搜索结果下拉匹配面板 */}
      <AnimatePresence>
        {searchOpen && searchVal.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 md:left-auto md:right-0 top-full mt-2 w-full md:w-[420px] max-h-[460px] flex flex-col bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs"
          >
            {/* 分类 Filter Tabs */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 bg-slate-900/60 overflow-x-auto no-scrollbar">
              {CATEGORY_TABS.map((tab) => {
                const active = selectedCategory === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => handleCategoryChange(tab.value)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs shrink-0 cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* 匹配结果列表区域 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin text-cyan-400" />
                  <span>正在检索全站数据…</span>
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                  <Search size={20} className="text-slate-500 stroke-[1.5]" />
                  <span className="text-slate-300 font-medium">未找到相关结果</span>
                  <span className="text-[11px] text-slate-500">试着用更简短的关键字或切换分类匹配</span>
                </div>
              ) : (
                results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectResult(item.target_url)}
                    className="group p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 cursor-pointer transition-all flex flex-col gap-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getItemIcon(item.type)}
                        <span className="font-semibold text-slate-100 truncate text-xs group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50 shrink-0">
                        {getItemTagLabel(item.type)}
                      </span>
                    </div>

                    {item.snippet && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 pl-5 font-normal leading-relaxed">
                        {item.snippet}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pl-5 pt-0.5">
                      <span>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ''}</span>
                      <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity">
                        查看详情 <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 底部底部快捷指令提示面板 */}
            <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                  Esc
                </kbd>
                退出搜索
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <CornerDownLeft size={11} /> 选择并转跳
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
