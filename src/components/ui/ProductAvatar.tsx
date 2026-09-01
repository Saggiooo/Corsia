import { Icon } from "@/components/icons/Icon";

type Props = {
  iconKey?: string | null;
  fallback?: string | null;
  colorToken?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  sm: { box: "h-9 w-9 rounded-[10px]", icon: 20 },
  md: { box: "h-12 w-12 rounded-[14px]", icon: 26 },
  lg: { box: "h-16 w-16 rounded-[18px]", icon: 34 },
  xl: { box: "h-28 w-28 rounded-[28px]", icon: 62 },
};

/** Icona prodotto dentro una piastrella tinta col colore del reparto. */
export function ProductAvatar({ iconKey, fallback, colorToken, size = "md", className = "" }: Props) {
  const token = colorToken ?? "pantry";
  const s = SIZES[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${s.box} ${className}`}
      style={{
        background: `var(--${token}-soft)`,
        color: `var(--${token})`,
        boxShadow: "inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent)",
      }}
    >
      <Icon name={iconKey ?? undefined} fallback={fallback ?? undefined} size={s.icon} />
    </span>
  );
}
