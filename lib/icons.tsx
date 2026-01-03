// sederhana: hanya icon Lucide React (react-icons/lu). Perluas bila perlu.
import * as Lu from "react-icons/lu";
import { IconType } from "react-icons";

export function getIconByName(name?: string): IconType | null {
  if (!name) return null;
  
  // Jika name sudah ada prefix "Lu", gunakan langsung
  if (name.startsWith("Lu")) {
    return (Lu as Record<string, IconType>)[name] || null;
  }
  
  // Jika tidak ada prefix, tambahkan "Lu"
  const iconName = `Lu${name}`;
  return (Lu as Record<string, IconType>)[iconName] || null;
}
