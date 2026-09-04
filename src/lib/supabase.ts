import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  url?: string;
}> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      connected: false,
      message: "Supabase environment variables (URL or ANON key) are missing.",
    };
  }

  try {
    // Check connectivity against the Supabase health endpoint
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
      },
    });

    if (response.ok) {
      return {
        connected: true,
        message: "Successfully connected to Supabase API.",
        url: supabaseUrl,
      };
    }

    if (response.status === 401) {
      return {
        connected: false,
        message: "Connected to Supabase, but the provided API key was rejected (HTTP 401 Unauthorized).",
        url: supabaseUrl,
      };
    }

    return {
      connected: true,
      message: `Connected to Supabase (Status HTTP ${response.status}).`,
      url: supabaseUrl,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    return {
      connected: false,
      message: `Failed to reach Supabase: ${errMessage}`,
      url: supabaseUrl,
    };
  }
}
