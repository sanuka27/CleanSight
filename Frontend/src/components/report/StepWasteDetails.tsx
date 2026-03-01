import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { wasteTypes, urgencyLevels } from "./constants";

interface StepWasteDetailsProps {
  selectedType: string | null;
  onSelectType: (id: string) => void;
  selectedUrgency: string | null;
  onSelectUrgency: (id: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function StepWasteDetails({
  selectedType,
  onSelectType,
  selectedUrgency,
  onSelectUrgency,
  description,
  onDescriptionChange,
}: StepWasteDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold font-display">Waste Details</h2>
        <span className="text-xs text-muted-foreground">Categorize for faster cleanup</span>
      </div>

      {/* Category grid (2×2 / 4-col) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Waste type">
        {wasteTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectType(type.id)}
              className={`relative p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg ${type.bg} mx-auto mb-1.5 flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${type.color}`} />
              </div>
              <p
                className={`text-xs font-medium leading-tight ${
                  isSelected ? "text-primary font-bold" : "text-foreground"
                }`}
              >
                {type.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Urgency — segmented buttons */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Urgency Level</Label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Urgency level">
          {urgencyLevels.map((level) => {
            const isSelected = selectedUrgency === level.id;
            return (
              <button
                key={level.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectUrgency(level.id)}
                className={`p-2.5 rounded-lg border-2 text-center transition-all duration-200 ${
                  isSelected ? level.color : "border-border hover:border-primary/30"
                }`}
              >
                <span className="text-sm font-bold block">{level.label}</span>
                <span className="text-[10px] opacity-80 leading-none">{level.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description (required) */}
      <div className="space-y-1">
        <Label className="text-sm font-semibold">Description</Label>
        <Textarea
          placeholder="Context about the location or waste..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="rounded-lg border-border/50 focus:border-primary/50 focus:ring-primary/20 resize-y text-sm"
          style={{ maxHeight: 120 }}
        />
      </div>
    </div>
  );
}
