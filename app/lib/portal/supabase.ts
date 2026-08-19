import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { getPublicSupabaseEnvironment, getServiceSupabaseEnvironment } from "./config";

type PendingCookie = { name: string; value: string; options: CookieOptions };

export async function createServerSupabase() {
  const { url, anonKey } = getPublicSupabaseEnvironment();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (pending) => {
        try {
          pending.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components are read-only; middleware refreshes the cookies.
        }
      },
    },
  });
}

export function createRouteSupabase(request: NextRequest) {
  const { url, anonKey } = getPublicSupabaseEnvironment();
  const pendingCookies: PendingCookie[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (pending) => {
        pendingCookies.push(...pending);
      },
    },
  });
  return {
    supabase,
    applyCookies<T extends NextResponse>(response: T) {
      pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      return response;
    },
  };
}

export function createAdminSupabase() {
  const { url, serviceRoleKey } = getServiceSupabaseEnvironment();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
