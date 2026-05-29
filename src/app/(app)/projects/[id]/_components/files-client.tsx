"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import {
  File, FileText, FileSpreadsheet, Image as ImageIcon,
  Archive, Ruler, ShieldCheck, Folder, Upload, Trash2,
  ExternalLink, FolderOpen, Loader2, X, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadProjectFile, deleteProjectFile } from "@/actions/files";
import type { FileCategory } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectFile = {
  id: string;
  name: string;
  url: string;
  fileType: string | null;
  sizeBytes: number;
  category: FileCategory;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

type Props = {
  projectId: string;
  files: ProjectFile[];
  /** Whether the current user may delete files (ADMIN / OFFICE_MANAGER). */
  canDelete?: boolean;
};

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  FileCategory,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  PLANS: {
    label: "תוכניות",
    icon: Ruler,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  CONTRACTS: {
    label: "חוזים",
    icon: FileText,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
  },
  PERMITS: {
    label: "היתרים",
    icon: ShieldCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  PHOTOS: {
    label: "תמונות",
    icon: ImageIcon,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
  },
  OTHER: {
    label: "אחר",
    icon: Folder,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/40",
    border: "border-slate-200 dark:border-slate-700",
  },
};

const CATEGORY_ORDER: FileCategory[] = ["PLANS", "CONTRACTS", "PERMITS", "PHOTOS", "OTHER"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  const t = (mimeType ?? "").toLowerCase();
  const cls = "h-5 w-5 shrink-0";
  if (t.includes("pdf") || t.includes("msword") || t.includes("wordprocessingml"))
    return <FileText className={`${cls} text-red-500`} />;
  if (t.startsWith("image/"))
    return <ImageIcon className={`${cls} text-orange-500`} />;
  if (t.includes("spreadsheet") || t.includes("excel") || t.includes("csv"))
    return <FileSpreadsheet className={`${cls} text-green-600`} />;
  if (t.includes("zip") || t.includes("rar") || t.includes("tar") || t.includes("gz"))
    return <Archive className={`${cls} text-yellow-600`} />;
  return <File className={`${cls} text-slate-400`} />;
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ projectId, onUploaded: _onUploaded }: { projectId: string; onUploaded: (f: ProjectFile) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState<FileCategory>("OTHER");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setSelectedFile(files[0]);
      setStatus("idle");
      setErrorMsg("");
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleUpload = () => {
    if (!selectedFile) return;
    setStatus("uploading");
    setErrorMsg("");

    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("category", category);

    startTransition(async () => {
      const res = await uploadProjectFile(projectId, fd);
      if (res.success) {
        setStatus("success");
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = "";
        // Reload to get the fresh file with DB-assigned id/url
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "שגיאה לא ידועה");
      }
    });
  };

  const uploading = isPending || status === "uploading";

  return (
    <div className="mb-8 space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer",
          "py-10 px-6 transition-colors select-none",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        {selectedFile ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileTypeIcon mimeType={selectedFile.type} />
            <span className="max-w-xs truncate">{selectedFile.name}</span>
            <span className="text-muted-foreground text-xs">({formatBytes(selectedFile.size)})</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">גרור קובץ לכאן, או לחץ לבחירה</p>
            <p className="text-xs text-muted-foreground">PDF, Word, Excel, תמונות, ועוד</p>
          </>
        )}
      </div>

      {/* Category + Upload row */}
      <div className="flex items-center gap-3" dir="rtl">
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as FileCategory)}
          disabled={uploading}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="קטגוריה" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const Icon = cfg.icon;
              return (
                <SelectItem key={cat} value={cat}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    {cfg.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "מעלה..." : status === "success" ? "הועלה!" : "העלה קובץ"}
        </Button>

        {status === "error" && (
          <p className="text-sm text-destructive">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────

function FileCard({
  file,
  projectId,
  canDelete,
  onDeleted,
}: {
  file: ProjectFile;
  projectId: string;
  canDelete: boolean;
  onDeleted: (id: string) => void;
}) {
  const [deleting, startDelete] = useTransition();

  const handleDelete = () => {
    startDelete(async () => {
      const res = await deleteProjectFile(file.id, projectId);
      if (res.success) onDeleted(file.id);
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
      <FileTypeIcon mimeType={file.fileType} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatBytes(file.sizeBytes)}
          {" · "}
          {formatDate(file.createdAt)}
          {file.uploadedBy && (
            <span> · {file.uploadedBy.name}</span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          asChild
        >
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>מחיקת קובץ</AlertDialogTitle>
                <AlertDialogDescription>
                  האם למחוק את הקובץ <span className="font-medium">{file.name}</span>?
                  פעולה זו אינה ניתנת לביטול.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>ביטול</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  מחק
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  files,
  projectId,
  canDelete,
  onDeleted,
}: {
  category: FileCategory;
  files: ProjectFile[];
  projectId: string;
  canDelete: boolean;
  onDeleted: (id: string) => void;
}) {
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;

  return (
    <div>
      <div className={`flex items-center gap-2 rounded-lg border px-4 py-2 mb-3 ${cfg.bg} ${cfg.border}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        <Badge variant="secondary" className="mr-auto text-xs h-5">
          {files.length}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {files.map((f) => (
          <FileCard key={f.id} file={f} projectId={projectId} canDelete={canDelete} onDeleted={onDeleted} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function FilesClient({ projectId, files: initialFiles, canDelete = false }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);

  const handleDeleted = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const grouped = CATEGORY_ORDER.reduce<Record<FileCategory, ProjectFile[]>>(
    (acc, cat) => {
      acc[cat] = files.filter((f) => f.category === cat);
      return acc;
    },
    { PLANS: [], CONTRACTS: [], PERMITS: [], PHOTOS: [], OTHER: [] }
  );

  const populated = CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold">ניהול קבצים ומסמכים</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {files.length > 0
            ? `${files.length} קבצים • ${CATEGORY_ORDER.filter((c) => grouped[c].length > 0).length} קטגוריות`
            : "טרם הועלו קבצים לפרויקט זה"}
        </p>
      </div>

      {/* Upload zone */}
      <UploadZone projectId={projectId} onUploaded={() => {}} />

      {/* Summary chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_ORDER.map((cat) => {
            const count = grouped[cat].length;
            if (count === 0) return null;
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.border} ${cfg.color}`}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}
                <span className="opacity-70">({count})</span>
              </span>
            );
          })}
        </div>
      )}

      {/* File list */}
      {populated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
            <FolderOpen className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">אין קבצים עדיין</p>
          <p className="text-xs text-muted-foreground mt-1">גרור קובץ לאזור למעלה כדי להעלות</p>
        </div>
      ) : (
        <div className="space-y-8">
          {populated.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              files={grouped[cat]}
              projectId={projectId}
              canDelete={canDelete}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
