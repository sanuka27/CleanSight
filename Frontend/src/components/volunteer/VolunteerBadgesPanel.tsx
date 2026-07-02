import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Lock,
  Medal,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VolunteerBadge, VolunteerBadgeDefinition } from "@/types/dashboard";

const badgeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  sparkles: Sparkles,
  "hand-heart": HandHeart,
  medal: Medal,
  "shield-check": ShieldCheck,
  trophy: Trophy,
};

const badgeShapes: Record<
  string,
  { frame: string; icon: string; label: string }
> = {
  first_cleanup: { frame: "rounded-full", icon: "", label: "Circle" },
  cleanup_5: { frame: "rounded-none", icon: "", label: "Square" },
  cleanup_10: { frame: "rounded-xl", icon: "", label: "Soft Square" },
  cleanup_25: { frame: "rounded-none rotate-45", icon: "-rotate-45", label: "Diamond" },
  cleanup_50: { frame: "rounded-full ring-2 ring-primary/30", icon: "", label: "Halo" },
  cleanup_75: { frame: "rounded-2xl", icon: "", label: "Shield" },
  cleanup_100: { frame: "rounded-none", icon: "", label: "Square" },
  cleanup_150: { frame: "rounded-xl", icon: "", label: "Soft Square" },
  cleanup_200: { frame: "rounded-none rotate-45", icon: "-rotate-45", label: "Diamond" },
  cleanup_300: { frame: "rounded-full ring-2 ring-emerald-400/30", icon: "", label: "Halo" },
};

function formatEarnedDate(earnedAt?: string) {
  if (!earnedAt) return null;
  const date = new Date(earnedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function badgeKey(badge: { id?: string; name?: string }) {
  return badge.id || badge.name || "";
}

function criteriaLabel(criteria?: VolunteerBadgeDefinition["criteria"] | null) {
  if (!criteria) return null;
  if (criteria.totalCleanups) {
    return `Unlock at ${criteria.totalCleanups} cleanups`;
  }
  if (criteria.reportsResolved) {
    return `Unlock at ${criteria.reportsResolved} resolved reports`;
  }
  return null;
}

interface VolunteerBadgesPanelProps {
  badges: VolunteerBadge[];
  catalog: VolunteerBadgeDefinition[];
  totalCleanups: number;
  isLoading: boolean;
}

export function VolunteerBadgesPanel({
  badges,
  catalog,
  totalCleanups,
  isLoading,
}: VolunteerBadgesPanelProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sortedBadges = [...badges].sort((a, b) => {
    const aTime = new Date(a.earnedAt).getTime();
    const bTime = new Date(b.earnedAt).getTime();
    return bTime - aTime;
  });

  const earnedMap = new Map(
    sortedBadges.map((badge) => [badgeKey(badge), badge])
  );

  const effectiveCatalog =
    catalog.length > 0
      ? catalog
      : sortedBadges.map((badge) => ({
          id: badgeKey(badge),
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          criteria: null,
        }));

  const unlockedCount = effectiveCatalog.filter((badge) =>
    earnedMap.has(badge.id)
  ).length;

  const latestBadge = sortedBadges[0];
  const latestDate = formatEarnedDate(latestBadge?.earnedAt);

  const handleScroll = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const amount = Math.max(240, scroller.clientWidth * 0.75);
    scroller.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl border border-white/8 p-5">
        <div className="h-5 w-32 bg-muted/30 rounded mb-4" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-premium rounded-2xl border border-white/8 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl font-bold">Badge Case</h2>
          <p className="text-xs text-muted-foreground">
            {badges.length > 0
              ? "Every cleanup counts toward your next achievement."
              : "Complete your first cleanup to unlock a badge."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {totalCleanups} cleanups
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Unlocked {unlockedCount}/{effectiveCatalog.length}
          </Badge>
          {latestBadge && (
            <Badge variant="secondary" className="text-xs">
              Latest: {latestBadge.name}
              {latestDate ? ` (${latestDate})` : ""}
            </Badge>
          )}
          {effectiveCatalog.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => handleScroll(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => handleScroll(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {effectiveCatalog.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-background/40 p-4 text-sm text-muted-foreground">
          Accept a nearby task and mark it resolved to earn your first badge.
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
          >
            {effectiveCatalog.map((badge, index) => {
              const earnedBadge = earnedMap.get(badge.id);
              const isUnlocked = !!earnedBadge;
              const Icon = badgeIcons[badge.icon] || Award;
              const shape = badgeShapes[badge.id] || {
                frame: "rounded-2xl",
                icon: "",
                label: "Badge",
              };
              const criteriaText = criteriaLabel(badge.criteria);
              const requiredCleanups = badge.criteria?.totalCleanups ?? null;
              const progress = requiredCleanups
                ? Math.min(totalCleanups / requiredCleanups, 1)
                : null;

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className={`min-w-[230px] max-w-[260px] snap-start rounded-2xl border p-4 flex gap-4 relative overflow-hidden ${
                    isUnlocked
                      ? "border-amber-400/60 bg-gradient-to-br from-amber-200/80 via-amber-100/60 to-transparent"
                      : "border-white/10 bg-muted/30"
                  }`}
                >
                  {isUnlocked && (
                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-amber-300/40 blur-2xl" />
                  )}
                  <div
                    className={`h-12 w-12 flex items-center justify-center ${shape.frame} ${
                      isUnlocked
                        ? "bg-amber-300/50 ring-1 ring-amber-400/70"
                        : "bg-muted/40 ring-1 ring-white/10"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${shape.icon} ${
                        isUnlocked
                          ? "text-amber-900"
                          : "text-muted-foreground/70"
                      }`}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">
                        {badge.name}
                      </p>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-[11px] font-semibold tracking-wide shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          Achieved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 text-muted-foreground px-2 py-0.5 text-[11px] font-semibold tracking-wide shrink-0">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-muted-foreground/70">
                        {shape.label}
                      </span>
                      {isUnlocked && earnedBadge?.earnedAt && (
                        <span className="text-[11px] text-amber-800">
                          Earned {formatEarnedDate(earnedBadge.earnedAt)}
                        </span>
                      )}
                      {!isUnlocked && criteriaText && (
                        <span className="text-[11px] text-muted-foreground/70">
                          {criteriaText}
                        </span>
                      )}
                    </div>
                    {!isUnlocked && requiredCleanups && progress !== null && (
                      <div className="pt-1.5">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                          <span>Progress</span>
                          <span>
                            {Math.min(totalCleanups, requiredCleanups)}/{requiredCleanups}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-muted-foreground/70"
                            style={{ width: `${Math.round(progress * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
