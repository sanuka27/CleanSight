import type React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle, X } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/useReports";
import { useAuth } from "@/context/AuthContext";
import { MeshGradient } from "@/components/shared/MeshGradient";

import { steps, MAX_FILE_SIZE, isLocationInRange } from "@/components/report/constants";
import { StepPhotoEvidence } from "@/components/report/StepPhotoEvidence";
import { StepWasteDetails } from "@/components/report/StepWasteDetails";
import { StepLocation } from "@/components/report/StepLocation";
import { WizardFooter } from "@/components/report/WizardFooter";
import {
  loadDraft,
  clearDraft,
  createThumbnail,
  useAutoSaveDraft,
} from "@/components/report/useWizardDraft";

/* ── Component ──────────────────────────────────────────────────── */

const ReportWaste = () => {
  /* ── State ─────────────────────────────────────────────────── */
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageThumbnail, setImageThumbnail] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didRestoreDraft, setDidRestoreDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftLoaded = useRef(false);
  const { toast } = useToast();
  const { createReport } = useReports();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  /* ── Derived: location range validation ─────────────────────── */
  const { valid: isLocationValid, error: locationRangeError } =
    isLocationInRange(location);

  /* ── Draft: restore on mount ────────────────────────────────── */
  useEffect(() => {
    if (draftLoaded.current) return;
    draftLoaded.current = true;

    const draft = loadDraft();
    if (!draft) return;

    setCurrentStep(draft.currentStep);
    setSelectedType(draft.selectedType);
    setSelectedUrgency(draft.selectedUrgency);
    setDescription(draft.description);
    setLocation(draft.location);
    setShowMapPicker(draft.showMapPicker);
    setDidRestoreDraft(true);

    if (draft.imageThumbnail) {
      setImagePreview(draft.imageThumbnail);
      setImageThumbnail(draft.imageThumbnail);
      // imageFile stays null — user must re-select the file
    }
  }, []);

  /* ── Full wizard reset ──────────────────────────────────────── */
  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setSelectedType(null);
    setSelectedUrgency(null);
    setImagePreview(null);
    setImageFile(null);
    setImageThumbnail(null);
    setDescription("");
    setLocation(null);
    setIsLocating(false);
    setShowMapPicker(false);
    setLocationError(null);
    setIsSubmitting(false);
    setDidRestoreDraft(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    clearDraft();
  }, []);

  /* ── Draft: auto-save (debounced 300 ms) ────────────────────── */
  useAutoSaveDraft({
    currentStep,
    selectedType,
    selectedUrgency,
    description,
    imageThumbnail,
    imageFileName: imageFile?.name ?? null,
    location,
    showMapPicker,
  });

  /* ── Global enter-key prevention on <input> elements ────────── */
  const handleWizardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
        e.preventDefault();
      }
    },
    [],
  );

  /* ── Location detection (user-triggered only) ──────────────── */
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Location permission denied. Allow access or enter coordinates manually."
            : "Unable to detect location. Enter coordinates manually.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  /* ── Image handling (safe replacement) ──────────────────────── */
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File Too Large", description: "Max 10 MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid File", description: "Please upload JPG, PNG, etc.", variant: "destructive" });
        return;
      }

      // Replace previous image state cleanly
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImagePreview(dataUrl);
        // Generate a small thumbnail for the session draft
        createThumbnail(dataUrl)
          .then(setImageThumbnail)
          .catch(() => setImageThumbnail(null));
      };
      reader.readAsDataURL(file);
    },
    [toast],
  );

  /* ── Step validation ────────────────────────────────────────── */
  const canAdvance = (): boolean => {
    if (currentStep === 1) {
      if (!imageFile) {
        toast({ title: "Image Required", description: "Upload a photo before continuing.", variant: "destructive" });
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!selectedType) {
        toast({ title: "Type Required", description: "Select a waste type.", variant: "destructive" });
        return false;
      }
      if (!selectedUrgency) {
        toast({ title: "Urgency Required", description: "Select an urgency level.", variant: "destructive" });
        return false;
      }
      if (!description.trim()) {
        toast({ title: "Description Required", description: "Provide a brief description of the waste.", variant: "destructive" });
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (canAdvance()) setCurrentStep((prev) => Math.min(prev + 1, 3));
  };
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  /* ── Submit (explicit click only, never auto) ──────────────── */
  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: "Authentication Required", description: "Please log in to submit a report.", variant: "destructive" });
      return;
    }
    if (!imageFile) {
      toast({ title: "Image Required", description: "Upload a photo of the waste.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Description Required", description: "Provide a brief description of the waste.", variant: "destructive" });
      return;
    }
    if (!location) {
      toast({ title: "Location Required", description: "Select or detect a location.", variant: "destructive" });
      return;
    }
    if (!isLocationValid) {
      toast({ title: "Invalid Coordinates", description: locationRangeError ?? "Lat/lng out of range.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createReport(
        imageFile,
        description,
        location,
        selectedType || undefined,
        selectedUrgency || undefined,
      );
      resetWizard();
      toast({ title: "Report Submitted!", description: "Your report will be reviewed shortly." });
      navigate("/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Prevent native form submission ─────────────────────────── */
  const blockFormSubmit = (e: React.FormEvent) => e.preventDefault();

  /* ── Derived flags ─────────────────────────────────────────── */
  const needsReselect = imagePreview !== null && imageFile === null;
  const canSubmit = isLocationValid && imageFile !== null;

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-20 pb-6 relative overflow-hidden">
        <MeshGradient className="opacity-30" />

        <div className="container mx-auto px-4 max-w-2xl relative z-10">
          {/* ── Title ──────────────────────────────────────────── */}
          <div className="text-center mb-4">
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Report <span className="text-gradient">Waste</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Follow the steps to file a verified report.
            </p>
          </div>

          {/* ── Draft restored banner ──────────────────────────── */}
          {didRestoreDraft && (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 mb-3 text-xs">
              <span className="text-primary font-medium">Draft restored</span>
              <button
                type="button"
                onClick={resetWizard}
                className="flex items-center gap-1 text-primary/70 hover:text-primary transition-colors"
              >
                Clear <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Compact stepper ────────────────────────────────── */}
          <div className="mb-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-muted rounded-full -z-10">
                <motion.div
                  className="h-full gradient-primary rounded-full"
                  animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              {steps.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                  <div key={step.id} className="flex flex-col items-center gap-1 bg-background px-2 py-1 rounded-lg">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                        isActive || isCompleted
                          ? "bg-primary border-primary text-primary-foreground shadow-glow"
                          : "bg-card border-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <span className={`text-[11px] font-medium leading-none hidden sm:block ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Wizard card (with entrance animation + global key handler) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="glass-premium rounded-2xl shadow-2xl flex flex-col"
            style={{ minHeight: 340 }}
            onKeyDownCapture={handleWizardKeyDown}
          >
            <form onSubmit={blockFormSubmit} className="flex flex-col flex-1">
              {/* ── Content area ───────────────────────────────── */}
              <div className="flex-1 px-5 pt-5 pb-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 290px)" }}>
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                      <StepPhotoEvidence
                        imagePreview={imagePreview}
                        imageFile={imageFile}
                        onImageUpload={handleImageUpload}
                        needsReselect={needsReselect}
                        fileInputRef={fileInputRef}
                      />
                    </motion.div>
                  )}
                  {currentStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                      <StepWasteDetails
                        selectedType={selectedType}
                        onSelectType={setSelectedType}
                        selectedUrgency={selectedUrgency}
                        onSelectUrgency={setSelectedUrgency}
                        description={description}
                        onDescriptionChange={setDescription}
                      />
                    </motion.div>
                  )}
                  {currentStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                      <StepLocation
                        location={location}
                        onLocationChange={setLocation}
                        isLocating={isLocating}
                        showMapPicker={showMapPicker}
                        onToggleMapPicker={setShowMapPicker}
                        locationError={locationError}
                        locationRangeError={locationRangeError}
                        onDetectLocation={detectLocation}
                        imageFileName={imageFile?.name ?? null}
                        selectedType={selectedType}
                        selectedUrgency={selectedUrgency}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Footer ─────────────────────────────────────── */}
              <WizardFooter
                currentStep={currentStep}
                onBack={prevStep}
                onNext={nextStep}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                canSubmit={canSubmit}
              />
            </form>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReportWaste;
