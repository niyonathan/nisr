import { Coffee, Globe2, Leaf, Sprout } from "lucide-react";
import { useData } from "../data";
import { fmt, pct } from "../format";
import RwandaMap from "../components/RwandaMap";
import { BarList, Card, Headline, Note, PageHero, Section, StatCard } from "../components/ui";

const EXPORT_CROPS = ["Coffee", "French beans", "Pepper"];

export default function Exports() {
  const D = useData();
  const coffee = D.getCrop("Coffee");
  const coffeeDistricts = D.districtsForCrop("Coffee").sort((a, b) => b.median - a.median);
  const coffeeEffects = D.getEffects("Coffee").filter((e) => e.effect > 0).sort((a, b) => b.effect - a.effect);
  const avocado = D.fruit.find((f) => f.fruit === "Avocado");
  const crops = EXPORT_CROPS.map((c) => D.getCrop(c)).filter(Boolean);

  return (
    <>
      <PageHero compact eyebrow="Topic · Export market opportunities" title="Where Rwanda's export crops are grown"
        intro="The farm survey shows where export crops are grown, how well they yield and how much reaches the market. Export values and destinations come from separate trade statistics." />

      <div className="wrap"><Headline>
        Coffee was recorded on <b>{fmt(coffee.n)}</b> surveyed plots, with a typical yield of <b>{fmt(coffee.median)} kg/ha</b> and the best quarter above {fmt(coffee.p75)} kg/ha. Avocado is the most commercial fruit: <b>{pct(avocado.sold)}</b> of an estimated {fmt(avocado.tonnes)} tonnes is sold, most of it grown in {avocado.topDistrict}.
      </Headline></div>

      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Coffee} value={fmt(coffee.median)} label="kg/ha: typical coffee yield" note={`Best quarter: ${fmt(coffee.p75)}+`} />
          <StatCard icon={Sprout} tone="green" value={coffeeDistricts.length} label="districts with enough coffee farms to compare" note="30+ surveyed plots each" />
          <StatCard icon={Leaf} tone="green" value={pct(avocado.sold)} label="of avocados are sold" note={`${fmt(avocado.tonnes)} t estimated`} />
          <StatCard icon={Globe2} tone="grey" value={pct(coffee.fert)} label="of coffee plots use mineral fertilizer" note={`${pct(coffee.seed)} use improved seedlings`} />
        </div>
      </Section>

      <Section alt title="Coffee across districts" intro="Typical coffee yield in districts with at least 30 surveyed coffee plots. Grey districts have too few coffee farms in the survey.">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-6"><RwandaMap values={Object.fromEntries(coffeeDistricts.map((r) => [r.district, r.median]))} format={(v) => `${fmt(v)} kg/ha`} caption="Coffee yield" /></div>
          <div className="grid content-start gap-6">
            <Card title="Coffee yield by district">
              <BarList rows={coffeeDistricts.map((r) => ({ label: r.district, value: r.median, display: `${fmt(r.median)} kg/ha`, to: `/districts/${encodeURIComponent(r.district)}` }))} />
            </Card>
            <Card title="Practices on coffee farms" subtitle="None is statistically clear yet: too few coffee plots use each one.">
              <BarList rows={coffeeEffects.map((e) => ({ label: e.label, value: e.effect, display: pct(e.effect, true), faint: true }))} />
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Other export-oriented crops in the survey" intro="Crops Rwanda exports that appear on surveyed farms. Small numbers of plots mean these figures are indicative.">
        <div className="grid gap-5 md:grid-cols-3">
          {crops.map((c) => (
            <Card key={c.crop} title={c.crop === "Pepper" ? "Chili pepper" : c.crop}>
              <b className="num block font-display text-4xl text-nisr-navy">{fmt(c.median)} <small className="text-base font-semibold text-nisr-muted">kg/ha</small></b>
              <p className="mt-1 text-[15px] text-nisr-muted">Typical yield on {fmt(c.n)} surveyed plots. Best quarter from {fmt(c.p75)} kg/ha. {pct(c.fert)} use mineral fertilizer.</p>
            </Card>
          ))}
          <Card title="Avocado">
            <b className="num block font-display text-4xl text-nisr-navy">{fmt(avocado.tonnes)} <small className="text-base font-semibold text-nisr-muted">tonnes</small></b>
            <p className="mt-1 text-[15px] text-nisr-muted">Estimated national harvest from {fmt(avocado.n)} surveyed households; {pct(avocado.sold)} sold at a typical {fmt(avocado.price)} RWF/kg. Top district: {avocado.topDistrict}.</p>
          </Card>
        </div>
      </Section>

      <Section alt title="What this page can't show yet">
        <div className="card border-l-4 border-l-[#f2a33a] p-6">
          <p className="text-[17px]">
            Export earnings, volumes and destination countries are not part of the farm survey. They come from NISR's Formal External Trade statistics. Linking those figures to the production data here would show which export crops have the most room to grow, and in which districts.
          </p>
          <div className="mt-4"><Note>Tea is grown mostly on estates and cooperative plantations, so it barely appears in this household survey.</Note></div>
        </div>
      </Section>
    </>
  );
}
