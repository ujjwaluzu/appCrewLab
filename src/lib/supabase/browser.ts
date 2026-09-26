import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }

  browserClient = createBrowserClient(url, key);
  return browserClient;
}
