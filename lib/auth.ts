import { getServerSession } from "next-auth";

export async function getSession() {
  const session = await getServerSession();
  
  return session; // session.user.id sudah bertipe string
}

// export { auth as getSession } from "@/auth";
