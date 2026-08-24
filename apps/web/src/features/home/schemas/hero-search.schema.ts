import { z } from "zod";

export const heroSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Describe your need in at least 3 characters")
    .max(500, "Keep your request under 500 characters"),
});

export type HeroSearchValues = z.infer<typeof heroSearchSchema>;
