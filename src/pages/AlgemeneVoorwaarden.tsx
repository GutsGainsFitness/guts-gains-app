import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AlgemeneVoorwaarden = () => (
  <>
    <Navbar />
    <main className="pt-24 section-padding">
      <div className="container-tight max-w-3xl">
        <h1 className="text-3xl md:text-5xl text-foreground mb-8">ALGEMENE VOORWAARDEN</h1>
        <p className="text-muted-foreground mb-8">
          Door deel te nemen aan personal training bij Guts & Gains Fitness ga je akkoord met de volgende voorwaarden:
        </p>

        <div className="space-y-8">
          {[
            {
              title: "1. Inspanningsverplichting",
              text: "Het lid verklaart zich actief in te zetten voor het behalen van de afgesproken doelen en de trainings- en voedingsrichtlijnen naar redelijkheid op te volgen.",
            },
            {
              title: "2. Betaling & Start",
              text: "De training start zodra de eerste factuur is voldaan. Facturen worden iedere 4 weken vooraf verstuurd en dienen vóór de eerstvolgende training betaald te zijn.",
            },
            {
              title: "3. Looptijd & Opzegging",
              text: "Het abonnement heeft een minimale looptijd van 8 weken. Na deze periode is het lidmaatschap op ieder moment opzegbaar met een opzegtermijn van 4 weken.",
            },
            {
              title: "4. Veiligheid & Verantwoordelijkheid",
              text: "Volg altijd de instructies van de trainer. Geef vooraf aan of je medicijnen gebruikt of lichamelijke klachten hebt, zodat de training hierop aangepast kan worden. Guts & Gains Fitness is niet aansprakelijk voor letsel of schade aan eigendommen.",
            },
            {
              title: "5. Afspraken & Annulering",
              text: "Sessies dienen minimaal 24 uur van tevoren geannuleerd te worden. Niet nagekomen afspraken vervallen en kunnen niet worden ingehaald.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="text-lg font-heading text-foreground mb-2">{item.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-sm border border-border bg-card">
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            Door deelname aan Guts & Gains Fitness verklaar je dat je bovenstaande voorwaarden hebt gelezen en akkoord gaat met de inhoud van deze overeenkomst.
          </p>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default AlgemeneVoorwaarden;
