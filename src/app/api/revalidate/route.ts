import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// On-demand cache invalidation for the Discover feed. Call this after
// uploading new experiences to make them appear immediately instead of
// waiting for the cache to expire.
//
//   POST /api/revalidate?secret=<REVALIDATE_SECRET>
//
// Wire it into the Xano upload flow (an api.request step at the end of
// upload_itinerary_csv) so every upload refreshes the feed automatically,
// or hit it manually. Protected by a shared secret so it can't be abused
// to hammer revalidation. This route is excluded from the auth middleware
// (see middleware matcher) because it's called server-to-server by Xano
// with no user session.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, path: "/", now: Date.now() });
}
