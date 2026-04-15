import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudClient = url && key ? createClient(url, key) : null;
export const isCloudConfigured = !!cloudClient;
