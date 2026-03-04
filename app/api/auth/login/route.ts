// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

type LoginBody = {
  username: string;
  password: string;
};

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS
  ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10)
  : 10;

export async function POST(request: Request) {
  try {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
      return NextResponse.json(
        { error: "Server auth not configured. Missing env vars." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as LoginBody;
    const { username, password } = body;

    // 1) Check username
    if (username !== ADMIN_USERNAME) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2) Compare password using bcrypt
    // ADMIN_PASSWORD in .env is plain text; we hash it in memory and compare.
    const hashedAdminPassword = await bcrypt.hash(
      ADMIN_PASSWORD,
      BCRYPT_SALT_ROUNDS
    );
    const isPasswordValid = await bcrypt.compare(password, hashedAdminPassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3) Create JWT payload
    const payload = {
      sub: "admin",
      username: ADMIN_USERNAME,
      role: "admin",
    };

    // 4) Sign JWT
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "4h",
    });

    // 5) Set HttpOnly cookie with JWT
    const res = NextResponse.json(
      { success: true, message: "Login successful" },
      { status: 200 }
    );

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: false, // change to true when you use HTTPS in production
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
