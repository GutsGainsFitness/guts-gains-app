import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
  is_active: boolean;
  specific_date: string | null;
  slot_type: string;
  notes: string | null;
}

const AdminTimeSlots = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [newSlot, setNewSlot] = useState({
    specific_date: "",
    start_time: "09:00",
    end_time: "10:00",
    slot_type: "intake",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchSlots();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/login");
  };

  const fetchSlots = async () => {
    const { data, error } = await supabase
      .from("available_time_slots")
      .select("*")
      .order("specific_date", { ascending: true, nullsFirst: false })
      .order("start_time");
    if (error) {
      toast.error("Fout bij laden tijdsloten");
    } else {
      setSlots((data || []) as TimeSlot[]);
    }
    setLoading(false);
  };

  const addSlot = async () => {
    if (!newSlot.specific_date) {
      toast.error("Kies een datum");
      return;
    }
    const date = new Date(newSlot.specific_date + "T00:00:00");
    const { error } = await supabase.from("available_time_slots").insert({
      day_of_week: date.getDay(),
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      specific_date: newSlot.specific_date,
      slot_type: newSlot.slot_type,
      notes: newSlot.notes || null,
    });
    if (error) {
      toast.error("Fout bij toevoegen");
      console.error(error);
    } else {
      toast.success("Tijdslot toegevoegd");
      fetchSlots();
    }
  };

  const toggleSlot = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("available_time_slots")
      .update({ is_active: !isActive })
      .eq("id", id);
    if (error) toast.error("Fout bij bijwerken");
    else fetchSlots();
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase
      .from("available_time_slots")
      .delete()
      .eq("id", id);
    if (error) toast.error("Fout bij verwijderen");
    else { toast.success("Tijdslot verwijderd"); fetchSlots(); }
  };

  const filteredSlots = slots.filter(s => filterType === "all" || s.slot_type === filterType);
  const today = new Date().toISOString().split("T")[0];

  // Group by date
  const slotsByDate = filteredSlots.reduce((acc, slot) => {
    const key = slot.specific_date || `dag-${slot.day_of_week}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const formatDate = (dateStr: string) => {
    if (dateStr.startsWith("dag-")) return DAYS[parseInt(dateStr.replace("dag-", ""))];
    const d = new Date(dateStr + "T00:00:00");
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const isExpired = (dateStr: string) => {
    if (dateStr.startsWith("dag-")) return false;
    return dateStr < today;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
        >
          <ArrowLeft size={16} /> Terug naar admin
        </button>

        <h1 className="text-2xl font-heading text-foreground mb-8">BESCHIKBARE TIJDSLOTEN</h1>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "all", label: "Alles" },
            { value: "intake", label: "Intake" },
            { value: "pt_sessie", label: "PT-sessie" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                filterType === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Add new slot */}
        <div className="p-5 rounded-sm border border-border bg-card mb-8">
          <h2 className="text-sm font-heading text-foreground mb-4">NIEUW TIJDSLOT TOEVOEGEN</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Datum</label>
              <input
                type="date"
                value={newSlot.specific_date}
                onChange={(e) => setNewSlot({ ...newSlot, specific_date: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Start</label>
              <input
                type="time"
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Einde</label>
              <input
                type="time"
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-foreground text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <select
                value={newSlot.slot_type}
                onChange={(e) => setNewSlot({ ...newSlot, slot_type: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-foreground text-sm"
              >
                <option value="intake">Intake (45 min)</option>
                <option value="pt_sessie">PT-sessie (60 min)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notitie (optioneel)</label>
              <input
                type="text"
                value={newSlot.notes}
                onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                placeholder="Bijv. verzoek eerder mogelijk"
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-foreground text-sm"
              />
            </div>
          </div>
          <button
            onClick={addSlot}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-heading hover:bg-primary/90 transition-colors rounded-sm"
          >
            <Plus size={14} /> TOEVOEGEN
          </button>
        </div>

        {/* Existing slots */}
        {Object.keys(slotsByDate).length === 0 ? (
          <p className="text-muted-foreground text-sm">Geen tijdsloten gevonden.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(slotsByDate).map(([dateKey, daySlots]) => (
              <div key={dateKey} className={isExpired(dateKey) ? "opacity-40" : ""}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-heading text-foreground capitalize">{formatDate(dateKey)}</h3>
                  {isExpired(dateKey) && <span className="text-[10px] text-destructive">Verlopen</span>}
                </div>
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-3 rounded-sm border ${
                        slot.is_active ? "border-border bg-card" : "border-border/50 bg-card/50 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-foreground">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
                          slot.slot_type === "intake" ? "border-blue-500/30 text-blue-400" : "border-green-500/30 text-green-400"
                        }`}>
                          {slot.slot_type === "intake" ? "Intake" : "PT"}
                        </span>
                        {slot.notes && (
                          <span className="text-[10px] text-muted-foreground">💬 {slot.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSlot(slot.id, slot.is_active)}
                          className={`px-3 py-1 text-xs rounded-sm border transition-colors ${
                            slot.is_active
                              ? "border-primary/30 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {slot.is_active ? "Actief" : "Inactief"}
                        </button>
                        <button
                          onClick={() => deleteSlot(slot.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTimeSlots;
