// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  if (!authToken) {
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
       padding: "12px 16px",   // try 8–12 instead of very large
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
              Manage jobs, applications, and more.
            </p>
          </div>
        </div>

        <LogoutButton />
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <div
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
          <p style={{ fontSize: 14, color: "#4b5563" }}>
            This is your protected dashboard. Only logged-in admins can view
            this page.
          </p>
        </div>
      </section>
    </main>
  );
}
