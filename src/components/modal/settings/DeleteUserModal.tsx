"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface User {
  _id: string
  name?: string
  email: string
  role: string
}

interface DeleteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onConfirm: () => void
  isDeleting?: boolean
}

export default function DeleteUserModal({
  open,
  onOpenChange,
  user,
  onConfirm,
  isDeleting = false
}: DeleteUserModalProps) {
  if (!user) return null

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Delete User
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-600">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Are you sure you want to delete the user account for{" "}
              <span className="font-semibold">
                {user.name || user.email}
              </span>
              ?
            </p>
            <p className="text-xs text-red-700 mt-2">
              This will permanently remove the user from your pharmacy system and they will no longer be able to access their account.
            </p>
          </div>

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-600 space-y-1">
              <div><span className="font-medium">Name:</span> {user.name || "Not set"}</div>
              <div><span className="font-medium">Email:</span> {user.email}</div>
              <div><span className="font-medium">Role:</span> {user.role}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
