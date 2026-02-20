import { Leaf, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getUserRole } from "@/lib/role";
import { useToast } from "@/hooks/use-toast";
import {
  PLATFORM_LINKS,
  COMPANY_FOOTER_LINKS,
  SUPPORT_LINKS,
  canSeeFooterLink,
} from "@/constants/footerLinks";
import { useState, type FormEvent, useMemo } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = "cleansight_newsletter_email";

export function Footer() {
  const { isAuthenticated, appUser } = useAuth();
  const role = appUser ? getUserRole(appUser) : undefined;
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  /** Only show platform links the current user is allowed to access. */
  const visiblePlatformLinks = useMemo(
    () => PLATFORM_LINKS.filter((l) => canSeeFooterLink(l, isAuthenticated, role)),
    [isAuthenticated, role],
  );

  const handleNewsletter = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setEmailError("Please enter your email.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, trimmed);
    setEmail("");
    setEmailError(null);
    toast({
      title: "Thanks! You're subscribed.",
      description: "We'll keep you posted on community cleanups and new features.",
    });
  };

  return (
    <footer className="relative bg-card border-t border-border/50 pt-16 pb-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-xl font-bold">
                Clean<span className="text-gradient">Sight</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Empowering communities to create cleaner, safer environments through technology and collaboration.
            </p>
          </div>

          {/* Platform links (auth-aware) */}
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {visiblePlatformLinks.length > 0 ? (
                visiblePlatformLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                /* Guest fallback — still show a sign-in nudge */
                <li>
                  <Link
                    to="/login"
                    className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    Sign in to explore
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Company + Support */}
          <div className="space-y-8">
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {COMPANY_FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {SUPPORT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div>
             <h4 className="font-semibold mb-4">Stay Updated</h4>
             <p className="text-sm text-muted-foreground mb-4">
               Get the latest updates on community cleanups and features.
             </p>
             <form onSubmit={handleNewsletter} noValidate className="flex flex-col gap-2">
               <div className="flex gap-2">
                 <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "newsletter-err" : undefined}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                 />
                 <button
                   type="submit"
                   className="gradient-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                 >
                    Join
                 </button>
               </div>
               {emailError && (
                 <p id="newsletter-err" className="text-destructive text-xs">
                   {emailError}
                 </p>
               )}
             </form>
          </div>
        </div>

        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 CleanSight. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-destructive fill-destructive" /> by the Community
          </p>
        </div>
      </div>
    </footer>
  );
}
