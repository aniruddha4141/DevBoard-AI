"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  Code2,
  FileText,
  Settings,
  Users,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  title: string;
  description: string;
  selector?: string;
  route?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const steps: TourStep[] = [
  {
    title: "Welcome to DevBoard AI!",
    description: "Your team's workspace is ready. Let's take a quick 1-minute tour to help you get familiar with the platform and your new project hub.",
    icon: Sparkles,
    accentColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    title: "Main Dashboard Metrics",
    description: "Get real-time workspace activity feed, active sprint status, ticket completions, and open issues all compiled in one central dashboard page.",
    selector: "a[href='/dashboard']",
    route: "/dashboard",
    icon: LayoutDashboard,
    accentColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "Interactive Online IDE",
    description: "Launch the Monaco-powered workspace editor by navigating to Projects. Write code, inspect changes, and review your code files directly in the browser.",
    selector: "a[href='/projects']",
    route: "/projects",
    icon: Code2,
    accentColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    title: "AI Sprint Reports",
    description: "In your project sub-panels, generate daily standups, weekly sprint summaries, risk assessments, and release notes instantly with integrated cloud AI assistance.",
    selector: "a[href='/projects']",
    route: "/projects",
    icon: FileText,
    accentColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "AI Providers & Keys",
    description: "Connect your workspace to over 40 cloud models (Gemini, OpenAI, Anthropic, DeepSeek, Venice, etc.) from Settings. No local configuration required.",
    selector: "a[href='/settings']",
    route: "/settings",
    icon: Settings,
    accentColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    title: "Team Collaboration & Announcements",
    description: "Invite collaborators via secure codes in the Team page. Admins and Project Managers can also broadcast notifications to all team members instantly.",
    selector: "a[href='/team']",
    route: "/team",
    icon: Users,
    accentColor: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  },
];

export function TutorialTour() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [highlightStyle, setHighlightStyle] = React.useState<React.CSSProperties>({});
  const [cardStyle, setCardStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    const completed = localStorage.getItem("devboard_tour_completed");
    if (completed !== "true") {
      setIsOpen(true);
    }
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (!step.selector) {
      setHighlightStyle({ display: "none" });
      setCardStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "380px",
        zIndex: 101,
      });
      return;
    }

    const element = document.querySelector(step.selector);
    if (!element) {
      // Fallback to center if element is not found on page
      setHighlightStyle({ display: "none" });
      setCardStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "380px",
        zIndex: 101,
      });
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 6;

    setHighlightStyle({
      position: "fixed",
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      display: "block",
      borderRadius: "8px",
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 15px rgba(124, 58, 237, 0.4)",
      border: "2px solid rgba(124, 58, 237, 0.6)",
      transition: "all 0.3s ease-in-out",
      pointerEvents: "none",
      zIndex: 100,
    });

    const cardWidth = 350;
    const cardHeight = 220;
    const gap = 12;

    let top = rect.top + rect.height / 2 - cardHeight / 2;
    let left = rect.right + gap;

    // Boundaries check
    if (left + cardWidth > window.innerWidth) {
      left = rect.left - cardWidth - gap;
    }
    if (left < 0) {
      left = window.innerWidth / 2 - cardWidth / 2;
      top = rect.bottom + gap;
    }

    if (top < gap) top = gap;
    if (top + cardHeight > window.innerHeight) {
      top = window.innerHeight - cardHeight - gap;
    }

    setCardStyle({
      position: "fixed",
      top: top,
      left: left,
      width: `${cardWidth}px`,
      transition: "all 0.3s ease-in-out",
      zIndex: 101,
    });
  }, [currentStep, isOpen]);

  // Recalculate position when currentStep or isOpen changes
  React.useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);

    // Multi-delay triggers to align once route navigation renders
    const t1 = setTimeout(updatePosition, 100);
    const t2 = setTimeout(updatePosition, 300);
    const t3 = setTimeout(updatePosition, 600);
    const t4 = setTimeout(updatePosition, 1000);

    return () => {
      window.removeEventListener("resize", updatePosition);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [currentStep, isOpen, updatePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextIdx = currentStep + 1;
      const nextStep = steps[nextIdx];
      if (nextStep.route) {
        router.push(nextStep.route);
      }
      setCurrentStep(nextIdx);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      const prevStep = steps[prevIdx];
      if (prevStep.route) {
        router.push(prevStep.route);
      }
      setCurrentStep(prevIdx);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("devboard_tour_completed", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const activeStepData = steps[currentStep];
  const StepIcon = activeStepData.icon;

  return (
    <>
      {/* Central Backdrop (only for center modal steps with no selector) */}
      {!activeStepData.selector && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[99]" onClick={handleComplete} />
      )}

      {/* Glow Highlight Box */}
      <div style={highlightStyle} />

      {/* Tour Step Card */}
      <div
        style={cardStyle}
        className="bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Step Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg border ${activeStepData.accentColor}`}>
              <StepIcon className="h-4.5 w-4.5" />
            </div>
            <h4 className="font-bold text-sm text-foreground tracking-tight">
              {activeStepData.title}
            </h4>
          </div>
          <button
            onClick={handleComplete}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/40 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Content */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {activeStepData.description}
        </p>

        {/* Step Progress & Controls */}
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/60">
          <span className="text-[10px] text-muted-foreground font-semibold">
            Step {currentStep + 1} of {steps.length}
          </span>

          <div className="flex gap-1.5">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-8 px-2.5 text-xs font-semibold gap-1 border-border cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="h-8 px-3 text-xs font-bold gap-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {currentStep === steps.length - 1 ? (
                "Finish"
              ) : (
                <>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
