import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Camera, 
  MapPin, 
  Upload, 
  CheckCircle, 
  Trash2,
  Leaf,
  Building2,
  Recycle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  LocateFixed,
  Map as MapIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/useReports";
import { useAuth } from "@/context/AuthContext";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { CleanSightMap } from "@/components/maps/CleanSightMap";
import type { LatLng } from "@/types/map";

const wasteTypes = [
  { id: "general", label: "General Waste", icon: Trash2, color: "text-gray-500", bg: "bg-gray-500/10" },
  { id: "recyclable", label: "Recyclables", icon: Recycle, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "organic", label: "Organic/Garden", icon: Leaf, color: "text-green-500", bg: "bg-green-500/10" },
  { id: "construction", label: "Construction", icon: Building2, color: "text-orange-500", bg: "bg-orange-500/10" },
];

const urgencyLevels = [
  { id: "low", label: "Low", desc: "No immediate hazard", color: "bg-success/10 text-success border-success/30" },
  { id: "medium", label: "Medium", desc: "Needs attention soon", color: "bg-warning/10 text-warning border-warning/30" },
  { id: "high", label: "High", desc: "Hazardous / Blocking", color: "bg-destructive/10 text-destructive border-destructive/30" },
];

const steps = [
  { id: 1, title: "Photo Evidence", desc: "Upload a clear photo" },
  { id: 2, title: "Waste Details", desc: "Type & Urgency" },
  { id: 3, title: "Location", desc: "Pin the spot" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ReportWaste = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { createReport } = useReports();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectLocation = () => {
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
            ? "Location permission denied. Please allow location access or enter coordinates manually."
            : "Unable to detect location. Please enter coordinates manually."
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File Too Large", description: "Maximum file size is 10 MB. Please choose a smaller image.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please upload an image file (JPG, PNG, etc.).", variant: "destructive" });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  /** Validate per-step before advancing */
  const canAdvance = (): boolean => {
    if (currentStep === 1) {
      if (!imageFile) {
        toast({ title: "Image Required", description: "Please upload a photo before continuing.", variant: "destructive" });
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!selectedType) {
        toast({ title: "Waste Type Required", description: "Please select a waste type.", variant: "destructive" });
        return false;
      }
      if (!selectedUrgency) {
        toast({ title: "Urgency Required", description: "Please select an urgency level.", variant: "destructive" });
        return false;
      }
      if (!description.trim()) {
        toast({ title: "Description Required", description: "Please provide a description of the waste.", variant: "destructive" });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      toast({ title: "Authentication Required", description: "Please log in to submit a report.", variant: "destructive" });
      return;
    }
    if (!imageFile) {
      toast({ title: "Image Required", description: "Please upload a photo of the waste.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Description Required", description: "Please provide a description.", variant: "destructive" });
      return;
    }
    if (!location) {
      toast({ title: "Location Required", description: "Please allow location access or enter coordinates.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createReport(
        imageFile,
        description,
        location,
        selectedType || undefined,
        selectedUrgency || undefined
      );
      toast({
        title: "Report Submitted!",
        description: "Your waste report has been submitted and will be reviewed shortly.",
      });
      // Navigate to dashboard after successful submission
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 pt-28 pb-16 relative overflow-hidden">
        <MeshGradient className="opacity-30" />
        
        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <RevealOnScroll className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Report <span className="text-gradient">Waste</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Help keep your community clean. Follow the steps below to file a verified report.
            </p>
          </RevealOnScroll>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full -z-10">
                <motion.div 
                  className="h-full gradient-primary rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />
              </div>
              
              {steps.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-2 bg-background p-2 rounded-xl">
                    <motion.div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive || isCompleted 
                          ? "bg-primary border-primary text-primary-foreground shadow-glow" 
                          : "bg-card border-muted text-muted-foreground"
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span>{step.id}</span>}
                    </motion.div>
                    <div className="text-center hidden sm:block">
                      <p className={`text-sm font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div
            layout
            className="glass-premium rounded-3xl p-6 md:p-8 shadow-2xl"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold font-display">Upload Evidence</h2>
                      <p className="text-muted-foreground">Take a clear photo of the waste</p>
                    </div>

                    <div className="relative max-w-xl mx-auto">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className={`
                          group block w-full aspect-video rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 relative overflow-hidden
                          ${imagePreview ? "border-primary" : "border-border hover:border-primary/50"}
                          ${!imagePreview && "bg-muted/30 hover:bg-muted/50"}
                        `}
                      >
                        {imagePreview ? (
                          <div className="relative h-full">
                            <img
                              src={imagePreview}
                              alt="Uploaded preview"
                              className="w-full h-full object-cover"
                            />
                            {/* Success badge */}
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-4 right-4"
                            >
                              <div className="flex items-center gap-2 glass-strong rounded-full px-4 py-2 border border-success/50">
                                <CheckCircle className="w-5 h-5 text-success" />
                                <span className="text-sm font-medium text-success">Photo ready</span>
                              </div>
                            </motion.div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                              <Camera className="w-10 h-10 text-primary" />
                            </div>
                            <p className="font-display text-xl font-bold mb-2">Click or Drop Photo</p>
                            <p className="text-muted-foreground">Supports JPG, PNG (Max 10MB)</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                     <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold font-display">Waste Details</h2>
                      <p className="text-muted-foreground">Categorize the issue for faster cleanup</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {wasteTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedType === type.id;
                        return (
                          <motion.button
                            key={type.id}
                            type="button"
                            onClick={() => setSelectedType(type.id)}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                              relative p-4 rounded-2xl border-2 text-center transition-all duration-300 overflow-hidden
                              ${isSelected
                                ? "border-primary bg-primary/5 shadow-glow"
                                : "border-border hover:border-primary/30"
                              }
                            `}
                          >
                            {isSelected && (
                              <motion.div 
                                layoutId="waste-type-active"
                                className="absolute inset-0 bg-primary/5"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                            <div className={`w-12 h-12 rounded-xl ${type.bg} mx-auto mb-3 flex items-center justify-center`}>
                              <Icon className={`w-6 h-6 ${type.color}`} />
                            </div>
                            <p className={`font-medium ${isSelected ? "text-primary font-bold" : "text-foreground"}`}>
                              {type.label}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Urgency Level</Label>
                      <div className="grid md:grid-cols-3 gap-4">
                        {urgencyLevels.map((level) => {
                          const isSelected = selectedUrgency === level.id;
                          return (
                            <motion.button
                              key={level.id}
                              type="button"
                              onClick={() => setSelectedUrgency(level.id)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`
                                text-left p-4 rounded-xl border-2 transition-all duration-300
                                ${isSelected ? level.color : "border-border hover:border-primary/30"}
                              `}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold">{level.label}</span>
                                {isSelected && <CheckCircle className="w-4 h-4" />}
                              </div>
                              <p className="text-xs opacity-80">{level.desc}</p>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-base font-semibold">Additional Description</Label>
                       <Textarea 
                          placeholder="Provide more context about the location or waste..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="rounded-xl border-border/50 focus:border-primary/50 focus:ring-primary/20 min-h-[100px]"
                        />
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold font-display">Confirm Location</h2>
                      <p className="text-muted-foreground">Use GPS or pick a spot on the map</p>
                    </div>

                    {/* Method toggle */}
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant={!showMapPicker ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowMapPicker(false)}
                      >
                        <LocateFixed className="w-4 h-4" />
                        GPS / Manual
                      </Button>
                      <Button
                        type="button"
                        variant={showMapPicker ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowMapPicker(true)}
                      >
                        <MapIcon className="w-4 h-4" />
                        Pick on Map
                      </Button>
                    </div>

                    {showMapPicker ? (
                      /* ── Map Picker ── */
                      <div className="space-y-3">
                        <div className="rounded-xl overflow-hidden border border-border shadow-sm h-[350px]">
                          <CleanSightMap
                            mode="pick"
                            pickedLocation={location as LatLng | undefined}
                            onPickLocation={(ll) => setLocation({ lat: ll.lat, lng: ll.lng })}
                            showUserLocation
                            className="h-full w-full"
                          />
                        </div>
                        {location ? (
                          <div className="flex items-center gap-3 bg-card rounded-lg p-3 border border-border">
                            <MapPin className="w-5 h-5 text-success flex-shrink-0" />
                            <p className="text-sm font-mono text-muted-foreground">
                              {location.lat.toFixed(6)}° {location.lat >= 0 ? "N" : "S"},{" "}
                              {Math.abs(location.lng).toFixed(6)}° {location.lng >= 0 ? "E" : "W"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center">
                            Click anywhere on the map to place a pin
                          </p>
                        )}
                      </div>
                    ) : (
                      /* ── GPS / Manual entry ── */
                      <div className="bg-card rounded-xl p-6 border border-border shadow-sm space-y-4">
                        {isLocating ? (
                          <div className="flex items-center gap-4 justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-muted-foreground">Detecting your location...</p>
                          </div>
                        ) : location ? (
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-6 h-6 text-success" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-success">Location Detected</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {location.lat.toFixed(6)}° {location.lat >= 0 ? "N" : "S"},{" "}
                                {Math.abs(location.lng).toFixed(6)}° {location.lng >= 0 ? "E" : "W"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary/80 gap-1"
                              onClick={detectLocation}
                            >
                              <LocateFixed className="w-4 h-4" />
                              Refresh
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {locationError && (
                              <p className="text-sm text-destructive">{locationError}</p>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={detectLocation}
                              className="gap-2"
                            >
                              <LocateFixed className="w-4 h-4" />
                              Detect My Location
                            </Button>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label htmlFor="lat" className="text-xs">Latitude</Label>
                                <Input
                                  id="lat"
                                  type="number"
                                  step="any"
                                  placeholder="e.g. 6.9271"
                                  onChange={(e) => {
                                    const lat = parseFloat(e.target.value);
                                    if (!isNaN(lat)) setLocation((prev) => ({ lat, lng: prev?.lng ?? 0 }));
                                  }}
                                  className="font-mono text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="lng" className="text-xs">Longitude</Label>
                                <Input
                                  id="lng"
                                  type="number"
                                  step="any"
                                  placeholder="e.g. 79.8612"
                                  onChange={(e) => {
                                    const lng = parseFloat(e.target.value);
                                    if (!isNaN(lng)) setLocation((prev) => ({ lat: prev?.lat ?? 0, lng }));
                                  }}
                                  className="font-mono text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Report Summary */}
                    <div className="bg-muted/30 rounded-xl p-6 border border-border/50 space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Report Summary</h3>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-muted-foreground">Waste Type</span>
                        <span className="font-medium capitalize">{selectedType || "—"}</span>
                        <span className="text-muted-foreground">Urgency</span>
                        <span className="font-medium capitalize">{selectedUrgency || "—"}</span>
                        <span className="text-muted-foreground">Photo</span>
                        <span className="font-medium">{imageFile ? imageFile.name : "—"}</span>
                        <span className="text-muted-foreground">Description</span>
                        <span className="font-medium truncate">{description || "—"}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Actions */}
              <div className="flex justify-between pt-6 border-t border-border/50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="gap-2 gradient-primary text-white shadow-glow"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2 gradient-primary text-white shadow-glow hover:shadow-glow-lg min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Report
                        <Upload className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReportWaste;
