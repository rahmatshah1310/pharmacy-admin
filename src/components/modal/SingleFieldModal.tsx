"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export type SingleFieldModalProps = {
  open: boolean
  title: string
  description?: string
  label: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
  cancelText?: string
  onConfirm: (value: string) => Promise<void> | void
  onOpenChange: (open: boolean) => void
}

export function SingleFieldModal({ open, title, description, label, placeholder, initialValue = "", confirmText = "Add", cancelText = "Cancel", onConfirm, onOpenChange }: SingleFieldModalProps) {
  const [value, setValue] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setValue(initialValue) }, [initialValue, open])

  const handleConfirm = async () => {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    try {
      setLoading(true)
      await onConfirm(trimmed)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <Input placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelText}</Button>
            <Button disabled={loading} onClick={handleConfirm}>{loading ? `${confirmText}...` : confirmText}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SingleFieldModal


