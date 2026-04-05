import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_API_BASE } from "@/lib/xano";

// POST — upload a profile photo and update the user record in Xano.
// Expects multipart/form-data with a field named "photo".
// Xano endpoint: POST /user/upload_photo (must exist in your Xano API group)
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const xanoToken = cookieStore.get("xano_token")?.value;

  if (!xanoToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  // Forward to Xano without setting Content-Type so fetch sets the multipart boundary
  const res = await fetch(`${USER_API_BASE}/user/upload_photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${xanoToken}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Upload failed" }, { status: res.status });
  }

  const data = await res.json();
  console.log("[avatar upload] Xano response:", JSON.stringify(data).slice(0, 1000));
  return NextResponse.json(data);
}
