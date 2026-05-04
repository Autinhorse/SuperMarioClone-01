import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the email-confirmation redirect from Supabase.
 * The link in the confirmation email points here with a `code` query param.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent("Missing confirmation code.")}`,
      { status: 303 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(error.message)}`,
      { status: 303 },
    );
  }

  return NextResponse.redirect(`${url.origin}${next}`, { status: 303 });
}
