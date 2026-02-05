import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Calendar,
} from "lucide-react";

const stats = [
  { label: "Total Reports", value: "2,547", change: "+12%", trend: "up", icon: MapPin },
  { label: "Active Volunteers", value: "523", change: "+8%", trend: "up", icon: Users },
  { label: "Cleanups Completed", value: "1,893", change: "+24%", trend: "up", icon: CheckCircle },
  { label: "Avg. Response Time", value: "4.2h", change: "-18%", trend: "down", icon: Clock },
];

const recentActivity = [
  { type: "report", message: "New waste report in Central Park", time: "5 min ago", status: "pending" },
  { type: "cleanup", message: "Cleanup completed at Main Street", time: "15 min ago", status: "completed" },
  { type: "assignment", message: "Task assigned to Volunteer Team A", time: "1 hour ago", status: "assigned" },
  { type: "report", message: "New hazardous waste report - Oak Avenue", time: "2 hours ago", status: "urgent" },
  { type: "cleanup", message: "Beach cleanup verified and approved", time: "3 hours ago", status: "completed" },
];

const statusStyles = {
  pending: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  assigned: "bg-info/10 text-info",
  urgent: "bg-destructive/10 text-destructive",
};

const Dashboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold mb-2">Dashboard</h1>
                <p className="text-muted-foreground">
                  Overview of community cleanup activities and reports.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Last 30 Days
                </Button>
                <Button variant="hero" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Export Report
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-elevated transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge
                      variant="outline"
                      className={`${
                        stat.trend === "up" ? "text-success border-success/30" : "text-info border-info/30"
                      }`}
                    >
                      <TrendingUp className={`w-3 h-3 mr-1 ${stat.trend === "down" ? "rotate-180" : ""}`} />
                      {stat.change}
                    </Badge>
                  </div>
                  <p className="font-display text-3xl font-bold mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 bg-card rounded-2xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold">Report Trends</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Weekly</Button>
                  <Button variant="secondary" size="sm">Monthly</Button>
                  <Button variant="ghost" size="sm">Yearly</Button>
                </div>
              </div>
              
              {/* Placeholder Chart */}
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-xl">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Connect Lovable Cloud to view real-time analytics
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card rounded-2xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold">Recent Activity</h2>
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </div>

              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${statusStyles[activity.status as keyof typeof statusStyles]}`}>
                      {activity.status === "completed" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : activity.status === "urgent" ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Map Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 bg-card rounded-2xl border border-border p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold">Active Reports Map</h2>
              <Button variant="outline" size="sm" className="gap-1">
                <MapPin className="w-4 h-4" />
                Full Map View
              </Button>
            </div>

            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-xl">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Interactive map showing all active waste reports
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
