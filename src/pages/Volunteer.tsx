import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HeartHandshake,
  MapPin,
  Clock,
  Users,
  Star,
  ArrowRight,
  Trash2,
  CheckCircle,
  Calendar,
} from "lucide-react";

const availableTasks = [
  {
    id: 1,
    title: "Park Cleanup Drive",
    location: "Central Park - North Section",
    distance: "1.2 km away",
    urgency: "medium",
    volunteers: 3,
    maxVolunteers: 5,
    estimatedTime: "2 hours",
    date: "Tomorrow, 9:00 AM",
  },
  {
    id: 2,
    title: "Beach Waste Collection",
    location: "Sunset Beach - East Side",
    distance: "3.5 km away",
    urgency: "high",
    volunteers: 7,
    maxVolunteers: 10,
    estimatedTime: "3 hours",
    date: "Saturday, 8:00 AM",
  },
  {
    id: 3,
    title: "Street Cleanup",
    location: "Main Street - Downtown",
    distance: "0.8 km away",
    urgency: "low",
    volunteers: 2,
    maxVolunteers: 4,
    estimatedTime: "1.5 hours",
    date: "Sunday, 10:00 AM",
  },
];

const urgencyColors = {
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};

const achievements = [
  { icon: Trash2, label: "Cleanups Joined", value: "0" },
  { icon: Clock, label: "Hours Volunteered", value: "0" },
  { icon: Star, label: "Impact Points", value: "0" },
];

const Volunteer = () => {
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
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <HeartHandshake className="w-4 h-4" />
              <span className="text-sm font-medium">Volunteer Hub</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Make an Impact in Your Community
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join cleanup events, earn recognition, and help transform your neighborhood.
              Every action counts toward a cleaner environment.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Available Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold">Available Tasks</h2>
                <Button variant="outline" size="sm" className="gap-2">
                  <MapPin className="w-4 h-4" />
                  Near Me
                </Button>
              </div>

              <div className="space-y-4">
                {availableTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-card rounded-2xl border border-border p-6 hover:shadow-elevated transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-display text-lg font-semibold">
                            {task.title}
                          </h3>
                          <Badge variant="outline" className={urgencyColors[task.urgency as keyof typeof urgencyColors]}>
                            {task.urgency} priority
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{task.location}</span>
                            <span className="text-primary">• {task.distance}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{task.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>~{task.estimatedTime}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              <span className="font-medium">{task.volunteers}</span>
                              <span className="text-muted-foreground">/{task.maxVolunteers} volunteers</span>
                            </span>
                            <div className="ml-2 h-2 w-24 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(task.volunteers / task.maxVolunteers) * 100}%` }}
                              />
                            </div>
                          </div>
                          <Button variant="hero" size="sm" className="gap-2">
                            Join Task
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Button variant="outline" className="gap-2">
                  Load More Tasks
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Volunteer Card */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <HeartHandshake className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-1">
                    Become a Volunteer
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sign up to join cleanup events and make a difference.
                  </p>
                </div>

                <Link to="/signup">
                  <Button variant="hero" className="w-full gap-2">
                    Sign Up Now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-display font-semibold mb-4">Your Impact</h3>
                <div className="space-y-4">
                  {achievements.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="font-display text-xl font-bold">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-secondary/50 rounded-2xl p-6">
                <h3 className="font-display font-semibold mb-4">Volunteer Tips</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Bring gloves and wear appropriate footwear</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Take before and after photos for verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Work in groups for safety and efficiency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Separate recyclables when possible</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Volunteer;
