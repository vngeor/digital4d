// Shared color classes for category badges across the application
// Used by both frontend and admin panel for consistent styling

export const COLOR_CLASSES: Record<string, string> = {
  // Blues
  cyan: "bg-cyan-500/20 text-cyan-400",
  sky: "bg-sky-500/20 text-sky-400",
  blue: "bg-blue-500/20 text-blue-400",
  cobalt: "bg-blue-600/20 text-blue-300",
  navy: "bg-blue-900/30 text-blue-300",
  ocean: "bg-cyan-700/20 text-cyan-300",
  // Purples
  indigo: "bg-indigo-500/20 text-indigo-400",
  violet: "bg-violet-500/20 text-violet-400",
  purple: "bg-purple-500/20 text-purple-400",
  plum: "bg-purple-800/20 text-purple-300",
  lavender: "bg-purple-300/20 text-purple-300",
  fuchsia: "bg-fuchsia-500/20 text-fuchsia-400",
  magenta: "bg-fuchsia-700/20 text-fuchsia-300",
  // Pinks & Reds
  pink: "bg-pink-500/20 text-pink-400",
  rose: "bg-rose-500/20 text-rose-400",
  red: "bg-red-500/20 text-red-400",
  crimson: "bg-red-800/20 text-red-300",
  coral: "bg-red-400/20 text-red-300",
  // Oranges & Browns
  orange: "bg-orange-500/20 text-orange-400",
  copper: "bg-orange-700/20 text-orange-300",
  bronze: "bg-amber-700/20 text-amber-300",
  amber: "bg-amber-500/20 text-amber-400",
  // Yellows
  yellow: "bg-yellow-500/20 text-yellow-400",
  gold: "bg-yellow-400/20 text-yellow-300",
  olive: "bg-yellow-700/20 text-yellow-500",
  // Greens
  lime: "bg-lime-500/20 text-lime-400",
  green: "bg-green-500/20 text-green-400",
  mint: "bg-green-300/20 text-green-300",
  sage: "bg-green-600/20 text-green-400",
  forest: "bg-green-800/20 text-green-400",
  emerald: "bg-emerald-500/20 text-emerald-400",
  jade: "bg-teal-600/20 text-teal-300",
  teal: "bg-teal-500/20 text-teal-400",
  // Grays
  slate: "bg-slate-500/20 text-slate-400",
  zinc: "bg-zinc-500/20 text-zinc-400",
  stone: "bg-stone-500/20 text-stone-400",
  neutral: "bg-neutral-500/20 text-neutral-400",
  gray: "bg-gray-500/20 text-gray-400",
  silver: "bg-gray-300/20 text-gray-300",
  charcoal: "bg-gray-700/20 text-gray-400",
}

export const COLOR_OPTIONS = [
  // Blues
  { value: "cyan", label: "Cyan" },
  { value: "sky", label: "Sky" },
  { value: "blue", label: "Blue" },
  { value: "cobalt", label: "Cobalt" },
  { value: "navy", label: "Navy" },
  { value: "ocean", label: "Ocean" },
  // Purples
  { value: "indigo", label: "Indigo" },
  { value: "violet", label: "Violet" },
  { value: "purple", label: "Purple" },
  { value: "plum", label: "Plum" },
  { value: "lavender", label: "Lavender" },
  { value: "fuchsia", label: "Fuchsia" },
  { value: "magenta", label: "Magenta" },
  // Pinks & Reds
  { value: "pink", label: "Pink" },
  { value: "rose", label: "Rose" },
  { value: "red", label: "Red" },
  { value: "crimson", label: "Crimson" },
  { value: "coral", label: "Coral" },
  // Oranges & Browns
  { value: "orange", label: "Orange" },
  { value: "copper", label: "Copper" },
  { value: "bronze", label: "Bronze" },
  { value: "amber", label: "Amber" },
  // Yellows
  { value: "yellow", label: "Yellow" },
  { value: "gold", label: "Gold" },
  { value: "olive", label: "Olive" },
  // Greens
  { value: "lime", label: "Lime" },
  { value: "green", label: "Green" },
  { value: "mint", label: "Mint" },
  { value: "sage", label: "Sage" },
  { value: "forest", label: "Forest" },
  { value: "emerald", label: "Emerald" },
  { value: "jade", label: "Jade" },
  { value: "teal", label: "Teal" },
  // Grays
  { value: "slate", label: "Slate" },
  { value: "zinc", label: "Zinc" },
  { value: "stone", label: "Stone" },
  { value: "neutral", label: "Neutral" },
  { value: "gray", label: "Gray" },
  { value: "silver", label: "Silver" },
  { value: "charcoal", label: "Charcoal" },
]

export function getColorClass(color: string): string {
  return COLOR_CLASSES[color] || COLOR_CLASSES.gray
}
