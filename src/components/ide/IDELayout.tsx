"use client";

import * as React from "react";
import Editor from "@monaco-editor/react";
import {
  createIDEFile,
  updateIDEFileContent,
  renameIDEFile,
  deleteIDEFile,
  getIDEFiles,
} from "@/server/actions/ide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FolderPlus,
  FilePlus,
  Folder,
  FileCode,
  X,
  Play,
  Save,
  Trash2,
  Edit,
  Loader2,
  Terminal as TerminalIcon,
  Search,
  Check,
} from "lucide-react";
import { FileStatus, WorkspaceRole } from "@prisma/client";
import { toast } from "sonner";
import { getLanguageFromFileName } from "@/lib/utils";

interface IDEFile {
  id: string;
  path: string;
  fileName: string;
  language: string | null;
  content: string | null;
  status: FileStatus;
}

interface IDELayoutProps {
  projectId: string;
  initialFiles: IDEFile[];
  userRole: WorkspaceRole;
}

export function IDELayout({ projectId, initialFiles, userRole }: IDELayoutProps) {
  const [files, setFiles] = React.useState<IDEFile[]>(initialFiles);
  const [openTabs, setOpenTabs] = React.useState<IDEFile[]>([]);
  const [activeFile, setActiveFile] = React.useState<IDEFile | null>(null);
  const [editorContent, setEditorContent] = React.useState("");
  
  // Terminal execution states
  const [terminalLogs, setTerminalLogs] = React.useState<string[]>([
    "DevBoard AI online shell initialized.",
    "Connecting to workspace gateway sandbox...",
    "Done. Ready.",
  ]);
  const [terminalInput, setTerminalInput] = React.useState("");

  // Create file/folder modal states
  const [createType, setCreateType] = React.useState<"file" | "folder" | null>(null);
  const [createName, setCreateName] = React.useState("");
  const [createPath, setCreatePath] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Rename states
  const [renameFileId, setRenameFileId] = React.useState<string | null>(null);
  const [renameName, setRenameName] = React.useState("");
  const [isRenaming, setIsRenaming] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);

  const canEdit = userRole !== "VIEWER";

  // Reload tree
  const reloadTree = async () => {
    try {
      const data = await getIDEFiles(projectId);
      setFiles(data);
    } catch {
      toast.error("Failed to sync files tree");
    }
  };

  // Open file in editor
  const handleOpenFile = (file: IDEFile) => {
    // If already active, do nothing
    if (activeFile?.id === file.id) return;

    // Save previous active file changes?
    // In standard MVP, we'll auto-track state edits or prompt. We can save edits in editorContent state.
    if (activeFile) {
      // update internal client tabs content
      setOpenTabs((prev) =>
        prev.map((t) => (t.id === activeFile.id ? { ...t, content: editorContent } : t))
      );
    }

    // Add to open tabs if not present
    if (!openTabs.some((t) => t.id === file.id)) {
      setOpenTabs((prev) => [...prev, file]);
    }

    setActiveFile(file);
    setEditorContent(file.content || "");
  };

  // Close tab
  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedTabs = openTabs.filter((t) => t.id !== id);
    setOpenTabs(updatedTabs);

    if (activeFile?.id === id) {
      if (updatedTabs.length > 0) {
        // Shift active tab
        const next = updatedTabs[updatedTabs.length - 1];
        setActiveFile(next);
        setEditorContent(next.content || "");
      } else {
        setActiveFile(null);
        setEditorContent("");
      }
    }
  };

  // Save current active file
  const handleSave = async () => {
    if (!activeFile || !canEdit) return;

    setIsSaving(true);
    try {
      await updateIDEFileContent(activeFile.id, editorContent);
      
      // Update local states
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFile.id ? { ...f, content: editorContent, status: f.status === "ADDED" ? "ADDED" : "MODIFIED" } : f))
      );
      setOpenTabs((prev) =>
        prev.map((t) => (t.id === activeFile.id ? { ...t, content: editorContent, status: t.status === "ADDED" ? "ADDED" : "MODIFIED" } : t))
      );
      toast.success(`Saved ${activeFile.fileName}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Ctrl+S keybind
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFile, editorContent]);

  // Create file or folder
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setIsCreating(true);
    try {
      const fullPath = createPath ? `${createPath}/${createName.trim()}` : createName.trim();
      const newFile = await createIDEFile({
        projectId,
        path: fullPath,
        fileName: createName.trim(),
        content: createType === "file" ? `// Code content here` : "",
      });

      toast.success(`${createType === "file" ? "File" : "Folder"} created!`);
      await reloadTree();
      
      if (createType === "file") {
        handleOpenFile({ ...newFile, content: `// Code content here` });
      }

      setCreateType(null);
      setCreateName("");
      setCreatePath("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create resource");
    } finally {
      setIsCreating(false);
    }
  };

  // Delete file
  const handleDelete = async (id: string, name: string) => {
    if (!canEdit) return;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteIDEFile(id);
      toast.success("File deleted successfully");
      
      // Close tab if open
      setOpenTabs((prev) => prev.filter((t) => t.id !== id));
      if (activeFile?.id === id) {
        setActiveFile(null);
        setEditorContent("");
      }

      await reloadTree();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  // Rename action
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFileId || !renameName.trim()) return;

    setIsRenaming(true);
    try {
      const file = files.find((f) => f.id === renameFileId);
      if (!file) throw new Error("File not found");

      const pathSegments = file.path.split("/");
      pathSegments[pathSegments.length - 1] = renameName.trim();
      const newPath = pathSegments.join("/");

      await renameIDEFile(renameFileId, newPath, renameName.trim());
      toast.success("Renamed successfully!");
      
      await reloadTree();
      setRenameFileId(null);
      setRenameName("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to rename file");
    } finally {
      setIsRenaming(false);
    }
  };

  // Fake Terminal execute
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const input = terminalInput.trim();
    setTerminalLogs((prev) => [...prev, `$ ${input}`]);

    if (input === "clear") {
      setTerminalLogs([]);
    } else if (input.startsWith("run ") || input === "run") {
      setTerminalLogs((prev) => [
        ...prev,
        "Code execution sandbox coming soon.",
        "To safeguard execution runtime, MVP compiles read-only terminals.",
      ]);
    } else {
      setTerminalLogs((prev) => [
        ...prev,
        `devboard-shell: command not found: ${input}. Type 'run' or 'clear'.`,
      ]);
    }

    setTerminalInput("");
  };

  return (
    <div className="h-[calc(100vh-10rem)] border border-border bg-card/20 rounded-xl flex overflow-hidden">
      {/* 1. IDE Sidebar: File Explorer */}
      <div className="w-60 border-r border-border bg-card/65 flex flex-col justify-between shrink-0">
        <div className="p-3 border-b border-border/80 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Explorer</span>
          <div className="flex items-center gap-1.5">
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    setCreateType("file");
                    setCreatePath("");
                  }}
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  title="New File"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setCreateType("folder");
                    setCreatePath("");
                  }}
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  title="New Folder"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Flat File Tree list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs text-muted-foreground">
          {files.length === 0 ? (
            <div className="py-12 text-center text-[10px] text-muted-foreground/60">
              No files in workspace. Click file icon above to create one.
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleOpenFile(file)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-secondary/45 hover:text-foreground cursor-pointer transition-colors group ${
                  activeFile?.id === file.id ? "bg-secondary text-foreground font-semibold" : ""
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                  <span className="truncate">{file.path}</span>
                </div>

                {/* Edit options */}
                {canEdit && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameFileId(file.id);
                        setRenameName(file.fileName);
                      }}
                      className="h-5.5 w-5.5 rounded hover:bg-secondary flex items-center justify-center"
                      title="Rename"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id, file.path);
                      }}
                      className="h-5.5 w-5.5 rounded hover:bg-secondary hover:text-destructive flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Monaco Editor main area & Tabs */}
      <div className="flex-1 flex flex-col justify-between bg-black/45 min-w-0">
        {/* Tabs Bar */}
        <div className="h-9 border-b border-border bg-card/35 flex items-center overflow-x-auto no-scrollbar">
          {openTabs.map((tab) => {
            const isActive = activeFile?.id === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleOpenFile(tab)}
                className={`h-full px-4 border-r border-border text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                  isActive
                    ? "bg-black/60 text-foreground border-t-2 border-t-primary"
                    : "text-muted-foreground hover:bg-secondary/15 hover:text-foreground"
                }`}
              >
                <span>{tab.fileName}</span>
                {tab.status !== "UNCHANGED" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                )}
                <X
                  className="h-3.5 w-3.5 hover:text-destructive shrink-0 rounded hover:bg-secondary"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                />
              </button>
            );
          })}

          {openTabs.length === 0 && (
            <div className="text-[10px] text-muted-foreground/60 px-4">
              No files open. Select a file from the explorer.
            </div>
          )}
        </div>

        {/* Main Editor Pane */}
        <div className="flex-1 min-h-0 relative">
          {activeFile ? (
            <>
              {/* Toolbar action buttons overlay */}
              <div className="absolute right-6 top-3 z-10 flex items-center gap-2">
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-7 px-3 text-[10px] font-semibold gap-1"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-3 w-3" /> Save (Ctrl+S)
                      </>
                    )}
                  </Button>
                )}
              </div>

              <Editor
                height="100%"
                theme="vs-dark"
                language={activeFile.language || getLanguageFromFileName(activeFile.fileName)}
                value={editorContent}
                onChange={(val) => setEditorContent(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: !canEdit,
                  automaticLayout: true,
                }}
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-black/20">
              <TerminalIcon className="h-12 w-12 text-muted-foreground/35 mb-3" />
              <h4 className="text-sm font-semibold text-foreground">Online IDE Sandbox</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Open a file from the file explorer to begin writing code directly inside your browser.
              </p>
            </div>
          )}
        </div>

        {/* 3. Read-only Output / Terminal panel */}
        <div className="h-36 border-t border-border bg-card/65 flex flex-col justify-between shrink-0">
          <div className="h-7 border-b border-border/80 px-3 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground select-none uppercase tracking-wider">
            <TerminalIcon className="h-3.5 w-3.5 text-primary/80" /> Output Sandbox
          </div>
          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-400/90 space-y-1 bg-black/60">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
          {/* Input form */}
          <form onSubmit={handleTerminalSubmit} className="h-8 border-t border-border flex items-center bg-black/85">
            <span className="text-[11px] font-mono text-muted-foreground pl-3 pr-1.5 select-none">$</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Type 'run' to compile files..."
              className="flex-1 h-full bg-transparent border-0 outline-none text-[11px] font-mono text-foreground placeholder:text-[10px] placeholder:text-muted-foreground/60"
            />
          </form>
        </div>
      </div>

      {/* CREATE RESOURCE MODAL */}
      {createType && (
        <Dialog open={!!createType} onOpenChange={(open) => !open && setCreateType(null)}>
          <DialogContent onClose={() => setCreateType(null)} title={`New ${createType === "file" ? "File" : "Folder"}`}>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="res-name">Name</Label>
                <Input
                  id="res-name"
                  placeholder={createType === "file" ? "e.g. index.ts, style.css" : "e.g. components, utils"}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="res-path">Parent Folder Path (Optional)</Label>
                <Input
                  id="res-path"
                  placeholder="e.g. src/components (leave blank for root)"
                  value={createPath}
                  onChange={(e) => setCreatePath(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateType(null)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* RENAME MODAL */}
      {renameFileId && (
        <Dialog open={!!renameFileId} onOpenChange={(open) => !open && setRenameFileId(null)}>
          <DialogContent onClose={() => setRenameFileId(null)} title="Rename Resource">
            <form onSubmit={handleRename} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="rename-name">New Name</Label>
                <Input
                  id="rename-name"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  required
                  disabled={isRenaming}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRenameFileId(null)}
                  disabled={isRenaming}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isRenaming}>
                  {isRenaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Rename"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
