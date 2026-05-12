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
  leadSource: 'own' | 'company' | 'zillow'
): { gross: number; franchiseFee: number; net: number } {
  const gross = salePrice * commissionPct;
  const franchiseFee = gross * 0.10;
  const afterFranchise = gross - franchiseFee;

  let agentShare = 0;
  if (leadSource === 'own') {
    agentShare = afterFranchise * 0.70;
  } else if (leadSource === 'company') {
    agentShare = afterFranchise * 0.50;
  } else if (leadSource === 'zillow') {
    const zillowTakes = gross * 0.35;
    const remaining = gross - zillowTakes - franchiseFee;
    agentShare = remaining * 0.50;
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
