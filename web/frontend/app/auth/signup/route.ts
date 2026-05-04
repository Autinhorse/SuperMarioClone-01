import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function back(origin: string, message: string) {
  return NextResponse.redirect(
    `${origin}/signup?error=${encodeURIComponent(message)}`,
    { status: 303 },
  );
}

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !password || !username) {
    return back(origin, "All fields are required.");
  }
  if (!USERNAME_PATTERN.test(username)) {
    return back(origin, "Username must be 3–20 letters, numbers, or underscores.");
  }
  if (password.length < 8) {
    return back(origin, "Password must be at least 8 characters.");
  }

  const supabase = await createClient();

  // Pre-check username availability (case-insensitive — the unique index on
  // lower(username) treats "autinhorse" and "Autinhorse" as the same name).
  // Returns a clear error instead of a generic "Database error saving new user"
  // from the trigger when there's a conflict.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (existing) {
    return back(origin, "That username is taken.");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return back(origin, error.message);
  }

  return NextResponse.redirect(`${origin}/signup?check=email`, { status: 303 });
}
