import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper to get the current user's session
export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user;
};

// Helper to fetch company data
export const getCompanyData = async (companyId: string) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  
  if (error) throw error;
  return data;
};

// Helper to fetch GST rates
export const getGSTRates = async () => {
  const { data, error } = await supabase
    .from('gst_rates')
    .select('*')
    .eq('is_active', true)
    .order('rate', { ascending: true });
  
  if (error) throw error;
  return data;
};

// Export the Supabase types for use in components
export type { Database } from './database.types';
