import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check } from "lucide-react"

export interface SelectOption<T extends string | number = string> {
  value: T
  label: string
  icon?: React.ReactNode
}

export interface SelectProps<T extends string | number = string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "tinted" | "ghost"
  className?: string
  ariaLabel?: string
}

export function Select<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "请选择...",
  disabled = false,
  size = "md",
  variant = "default",
  className = "",
  ariaLabel = "下拉选择框",
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault()
      setIsOpen(false)
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      const currentIndex = options.findIndex((opt) => opt.value === value)
      const nextIndex =
        e.key === "ArrowDown"
          ? (currentIndex + 1) % options.length
          : (currentIndex - 1 + options.length) % options.length
      onChange(options[nextIndex].value)
    }
  }

  // Size styling map
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs gap-1.5 rounded-xl",
    md: "px-3 py-1.5 text-xs gap-2 rounded-xl",
    lg: "px-3.5 py-2 text-sm gap-2 rounded-xl",
  }

  const optionSizeStyles = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-xs",
    lg: "px-3.5 py-2 text-sm",
  }

  // Variant styling map for high contrast surface separation
  const variantStyles = {
    default: "bg-[#0F172A] border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/40",
    tinted: "bg-slate-800/80 border-slate-700/80 text-cyan-300 hover:bg-slate-800 hover:border-cyan-500/50 shadow-xs shadow-slate-950/50",
    ghost: "bg-transparent border-slate-800/60 text-slate-300 hover:bg-slate-800/40",
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between border transition-all cursor-pointer font-medium select-none ${
          isOpen
            ? "border-cyan-500/60 ring-1 ring-cyan-500/30 shadow-xs shadow-cyan-950/40 text-cyan-300"
            : variantStyles[variant]
        } ${sizeStyles[size]}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-cyan-400">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={size === "lg" ? 16 : 13}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-cyan-400" : ""
          }`}
        />
      </button>

      {/* Floating Options Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="listbox"
            aria-label={ariaLabel}
            className="absolute left-0 right-0 mt-1 z-50 min-w-full bg-[#0F172A]/95 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-2xl shadow-slate-950/80 space-y-0.5 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between rounded-lg transition-all cursor-pointer text-left ${
                    optionSizeStyles[size]
                  } ${
                    isSelected
                      ? "bg-cyan-500/15 text-cyan-300 font-medium"
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {option.icon && (
                      <span className={isSelected ? "text-cyan-400" : "text-slate-400"}>
                        {option.icon}
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>

                  {isSelected && <Check size={12} className="text-cyan-400 shrink-0 ml-1.5" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
