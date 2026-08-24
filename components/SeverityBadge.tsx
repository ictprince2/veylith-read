import { cn, SEVERITY_COLORS } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider",
        SEVERITY_COLORS[severity] || SEVERITY_COLORS.informational,
        className
      )}
    >
      {severity}
    </span>
  );
}
