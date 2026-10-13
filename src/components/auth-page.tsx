import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AuthPage() {
  const { login, users } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const success = login(email);
      if (!success) {
        setError("No account found with that email. Try the demo account or check the email.");
        setLoading(false);
      } else {
        toast.success("Welcome back!");
        setLoading(false);
      }
    }, 400);
  };

  const handleDemoLogin = () => {
    setEmail("demo@contractguardian.io");
    setPassword("demo");
    setLoading(true);
    setTimeout(() => {
      login("demo@contractguardian.io");
      toast.success("Signed in as Demo Admin");
      setLoading(false);
    }, 300);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Contract Guardian</h1>
            <p className="text-sm text-muted-foreground mt-1">Data Contract & Schema Evolution Platform</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter any password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p id="login-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleDemoLogin} disabled={loading}>
          Continue as Demo Admin
        </Button>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground text-center">
            Demo accounts: demo@contractguardian.io, sarah.chen@company.com, priya.patel@company.com
          </p>
        </div>
      </div>
    </div>
  );
}
