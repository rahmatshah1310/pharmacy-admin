"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { forgotPassword, loginUser, logoutUser, resetPassword, signupUser, type SignupPayload, getCurrentUserProfile, listAllUsersProfiles } from "@/services/auth.service";

export const useSignup = () => {
	return useMutation({
		mutationFn: (payload: SignupPayload) => signupUser(payload),
	});
};

export const useLogin = () => {
	return useMutation({
		mutationFn: ({ email, password }: { email: string; password: string }) => loginUser(email, password),
	});
};

export const useForgotPasswordMutation = () => {
	return useMutation({
		mutationFn: (email: string) => forgotPassword(email),
	});
};

export const useResetPasswordMutation = () => {
	return useMutation({
		mutationFn: (payload: { oobCode: string; newPassword: string }) => resetPassword(payload),
	});
};

export const useLogout = () => {
	return useMutation({
		mutationFn: () => logoutUser(),
	});
};

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: async () => {
      const res = await getCurrentUserProfile();
      return res.data.user;
    },
  });

export const useAllUsers = () =>
  useQuery({
    queryKey: ["auth", "allUsers"],
    queryFn: async () => {
      const res = await listAllUsersProfiles();
      return res.data.users as any[];
    },
  });
