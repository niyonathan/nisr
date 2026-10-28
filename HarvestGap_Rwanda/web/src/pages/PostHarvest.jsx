import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Apple, GraduationCap, Milk, Package } from "lucide-react";
import { useData } from "../data";
import { fmt, pct } from "../format";
import RwandaMap from "../components/RwandaMap";
import { BarList, Card, DataTable, Headline, Note, PageHero, RankList, Section, StatCard } from "../components/ui";

export default function PostHarvest() {
  const D = useData();
  const N = D.national;
  const fruit = D.fruit.filter((f) => !f.fruit.startsWith("Other")).sort((a, b) => b.tonnes - a.tonnes);
  const avocado = fruit.find((f) => f.fruit === "Avocado");
  const mango = fruit.find((f) => f.fruit === "Mango");
  const totalTonnes = fruit.reduce((s, f) => s + f.tonnes, 0);
  const soldTonnes = fruit.reduce((s, f) => s + f.tonnes * f.sold, 0);
  const milkW = D.milk.reduce((s, m) => s + m.n, 0);
  const milkSold = D.milk.reduce((s, m) => s + m.sold * m.n, 0) / milkW;
  const reliable = D.districts.filter((d) => !d.low_sample);
  const leastAdvice = [...reliable].sort((a, b) => a.extension_post_harvest_rate - b.extension_post_harvest_rate).slice(0, 6)
    .map((d) => ({ label: d.district, value: d.extension_post_harvest_rate, display: pct(d.extension_post_harvest_rate) }));

  const chart = fruit.map((f) => ({
    fruit: f.fruit,
    Sold: f.sold,
    "Eaten at home": f.consumed,
    "Other use or lost": Math.max(0, 1 - f.sold - f.consumed),
  }));
  const fellMost = D.crops.filter((c) => c.n >= 300).sort((a, b) => b.decreased - a.decreased).slice(0, 8)
    .map((c) => ({ label: c.crop, value: c.decreased, display: pct(c.decreased) }));

  return (
    <>
      <PageHero compact eyebrow="Topic · Post-harvest, processing & value addition" title="What happens after the harvest"
        intro="How much fruit and milk reaches the market, where most of it stays at home, and where farmers get the least advice on handling and storage." />

      <div className="wrap"><Headline>
        Of about <b>{fmt(totalTonnes)} tonnes</b> of fruit grown on surveyed farms nationwide, only <b>{pct(soldTonnes / totalTonnes)}</b> is sold. Avocado is the exception ({pct(avocado.sold)} sold); just {pct(mango.sold)} of mangoes are. Only <b>{pct(N.extension_post_harvest)}</b> of farming households got any post-harvest advice this season.
      </Headline></div>

      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Apple} tone="green" value={pct(avocado.sold)} label="of avocados are sold" note={`${fmt(avocado.tonnes)} t grown; most in ${avocado.topDistrict}`} />
          <StatCard icon={Package} tone="amber" value={pct(mango.sold)} label="of mangoes are sold" note={`${fmt(mango.tonnes)} t grown; most in ${mango.topDistrict}`} />
          <StatCard icon={Milk} value={pct(milkSold)} label="of milk is sold" note="Households with milking cows" />
          <StatCard icon={GraduationCap} tone="red" value={pct(N.extension_post_harvest)} label="households got post-harvest advice" note="This season" />
        </div>
      </Section>

      <Section alt title="Sold, eaten at home, or lost?" intro="What happens to each fruit's harvest. A large 'eaten at home' share with a good price can signal room for drying, juice or other processing.">
        <div className="card p-4 sm:p-6">
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#e6edf5" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 13, fill: "#5d6f84" }} />
                <YAxis type="category" dataKey="fruit" width={96} tick={{ fontSize: 14, fill: "#1b2a3d" }} />
                <Tooltip formatter={(v) => pct(v)} cursor={{ fill: "#eef3f9" }} />
                <Legend wrapperStyle={{ fontSize: 14 }} />
                <Bar dataKey="Sold" stackId="a" fill="#0a5ca8" />
                <Bar dataKey="Eaten at home" stackId="a" fill="#4aa8e0" />
                <Bar dataKey="Other use or lost" stackId="a" fill="#d4dde8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-6 card p-5">
          <DataTable rows={fruit} filename="harvestgap_fruit_market.csv" initialSort={{ key: "tonnes", dir: -1 }}
            columns={[
              { key: "fruit", label: "Fruit" },
              { key: "n", label: "Households", numeric: true, render: (r) => fmt(r.n) },
              { key: "tonnes", label: "Estimated tonnes", numeric: true, render: (r) => fmt(r.tonnes) },
              { key: "sold", label: "Sold", numeric: true, render: (r) => pct(r.sold) },
              { key: "consumed", label: "Eaten at home", numeric: true, render: (r) => pct(r.consumed) },
              { key: "price", label: "Price (RWF/kg)", numeric: true, render: (r) => fmt(r.price) },
              { key: "topDistrict", label: "Top district" },
            ]} />
        </div>
      </Section>

      <Section title="Milk: how much reaches the market" intro="Share of milk produced in the last six months that was sold, by province (households with milking cows).">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Share sold">
            <BarList max={1} rows={[...D.milk].sort((a, b) => b.sold - a.sold).map((m) => ({ label: `${m.province} (${m.n} households)`, value: m.sold, display: pct(m.sold) }))} />
          </Card>
          <Card title="Typical price paid">
            <BarList rows={D.milk.map((m) => ({ label: m.province, value: m.price, display: `${fmt(m.price)} RWF/L`, color: "#4aa8e0" }))} />
            <div className="mt-4"><Note>Kigali has too few dairy households in the survey to report.</Note></div>
          </Card>
        </div>
      </Section>

      <Section alt title="Where post-harvest advice is missing" intro="Share of farming households that received advice on post-harvest handling and storage this season.">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="card p-6"><RwandaMap values={Object.fromEntries(D.districts.map((d) => [d.district, d.extension_post_harvest_rate]))} format={pct} caption="Post-harvest advice" /></div>
          <Card title="Least advice received" subtitle="Action: training on drying, hermetic storage and collection points."><RankList rows={leastAdvice} /></Card>
        </div>
      </Section>

      <Section title="Crops where output fell most" intro="Share of each crop's plots where farmers said they harvested less than the season before (crops with 300+ plots).">
        <div className="card max-w-3xl p-6"><BarList max={1} rows={fellMost} color="#b3261e" /></div>
        <div className="mt-5"><Note>The survey does not measure storage losses directly. Post-harvest loss estimates (for example from MINAGRI or FAO) would complete this picture.</Note></div>
      </Section>
    </>
  );
}
