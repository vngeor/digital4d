"use client"

import { useEffect, type RefObject } from "react"

/**
 * Hook that triggers form submission on Ctrl+S / Cmd+S.
 * Uses requestSubmit() to properly trigger form validation and onSubmit handler.
 */
export function useKeyboardSave(formRef: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [formRef])
}
