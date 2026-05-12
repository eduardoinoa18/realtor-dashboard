import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useFub(type: 'people' | 'events' | 'appointments' | 'tasks' | 'users') {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['fub', type],
    queryFn: async () => {
      const res = await fetch(`/api/fub?type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch from FUB');
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['fub', type] });
      }
    };

    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [queryClient, type]);

  return query;
}
