import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase client will not work."
  );
}

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
};

