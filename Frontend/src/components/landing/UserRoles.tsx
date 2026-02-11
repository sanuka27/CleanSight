import { motion } from "framer-motion";
import { memo } from "react";
import { User, HeartHandshake, Building2, ShieldCheck } from "lucide-react";

const roles = [
  {
    icon: User,
    title: "Citizens",
    description: "Report waste issues in your neighborhood, track the status of your reports, and see community impact.",
    features: ["Submit photo reports", "GPS location tagging", "Track report status", "View cleanup history"],
    color: "bg-info/10",
    iconColor: "text-info",
  },
  {
    icon: HeartHandshake,
    title: "Volunteers",
    description: "Accept cleanup tasks, coordinate with teams, and upload proof-of-cleanup photos to earn recognition.",
    features: ["Browse available tasks", "Accept assignments", "Upload proof photos", "Track contributions"],
    color: "bg-success/10",
    iconColor: "text-success",
  },
  {
    icon: Building2,
    title: "Municipal Staff",
    description: "Manage reports, assign tasks to volunteers or crews, and monitor cleanup progress across the city.",
    features: ["Manage all reports", "Assign tasks", "Monitor progress", "Generate reports"],
    color: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    icon: ShieldCheck,
    title: "Administrators",
    description: "Full system access with analytics, user management, and performance monitoring capabilities.",
    features: ["System analytics", "User management", "Performance metrics", "Configuration"],
    color: "bg-primary/10",
    iconColor: "text-primary",
  },
];

export const UserRoles = memo(function UserRoles() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ willChange: "auto" }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Built for Everyone
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you're a concerned citizen, dedicated volunteer, or municipal manager,
            CleanSight has tools designed for your role.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
                style={{ willChange: "auto" }}
              >
                <div className="h-full bg-card rounded-2xl p-6 border border-border hover:shadow-elevated transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl ${role.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-7 h-7 ${role.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl font-semibold mb-2">
                        {role.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {role.description}
                      </p>
                      <ul className="grid grid-cols-2 gap-2">
                        {role.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
