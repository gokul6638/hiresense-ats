// app/dashboard/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "none",
        background: "#ef4444",
        color: "white",
        fontWeight: 500,
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      Logout
    </button>
  );
}
