import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { QUICK_LINKS, SPLITS, TARGETS } from '@/lib/constants';

export interface QuickLinkItem {
  id: string;
  label: string;
  url: string;
  group: string;
}

interface CommissionSettings {
  defaultCommissionPct: number;
  franchiseFeePct: number;
  ownAgentPct: number;
  companyAgentPct: number;
  zillowReferralPct: number;
  zillowAgentPct: number;
}

interface TargetSettings {
  netMonthlyTarget: number;
  survivalMinimum: number;
  avgSalePrice: number;
}

interface SecuritySettings {
  pinHash: string | null;
  isPinRequired: boolean;
  aiModeEnabled: boolean;
  aiModePinHash: string | null;
}

interface AppSettingsState {
  // Quick Links & UI
  quickLinks: QuickLinkItem[];
  sidebarQuickLinksCollapsed: boolean;
  
  // Financial Settings
  commissions: CommissionSettings;
  targets: TargetSettings;
  
  // Security & PIN
  security: SecuritySettings;
  pinAttempts: number;
  
  // Methods
  addQuickLink: (label: string, url: string, group?: string) => void;
  removeQuickLink: (id: string) => void;
  moveQuickLink: (id: string, direction: 'up' | 'down') => void;
  updateQuickLinkGroup: (id: string, group: string) => void;
  toggleSidebarQuickLinks: () => void;
  setSidebarQuickLinksCollapsed: (collapsed: boolean) => void;
  updateCommission: (key: keyof CommissionSettings, value: number) => void;
  updateTarget: (key: keyof TargetSettings, value: number) => void;
  
  // Security Methods
  setPinHash: (hash: string | null) => void;
  setIsPinRequired: (required: boolean) => void;
  setAiModeEnabled: (enabled: boolean) => void;
  setAiModePinHash: (hash: string | null) => void;
  setPinAttempts: (attempts: number) => void;
}

const defaultQuickLinks: QuickLinkItem[] = QUICK_LINKS.map((link) => ({
  id: link.label.toLowerCase().replace(/\s+/g, '-'),
  label: link.label,
  url: link.url,
  group: 'Core',
}));

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export const useAppSettings = create<AppSettingsState>()(
  persist(
    (set) => ({
      // Quick Links
      quickLinks: defaultQuickLinks,
      sidebarQuickLinksCollapsed: false,
      
      // Financial Settings
      commissions: {
        defaultCommissionPct: TARGETS.avgCommissionPct,
        franchiseFeePct: SPLITS.ownLead.franchiseFee,
        ownAgentPct: SPLITS.ownLead.agentPct,
        companyAgentPct: SPLITS.companyLead.agentPct,
        zillowReferralPct: SPLITS.zillowFlex.zillowPct,
        zillowAgentPct: SPLITS.zillowFlex.agentPct,
      },
      targets: {
        netMonthlyTarget: TARGETS.netMonthlyTarget,
        survivalMinimum: TARGETS.survivalMinimum,
        avgSalePrice: TARGETS.avgSalePrice,
      },
      
      // Security & PIN
      security: {
        pinHash: null,
        isPinRequired: false,
        aiModeEnabled: false,
        aiModePinHash: null,
      },
      pinAttempts: 0,
      
      // Quick Links Methods
      addQuickLink: (label, url, group = 'General') => {
        const normalizedUrl = normalizeUrl(url);
        const normalizedLabel = label.trim();
        const normalizedGroup = group.trim() || 'General';
        if (!normalizedLabel || !normalizedUrl) return;

        set((state) => ({
          quickLinks: [
            ...state.quickLinks,
            {
              id: `${normalizedLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
              label: normalizedLabel,
              url: normalizedUrl,
              group: normalizedGroup,
            },
          ],
        }));
      },
      removeQuickLink: (id) =>
        set((state) => ({
          quickLinks: state.quickLinks.filter((link) => link.id !== id),
        })),
      moveQuickLink: (id, direction) =>
        set((state) => {
          const idx = state.quickLinks.findIndex((item) => item.id === id);
          if (idx < 0) return state;
          const target = direction === 'up' ? idx - 1 : idx + 1;
          if (target < 0 || target >= state.quickLinks.length) return state;

          const next = [...state.quickLinks];
          [next[idx], next[target]] = [next[target], next[idx]];
          return { quickLinks: next };
        }),
      updateQuickLinkGroup: (id, group) =>
        set((state) => ({
          quickLinks: state.quickLinks.map((item) =>
            item.id === id ? { ...item, group: group.trim() || 'General' } : item
          ),
        })),
      toggleSidebarQuickLinks: () =>
        set((state) => ({
          sidebarQuickLinksCollapsed: !state.sidebarQuickLinksCollapsed,
        })),
      setSidebarQuickLinksCollapsed: (collapsed) => set({ sidebarQuickLinksCollapsed: collapsed }),
      
      // Commission & Target Methods
      updateCommission: (key, value) =>
        set((state) => ({
          commissions: {
            ...state.commissions,
            [key]: Number.isFinite(value) ? Math.max(0, value) : state.commissions[key],
          },
        })),
      updateTarget: (key, value) =>
        set((state) => ({
          targets: {
            ...state.targets,
            [key]: Number.isFinite(value) ? Math.max(0, value) : state.targets[key],
          },
        })),
      
      // Security Methods
      setPinHash: (hash) => set((state) => ({
        security: { ...state.security, pinHash: hash },
      })),
      setIsPinRequired: (required) => set((state) => ({
        security: { ...state.security, isPinRequired: required },
      })),
      setAiModeEnabled: (enabled) => set((state) => ({
        security: { ...state.security, aiModeEnabled: enabled },
      })),
      setAiModePinHash: (hash) => set((state) => ({
        security: { ...state.security, aiModePinHash: hash },
      })),
      setPinAttempts: (attempts) => set({ pinAttempts: attempts }),
    }),
    {
      name: 'realtor-hq-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
