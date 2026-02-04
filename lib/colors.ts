// Shared color classes for category badges across the application
// Used by both frontend and admin panel for consistent styling

export const COLOR_CLASSES: Record<string, string> = {
  cyan: "bg-cyan-500/20 text-cyan-400",
  purple: "bg-purple-500/20 text-purple-400",
  emerald: "bg-emerald-500/20 text-emerald-400",
  amber: "bg-amber-500/20 text-amber-400",
  red: "bg-red-500/20 text-red-400",
  blue: "bg-blue-500/20 text-blue-400",
  pink: "bg-pink-500/20 text-pink-400",
  orange: "bg-orange-500/20 text-orange-400",
  teal: "bg-teal-500/20 text-teal-400",
  indigo: "bg-indigo-500/20 text-indigo-400",
  rose: "bg-rose-500/20 text-rose-400",
  lime: "bg-lime-500/20 text-lime-400",
  sky: "bg-sky-500/20 text-sky-400",
  violet: "bg-violet-500/20 text-violet-400",
  fuchsia: "bg-fuchsia-500/20 text-fuchsia-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
  green: "bg-green-500/20 text-green-400",
  gray: "bg-gray-500/20 text-gray-400",
}

export const COLOR_OPTIONS = [
  { value: "cyan", label: "Cyan" },
  { value: "purple", label: "Purple" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "rose", label: "Rose" },
  { value: "lime", label: "Lime" },
  { value: "sky", label: "Sky" },
  { value: "violet", label: "Violet" },
  { value: "fuchsia", label: "Fuchsia" },
  { value: "yellow", label: "Yellow" },
]

export function getColorClass(color: string): string {
  return COLOR_CLASSES[color] || COLOR_CLASSES.gray
}
