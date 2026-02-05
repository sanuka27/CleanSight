import { useState } from "react";
import { motion } from "framer-motion";
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
  Recycle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const wasteTypes = [
  { id: "general", label: "General Waste", icon: Trash2 },
  { id: "recyclable", label: "Recyclables", icon: Recycle },
  { id: "organic", label: "Organic/Garden", icon: Leaf },
  { id: "construction", label: "Construction", icon: Building2 },
];

const urgencyLevels = [
  { id: "low", label: "Low", color: "bg-success/10 text-success border-success/30" },
  { id: "medium", label: "Medium", color: "bg-warning/10 text-warning border-warning/30" },
  { id: "high", label: "High", color: "bg-destructive/10 text-destructive border-destructive/30" },
];

const ReportWaste = () => {
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
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Report Submitted!",
      description: "Your waste report has been submitted and will be reviewed shortly.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Report Waste
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Help keep your community clean by reporting garbage or illegal dumping.
              Our AI will verify your report and GPS will tag the location.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* Image Upload */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Upload Photo</Label>
                <div className="relative">
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
                      block w-full aspect-video rounded-2xl border-2 border-dashed cursor-pointer transition-all
                      ${imagePreview ? "border-primary/50" : "border-border hover:border-primary/30"}
                      ${!imagePreview && "bg-muted/50 hover:bg-muted"}
                    `}
                  >
                    {imagePreview ? (
                      <div className="relative h-full">
                        <img
                          src={imagePreview}
                          alt="Uploaded preview"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {/* AI Analysis Overlay */}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <div className="text-center">
                              <Sparkles className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
                              <p className="text-sm font-medium">Analyzing image...</p>
                            </div>
                          </div>
                        )}
                        {analysisResult && (
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className={`glass-strong rounded-lg p-3 flex items-center gap-3 ${analysisResult.detected ? "border-success/30" : "border-destructive/30"} border`}>
                              {analysisResult.detected ? (
                                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {analysisResult.detected ? "Waste Detected" : "No Waste Detected"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Confidence: {Math.round(analysisResult.confidence * 100)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Camera className="w-8 h-8 text-primary" />
                        </div>
                        <p className="font-medium text-sm mb-1">Click to upload photo</p>
                        <p className="text-xs text-muted-foreground">or drag and drop</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Location</Label>
                <div className="bg-muted/50 rounded-2xl p-6 border border-border h-[calc(100%-2rem)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">GPS Location</p>
                      <p className="text-xs text-muted-foreground">Automatically detected</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Latitude</span>
                      <span className="font-mono">40.7128° N</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Longitude</span>
                      <span className="font-mono">74.0060° W</span>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <Input placeholder="Add address details (optional)" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Waste Type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4"
            >
              <Label className="text-base font-semibold">Waste Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {wasteTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`
                        p-4 rounded-xl border-2 text-center transition-all
                        ${isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                        }
                      `}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <p className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                        {type.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Urgency */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-4"
            >
              <Label className="text-base font-semibold">Urgency Level</Label>
              <div className="flex gap-3">
                {urgencyLevels.map((level) => {
                  const isSelected = selectedUrgency === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setSelectedUrgency(level.id)}
                      className={`
                        px-6 py-3 rounded-xl border-2 font-medium transition-all
                        ${isSelected ? level.color : "border-border hover:border-primary/30"}
                      `}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-4"
            >
              <Label className="text-base font-semibold">Description (Optional)</Label>
              <Textarea
                placeholder="Provide additional details about the waste..."
                className="min-h-[100px] resize-none"
              />
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex justify-end gap-4"
            >
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
              <Button type="submit" variant="hero" size="lg" className="gap-2">
                <Upload className="w-4 h-4" />
                Submit Report
              </Button>
            </motion.div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReportWaste;
