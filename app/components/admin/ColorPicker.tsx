"use client"

import { COLOR_CLASSES, COLOR_OPTIONS } from "@/lib/colors"

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {COLOR_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.label}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              COLOR_CLASSES[option.value] || "bg-gray-500/20 text-gray-400"
            } ${
              value === option.value
                ? "ring-2 ring-white/60 scale-110 opacity-100"
                : "opacity-50 hover:opacity-90 hover:scale-105"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
