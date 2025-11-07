// app/page.tsx
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import Dashboard from "./(dashboard)/page";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/signin");
  
  return <Dashboard />;
}
