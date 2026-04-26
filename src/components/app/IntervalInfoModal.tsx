import { X, Flame, Zap, Heart, Wind } from "lucide-react";

export interface PresetInfo {
  name: string;
  work: number;
  rest: number;
  rounds: number;
  fullName: string;
  origin: string;
  whatIsIt: string;
  howItWorks: string;
  goodFor: string;
  tips: string;
  icon: typeof Flame;
  accentClass: string;
}

export const PRESET_INFO: Record<string, PresetInfo> = {
  TABATA: {
    name: "TABATA",
    work: 20,
    rest: 10,
    rounds: 8,
    fullName: "Tabata Protocol",
    origin: "Bedacht door de Japanse wetenschapper Dr. Izumi Tabata in 1996.",
    whatIsIt:
      "De koning van de korte HIIT. 8 rondes van 20 seconden alles geven, 10 seconden rust. Totaal 4 minuten pure pijn.",
    howItWorks:
      "Kies één oefening (burpees, squat jumps, sprints). 20 sec ALL OUT — niet pacen, maximaal tempo. Dan 10 sec rust. Herhaal 8x.",
    goodFor:
      "Maximale calorieënverbranding in minimale tijd. Verbetert zowel aerobe als anaerobe capaciteit. Ideaal als je weinig tijd hebt.",
    tips: "Begin niet te hard — ronde 5-8 zijn killers. Doe één oefening per Tabata, niet wisselen. Goed opwarmen vooraf is essentieel.",
    icon: Flame,
    accentClass: "text-primary",
  },
  EMOM: {
    name: "EMOM",
    work: 50,
    rest: 10,
    rounds: 10,
    fullName: "Every Minute On the Minute",
    origin: "Bekend uit CrossFit en functional fitness training.",
    whatIsIt:
      "Elke minuut start je opnieuw. Doe je werk binnen ~50 seconden, de rest van de minuut is je rust. Hoe sneller je bent, hoe meer rust je krijgt.",
    howItWorks:
      "Aan het begin van elke minuut: doe een vast aantal reps (bijv. 10 burpees). Klaar binnen 40 sec? Dan 20 sec rust. Klaar in 55 sec? Slechts 5 sec rust.",
    goodFor:
      "Werkt perfect voor kracht-cardio combinaties. Leert je pacing, mentale focus en consistentie. Goed voor skill-onderhoud zoals pull-ups of kettlebell swings.",
    tips: "Kies een rep-aantal dat je in 30-45 sec kan doen. Te makkelijk = geen prikkel. Te zwaar = je redt het niet en faalt.",
    icon: Zap,
    accentClass: "text-yellow-500",
  },
  "HIIT 30/30": {
    name: "HIIT 30/30",
    work: 30,
    rest: 30,
    rounds: 10,
    fullName: "High Intensity Interval Training (1:1)",
    origin: "De klassieke HIIT verhouding — werk en rust in balans.",
    whatIsIt:
      "30 seconden hard werk, 30 seconden actieve rust (langzaam joggen of wandelen). De gulden middenweg tussen Tabata en lange intervals.",
    howItWorks:
      "Sprint, jumping jacks of kettlebell swings voor 30 sec op ~85-90% inspanning. Dan 30 sec rustig bewegen om hartslag iets te laten zakken. Herhaal 10x.",
    goodFor:
      "Beginners en intermediates. Bouwt VO2max op zonder dat je instort. Goede balans tussen pijn en herstelbaar. Perfect 2-3x per week.",
    tips: "Niet zitten tijdens de rust — blijf bewegen. Dat houdt je hartslag op een trainingszone en bouwt cardio sneller op.",
    icon: Heart,
    accentClass: "text-red-500",
  },
  "SPRINT 1:2": {
    name: "SPRINT 1:2",
    work: 30,
    rest: 60,
    rounds: 8,
    fullName: "Sprint Intervals (1:2 verhouding)",
    origin: "Klassiek atletiek protocol voor snelheid en explosiviteit.",
    whatIsIt:
      "30 seconden ALL OUT sprinten, 60 seconden volledig herstellen (wandelen). Dubbele rust ten opzichte van werk = elke sprint kan maximaal zijn.",
    howItWorks:
      "Sprint zo hard mogelijk voor 30 sec (op de plek, 100m loop, of bike). Wandel daarna 60 sec rustig terug. Herhaal 8x. Volledig herstel = volgende sprint kan weer 100%.",
    goodFor:
      "Hardlopers, voetballers, atleten die snelheid en power willen. Bouwt anaerobe capaciteit en sprint-kracht. Verbrandt veel vet door EPOC (after-burn).",
    tips: "Vorm boven snelheid in begin. Goed opwarmen (10 min jog + dynamische stretches) is verplicht — koud sprinten = blessurerisico.",
    icon: Wind,
    accentClass: "text-blue-500",
  },
};

interface Props {
  preset: PresetInfo | null;
  onClose: () => void;
  onApply: (preset: { work: number; rest: number; rounds: number; name: string }) => void;
}

const IntervalInfoModal = ({ preset, onClose, onApply }: Props) => {
  if (!preset) return null;
  const Icon = preset.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-card border-2 border-primary/30 rounded-sm max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Sluiten"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center">
              <Icon size={24} className={preset.accentClass} />
            </div>
            <div>
              <p className="text-[10px] font-heading tracking-[0.3em] text-muted-foreground">INTERVAL</p>
              <h2 className="text-2xl font-heading text-foreground">{preset.name}</h2>
            </div>
          </div>
          <p className="text-sm font-body text-muted-foreground italic">{preset.fullName}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 border-b border-border">
          <Stat label="WERK" value={`${preset.work}s`} />
          <Stat label="RUST" value={`${preset.rest}s`} divider />
          <Stat label="RONDES" value={`${preset.rounds}x`} divider />
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm font-body">
          <Section title="Wat is het?">{preset.whatIsIt}</Section>
          <Section title="Hoe werkt het?">{preset.howItWorks}</Section>
          <Section title="Goed voor">{preset.goodFor}</Section>
          <Section title="💡 Pro tip" highlight>
            {preset.tips}
          </Section>
          <p className="text-[11px] font-body text-muted-foreground italic pt-2 border-t border-border">
            {preset.origin}
          </p>
        </div>

        {/* CTA */}
        <div className="p-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 border border-border rounded-sm text-muted-foreground hover:text-foreground font-heading text-xs tracking-wider"
          >
            ANNULEER
          </button>
          <button
            onClick={() => {
              onApply({ work: preset.work, rest: preset.rest, rounds: preset.rounds, name: preset.name });
              onClose();
            }}
            className="flex-1 h-11 bg-primary text-primary-foreground rounded-sm font-heading text-xs tracking-wider hover:bg-primary/90"
          >
            START {preset.name}
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, divider }: { label: string; value: string; divider?: boolean }) => (
  <div className={`p-4 text-center ${divider ? "border-l border-border" : ""}`}>
    <p className="text-[10px] font-heading tracking-wider text-muted-foreground">{label}</p>
    <p className="text-2xl font-heading text-foreground tabular-nums mt-1">{value}</p>
  </div>
);

const Section = ({ title, children, highlight }: { title: string; children: React.ReactNode; highlight?: boolean }) => (
  <div className={highlight ? "p-3 rounded-sm bg-primary/5 border border-primary/20" : ""}>
    <p className="text-[10px] font-heading tracking-[0.25em] text-primary uppercase mb-1.5">{title}</p>
    <p className="text-foreground/90 leading-relaxed">{children}</p>
  </div>
);

export default IntervalInfoModal;
