// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Always redirect "/" to the login page
  redirect("/login");
}
