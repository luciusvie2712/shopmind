import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(128),
});

export const registerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100),
  email: z.string().email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(128),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
