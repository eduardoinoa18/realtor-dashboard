import { useQuery } from '@tanstack/react-query';

export function useKpis(weekStart?: string) {
  return useQuery({
    queryKey: ['kpis', weekStart],
    queryFn: async () => {
      // This would fetch from Supabase in a real implementation
      return {
        touches: 0,
        calls: 0,
        appointments: 0,
        new_leads: 0,
        uags: 0,
        closings: 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
