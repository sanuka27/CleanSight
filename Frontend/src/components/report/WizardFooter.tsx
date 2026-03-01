import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, Loader2 } from "lucide-react";
import { steps } from "./constants";

interface WizardFooterProps {
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}

export function WizardFooter({
  currentStep,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  canSubmit,
}: WizardFooterProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border/50">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={currentStep === 1}
        className="gap-1.5 h-9"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {currentStep < steps[steps.length - 1].id ? (
        <Button
          type="button"
          size="sm"
          onClick={onNext}
          className="gap-1.5 h-9 gradient-primary text-white shadow-glow"
        >
          Next Step
          <ArrowRight className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={isSubmitting || !canSubmit}
          onClick={onSubmit}
          className="gap-1.5 h-9 gradient-primary text-white shadow-glow hover:shadow-glow-lg min-w-[130px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
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
  );
}
