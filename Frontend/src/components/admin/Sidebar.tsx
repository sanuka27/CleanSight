import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MapPin,
  Users,
  PieChart,
  FileText,
  Settings,
  LogOut,
  ClipboardList,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { path: "/dashboard/admin", label: "Overview", icon: Home, end: true },
  { path: "/dashboard/admin/reports", label: "Reports", icon: MapPin },
  { path: "/dashboard/admin/volunteers", label: "Volunteers", icon: Users },
  { path: "/dashboard/admin/users", label: "Users", icon: UserCog },
  { path: "/dashboard/admin/analytics", label: "Analytics", icon: PieChart },
  { path: "/dashboard/admin/documents", label: "Documents", icon: FileText },
  { path: "/dashboard/admin/audit-log", label: "Audit Log", icon: ClipboardList },
  { path: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ collapsed, onToggle }: SidebarProps) {
  const { logout, appUser } = useAuth();
  const location = useLocation();

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.end) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col bg-card border-r border-border/60 overflow-hidden shrink-0"
      style={{ height: "100%", position: "sticky", top: 0 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border/60 min-h-[72px]">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">CS</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="font-bold text-base leading-tight">CleanSight</p>
              <p className="text-[11px] text-muted-foreground">Admin Panel</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <NavLink key={item.path} to={item.path} end={item.end} onClick={() => { if (collapsed) onToggle(); }}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-medium text-sm whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && !collapsed && (
                  <motion.div
                    layoutId="active-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/80"
                  />
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Profile + sign out */}
      <div className="border-t border-border/60 p-2 space-y-1">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {appUser?.name?.[0]?.toUpperCase() || "A"}
            </span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden min-w-0"
              >
                <p className="text-sm font-medium truncate">{appUser?.name || "Admin"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{appUser?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle — now rendered in AdminLayout so it isn't clipped */}
    </motion.aside>
  );
}
