import { notFound } from "next/navigation";
import { FeedbackShowcase } from "@/features/feedback/feedback-showcase";

export default function FeedbackShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FeedbackShowcase />;
}
