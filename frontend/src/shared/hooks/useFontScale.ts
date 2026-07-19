import { useState, useEffect } from "react";

export type FontScaleLevel = "compact" | "standard" | "comfortable" | "large";

export interface FontScaleOption {
  key: FontScaleLevel;
  label: string;
  scale: number;
  description: string;
}

export const FONT_SCALE_OPTIONS: FontScaleOption[] = [
  { key: "compact", label: "紧凑", scale: 0.92, description: "信息密度更高 (92%)" },
  { key: "standard", label: "标准", scale: 1.0, description: "常规显示器默认 (100%)" },
  { key: "comfortable", label: "舒适大屏", scale: 1.08, description: "推荐 2K/27寸大显示器 (108%)" },
  { key: "large", label: "放大阅读", scale: 1.16, description: "高分清晰视图 (116%)" },
];

const STORAGE_KEY = "app_font_scale_level";
const CUSTOM_EVENT_KEY = "app_font_scale_changed";

export function useFontScale() {
  const [scaleLevel, setScaleLevel] = useState<FontScaleLevel>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as FontScaleLevel | null;
    if (saved && FONT_SCALE_OPTIONS.some((o) => o.key === saved)) {
      return saved;
    }
    return "standard";
  });

  const currentOption =
    FONT_SCALE_OPTIONS.find((o) => o.key === scaleLevel) || FONT_SCALE_OPTIONS[1];

  const updateScale = (newLevel: FontScaleLevel) => {
    const targetOption = FONT_SCALE_OPTIONS.find((o) => o.key === newLevel);
    if (!targetOption) return;

    setScaleLevel(newLevel);
    localStorage.setItem(STORAGE_KEY, newLevel);
    document.documentElement.style.setProperty(
      "--app-font-scale",
      targetOption.scale.toString()
    );

    // 触发自定义事件 notify 其它 Hook 监听组件
    window.dispatchEvent(
      new CustomEvent(CUSTOM_EVENT_KEY, { detail: newLevel })
    );
  };

  useEffect(() => {
    // 首次挂载初始化应用到 documentElement
    document.documentElement.style.setProperty(
      "--app-font-scale",
      currentOption.scale.toString()
    );

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent<FontScaleLevel>).detail;
      if (detail && FONT_SCALE_OPTIONS.some((o) => o.key === detail)) {
        setScaleLevel(detail);
      }
    };

    window.addEventListener(CUSTOM_EVENT_KEY, handleCustomEvent);
    return () => window.removeEventListener(CUSTOM_EVENT_KEY, handleCustomEvent);
  }, [currentOption.scale]);

  return {
    scaleLevel,
    currentScale: currentOption.scale,
    currentOption,
    options: FONT_SCALE_OPTIONS,
    setScaleLevel: updateScale,
  };
}
