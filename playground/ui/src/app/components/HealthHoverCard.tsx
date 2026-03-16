import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import type { HealthState } from "@/lib/types";

function badgeVariant(status: HealthState) {
  if (status === "pass") return "success";
  if (status === "warn") return "warning";
  return "destructive";
}

function statusLabel(status: HealthState) {
  if (status === "pass") return "Healthy";
  if (status === "warn") return "Watch";
  return "Attention";
}

type HealthHoverCardProps = {
  label: string;
  status: HealthState;
  description: string;
};

export default function HealthHoverCard({ label, status, description }: HealthHoverCardProps) {
  return (
    <HoverCard openDelay={120} closeDelay={120}>
      <HoverCardTrigger asChild>
        <div>
          <Badge variant={badgeVariant(status)} className="cursor-default">
            {label}: {statusLabel(status)}
          </Badge>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{label}</p>
            <Badge variant={badgeVariant(status)}>{statusLabel(status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
