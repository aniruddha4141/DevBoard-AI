import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Github, Terminal, Shield, Cpu } from "lucide-react";

export const metadata = {
  title: "Login | DevBoard AI",
  description: "Sign in to DevBoard AI with your GitHub account.",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden grid-bg">
      {/* Decorative radial gradients for glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md p-4">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-xl overflow-hidden bg-primary/5 border border-primary/10 flex items-center justify-center mb-4 shadow-lg shadow-primary/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="DevBoard AI Logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            DevBoard <span className="text-primary font-mono text-2xl">AI</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            GitHub-centric AI-powered project management for engineering teams.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card/45 border border-border backdrop-blur-md rounded-2xl p-8 shadow-xl relative overflow-hidden">
          {/* Subtle line decoration */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
            Welcome back
          </h2>

          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/dashboard" });
            }}
            className="space-y-4"
          >
            <Button
              type="submit"
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-3 text-base shadow transition-all duration-300"
            >
              <Github className="h-5 w-5" />
              Continue with GitHub
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6 leading-relaxed">
            By signing in, you connect using GitHub OAuth. We securely store your GitHub username and email to build your workspace.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="bg-secondary/40 border border-border/60 rounded-xl p-3 flex flex-col items-center text-center backdrop-blur-xs">
            <Terminal className="h-4 w-4 text-muted-foreground mb-1.5" />
            <span className="text-[11px] font-medium text-muted-foreground">Online IDE</span>
          </div>
          <div className="bg-secondary/40 border border-border/60 rounded-xl p-3 flex flex-col items-center text-center backdrop-blur-xs">
            <Cpu className="h-4 w-4 text-muted-foreground mb-1.5" />
            <span className="text-[11px] font-medium text-muted-foreground">AI Reports</span>
          </div>
          <div className="bg-secondary/40 border border-border/60 rounded-xl p-3 flex flex-col items-center text-center backdrop-blur-xs">
            <Shield className="h-4 w-4 text-muted-foreground mb-1.5" />
            <span className="text-[11px] font-medium text-muted-foreground">GitHub Native</span>
          </div>
        </div>
      </div>
    </div>
  );
}
