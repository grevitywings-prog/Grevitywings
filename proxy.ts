import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment, getPublicSupabaseEnvironment } from "./app/lib/portal/config";

function securePortalResponse(response: NextResponse) {
  response.headers.set("cache-control", "private, no-store, max-age=0");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "same-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnvironment()) return securePortalResponse(NextResponse.next({ request }));
  const { url, anonKey } = getPublicSupabaseEnvironment();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Revalidate the cookie-backed identity; never authorize from getSession().
  await supabase.auth.getUser();
  return securePortalResponse(response);
}

export const config = {
  matcher: [
    "/portal/:path*",
    "/admin/client-delivery/:path*",
    "/api/portal/:path*",
    "/api/admin/client-delivery/:path*",
  ],
};
