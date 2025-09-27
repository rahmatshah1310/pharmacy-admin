import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useEffect } from "react"
import { useAuth } from "@/lib/authContext"
import { toast } from "react-toastify"

const editUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(["user", "admin"]),
  disabled: z.boolean()
})

type EditUserForm = z.infer<typeof editUserSchema>

interface User {
  _id: string
  email: string
  displayName: string
  role: string
  disabled: boolean
}

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onUpdateUser: (data: EditUserForm & { uid: string }) => void
  onToggleDisable: (uid: string, disabled: boolean) => void
  isUpdating?: boolean
  isToggling?: boolean
}

export default function EditUserModal({
  open,
  onOpenChange,
  user,
  onUpdateUser,
  onToggleDisable,
  isUpdating = false,
  isToggling = false
}: EditUserModalProps) {
  const { user: authUser } = useAuth()
  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      displayName: "",
      role: "user",
      disabled: false
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        role: user.role as "user" | "admin",
        disabled: user.disabled || false
      })
    }
  }, [user, form])

  const handleSubmit = (data: EditUserForm) => {
    if (user) {
      const isSelfAdmin = authUser && authUser.uid === user._id && user.role === 'admin'
      if (isSelfAdmin && data.disabled) {
        toast.error("You cannot disable your own admin account.")
        return
      }
      onUpdateUser({ ...data, uid: user._id })
      onOpenChange(false)
    }
  }

  const handleToggleDisable = () => {
    if (user) {
      const isSelfAdmin = authUser && authUser.uid === user._id && user.role === 'admin'
      if (isSelfAdmin) {
        toast.error("You cannot disable your own admin account.")
        return
      }
      onToggleDisable(user._id, !user.disabled)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions for {user.email}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <Input 
                placeholder="Full name" 
                {...form.register("displayName")}
              />
              {form.formState.errors.displayName && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.displayName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <Select {...form.register("role")}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
              {form.formState.errors.role && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>
          </div>

          

          <div>
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                {...form.register("disabled")}
                className="rounded border-gray-300"
                disabled={!!(authUser && user && authUser.uid === user._id && user.role === 'admin')}
              />
              <span className="text-sm font-medium text-gray-700">Disable User Account</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleToggleDisable}
              disabled={
                isToggling || !!(authUser && user && authUser.uid === user._id && user.role === 'admin')
              }
            >
              {isToggling ? "Toggling..." : (user.disabled ? "Enable" : "Disable")} User
            </Button>
            <Button 
              type="submit" 
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
