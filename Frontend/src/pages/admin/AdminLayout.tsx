import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminSidebar } from "@/components/admin/Sidebar";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = () => setCollapsed((c) => !c);

  useEffect(() => {
    // Warm admin route chunks to avoid full-page loading flashes on nav.
    void Promise.allSettled([
      import("./Overview"),
      import("./Reports"),
      import("./AdminMapView"),
      import("./Volunteers"),
      import("./Users"),
      import("./Analytics"),
      import("./MLAnalytics"),
      import("./Documents"),
      import("./AuditLog"),
      import("./Settings"),
    ]);
  }, []);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sticky sidebar wrapper — overflow-visible so the toggle button can bleed out */}
      <div
        className="relative hidden lg:flex shrink-0 sticky top-0 h-screen"
        style={{ width: collapsed ? 72 : 240, transition: "width 0.25s ease" }}
      >
        <AdminSidebar collapsed={collapsed} onToggle={toggle} />

        {/* Toggle button lives here so it isn't clipped by the aside's overflow-hidden */}
        <button
          onClick={toggle}
          className="absolute -right-3.5 top-[84px] z-50 w-7 h-7 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Main scroll area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
