import prisma from "@/lib/prisma"

export async function logAuditAction(params: {
  userId: string
  action: "create" | "edit" | "delete"
  resource: string
  recordId: string
  recordTitle?: string
  details?: string
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      recordId: params.recordId,
      recordTitle: params.recordTitle || null,
      details: params.details || null,
    },
  })
}

/**
 * Compare old and new records, return JSON string of changed fields.
 * Only includes fields that actually changed. Skips updatedAt.
 * Format: { "field": { "from": oldValue, "to": newValue }, ... }
 */
export function getChangeDetails(
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  fields: string[]
): string | undefined {
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  for (const field of fields) {
    const oldVal = oldRecord[field]
    const newVal = newRecord[field]

    // Normalize for comparison: treat null/undefined/"" as equivalent
    const oldNorm = oldVal === undefined || oldVal === "" ? null : oldVal
    const newNorm = newVal === undefined || newVal === "" ? null : newVal

    // Compare JSON strings for arrays/objects, direct comparison for primitives
    const oldStr = typeof oldNorm === "object" ? JSON.stringify(oldNorm) : oldNorm
    const newStr = typeof newNorm === "object" ? JSON.stringify(newNorm) : newNorm

    if (oldStr !== newStr) {
      changes[field] = { from: oldNorm, to: newNorm }
    }
  }

  if (Object.keys(changes).length === 0) return undefined
  return JSON.stringify(changes)
}
