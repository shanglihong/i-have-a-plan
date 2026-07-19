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
  menu: { x: number; y: number; text: string } | null;
  setMenu: (menu: { x: number; y: number; text: string } | null) => void;
}

export const useFloatingMenuStore = create<FloatingMenuState>((set) => ({
  menu: null,
  setMenu: (menu) => set({ menu }),
}));
