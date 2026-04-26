import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Clock } from "lucide-react";
import { nl, enUS, es } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";

const DAYS: Record<string, string[]> = {
  nl: ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
};
const MONTHS: Record<string, string[]> = {
  nl: ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
};

const calendarLocales = { nl, en: enUS, es };

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  specific_date: string | null;
  slot_type: string;
  notes: string | null;
}

interface SlotBlock { start: string; end: string; notes: string | null; }

interface DateSlotPickerProps {
  timeSlots: TimeSlot[];
  selectedSlot: string;
  onSelectSlot: (slotValue: string) => void;
  blockMinutes?: number;
  /** Already booked slot values in the form `YYYY-MM-DD|HH:MM-HH:MM` */
  bookedSlots?: string[];
}

function splitIntoBlocks(startTime: string, endTime: string, durationMin: number, notes: string | null): SlotBlock[] {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const blocks: SlotBlock[] = [];
  for (let m = startMins; m + durationMin <= endMins; m += durationMin) {
    const bStart = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const bEnd = `${String(Math.floor((m + durationMin) / 60)).padStart(2, "0")}:${String((m + durationMin) % 60).padStart(2, "0")}`;
    blocks.push({ start: bStart, end: bEnd, notes });
  }
  return blocks;
}

const DateSlotPicker = ({ timeSlots, selectedSlot, onSelectSlot, blockMinutes, bookedSlots = [] }: DateSlotPickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { language, t } = useLanguage();

  const duration = useMemo(() => {
    if (blockMinutes) return blockMinutes;
    const firstSlot = timeSlots[0];
    if (firstSlot?.slot_type === "intake") return 45;
    return 60;
  }, [blockMinutes, timeSlots]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    timeSlots.forEach((slot) => { if (slot.specific_date) dates.add(slot.specific_date); });
    return dates;
  }, [timeSlots]);

  const blocksForDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split("T")[0];
    const slotsOnDate = timeSlots.filter((s) => s.specific_date === dateStr);
    const allBlocks: SlotBlock[] = [];
    for (const slot of slotsOnDate) {
      allBlocks.push(...splitIntoBlocks(slot.start_time.slice(0, 5), slot.end_time.slice(0, 5), duration, slot.notes));
    }
    return allBlocks;
  }, [selectedDate, timeSlots, duration]);

  const bookedSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);

  const formatDate = (d: Date) =>
    `${DAYS[language][d.getDay()]} ${d.getDate()} ${MONTHS[language][d.getMonth()]}`;

  const isDateAvailable = (date: Date) => availableDates.has(date.toISOString().split("T")[0]);

  if (timeSlots.length === 0) return null;

  return (
    <div>
      <label className="text-xs text-muted-foreground font-heading tracking-wider mb-1.5 block">
        <Clock size={12} className="inline mr-1.5" />
        {t("slots.title")}
      </label>

      <div className="border border-border rounded-sm bg-background p-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => { setSelectedDate(date); onSelectSlot(""); }}
          locale={calendarLocales[language]}
          disabled={(date) => !isDateAvailable(date)}
          fromDate={new Date()}
          className="p-0 pointer-events-auto [&_.rdp-month]:w-full"
          classNames={{
            months: "w-full", month: "w-full space-y-3", table: "w-full border-collapse",
            head_row: "flex w-full", head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.75rem]",
            row: "flex w-full mt-1", cell: "flex-1 h-9 text-center text-sm p-0 relative",
            day: "h-9 w-full p-0 font-normal rounded-sm hover:bg-primary/10 aria-selected:opacity-100 transition-colors",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_disabled: "text-muted-foreground/30 cursor-not-allowed hover:bg-transparent",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-border rounded-sm",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-heading tracking-wider",
          }}
        />

        {selectedDate && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-heading text-foreground/70 mb-2 capitalize">
              {formatDate(selectedDate)} — {duration} min
            </p>
            {blocksForDate.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {blocksForDate.map((block, i) => {
                  const dateStr = selectedDate.toISOString().split("T")[0];
                  const slotValue = `${dateStr}|${block.start}-${block.end}`;
                  const isSelected = selectedSlot === slotValue;
                  const isBooked = bookedSet.has(slotValue);
                  return (
                    <div key={`${block.start}-${i}`} className="flex flex-col">
                      <button
                        type="button"
                        disabled={isBooked}
                        onClick={() => onSelectSlot(isSelected ? "" : slotValue)}
                        className={`px-4 py-2.5 text-xs rounded-sm border transition-colors ${
                          isBooked
                            ? "border-border/50 bg-muted/30 text-muted-foreground/40 line-through cursor-not-allowed"
                            : isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {block.start} – {block.end}
                        {isBooked && <span className="ml-1.5 text-[9px] tracking-wider uppercase">({t("slots.booked")})</span>}
                      </button>
                      {block.notes && !isBooked && (
                        <span className="text-[10px] text-muted-foreground/60 mt-0.5 max-w-[140px]">{block.notes}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("slots.no_slots")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DateSlotPicker;
