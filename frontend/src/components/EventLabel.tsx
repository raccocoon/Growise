import { Sprout, FlaskConical, ShieldCheck, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

export type EventType = "planting" | "fertilizing" | "pesticide" | "harvest";

const eventStyles: Record<EventType, { bg: string; iconBg: string; badgeBg: string; Icon: React.ElementType }> = {
  planting: { bg: "bg-[#DFF5E3]", iconBg: "bg-[#22C55E]", badgeBg: "bg-[#22C55E]", Icon: Sprout },
  fertilizing: { bg: "bg-[#FEF9C3]", iconBg: "bg-[#EAB308]", badgeBg: "bg-[#EAB308]", Icon: FlaskConical },
  pesticide: { bg: "bg-[#FFE4E6]", iconBg: "bg-[#F43F5E]", badgeBg: "bg-[#F43F5E]", Icon: ShieldCheck },
  harvest: { bg: "bg-[#FFEDD5]", iconBg: "bg-[#F97316]", badgeBg: "bg-[#F97316]", Icon: Wheat },
};

interface EventLabelProps {
  type: EventType;
  label: string;
  date?: string;
  count?: number;
  compact?: boolean;
}

export function EventLabel({ type, label, date, count, compact = false }: EventLabelProps) {
  const style = eventStyles[type] || eventStyles.planting;
  const { Icon } = style;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 px-1 py-0.5 rounded-md w-full", style.bg)}>
        <div className={cn("flex items-center justify-center rounded-[3px] flex-shrink-0 h-3.5 w-3.5", style.iconBg)}>
          <Icon className="h-2 w-2 text-white" />
        </div>
        <span className="text-[8px] font-medium text-[#1a1a1a] truncate flex-1">{label}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl w-full", date ? "h-14" : "h-11", style.bg)}>
      <div className={cn("flex items-center justify-center rounded-[6px] flex-shrink-0 h-7 w-7", style.iconBg)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[15px] font-medium text-[#1a1a1a] truncate leading-tight">{label}</span>
        {date && <span className="text-[11px] text-muted-foreground leading-tight">{date}</span>}
      </div>
    </div>
  );
}