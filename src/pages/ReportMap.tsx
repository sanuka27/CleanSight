import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Filter, 
  Search, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  Trash2,
  Layers
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Mock data for reports
const mockReports = [
  { id: 1, title: "Illegal Dumping - Park Area", status: "pending", type: "hazardous", location: "Central Park", date: "2 hours ago" },
  { id: 2, title: "Overflowing Trash Bin", status: "assigned", type: "general", location: "Main Street", date: "4 hours ago" },
  { id: 3, title: "Construction Debris", status: "completed", type: "construction", location: "Oak Avenue", date: "1 day ago" },
  { id: 4, title: "Plastic Waste on Beach", status: "pending", type: "recyclable", location: "Sunset Beach", date: "3 hours ago" },
  { id: 5, title: "Garden Waste Pile", status: "assigned", type: "organic", location: "Green Lane", date: "6 hours ago" },
];

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-info/10 text-info border-info/20",
  completed: "bg-success/10 text-success border-success/20",
};

const statusIcons = {
  pending: AlertCircle,
  assigned: Clock,
  completed: CheckCircle,
};

const ReportMap = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)] flex">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full md:w-96 bg-card border-r border-border overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h1 className="font-display text-xl font-bold mb-4">Report Map</h1>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" className="gap-1">
                  <Filter className="w-3 h-3" />
                  All Status
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Trash2 className="w-3 h-3" />
                  Type
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Layers className="w-3 h-3" />
                  Urgency
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 bg-secondary/50 border-b border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-display text-xl font-bold text-warning">12</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-info">8</p>
                  <p className="text-xs text-muted-foreground">Assigned</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-success">156</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>

            {/* Report List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mockReports.map((report) => {
                const StatusIcon = statusIcons[report.status as keyof typeof statusIcons];
                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-background rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm line-clamp-1">{report.title}</h3>
                      <Badge variant="outline" className={statusColors[report.status as keyof typeof statusColors]}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {report.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {report.location}
                      <span className="mx-1">•</span>
                      {report.date}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.aside>

          {/* Map Area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:flex flex-1 items-center justify-center bg-muted relative"
          >
            {/* Placeholder for map */}
            <div className="text-center p-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Interactive Map</h2>
              <p className="text-muted-foreground max-w-md">
                Connect Lovable Cloud to enable the interactive map with real-time waste report markers.
              </p>
              <Button variant="hero" className="mt-6">
                Enable Map Integration
              </Button>
            </div>

            {/* Map Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <Button variant="secondary" size="icon" className="shadow-elevated">
                <span className="text-lg font-bold">+</span>
              </Button>
              <Button variant="secondary" size="icon" className="shadow-elevated">
                <span className="text-lg font-bold">−</span>
              </Button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 glass-strong rounded-xl p-4">
              <h4 className="font-medium text-sm mb-3">Legend</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span>Pending Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-info" />
                  <span>Assigned Tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Completed</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ReportMap;
