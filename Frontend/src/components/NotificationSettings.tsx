/**
 * NotificationSettings component
 *
 * Shows a card with:
 *  - Push notification toggle (with browser permission prompt)
 *  - Email notification toggle
 *
 * Plug this into any settings/profile page:
 *   import NotificationSettings from '@/components/NotificationSettings';
 *   <NotificationSettings />
 */

import { Bell, BellOff, Mail, MailX, Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/context/useAuth';

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

function ToggleRow({ icon, label, description, checked, disabled, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {/* Native-style toggle switch */}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
          'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-input',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0',
            'transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export default function NotificationSettings() {
  const { isAuthenticated } = useAuth();
  const { permissionGranted, isLoading, preferences, enablePush, updatePreference } =
    useNotifications(isAuthenticated);

  const handlePushToggle = () => {
    if (!permissionGranted && !preferences.push) {
      // First time — request browser permission
      enablePush();
    } else {
      // Already permitted — just toggle the backend preference
      updatePreference('push', !preferences.push);
    }
  };

  const browserDenied =
    typeof Notification !== 'undefined' && Notification.permission === 'denied';

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Notifications</h3>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Get notified when your reports are reviewed, assigned to a volunteer, or resolved.
      </p>

      <div className="divide-y divide-border">
        {/* Push notifications */}
        <ToggleRow
          icon={
            preferences.push && permissionGranted ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )
          }
          label={isLoading ? 'Enabling…' : 'Push notifications'}
          description={
            browserDenied
              ? 'Blocked in browser settings. Enable notifications in your browser to use this.'
              : permissionGranted
              ? 'Receive live alerts in this browser.'
              : 'Click to enable push notifications in this browser.'
          }
          checked={preferences.push && permissionGranted}
          disabled={isLoading || browserDenied}
          onToggle={handlePushToggle}
        />

        {/* Email notifications */}
        <ToggleRow
          icon={
            preferences.email ? (
              <Mail className="h-4 w-4" />
            ) : (
              <MailX className="h-4 w-4" />
            )
          }
          label="Email notifications"
          description="Receive status update emails at your registered address."
          checked={preferences.email}
          onToggle={() => updatePreference('email', !preferences.email)}
        />
      </div>

      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Setting up push notifications…
        </div>
      )}

      {browserDenied && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Push notifications are blocked. Go to your browser settings → Notifications → allow this
          site.
        </p>
      )}
    </div>
  );
}
