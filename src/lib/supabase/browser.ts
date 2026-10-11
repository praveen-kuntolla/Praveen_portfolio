'use client';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';
// For browser integrations. Administrative mutations use the protected server API.
export function createSupabaseBrowserClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
