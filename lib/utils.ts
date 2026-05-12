export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function calculateCommission(
  salePrice: number,
  commissionPct: number,
  leadSource: 'own' | 'company' | 'zillow',
  options?: {
    franchiseFeePct?: number;
    ownAgentPct?: number;
    companyAgentPct?: number;
    zillowReferralPct?: number;
    zillowAgentPct?: number;
  }
): { gross: number; franchiseFee: number; net: number } {
  const gross = salePrice * commissionPct;
  const franchiseFeePct = options?.franchiseFeePct ?? 0.10;
  const ownAgentPct = options?.ownAgentPct ?? 0.70;
  const companyAgentPct = options?.companyAgentPct ?? 0.50;
  const zillowReferralPct = options?.zillowReferralPct ?? 0.35;
  const zillowAgentPct = options?.zillowAgentPct ?? 0.50;

  const franchiseFee = gross * franchiseFeePct;
  const afterFranchise = gross - franchiseFee;

  let agentShare = 0;
  if (leadSource === 'own') {
    agentShare = afterFranchise * ownAgentPct;
  } else if (leadSource === 'company') {
    agentShare = afterFranchise * companyAgentPct;
  } else if (leadSource === 'zillow') {
    const zillowTakes = gross * zillowReferralPct;
    const remaining = gross - zillowTakes - franchiseFee;
    agentShare = remaining * zillowAgentPct;
  }

  return {
    gross: Math.round(gross),
    franchiseFee: Math.round(franchiseFee),
    net: Math.round(agentShare),
  };
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
