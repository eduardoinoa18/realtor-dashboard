import { useQuery } from '@tanstack/react-query';

export function useFub(type: 'people' | 'events' | 'appointments') {
  return useQuery({
    queryKey: ['fub', type],
    queryFn: async () => {
      const res = await fetch(`/api/fub?type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch from FUB');
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
