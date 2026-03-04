// app/api/auth/login/route.ts
import { NextResponse } from "next/server";

type LoginBody = {
  username: string;
  password: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const { username, password } = body;

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Server auth not configured. Missing env vars." },
        { status: 500 }
      );
    }

    if (username === adminUsername && password === adminPassword) {
      // For now just return success, you can later add JWT/cookies here
      return NextResponse.json(
        { success: true, message: "Login successful" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
