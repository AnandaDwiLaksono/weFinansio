// sederhana: hanya icon Lucide React (react-icons/lu). Perluas bila perlu.
import * as Lu from "react-icons/lu";
import { IconType } from "react-icons";

export function getIconByName(name?: string): IconType | null {
  if (!name) return null;
  // aman: hanya ambil dari namespace Lu
  return (Lu as Record<string, IconType>)[name] || null;
}
