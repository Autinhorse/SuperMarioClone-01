import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static assets.
    //
    // `api/v1` is excluded too: those routes authenticate from an
    // `Authorization: Bearer` header (the desktop game client, ADR-004), so
    // refreshing *cookie* sessions there is a wasted Supabase round trip on
    // every request — and it would try to set refresh cookies on responses a
    // native client neither sends nor stores.
    "/((?!api/v1|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
