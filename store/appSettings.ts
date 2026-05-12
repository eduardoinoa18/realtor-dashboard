import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { QUICK_LINKS, SPLITS, TARGETS } from '@/lib/constants';

export interface QuickLinkItem {
  id: string;
  label: string;
  url: string;
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

interface AppSettingsState {
  quickLinks: QuickLinkItem[];
  sidebarQuickLinksCollapsed: boolean;
  commissions: CommissionSettings;
  targets: TargetSettings;
  addQuickLink: (label: string, url: string) => void;
  removeQuickLink: (id: string) => void;
  toggleSidebarQuickLinks: () => void;
  setSidebarQuickLinksCollapsed: (collapsed: boolean) => void;
  updateCommission: (key: keyof CommissionSettings, value: number) => void;
  updateTarget: (key: keyof TargetSettings, value: number) => void;
}

const defaultQuickLinks: QuickLinkItem[] = QUICK_LINKS.map((link) => ({
  id: link.label.toLowerCase().replace(/\s+/g, '-'),
  label: link.label,
  url: link.url,
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
      quickLinks: defaultQuickLinks,
      sidebarQuickLinksCollapsed: false,
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
      addQuickLink: (label, url) => {
        const normalizedUrl = normalizeUrl(url);
        const normalizedLabel = label.trim();
        if (!normalizedLabel || !normalizedUrl) return;

        set((state) => ({
          quickLinks: [
            ...state.quickLinks,
            {
              id: `${normalizedLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
              label: normalizedLabel,
              url: normalizedUrl,
            },
          ],
        }));
      },
      removeQuickLink: (id) =>
        set((state) => ({
          quickLinks: state.quickLinks.filter((link) => link.id !== id),
        })),
      toggleSidebarQuickLinks: () =>
        set((state) => ({
          sidebarQuickLinksCollapsed: !state.sidebarQuickLinksCollapsed,
        })),
      setSidebarQuickLinksCollapsed: (collapsed) => set({ sidebarQuickLinksCollapsed: collapsed }),
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
    }),
    {
      name: 'realtor-hq-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
