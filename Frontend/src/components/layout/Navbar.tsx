import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, Leaf, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { getUserRole } from "@/lib/role";
import { NAV_LINKS, canSeeNavLink } from "@/constants/roles";
import { PendingQueueBadge } from "@/components/pwa/PendingQueueBadge";
import { usePWA } from "@/context/PWAContext";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const rafRef = useRef<number | null>(null);

  const { isAuthenticated, isLoading, appUser, isAppUserLoading, logout } = useAuth();
  const role = appUser ? getUserRole(appUser) : undefined;
  const { pendingCount } = usePWA();

  /** Filter nav links based on auth state + role. */
  const visibleLinks = useMemo(
    () => NAV_LINKS.filter((link) => canSeeNavLink(link, isAuthenticated, role)),
    [isAuthenticated, role],
  );

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      setScrolled(window.scrollY > 20);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? "py-2" 
            : "py-4"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="container mx-auto px-4">
          <motion.nav 
            className={`relative flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-500 ${
              scrolled 
                ? "bg-background border border-border shadow-lg" 
                : "bg-background border border-border shadow-md"
            }`}
          >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div 
                className="relative w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Leaf className="w-5 h-5 text-white relative z-10" />
                {/* Shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              </motion.div>
              <span className="font-display text-xl font-bold">
                Clean<span className="text-gradient">Sight</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1 bg-muted rounded-xl p-1.5">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                const isReportLink = link.href === "/report";
                
                return (
                  <Link key={link.href} to={link.href}>
                    <motion.div
                      className={`relative px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        isActive 
                          ? "text-white gradient-primary rounded-lg shadow-glow" 
                          : "text-foreground hover:text-primary"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <span className="relative">
                          <Icon className="w-4 h-4" />
                          {isReportLink && <PendingQueueBadge count={pendingCount} />}
                        </span>
                        {link.label}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {isLoading || isAppUserLoading ? (
                /* Tiny skeleton while auth resolves — prevents layout shift */
                <div className="w-20 h-9 rounded-lg bg-muted/50 animate-pulse" />
              ) : isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium transition-transform hover:scale-[1.02] active:scale-[0.98] gap-2"
                  onClick={() => void logout()}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button 
                      size="sm" 
                      className="gradient-primary text-white shadow-glow hover:shadow-glow-lg transition-all font-medium gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Get Started
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lg:hidden relative w-10 h-10 rounded-xl glass flex items-center justify-center"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.nav>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="lg:hidden overflow-hidden"
            >
              <div className="container mx-auto px-4 pt-2">
                <div className="bg-background border border-border rounded-2xl p-4 shadow-lg">
                  <div className="flex flex-col gap-2">
                    {visibleLinks.map((link, index) => {
                      const Icon = link.icon;
                      const isActive = location.pathname === link.href;
                      
                      return (
                        <motion.div
                          key={link.href}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link to={link.href}>
                            <div
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                isActive 
                                  ? "gradient-primary text-white" 
                                  : "hover:bg-card/50"
                              }`}
                            >
                              <span className="relative">
                                <Icon className="w-5 h-5" />
                                {link.href === "/report" && (
                                  <PendingQueueBadge count={pendingCount} />
                                )}
                              </span>
                              <span className="font-medium">{link.label}</span>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                    
                    <div className="border-t border-border/50 my-2" />
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: visibleLinks.length * 0.05 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      {isAuthenticated ? (
                        <Button
                          variant="outline"
                          className="w-full col-span-2 gap-2"
                          onClick={() => void logout()}
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </Button>
                      ) : (
                        <>
                          <Link to="/login">
                            <Button variant="outline" className="w-full">
                              Sign In
                            </Button>
                          </Link>
                          <Link to="/signup">
                            <Button className="w-full gradient-primary text-white">
                              Get Started
                            </Button>
                          </Link>
                        </>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Spacer for fixed header */}
      <div className="h-20" />
    </>
  );
}
