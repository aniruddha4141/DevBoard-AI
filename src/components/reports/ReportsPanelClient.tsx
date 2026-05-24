"use client";

import * as React from "react";
import {
  generateAIReportAction,
  deleteAIReport,
  fetchAIReports,
} from "@/server/actions/report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Calendar,
  Copy,
  Download,
  Trash2,
  FileText,
  Loader2,
  RefreshCw,
  Clock,
} from "lucide-react";
import { WorkspaceRole } from "@prisma/client";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";

interface AIReport {
  id: string;
  reportType: string;
  title: string;
  content: string;
  createdAt: Date;
  generatedBy: {
    name: string | null;
    githubUsername: string | null;
  };
}

interface ReportsPanelClientProps {
  projectId: string;
  initialReports: AIReport[];
  userRole: WorkspaceRole;
}

export function ReportsPanelClient({
  projectId,
  initialReports,
  userRole,
}: ReportsPanelClientProps) {
  const [reports, setReports] = React.useState<AIReport[]>(initialReports);
  const [selectedReport, setSelectedReport] = React.useState<AIReport | null>(
    initialReports[0] || null
  );
  const [reportType, setReportType] = React.useState("daily");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const canGenerate = userRole !== "VIEWER";
  const canDelete = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  const refreshReports = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchAIReports(projectId);
      const mapped = data.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
      setReports(mapped);
      if (mapped.length > 0 && !selectedReport) {
        setSelectedReport(mapped[0]);
      }
    } catch {
      toast.error("Failed to sync reports catalog");
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, selectedReport]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const report = await generateAIReportAction({ projectId, reportType });
      toast.success(`Generated: ${report.title}`);
      
      const newReport = {
        ...report,
        createdAt: new Date(report.createdAt),
        generatedBy: {
          name: "You",
          githubUsername: "",
        },
      };

      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    setIsDeleting(true);
    try {
      await deleteAIReport(id);
      toast.success("Report deleted successfully");
      
      const updated = reports.filter((r) => r.id !== id);
      setReports(updated);
      
      if (selectedReport?.id === id) {
        setSelectedReport(updated[0] || null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete report");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!selectedReport) return;
    navigator.clipboard.writeText(selectedReport.content);
    toast.success("Report copied to clipboard!");
  };

  const handleDownload = () => {
    if (!selectedReport) return;
    const blob = new Blob([selectedReport.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedReport.title.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Download started!");
  };

  const reportOptions = [
    { label: "Daily Progress Report", value: "daily" },
    { label: "Weekly Sprint Report", value: "weekly" },
    { label: "Bug Summary", value: "bug_summary" },
    { label: "Pending Work Summary", value: "pending_work" },
    { label: "Project Risk Report", value: "risk" },
    { label: "Release Notes", value: "release" },
    { label: "Team Performance Summary", value: "team_performance" },
    { label: "GitHub Commit Summary", value: "commit_summary" },
    { label: "Pull Request Summary", value: "pr_summary" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in-0 duration-300">
      {/* Sidebar: Generate Panel & Reports List */}
      <div className="space-y-6">
        {/* Generate Card */}
        {canGenerate && (
          <Card className="border border-border bg-card/45">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Generate AI Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-1.5">
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    disabled={isGenerating}
                  >
                    {reportOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full h-9 font-semibold gap-1.5 cursor-pointer text-xs"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Generate Report <Sparkles className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reports History Catalog */}
        <Card className="border border-border bg-card/45">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Reports History</CardTitle>
              <CardDescription className="text-[10px]">Previously compiled reports</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshReports}
              disabled={isRefreshing}
              className="h-8 w-8 border border-border"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isRefreshing && "animate-spin")} />
            </Button>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
              {reports.length === 0 ? (
                <span className="text-xs text-muted-foreground block text-center py-6">No reports generated</span>
              ) : (
                reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={cn(
                      "w-full p-2.5 rounded-lg border text-left cursor-pointer transition-colors text-xs space-y-1",
                      selectedReport?.id === r.id
                        ? "bg-secondary/45 border-border hover:bg-secondary/65 text-foreground font-semibold"
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/15"
                    )}
                  >
                    <div className="truncate">{r.title}</div>
                    <span className="text-[9px] text-muted-foreground block">
                      {formatDate(r.createdAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main View Area: Report contents */}
      <div className="lg:col-span-2">
        {selectedReport ? (
          <Card className="border border-border bg-card/45 h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  {selectedReport.title}
                </CardTitle>
                <div className="flex items-center gap-3.5 text-[10px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Compiled {formatDate(selectedReport.createdAt)}
                  </span>
                  <span>|</span>
                  <span>By {selectedReport.generatedBy.name || selectedReport.generatedBy.githubUsername}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="h-7 px-2.5 text-[10px] gap-1 font-semibold border-border/80"
                >
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 px-2.5 text-[10px] gap-1 font-semibold border-border/80"
                >
                  <Download className="h-3 w-3" /> MD
                </Button>
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(selectedReport.id)}
                    disabled={isDeleting}
                    className="h-7 w-7 p-0 flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 min-h-[300px] overflow-y-auto max-h-[60vh] bg-black/35 font-sans leading-relaxed text-xs text-foreground/90 border-b border-border">
              {/* Premium Markdown styling placeholder */}
              <div className="prose prose-invert max-w-none whitespace-pre-wrap font-sans">
                {selectedReport.content}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border bg-card/45 h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground/35 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No Report Selected</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Generate a new AI report or select an existing report summary from the history list panel.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
