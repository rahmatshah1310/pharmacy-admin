"use client"

import React, { useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { notify } from "@/lib/utils"
import { useSignup } from "@/app/api/authApi"
import Link from "next/link"

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string().min(6, "Confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type SignupSchema = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { mutateAsync: signup, isPending } = useSignup()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" }
  })

  // Auto-populate role for admins
  React.useEffect(() => {
    // This effect can be used for other admin-related setup if needed
  }, []);

  // Determine default role based on admin context
  const getDefaultRole = () => {
    try {
      const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}");
      if (adminInfo.role === "super-admin") {
        return "admin"; // Super admin creates admins
      } else if (adminInfo.role === "admin") {
        return "user"; // Regular admin creates users
      }
    } catch (error) {
    }
    return "user"; // Default to user if no admin context
  };

  const onSubmit = async (values: SignupSchema) => {
    try {
      // Get admin information from localStorage (stored during admin login)
      let adminInfo = null
      try {
        const raw = window.localStorage.getItem("pc_admin_info")
        if (raw) {
          adminInfo = JSON.parse(raw)
        }
      } catch (error) {
      }
      
      // Determine role based on admin context
      const defaultRole = getDefaultRole();
      
      // Pass admin information from localStorage
      const signupData = {
        email: values.email,
        password: values.password,
        name: values.name,
        role: defaultRole as "admin" | "user",
        createdBy: adminInfo?.uid || null,
        adminId: adminInfo?.adminId || adminInfo?.uid || null,
        pharmacyId: adminInfo?.pharmacyId || null,
        pharmacyName: adminInfo?.pharmacyName || null,
      }
      
      await signup(signupData)
      notify.success("Account created successfully! Please log in with your new credentials.")
      reset()

      // Always redirect to login page after successful signup
      router.push("/login")
    } catch (err: any) {
      notify.error(err?.message || "Failed to create account")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-gray-900">Create New User</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Create a new user account for your pharmacy
            </CardDescription>
            {(() => {
              try {
                const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}")
                if (adminInfo.uid) {
                  const defaultRole = getDefaultRole();
                  const roleText = defaultRole === "admin" ? "Admin" : "User";
                  const roleColor = defaultRole === "admin" ? "text-blue-600 bg-blue-50" : "text-green-600 bg-green-50";
                  const roleIcon = defaultRole === "admin" ? "👑" : "👤";
                  
                  return (
                    <div className={`text-center text-sm ${roleColor} p-2 rounded-md`}>
                      {roleIcon} Creating {roleText} for {adminInfo.displayName || adminInfo.email}
                      {adminInfo.role === "super-admin" && (
                        <div className="text-xs mt-1 opacity-75">
                          Super Admin can create other Admins
                        </div>
                      )}
                      {adminInfo.role === "admin" && (
                        <div className="text-xs mt-1 opacity-75">
                          Admin can create Users
                        </div>
                      )}
                    </div>
                  )
                }
              } catch {}
              return (
                <div className="text-center text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                  ⚠ No admin context found - Please log in as admin first to create users
                </div>
              )
            })()}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input {...register("name")} placeholder="Your full name" />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" {...register("email")} placeholder="you@email.com" />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} {...register("password")} placeholder="••••••••" className="pr-12" />
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <Input type={showConfirm ? "text" : "password"} {...register("confirmPassword")} placeholder="••••••••" className="pr-12" />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" disabled={isPending} className="w-full">{isPending ? "Creating..." : "Create New User Account"}</Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


