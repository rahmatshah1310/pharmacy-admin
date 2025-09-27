import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const currentUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
})

type CurrentUserForm = z.infer<typeof currentUserSchema>

interface CurrentUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { _id: string; email?: string; displayName?: string | null } | null
  onUpdateUser: (data: CurrentUserForm & { uid: string }) => void
  isUpdating?: boolean
}

export default function CurrentUserModal({ open, onOpenChange, user, onUpdateUser, isUpdating = false }: CurrentUserModalProps) {
  const form = useForm<CurrentUserForm>({
    resolver: zodResolver(currentUserSchema),
    defaultValues: {
      displayName: user?.displayName || "",
    },
  })

  // Sync form when user changes
  const displayName = user?.displayName || ""
  if (form.getValues("displayName") !== displayName) {
    form.reset({ displayName })
  }

  const handleSubmit = (data: CurrentUserForm) => {
    if (!user) return
    onUpdateUser({ ...data, uid: user._id })
    onOpenChange(false)
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update My Account</DialogTitle>
          <DialogDescription>Change your display name for your account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input value={user.email || "-"} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
            <Input placeholder="Your display name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.displayName.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


