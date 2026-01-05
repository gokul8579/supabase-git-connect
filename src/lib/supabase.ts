// Re-export the centralized Supabase client to avoid multiple instances
export { supabase } from '@/integrations/supabase/client';
export type { Database } from '@/integrations/supabase/types';

// Helper to get the current user's session
export const getCurrentUser = async () => {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user;
};
