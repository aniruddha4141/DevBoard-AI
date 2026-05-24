import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acceptInviteWithCode } from "@/server/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, KeyRound, Loader2, LogIn, ArrowRight, AlertTriangle } from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: InvitePageProps) {
  const { token } = await params;
  const session = await auth();

  // 1. Fetch the workspace by its active invite code
  const workspace = await prisma.workspace.findUnique({
    where: { inviteCode: token },
    include: {
      createdBy: {
        select: { name: true, githubUsername: true },
      },
    },
  });

  // 2. Validate invite code exists
  const isValid = !!workspace;

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden grid-bg">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-4">
        {!isValid ? (
          <Card className="border border-border/80 bg-card/65 backdrop-blur-md shadow-xl text-center p-8 flex flex-col items-center">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Invalid or Expired Invite Link</h2>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs">
              This invite link has expired, was reset, or does not exist. Please ask your administrator to send a new invite link.
            </p>
            <Link href="/login" className="w-full mt-6">
              <Button variant="outline" className="w-full h-10 font-semibold">
                Go to Login
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="border border-border/80 bg-card/65 backdrop-blur-md shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center mb-3 mx-auto">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold text-foreground">Workspace Invitation</CardTitle>
              <CardDescription className="text-xs">
                You have been invited to join an engineering workspace team
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-4">
              <div className="p-3.5 rounded-lg border border-border bg-secondary/15 space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Workspace</span>
                  <span className="text-foreground font-bold">{workspace.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Workspace Creator</span>
                  <span className="text-foreground font-medium">
                    {workspace.createdBy.name || `@${workspace.createdBy.githubUsername}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Role Assigned</span>
                  <Badge variant="secondary">{getRoleLabel("DEVELOPER")}</Badge>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              {!session?.user?.id ? (
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: `/invite/${token}` });
                  }}
                  className="w-full"
                >
                  <Button type="submit" className="w-full h-11 font-semibold gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90">
                    <Github className="h-4.5 w-4.5" /> Sign in with GitHub to Accept
                  </Button>
                </form>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    try {
                      await acceptInviteWithCode(token);
                    } catch (e) {
                      // Handled by client redirect fallback or standard errors
                    }
                    redirect("/dashboard");
                  }}
                  className="w-full"
                >
                  <Button type="submit" className="w-full h-10 font-semibold gap-1.5 cursor-pointer">
                    Accept Invitation <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
