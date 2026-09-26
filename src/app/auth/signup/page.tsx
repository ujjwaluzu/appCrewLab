import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignupPage() {
  return <AuthShell><AuthForm mode="signup" /></AuthShell>;
}
