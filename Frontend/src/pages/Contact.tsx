import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, MapPin, Clock, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { submitContactMessage } from "@/services/contactApi";
import { ApiError } from "@/lib/api";

interface FormState {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!form.message.trim()) {
    errors.message = "Message is required.";
  } else if (form.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters.";
  }
  return errors;
}

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Contact — CleanSight";
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });

      setSubmitted(true);
      toast({
        title: "Message Sent",
        description: "Thanks for reaching out! We'll get back to you soon.",
      });
      setForm({ name: "", email: "", message: "" });
      setErrors({});
    } catch (err) {
      // Server-side validation errors
      if (err instanceof ApiError && (err as any).errors) {
        setErrors((err as any).errors);
      } else if (err instanceof ApiError && err.status === 429) {
        toast({
          title: "Too many requests",
          description: "Please wait a few minutes before sending again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Could not send your message. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <MeshGradient className="opacity-20" />
          <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
            <RevealOnScroll>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 text-sm text-muted-foreground mb-6">
                <Mail className="w-4 h-4 text-primary" />
                Contact
              </div>
            </RevealOnScroll>

            <RevealOnScroll>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
                Get in <span className="text-gradient">Touch</span>
              </h1>
            </RevealOnScroll>

            <RevealOnScroll>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Have a question, partnership idea, or just want to say hello?
                We'd love to hear from you.
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* Form + Info */}
        <section className="py-20 bg-card/50">
          <div className="container mx-auto px-4 max-w-5xl grid lg:grid-cols-5 gap-12">
            {/* Contact form */}
            <div className="lg:col-span-3">
              <RevealOnScroll>
                <div className="glass rounded-2xl p-8 border border-border/50">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                        <Send className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-display text-2xl font-bold mb-2">
                        Thank You!
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Your message has been received. We'll get back to you as
                        soon as possible.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubmitted(false)}
                        className="text-primary font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-6">
                      {/* Name */}
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-sm font-medium mb-1.5"
                        >
                          Name
                        </label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          value={form.name}
                          onChange={handleChange}
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? "err-name" : undefined}
                          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                          placeholder="Jane Doe"
                        />
                        {errors.name && (
                          <p id="err-name" className="text-destructive text-xs mt-1">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-sm font-medium mb-1.5"
                        >
                          Email
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? "err-email" : undefined}
                          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                          placeholder="jane@example.com"
                        />
                        {errors.email && (
                          <p id="err-email" className="text-destructive text-xs mt-1">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* Message */}
                      <div>
                        <label
                          htmlFor="contact-message"
                          className="block text-sm font-medium mb-1.5"
                        >
                          Message
                        </label>
                        <textarea
                          id="contact-message"
                          name="message"
                          rows={5}
                          value={form.message}
                          onChange={handleChange}
                          aria-invalid={!!errors.message}
                          aria-describedby={
                            errors.message ? "err-message" : undefined
                          }
                          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none"
                          placeholder="Tell us how we can help…"
                        />
                        {errors.message && (
                          <p
                            id="err-message"
                            className="text-destructive text-xs mt-1"
                          >
                            {errors.message}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 gradient-primary text-white rounded-xl px-6 py-3 font-semibold shadow-glow hover:shadow-glow-lg transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </RevealOnScroll>
            </div>

            {/* Sidebar info */}
            <div className="lg:col-span-2 space-y-8">
              <RevealOnScroll delay={0.1}>
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold">Email</h3>
                  </div>
                  <a
                    href="mailto:hello@cleansight.io"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    hello@cleansight.io
                  </a>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={0.2}>
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold">Location</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Remote-first — contributors everywhere
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={0.3}>
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold">Response Time</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Usually within 48 hours
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
