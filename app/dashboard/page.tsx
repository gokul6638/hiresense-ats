import ATSAnalyzerCard from "./ATSAnalyzerCard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import LogoutButton from "./LogoutButton";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

type JwtPayload = {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token || !JWT_SECRET) {
    redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (decoded.role !== "admin") {
      redirect("/login");
    }
  } catch (err) {
    console.error("Invalid JWT:", err);
    redirect("/login");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: "16px 24px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          marginBottom: 24,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Image
            src="/logo.png"
            alt="App logo"
            width={250}
            height={250}
            style={{ borderRadius: 30 }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              Admin Dashboard
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Analyze your resume with the Job Description.
            </p>
          </div>
        </div>

        <LogoutButton />
      </header>

      {/* Single Overview section that now contains the ATS analyzer */}
      <section
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Overview
        </h2>
        <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>
          This is a completely free ATS for personal-use only.
        </p>

        {/* ATS Analyzer inside the Overview content box */}
        <ATSAnalyzerCard />
      </section>
    </main>
  );
}
