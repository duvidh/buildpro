"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import {
  File, FileText, FileSpreadsheet, Image as ImageIcon,
  Archive, Ruler, ShieldCheck, Folder, Upload, Trash2,
  ExternalLink, FolderOpen, Loader2, X, CheckCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
import { uploadCrmFile, deleteCrmFile } from "@/actions/files";
import { useRouter } from "next/navigation";
import type { FileCategory } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CrmFile = {
  id: string;
  name: string;
  url: string;
  fileType: string | null;
  sizeBytes: number | null;
  category: FileCategory;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
};

type Entity = { type: "lead" | "client"; id: string };

type Props = {
  entity: Entity;
  files: CrmFile[];
  canDelete?: boolean;
};

// ─── Category Meta (no Hebrew labels here) ───────────────────────────────────

const CATEGORY_META: Record<
  FileCategory,
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  PLANS:     { icon: Ruler,       color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200"   },
  CONTRACTS: { icon: FileText,    color: "text-violet-600",  bg: "bg-violet-50",  border: "border-violet-200" },
  PERMITS:   { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  PHOTOS:    { icon: ImageIcon,   color: "text-orange-600",  bg: "bg-orange-50",  border: "border-orange-200" },
  OTHER:     { icon: Folder,      color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-200"  },
};

const CATEGORY_ORDER: FileCategory[] = ["PLANS", "CONTRACTS", "PERMITS", "PHOTOS", "OTHER"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function FileTypeIcon({ mimeType }: { mimeType: string | null }) {
  const m = (mimeType ?? "").toLowerCase();
  const cls = "h-5 w-5 shrink-0";
  if (m.includes("pdf") || m.includes("msword") || m.includes("wordprocessingml"))
    return <FileText className={`${cls} text-red-500`} />;
  if (m.startsWith("image/"))
    return <ImageIcon className={`${cls} text-orange-500`} />;
  if (m.includes("spreadsheet") || m.includes("excel") || m.includes("csv"))
    return <FileSpreadsheet className={`${cls} text-green-600`} />;
  if (m.includes("zip") || m.includes("rar") || m.includes("tar") || m.includes("gz"))
    return <Archive className={`${cls} text-yellow-600`} />;
  return <File className={`${cls} text-slate-400`} />;
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ entity }: { entity: Entity }) {
  const t = useTranslations("crmFiles");
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState<FileCategory>("OTHER");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSelectedFile(files[0]);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleUpload = () => {
    if (!selectedFile) return;
    setStatus("uploading");
    setErrorMsg("");

    const fd = new FormData();
    fd.append("file", selectedFile);
    fd.append("category", category);

    const opts =
      entity.type === "lead"
        ? { leadId: entity.id }
        : { clientId: entity.id };

    startTransition(async () => {
      const res = await uploadCrmFile(opts, fd);
      if (res.success) {
        setStatus("success");
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = "";
        setTimeout(() => {
          router.refresh();
          setStatus("idle");
        }, 800);
      } else {
        setStatus("error");
        setErrorMsg((res as { error?: string }).error ?? t("unknownError"));
      }
    });
  };

  const uploading = isPending || status === "uploading";

  return (
    <div className="mb-8 space-y-3">
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
            <p className="text-sm font-medium">{t("dragHint")}</p>
            <p className="text-xs text-muted-foreground">{t("fileTypes")}</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-3" dir="rtl">
        <Select value={category} onValueChange={(v) => setCategory(v as FileCategory)} disabled={uploading}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <SelectItem key={cat} value={cat}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    {t(`categoryLabels.${cat}` as Parameters<typeof t>[0])}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="gap-2">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? t("uploading") : status === "success" ? t("uploaded") : t("upload")}
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
  file, entity, canDelete, onDeleted,
}: {
  file: CrmFile;
  entity: Entity;
  canDelete: boolean;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("crmFiles");
  const [deleting, startDelete] = useTransition();

  const handleDelete = () => {
    const opts =
      entity.type === "lead"
        ? { leadId: entity.id }
        : { clientId: entity.id };

    startDelete(async () => {
      const res = await deleteCrmFile(file.id, opts);
      if (res.success) onDeleted(file.id);
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
      <FileTypeIcon mimeType={file.fileType} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatBytes(file.sizeBytes)}
          {" · "}
          {formatDate(file.createdAt)}
          {file.uploadedBy && <span> · {file.uploadedBy.name}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" asChild>
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" disabled={deleting}>
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteDesc", { name: file.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  {t("delete")}
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
  category, files, entity, canDelete, onDeleted,
}: {
  category: FileCategory;
  files: CrmFile[];
  entity: Entity;
  canDelete: boolean;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("crmFiles");
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  return (
    <div>
      <div className={`flex items-center gap-2 rounded-lg border px-4 py-2 mb-3 ${meta.bg} ${meta.border}`}>
        <Icon className={`h-4 w-4 ${meta.color}`} />
        <span className={`text-sm font-semibold ${meta.color}`}>
          {t(`categoryLabels.${category}` as Parameters<typeof t>[0])}
        </span>
        <Badge variant="secondary" className="mr-auto text-xs h-5">{files.length}</Badge>
      </div>
      <div className="space-y-1.5">
        {files.map((f) => (
          <FileCard key={f.id} file={f} entity={entity} canDelete={canDelete} onDeleted={onDeleted} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function CrmFilesClient({ entity, files: initialFiles, canDelete = false }: Props) {
  const t = useTranslations("crmFiles");
  const [files, setFiles] = useState<CrmFile[]>(initialFiles);

  const handleDeleted = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const grouped = CATEGORY_ORDER.reduce<Record<FileCategory, CrmFile[]>>(
    (acc, cat) => { acc[cat] = files.filter((f) => f.category === cat); return acc; },
    { PLANS: [], CONTRACTS: [], PERMITS: [], PHOTOS: [], OTHER: [] }
  );

  const populated = CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {files.length > 0
            ? t("filesCount", { count: files.length, cats: populated.length })
            : t("noFiles")}
        </p>
      </div>

      <UploadZone entity={entity} />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORY_ORDER.map((cat) => {
            const count = grouped[cat].length;
            if (count === 0) return null;
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.bg} ${meta.border} ${meta.color}`}
              >
                <Icon className="h-3 w-3" />
                {t(`categoryLabels.${cat}` as Parameters<typeof t>[0])}
                <span className="opacity-70">({count})</span>
              </span>
            );
          })}
        </div>
      )}

      {populated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
            <FolderOpen className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t("noFilesYet")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("dragToUpload")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {populated.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              files={grouped[cat]}
              entity={entity}
              canDelete={canDelete}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
