import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

type Mode = "login" | "signup";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      // Validate invite code server-side via edge function
      try {
        const res = await supabase.functions.invoke("validate-invite-signup", {
          body: { email, password, inviteCode },
        });
        if (res.error || res.data?.error) {
          toast.error(res.data?.error || "Registratie mislukt");
          setLoading(false);
          return;
        }
        toast.success("Account aangemaakt! Controleer je e-mail om je account te bevestigen.");
        setMode("login");
      } catch {
        toast.error("Registratie mislukt");
      }
      setLoading(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error("Login mislukt: " + error.message);
      } else {
        toast.success("Ingelogd!");
        navigate("/admin");
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 section-padding min-h-screen">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-heading text-foreground mb-8">
            {mode === "login" ? "INLOGGEN" : "ACCOUNT AANMAKEN"}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            {mode === "signup" && (
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Uitnodigingscode</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  placeholder="Voer je uitnodigingscode in"
                  className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? "LADEN..." : mode === "login" ? "INLOGGEN" : "REGISTREREN"}
            </button>
          </form>
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {mode === "login" ? "Nog geen account? Maak er een aan" : "Al een account? Log in"}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default LoginPage;
