import { useState, useMemo } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl } from "react-map-gl";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Filter, 
  Search, 
  Navigation, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Info,
  Layers,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "mapbox-gl/dist/mapbox-gl.css";

// Mock data (replace with API data later)
const REPORTS = [
  { id: 1, lat: 40.7128, lng: -74.0060, type: "Trash", status: "pending", severity: "high", address: "Central Park West" },
  { id: 2, lat: 40.7282, lng: -73.9942, type: "Hazard", status: "urgent", severity: "critical", address: "Broadway & E 4th" },
  { id: 3, lat: 40.7589, lng: -73.9851, type: "Recycling", status: "completed", severity: "low", address: "Times Square" },
  { id: 4, lat: 40.7061, lng: -74.0092, type: "Organic", status: "assigned", severity: "medium", address: "Wall St" },
];

const FILTER_TYPES = ["All", "Trash", "Hazard", "Recycling", "Organic"];
const MAPBOX_TOKEN = "pk.eyJ1IjoicHNhbnVrYTI3IiwiYSI6ImNtNXh4c3kxazF6aGEya3M5bXh6eW56Y3EifQ.Sfd0aGykX5ZJ4Xg9ud3jAA"; // Replace with user's token or env var

const MapView = () => {
  const [viewState, setViewState] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 13,
    bearing: 0,
    pitch: 0
  });
  const [selectedReport, setSelectedReport] = useState<typeof REPORTS[0] | null>(null);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const filteredReports = useMemo(() => {
    return REPORTS.filter(r => {
      const matchesType = filter === "All" || r.type === filter;
      const matchesSearch = r.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [filter, searchQuery]);

  const getMarkerColor = (status: string) => {
    switch (status) {
      case "urgent": return "text-destructive";
      case "pending": return "text-warning";
      case "completed": return "text-success";
      case "assigned": return "text-info";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Navbar />
      
      <main className="flex-1 relative pt-20 h-full">
        {/* Map Container */}
        <div className="absolute inset-0 z-0">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            attributionControl={false}
          >
            <GeolocateControl position="top-right" />
            <FullscreenControl position="top-right" />
            <NavigationControl position="top-right" />

            {filteredReports.map((report) => (
              <Marker
                key={report.id}
                latitude={report.lat}
                longitude={report.lng}
                anchor="bottom"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedReport(report);
                }}
              >
                <div className="relative group cursor-pointer transition-transform hover:scale-125 duration-200">
                  <div className={`absolute -inset-2 bg-gradient-to-t from-${getMarkerColor(report.status).split('-')[1]}/50 to-transparent blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <MapPin className={`w-8 h-8 ${getMarkerColor(report.status)} drop-shadow-md`} />
                  {report.status === 'urgent' && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                  )}
                </div>
              </Marker>
            ))}

            {selectedReport && (
              <Popup
                latitude={selectedReport.lat}
                longitude={selectedReport.lng}
                anchor="top"
                closeButton={false}
                onClose={() => setSelectedReport(null)}
                className="z-50"
              >
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                      {selectedReport.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">2m ago</span>
                  </div>
                  <h3 className="font-bold text-sm mb-1">{selectedReport.type} Issue</h3>
                  <p className="text-xs text-muted-foreground mb-2">{selectedReport.address}</p>
                  <Button size="sm" className="w-full h-7 text-xs gradient-primary text-white">
                    View Details
                  </Button>
                </div>
              </Popup>
            )}
          </Map>
        </div>

        {/* Floating Sidebar / Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-4 top-24 bottom-4 w-96 glass-premium rounded-3xl p-6 shadow-2xl z-10 flex flex-col gap-6 backdrop-blur-xl border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold">Live Reports</h2>
                  <p className="text-muted-foreground text-sm">Real-time waste monitoring</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Search & Filter */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    className="pl-9 bg-background/50 border-white/10"
                    placeholder="Search location..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {FILTER_TYPES.map(type => (
                    <Badge 
                      key={type}
                      variant={filter === type ? "default" : "outline"}
                      className={`cursor-pointer ${filter === type ? "gradient-primary border-transparent text-white" : "hover:bg-primary/10"}`}
                      onClick={() => setFilter(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {filteredReports.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <Info className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No reports found matching your filters.</p>
                    </div>
                ) : (
                    filteredReports.map(report => (
                    <motion.div
                        key={report.id}
                        layoutId={`report-${report.id}`}
                        onClick={() => {
                            setSelectedReport(report);
                            setViewState(prev => ({ ...prev, latitude: report.lat, longitude: report.lng, zoom: 16 }));
                        }}
                        className={`
                        p-4 rounded-xl border transition-all cursor-pointer group
                        ${selectedReport?.id === report.id 
                            ? "bg-primary/10 border-primary shadow-glow" 
                            : "bg-card/40 border-white/5 hover:bg-card/60 hover:border-white/20"
                        }
                        `}
                    >
                        <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${report.status === 'urgent' ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
                            <span className="font-semibold text-sm">{report.type}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5">
                            {report.status}
                        </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" />
                        {report.address}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 2h ago</span>
                            <span className="group-hover:text-primary transition-colors flex items-center gap-1">View <Navigation className="w-3 h-3" /></span>
                        </div>
                    </motion.div>
                    ))
                )}
              </div>

              <div className="pt-4 border-t border-white/10">
                 <Button className="w-full gradient-primary text-white shadow-glow">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Issue Here
                 </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Sidebar Button */}
        {!isSidebarOpen && (
             <Button 
                onClick={() => setSidebarOpen(true)}
                className="absolute left-4 top-24 gradient-primary text-white shadow-glow z-10 rounded-full w-12 h-12 p-0"
            >
                <Layers className="w-6 h-6" />
             </Button>
        )}
      </main>
    </div>
  );
};

export default MapView;
