import { create } from 'zustand';

interface KPIsStore {
  weekly: Record<string, number>;
  updateKPI: (key: string, value: number) => void;
  reset: () => void;
}

export const useKPIs = create<KPIsStore>((set) => ({
  weekly: {
    touches: 0,
    calls: 0,
    appointments: 0,
    new_leads: 0,
    uags: 0,
    closings: 0,
  },
  updateKPI: (key: string, value: number) =>
    set((state) => ({
      weekly: { ...state.weekly, [key]: value },
    })),
  reset: () =>
    set({
      weekly: {
        touches: 0,
        calls: 0,
        appointments: 0,
        new_leads: 0,
        uags: 0,
        closings: 0,
      },
    }),
}));
