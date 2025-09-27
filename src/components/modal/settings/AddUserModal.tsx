"use client"

import { useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { notify } from "@/lib/utils"
import { Select } from "@/components/ui/select"
import { useAdminCreateUser } from "@/app/api/users"

// Schema (no confirm password)
const addUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.enum(["admin", "user"]),
})

type AddUserForm = z.infer<typeof addUserSchema>

interface AddUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddUserModal({ open, onOpenChange }: AddUserModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { mutateAsync: adminCreate, isPending } = useAdminCreateUser()

  const {
    register,
    handleSubmit, 
    formState: { errors },
    reset,
  } = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  })

  const onSubmit = async (values: AddUserForm) => {
    try {
      await adminCreate({ name: values.name, email: values.email, password: values.password, role: values.role as "admin" | "user" })
      notify.success("User created successfully")
      reset()
      onOpenChange(false)
    } catch (err: any) {
      notify.error(err?.message || "Failed to create user")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new account for a team member</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input {...register("name")} name="name" placeholder="Full name" autoComplete="name" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input type="email" {...register("email")} name="email" placeholder="you@email.com" autoComplete="email" />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                className="pr-12"
                name="password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <Select {...register("role")}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
            {errors.role && <p className="text-sm text-red-600">{String(errors.role.message)}</p>}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
