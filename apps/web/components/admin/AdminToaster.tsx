'use client'

import { useEffect } from 'react'
import { useAdminToastStore } from '@/lib/admin-toast'

export function AdminToaster() {
  const message = useAdminToastStore((s) => s.message)
  const variant = useAdminToastStore((s) => s.variant)
  const dismiss = useAdminToastStore((s) => s.dismiss)

  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(dismiss, 4500)
    return () => window.clearTimeout(id)
  }, [message, dismiss])

  if (!message) return null

  const palette =
    variant === 'success'
      ? 'border-emerald-700/40 bg-emerald-950/95 text-emerald-50'
      : 'border-red-700/40 bg-red-950/95 text-red-50'

  return (
    <div
      role="status"
      className={`fixed top-4 left-1/2 z-[9999] max-w-md -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-lg ${palette}`}
    >
      {message}
    </div>
  )
}
