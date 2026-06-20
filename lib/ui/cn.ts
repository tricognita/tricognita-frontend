/**
 * cn — class name composer for the UI primitives library.
 *
 * Filters out falsy values and joins with a space. Intentionally tiny — no
 * clsx or tailwind-merge dependency. Tailwind class conflicts (e.g. p-4 + p-2)
 * are the caller's responsibility; primitives are designed so callers pass
 * className LAST and it overrides built-in classes.
 *
 * Usage:
 *   <div className={cn("p-4 rounded", isActive && "bg-violet-600", className)} />
 */
export function cn(
  ...classes: Array<string | number | undefined | null | false | 0>
): string {
  return classes.filter(Boolean).join(" ");
}
