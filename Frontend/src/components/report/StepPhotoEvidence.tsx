import { useRef } from "react";
import { Camera, CheckCircle, AlertCircle } from "lucide-react";

interface StepPhotoEvidenceProps {
  imagePreview: string | null;
  imageFile: File | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** True when preview was restored from a draft but the File object is gone. */
  needsReselect: boolean;
  /** Shared ref so the orchestrator can reset the file input on full wizard reset. */
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function StepPhotoEvidence({
  imagePreview,
  imageFile,
  onImageUpload,
  needsReselect,
  fileInputRef,
}: StepPhotoEvidenceProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = fileInputRef ?? localRef;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onImageUpload(e);
    // Reset value so the same file can be re-selected immediately
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold font-display">Upload Evidence</h2>
        <span className="text-xs text-muted-foreground">JPG / PNG, max 10 MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        id="image-upload"
      />

      {imagePreview ? (
        /* ── Compact thumbnail after upload ── */
        <label htmlFor="image-upload" className="cursor-pointer group">
          <div className="flex items-center gap-4 rounded-xl border-2 border-primary bg-primary/5 p-3 transition-all hover:bg-primary/10">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              {needsReselect ? (
                <>
                  <div className="flex items-center gap-1.5 text-warning mb-0.5">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Re-select photo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Session restored — please re-select your image file
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-success mb-0.5">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Photo ready</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{imageFile?.name}</p>
                </>
              )}
              <p className="text-xs text-primary mt-1 group-hover:underline">
                Click to {needsReselect ? "select" : "change"}
              </p>
            </div>
          </div>
        </label>
      ) : (
        /* ── Empty upload area (compact) ── */
        <label
          htmlFor="image-upload"
          className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all duration-300 py-10"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <p className="font-display font-bold text-base">Click to Upload Photo</p>
          <p className="text-muted-foreground text-sm mt-1">Supports JPG, PNG (Max 10 MB)</p>
        </label>
      )}
    </div>
  );
}
