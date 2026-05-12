export async function getSession() {
  const { createClient } = await import('@supabase/ssr').then(m => m);
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
