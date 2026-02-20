import { CheckCircle } from "lucide-react";
import { SELECTABLE_ROLES } from "@/constants/roles";
import type { AppRole } from "@/lib/role";

interface RoleSelectorProps {
  /** Currently selected role id. */
  value: string;
  /** Fired when the user taps a role card. */
  onChange: (role: AppRole) => void;
}

/**
 * Reusable Citizen / Volunteer role picker cards.
 *
 * Used on both the Signup page and the post-Google-login onboarding page
 * so the UI stays identical.
 */
export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SELECTABLE_ROLES.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onChange(role.id)}
          className={`
            p-4 rounded-xl border-2 text-left transition-all
            ${value === role.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30"
            }
          `}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`font-medium ${value === role.id ? "text-primary" : ""}`}>
              {role.label}
            </span>
            {value === role.id && (
              <CheckCircle className="w-4 h-4 text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{role.description}</p>
        </button>
      ))}
    </div>
  );
}
