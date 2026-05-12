import { create } from 'zustand';

interface DashboardStore {
  streakCount: number;
  lastActiveDate: Date | null;
  incrementStreak: () => void;
  resetStreak: () => void;
}

export const useDashboard = create<DashboardStore>((set) => ({
  streakCount: 0,
  lastActiveDate: null,
  incrementStreak: () =>
    set((state) => ({
      streakCount: state.streakCount + 1,
    })),
  resetStreak: () =>
    set({
      streakCount: 0,
      lastActiveDate: null,
    }),
}));
