import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Diagnostic endpoint — reports which auth cookies are present on the
// request. Returns booleans only, never values. Used by MixpanelProvider
// to attach cookie-presence flags to every "App Opened" event so we can
// correlate signed-out events with cookie state in the WKWebView. The
// middleware matcher excludes /api/auth/*, so this endpoint is reachable
// even when the user has no auth at all (which is the case we want to
// observe).
export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json(
    {
      hasXanoToken: !!cookieStore.get("xano_token")?.value,
      hasKindeRefresh: !!cookieStore.get("kinde_refresh")?.value,
      hasMobileAuthed: !!cookieStore.get("mobile_authed")?.value,
    },
    {
      // Prevent any caching layer from returning a stale answer.
      headers: { "Cache-Control": "no-store" },
    }
  );
}
