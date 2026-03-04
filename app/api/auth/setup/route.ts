import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/src/lib/supabaseServer";

export async function POST() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing ADMIN_USERNAME or ADMIN_PASSWORD in .env.local" },
      { status: 500 }
    );
  }

  // If admin already exists, block creating another one
  const existing = await supabaseServer
    .from("admin_users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing.data?.id) {
    return NextResponse.json(
      { ok: false, message: "Admin already exists. Setup not needed." },
      { status: 409 }
    );
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { error } = await supabaseServer.from("admin_users").insert({
    username,
    password_hash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Admin user created." });
}
