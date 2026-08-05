import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  outlineOpen: boolean;
  discussOpen: boolean;
  setOutlineOpen: (open: boolean) => void;
  setDiscussOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      outlineOpen: true,
      discussOpen: true,
      setOutlineOpen: (open) => set({ outlineOpen: open }),
      setDiscussOpen: (open) => set({ discussOpen: open }),
    }),
    { name: 'layout-storage' }
  )
);

interface FocusState {
  targetAnchor: string | null;
  setTargetAnchor: (anchor: string | null) => void;
}

export const useFocusStore = create<FocusState>((set) => ({
  targetAnchor: null,
  setTargetAnchor: (anchor) => set({ targetAnchor: anchor }),
}));

interface FloatingMenuState {
  menu: {
    x: number;
    y: number;
    text: string;
    blockId: string;         // 起点 Block id
    endBlockId?: string;     // 终点 Block id（跨 Block 时使用）
    middleBlockIds?: string[]; // 中间 Block ids（跨 3+ Block 时使用）
    startOffset: number;       // Block 相对起点偏移
    endOffset: number;         // Block 相对终点偏移
    chapter_startOffset: number; // 章节全量起点偏移
    chapter_endOffset: number;   // 章节全量终点偏移
    placement?: 'top' | 'bottom';
  } | null;
  isWritingNote: boolean;
  setMenu: (menu: FloatingMenuState['menu']) => void;
  setIsWritingNote: (isWritingNote: boolean) => void;
}

export const useFloatingMenuStore = create<FloatingMenuState>((set) => ({
  menu: null,
  isWritingNote: false,
  setMenu: (menu) => set({ menu, isWritingNote: false }),
  setIsWritingNote: (isWritingNote) => set({ isWritingNote }),
}));
