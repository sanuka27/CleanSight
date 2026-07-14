import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Camera,
  Upload,
  CheckCircle,
  Loader2,
  ImageIcon,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardReport } from "@/types/dashboard";
import { uploadImage } from "@/lib/upload";

interface ResolveWithPhotoModalProps {
  report: DashboardReport | null;
  open: boolean;
  onClose: () => void;
  /** Called with optional resolutionImageUrl when the volunteer confirms. */
  onConfirm: (reportId: string, resolutionImageUrl?: string) => Promise<void>;
  isLoading: boolean;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export function ResolveWithPhotoModal({
  report,
  open,
  onClose,
  onConfirm,
  isLoading,
}: ResolveWithPhotoModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPreview(null);
    setFile(null);
    setUploadState("idle");
    setUploadProgress(0);
    setError(null);
    setIsDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    reset();
    onClose();
  }, [isLoading, reset, onClose]);

  const processFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, WebP, etc.)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setUploadState("idle");
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleResolveWithPhoto = useCallback(async () => {
    if (!report || !file) return;
    setError(null);
    setUploadState("uploading");

    // Simulate progress ticks while Firebase uploads
    const ticker = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 12, 85));
    }, 300);

    try {
      const url = await uploadImage(file);
      clearInterval(ticker);
      setUploadProgress(100);
      setUploadState("done");
      await onConfirm(report._id, url);
      reset();
      onClose();
    } catch (err) {
      clearInterval(ticker);
      setUploadState("error");
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. Please try again."
      );
    }
  }, [report, file, onConfirm, reset, onClose]);

  const handleResolveWithoutPhoto = useCallback(async () => {
    if (!report) return;
    await onConfirm(report._id);
    reset();
    onClose();
  }, [report, onConfirm, reset, onClose]);

  return (
    <AnimatePresence>
      {open && report && (
        <>
          {/* Backdrop */}
          <motion.div
            key="resolve-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="resolve-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base leading-tight">
                      Mark as Resolved
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Upload a cleanup photo to build trust &amp; proof
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/20 disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Before / After Preview Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Before */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      Before
                    </p>
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-muted/20 border border-border/40">
                      {report.imageUrl ? (
                        <img
                          src={report.imageUrl}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-md font-medium">
                        Original report
                      </span>
                    </div>
                  </div>

                  {/* After */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      After
                    </p>
                    <div
                      className={`relative rounded-xl overflow-hidden aspect-[4/3] border-2 border-dashed transition-colors cursor-pointer ${
                        isDragOver
                          ? "border-primary bg-primary/5"
                          : preview
                          ? "border-success/50 bg-transparent"
                          : "border-border/40 bg-muted/10 hover:border-primary/50 hover:bg-primary/5"
                      }`}
                      onClick={() => !preview && fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      {preview ? (
                        <>
                          <img
                            src={preview}
                            alt="After"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-md font-medium">
                            After cleanup
                          </span>
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reset();
                            }}
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-destructive/80 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                          <Camera className="w-7 h-7 text-muted-foreground/50" />
                          <p className="text-[10px] text-muted-foreground text-center leading-tight">
                            Drop photo or tap
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow divider */}
                {(report.imageUrl || preview) && (
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-px w-10 bg-border/50" />
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>cleanup proof</span>
                      <div className="h-px w-10 bg-border/50" />
                    </div>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Upload zone (when no preview yet) */}
                {!preview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`w-full rounded-xl border-2 border-dashed py-4 text-sm flex items-center justify-center gap-2 transition-all ${
                      isDragOver
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Drag &amp; drop or click to select a photo</span>
                  </button>
                )}

                {/* Progress bar */}
                <AnimatePresence>
                  {uploadState === "uploading" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Uploading photo…
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-success"
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-sm h-10"
                    disabled={isLoading || uploadState === "uploading"}
                    onClick={handleResolveWithoutPhoto}
                  >
                    {isLoading && !file ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : null}
                    Resolve without photo
                  </Button>

                  <Button
                    type="button"
                    className="flex-1 text-sm h-10 gradient-primary text-white hover:opacity-90 disabled:opacity-50 gap-1.5"
                    disabled={!file || isLoading || uploadState === "uploading"}
                    onClick={handleResolveWithPhoto}
                  >
                    {uploadState === "uploading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : uploadState === "done" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {uploadState === "uploading"
                      ? "Uploading…"
                      : "Upload & Resolve"}
                  </Button>
                </div>

                <p className="text-center text-[11px] text-muted-foreground/60">
                  Photo is optional but builds community trust in your work ✓
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
