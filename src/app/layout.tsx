import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "DevBoard AI — GitHub-Native Project Management",
  description: "AI-powered, GitHub-only project management and online IDE for developer teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-primary/30 selection:text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
