import { cn } from "@/lib/utils";
import type { EsiLevel } from "@/types";

export const ESI_LABELS: Record<EsiLevel, string> = {
  1: "Critique",
  2: "Urgent",
  3: "Modéré",
  4: "Peu urgent",
  5: "Non urgent",
};

const DOT: Record<EsiLevel, string> = {
  1: "bg-esi-1",
  2: "bg-esi-2",
  3: "bg-esi-3",
  4: "bg-esi-4",
  5: "bg-esi-5",
};

const TEXT: Record<EsiLevel, string> = {
  1: "text-esi-1",
  2: "text-esi-2",
  3: "text-esi-3",
  4: "text-esi-4",
  5: "text-esi-5",
};

export function EsiBadge({
  level,
  size = "sm",
  withLabel = false,
  className,
}: {
  level: EsiLevel;
  size?: "sm" | "lg";
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card font-semibold",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-5 py-2.5 text-lg",
        TEXT[level],
        className,
      )}
    >
      <span className={cn("rounded-full", DOT[level], size === "sm" ? "size-2" : "size-3.5")} />
      ESI {level}
      {withLabel && (
        <span className="font-medium text-muted-foreground">· {ESI_LABELS[level]}</span>
      )}
    </span>
  );
}
