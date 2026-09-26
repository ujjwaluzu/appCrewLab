import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default function LoginPage() {
  return <AuthShell><AuthForm mode="login" /></AuthShell>;
}
