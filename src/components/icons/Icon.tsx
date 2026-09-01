import type { SVGProps } from "react";
import { ALIASES, DRAWINGS } from "./paths";

export type IconProps = SVGProps<SVGSVGElement> & {
  /** Chiave del prodotto. Se manca il disegno si ricade su `fallback`. */
  name?: string | null;
  /** Chiave di categoria, usata quando il prodotto non ha un disegno proprio. */
  fallback?: string | null;
  size?: number;
};

function resolve(key?: string | null): (() => React.ReactElement) | undefined {
  if (!key) return undefined;
  return DRAWINGS[key] ?? DRAWINGS[ALIASES[key] ?? ""];
}

export function hasIcon(key?: string | null): boolean {
  return resolve(key) !== undefined;
}

export function Icon({ name, fallback, size = 24, ...props }: IconProps) {
  const Draw = resolve(name) ?? resolve(fallback) ?? DRAWINGS.basket;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <Draw />
    </svg>
  );
}
