'use client';

import React, { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SupabaseProvider({ children }: { children: ReactNode }) {
  // Initialize Supabase client
  createClient();

  return <>{children}</>;
}
