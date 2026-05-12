import { useQuery } from '@tanstack/react-query';

export function usePipeline() {
  return useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      // This would fetch from Supabase in a real implementation
      return { leads: [], count: 0 };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
