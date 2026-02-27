import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getIconByName } from "@/lib/icons";

export default function KPICard({
  title,
  value,
  icon,
  color,
  children,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {(() => {
            const Icon = getIconByName(icon);
            return (
              <span
                className="inline-flex items-center gap-1 rounded-lg text-xs font-medium p-2"
                style={{
                  backgroundColor: color ? `${color}1A` : "transparent", // 10% opacity
                  color: color || "#0f172a",
                }}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              </span>
            );
          })()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {children ? (
          <p className="mt-1 text-xs text-muted-foreground">{children}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
