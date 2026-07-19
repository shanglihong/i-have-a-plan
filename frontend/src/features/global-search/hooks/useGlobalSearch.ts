import { useState, useRef, useEffect, useCallback } from 'react'
import { useClickOutside } from '../../../shared/hooks/useClickOutside'
import { searchGlobal, type SearchResultItem, type SearchCategory } from '../../../entities/search'

export interface UseGlobalSearchOptions {
  onSearchChange?: (val: string) => void
}

export function useGlobalSearch({ onSearchChange }: UseGlobalSearchOptions = {}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResultItem[]>([])

  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 使用 ref 记录最新状态，避免在 useEffect 监听 keydown 时频繁解绑/重新绑定事件
  const stateRef = useRef({ searchOpen, searchVal, onSearchChange })
  stateRef.current = { searchOpen, searchVal, onSearchChange }

  // 点击外部收起
  useClickOutside(searchRef, () => setSearchOpen(false), searchOpen)

  // 快捷键 ⌘K 打开, Esc 退出/清空
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { searchOpen, searchVal, onSearchChange } = stateRef.current

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      } else if (e.key === 'Escape' && searchOpen) {
        if (searchVal) {
          setSearchVal('')
          setResults([])
          onSearchChange?.('')
        } else {
          setSearchOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 执行真实搜索 API
  const executeSearch = useCallback(async (q: string, cat: SearchCategory) => {
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await searchGlobal({ q: q.trim(), category: cat, limit: 10 })
      setResults(res.results || [])
    } catch (err) {
      console.error('Global search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 防抖搜索
  useEffect(() => {
    if (!searchVal.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      executeSearch(searchVal, selectedCategory)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchVal, selectedCategory, executeSearch])

  const handleValueChange = (val: string) => {
    setSearchVal(val)
    onSearchChange?.(val)
  }

  const handleCategoryChange = (cat: SearchCategory) => {
    setSelectedCategory(cat)
  }

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  const closeSearch = () => {
    setSearchOpen(false)
  }

  const clearSearch = () => {
    setSearchVal('')
    setResults([])
    onSearchChange?.('')
  }

  return {
    searchOpen,
    setSearchOpen,
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
  }
}
