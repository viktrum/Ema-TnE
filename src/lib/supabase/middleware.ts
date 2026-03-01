import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that don't require authentication */
const PUBLIC_PATHS = ["/login", "/api", "/_next"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the auth session (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public paths through without auth checks
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // --- Protected routes: redirect to /login if not authenticated ---
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // --- Role-based access control ---
  // Check auth metadata first, then fall back to public.users table
  let role: string =
    (user.user_metadata?.role as string) ??
    (user.app_metadata?.role as string) ??
    "";

  if (!role) {
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    role = dbUser?.role ?? "employee";
  }

  const isChat = pathname.startsWith("/chat");
  const isDashboard = pathname.startsWith("/dashboard");

  if (isChat && role !== "employee") {
    // Non-employees trying to access /chat → redirect to /dashboard
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  if (isDashboard && !["manager", "chro", "admin"].includes(role)) {
    // Employees trying to access /dashboard → redirect to /chat
    const chatUrl = request.nextUrl.clone();
    chatUrl.pathname = "/chat";
    return NextResponse.redirect(chatUrl);
  }

  return supabaseResponse;
}
