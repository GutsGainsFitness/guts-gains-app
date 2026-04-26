import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import logoImage from "@/assets/logo-gutsandgains.png";

const AppResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Wachtwoord aangepast!");
      navigate("/app");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container-tight px-4 md:px-8 py-6">
        <Link to="/app/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft size={16} /> Terug
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <img src={logoImage} alt="Guts & Gains" className="h-16 mx-auto mb-6" />
            <h1 className="text-3xl font-heading text-foreground">NIEUW WACHTWOORD</h1>
          </div>
          <form onSubmit={handleSubmit} className="border-2 border-primary/20 bg-card p-7 rounded-sm space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">NIEUW WACHTWOORD</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-sm text-foreground text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground font-heading text-sm tracking-wider hover:bg-primary/90 transition-all shadow-red disabled:opacity-50"
            >
              {loading ? "BEZIG..." : "OPSLAAN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppResetPassword;
