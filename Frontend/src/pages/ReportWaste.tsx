import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  Leaf,
  Building2,
  Recycle,
  ArrowRight,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";

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

const ReportWaste = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ detected: boolean; confidence: number } | null>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
        simulateAIAnalysis();
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateAIAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult({
        detected: true,
        confidence: 0.94,
      });
      // Auto advance after analysis
      setTimeout(() => setCurrentStep(2), 1000);
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Report Submitted!",
      description: "Your waste report has been submitted and will be reviewed shortly.",
    });
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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
                            {/* AI Analysis Overlay */}
                            <AnimatePresence>
                              {isAnalyzing && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center"
                                >
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                    <Sparkles className="w-12 h-12 text-primary animate-spin-slow relative z-10" />
                                  </div>
                                  <p className="text-lg font-medium mt-4 animate-pulse">Analyzing waste type...</p>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {analysisResult && (
                              <motion.div 
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute bottom-4 left-4 right-4"
                              >
                                <div className={`glass-strong rounded-xl p-4 flex items-center gap-4 ${analysisResult.detected ? "border-success/50" : "border-destructive/50"} border`}>
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${analysisResult.detected ? "bg-success/20" : "bg-destructive/20"}`}>
                                    {analysisResult.detected ? (
                                      <CheckCircle className="w-6 h-6 text-success" />
                                    ) : (
                                      <AlertCircle className="w-6 h-6 text-destructive" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-lg font-bold">
                                      {analysisResult.detected ? "Waste Detected" : "No Waste Detected"}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-primary rounded-full"
                                          style={{ width: `${analysisResult.confidence * 100}%` }}
                                        />
                                      </div>
                                      <p className="text-sm font-mono text-muted-foreground">
                                        {Math.round(analysisResult.confidence * 100)}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
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
                      <p className="text-muted-foreground">Pinpoint the exact spot</p>
                    </div>

                    <div className="aspect-video rounded-2xl bg-muted/30 border border-border/50 relative overflow-hidden group">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <MapPin className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-muted-foreground">Map interactive preview</p>
                        </div>
                      </div>
                      
                      {/* Fake Map Grid */}
                      <div className="absolute inset-0 opacity-10" 
                        style={{
                           backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                           backgroundSize: '40px 40px'
                        }}
                      />
                    </div>

                    <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                         <p className="font-medium">Detected Location</p>
                         <p className="text-sm text-muted-foreground font-mono">40.7128° N, 74.0060° W</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        Adjust
                      </Button>
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
                    className="gap-2 gradient-primary text-white shadow-glow hover:shadow-glow-lg min-w-[140px]"
                  >
                    Submit Report
                    <Upload className="w-4 h-4" />
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
