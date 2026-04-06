import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText, Upload, Trash2, ExternalLink,
  File, Download, RefreshCw, Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminTopbar } from "@/components/admin/Topbar";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminDocumentsQuery,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
} from "@/hooks/useAdminQueries";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
import type { AdminDocument, DateRange, DocumentCategory } from "@/types/admin";

const CATEGORY_LABELS: Record<DocumentCategory | string, string> = {
  sop: "SOP", policy: "Policy", report: "Report", guide: "Guide", other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  sop:    "bg-sky-100 text-sky-700 border-sky-200",
  policy: "bg-violet-100 text-violet-700 border-violet-200",
  report: "bg-emerald-100 text-emerald-700 border-emerald-200",
  guide:  "bg-amber-100 text-amber-700 border-amber-200",
  other:  "bg-muted text-muted-foreground border-border",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocuments() {
  const { toast } = useToast();
  const [range, setRange] = useState<DateRange>("30d");
  const [catFilter, setCatFilter] = useState<string>("");
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // React Query
  const { data: docsRes, isLoading: loading, refetch } = useAdminDocumentsQuery(catFilter || undefined);
  const docs = docsRes?.data ?? [];
  const deleteMutation = useDeleteDocumentMutation();

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Document deleted" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title="Documents"
        subtitle="Manage SOPs, policies, and guides"
        range={range}
        onRangeChange={setRange}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filter + upload button */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={catFilter || "all"} onValueChange={(v) => setCatFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button size="sm" className="ml-auto gap-1.5 h-9 bg-primary" onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4" />
            Upload Document
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{docs.length} documents</span>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => {
            const count = docs.filter((d) => d.category === k).length;
            return count > 0 ? (
              <span key={k} className={`px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[k]}`}>
                {count} {v}
              </span>
            ) : null;
          })}
        </div>

        {/* Documents grid */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && docs.length === 0 && (
          <Card className="border-border/60 p-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium mb-1">No documents yet</p>
            <p className="text-muted-foreground text-sm mb-4">Upload SOPs, policies, or guides</p>
            <Button onClick={() => setShowUpload(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Upload Document
            </Button>
          </Card>
        )}

        {!loading && docs.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc, i) => (
              <motion.div
                key={doc._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-card border border-border/60 rounded-xl p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-muted rounded-xl">
                    <File className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <Badge className={`border text-xs font-medium ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other}`}>
                    {CATEGORY_LABELS[doc.category] || doc.category}
                  </Badge>
                </div>

                <h4 className="font-semibold text-sm mb-1 line-clamp-2 leading-snug">{doc.title}</h4>
                {doc.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{doc.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border/40">
                  <span>{formatBytes(doc.fileSize)}</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(doc._id, doc.title)}
                    disabled={deleting === doc._id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      {showUpload && (
        <UploadDocumentDialog
          onClose={() => setShowUpload(false)}
          onUploaded={(doc) => {
            refetch();
            setShowUpload(false);
            toast({ title: "Document uploaded", description: doc.title });
          }}
        />
      )}
    </div>
  );
}

/* ── Upload Dialog ──────────────────────────────────────────────── */

function UploadDocumentDialog({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: (doc: AdminDocument) => void;
}) {
  const { toast } = useToast();
  const createDocumentMutation = useCreateDocumentMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"file" | "url">("file");

  async function handleSubmit() {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let url = urlInput.trim();
      let fileType = "other";
      let fileSize = 0;

      if (mode === "file" && file) {
        // Upload to Firebase Storage
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const storagePath = `documents/${user.uid}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
        fileType = ["pdf", "doc", "docx", "xlsx", "csv"].includes(ext)
          ? ext
          : ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
          ? "image"
          : "other";
        fileSize = file.size;
      }

      if (!url) {
        toast({ title: "Please provide a file or URL", variant: "destructive" });
        setUploading(false);
        return;
      }

      // Validate URL scheme (prevent javascript: / data: XSS)
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          toast({ title: "Invalid URL", description: "Only http and https URLs are allowed.", variant: "destructive" });
          setUploading(false);
          return;
        }
      } catch {
        toast({ title: "Invalid URL", description: "Enter a valid URL.", variant: "destructive" });
        setUploading(false);
        return;
      }

      const res = await createDocumentMutation.mutateAsync({ title, url, fileType, fileSize, category, description });
      onUploaded(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload Error", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</Label>
            <Input
              className="mt-1"
              placeholder="e.g. Waste Sorting SOP v2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              className="mt-1 resize-none"
              rows={2}
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("file")}
            >
              Upload File
            </Button>
            <Button
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("url")}
            >
              Paste URL
            </Button>
          </div>

          {mode === "file" ? (
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">{file ? file.name : "Click to select file"}</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, CSV, Images</p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document URL</Label>
              <Input
                className="mt-1"
                placeholder="https://example.com/document.pdf"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                type="url"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading} className="gap-1.5">
            {uploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
