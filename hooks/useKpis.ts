import { useQuery } from '@tanstack/react-query';

export function useKpis(weekStart?: string) {
  return useQuery({
    queryKey: ['kpis', weekStart],
    queryFn: async () => {
      const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
      const res = await fetch(`/api/kpis${query}`);
      if (!res.ok) throw new Error('Failed to fetch KPIs');
      const data = await res.json();
      const row = data?.kpis || {};
      return {
        week_start: data?.weekStart || row.week_start,
        touches: Number(row.touches || 0),
        calls: Number(row.calls || 0),
        texts: Number(row.texts || 0),
        emails: Number(row.emails || 0),
        appointments: Number(row.appointments || 0),
        new_leads: Number(row.new_leads || 0),
        uags: Number(row.uags || 0),
        closings: Number(row.closings || 0),
        fub_synced_at: row.fub_synced_at || null,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
