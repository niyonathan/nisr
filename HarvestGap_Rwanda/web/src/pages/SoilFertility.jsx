import { useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Leaf, Mountain, Shovel, Sprout } from "lucide-react";
import { useData } from "../data";
import { fmt, pct } from "../format";
import RwandaMap from "../components/RwandaMap";
import { BarList, Card, DataTable, Headline, Note, PageHero, RankList, Section, StatCard, Tabs } from "../components/ui";

const PRACTICES = {
  inorganic_fertilizer: "Mineral fertilizer",
  organic_fertilizer: "Manure or compost",
  anti_erosion: "Anti-erosion measures",
  agroforestry: "Trees on the plot",
};
const LAYERS = {
  inorganic_fertilizer_rate: "Mineral fertilizer use",
  organic_fertilizer_rate: "Manure or compost use",
  anti_erosion_rate: "Anti-erosion measures",
  fertility_loss_threat_rate: "Soil fertility loss reported",
  erosion_threat_rate: "Erosion reported",
};

function ScatterTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-nisr-line bg-white px-3 py-2 text-sm shadow-card">
      <b className="block text-nisr-navy">{p.district}</b>
      Fertilizer on {pct(p.x)} of plots · maize {fmt(p.y)} kg/ha
    </div>
  );
}

export default function SoilFertility() {
  const D = useData();
  const N = D.national;
  const [practice, setPractice] = useState("inorganic_fertilizer");
  const [layer, setLayer] = useState("inorganic_fertilizer_rate");
  const reliable = D.districts.filter((d) => !d.low_sample);

  const effectRows = D.effects.filter((e) => e.practice === practice && D.getCrop(e.crop)?.n >= 300)
    .sort((a, b) => b.effect - a.effect)
    .map((e) => ({ label: e.crop, value: Math.max(0, e.effect), display: pct(e.effect, true), faint: !e.sig || e.effect <= 0 }));
  const clear = D.effects.filter((e) => e.practice === "inorganic_fertilizer" && e.sig && e.effect > 0).sort((a, b) => b.effect - a.effect);

  const scatter = reliable.map((d) => ({ district: d.district, x: d.inorganic_fertilizer_rate, y: D.getDistrictCrop(d.district, "Maize")?.median }))
    .filter((p) => p.y != null);
  const lowFert = [...reliable].sort((a, b) => a.inorganic_fertilizer_rate - b.inorganic_fertilizer_rate).slice(0, 5)
    .map((d) => ({ label: d.district, value: d.inorganic_fertilizer_rate, display: pct(d.inorganic_fertilizer_rate) }));
  const soilRisk = [...reliable].sort((a, b) => b.fertility_loss_threat_rate + b.erosion_threat_rate - (a.fertility_loss_threat_rate + a.erosion_threat_rate)).slice(0, 5)
    .map((d) => ({ label: d.district, value: d.fertility_loss_threat_rate + d.erosion_threat_rate, display: pct(d.fertility_loss_threat_rate + d.erosion_threat_rate) }));

  return (
    <>
      <PageHero compact eyebrow="Topic · Soil conservation & fertility" title="Feeding the soil, and keeping it in place"
        intro="Which soil practices go with bigger harvests, which districts use them least, and where soil is most at risk." />

      <div className="wrap"><Headline>
        Mineral fertilizer is used on only <b>{pct(N.inorganic_fertilizer)}</b> of plots, yet it goes with clearly bigger harvests for {clear.length} crops, from {clear[0].crop.toLowerCase()} (<b>{pct(clear[0].effect, true)}</b>) to {clear[clear.length - 1].crop.toLowerCase()} ({pct(clear[clear.length - 1].effect, true)}). Manure or compost is far more common, on <b>{pct(N.organic_fertilizer)}</b> of plots.
      </Headline></div>

      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Sprout} value={pct(N.inorganic_fertilizer)} label="plots with mineral fertilizer" note="NPK, DAP, urea" />
          <StatCard icon={Leaf} tone="green" value={pct(N.organic_fertilizer)} label="plots with manure or compost" />
          <StatCard icon={Shovel} value={pct(N.anti_erosion)} label="plots with anti-erosion measures" note="Terraces, ditches, grass strips" />
          <StatCard icon={Mountain} tone="amber" value={pct(N.fertility_loss_threat)} label="plots losing soil fertility" note={`Plus ${pct(N.erosion_threat)} reporting erosion`} />
        </div>
      </Section>

      <Section alt title="Which practices go with bigger harvests?" intro="Yield difference on plots using a practice compared with similar plots of the same crop in the same district and season.">
        <div className="card p-6">
          <Tabs label="Practice" value={practice} onChange={setPractice} options={Object.entries(PRACTICES).map(([value, label]) => ({ value, label }))} />
          <div className="mt-6 max-w-3xl">
            {effectRows.length ? <BarList rows={effectRows} /> : <p className="text-nisr-muted">Not enough plots to measure this practice.</p>}
          </div>
          <div className="mt-4"><Note>Crops with 300+ surveyed plots. Faded bars are not statistically clear (or show no gain). These are links in survey data: farmers who use fertilizer may also differ in other ways.</Note></div>
        </div>
      </Section>

      <Section title="Where soil practices are missing" intro="Colour the map by each indicator. Click a district for its full profile.">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="card p-6">
            <Tabs label="Map layer" value={layer} onChange={setLayer} options={Object.entries(LAYERS).map(([value, label]) => ({ value, label }))} />
            <div className="mt-5"><RwandaMap values={Object.fromEntries(D.districts.map((d) => [d.district, d[layer]]))} format={pct} caption={LAYERS[layer]} /></div>
          </div>
          <div className="grid content-start gap-6">
            <Card title="Lowest fertilizer use" subtitle="Action: input access through agro-dealers and subsidies."><RankList rows={lowFert} /></Card>
            <Card title="Soil most at risk" subtitle="Fertility loss plus erosion reported. Action: terraces, cover crops, liming."><RankList rows={soilRisk} /></Card>
          </div>
        </div>
      </Section>

      <Section alt title="More fertilizer, more maize?" intro="Each dot is a district: share of plots using mineral fertilizer against typical maize yield.">
        <div className="card p-4 sm:p-6">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid stroke="#e6edf5" />
                <XAxis type="number" dataKey="x" name="Fertilizer use" tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 13, fill: "#5d6f84" }}
                  label={{ value: "Plots using mineral fertilizer", position: "bottom", offset: 10, fill: "#5d6f84", fontSize: 13 }} />
                <YAxis type="number" dataKey="y" name="Maize yield" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 13, fill: "#5d6f84" }}
                  label={{ value: "Maize kg/ha", angle: -90, position: "insideLeft", fill: "#5d6f84", fontSize: 13 }} />
                <ZAxis range={[90, 90]} />
                <Tooltip content={<ScatterTip />} />
                <Scatter data={scatter} fill="#0a5ca8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <Note>A district-level picture only. Rainfall, altitude and soil also differ between districts, so the plot-level comparison above is the stronger evidence.</Note>
        </div>
      </Section>

      <Section title="Full district table">
        <div className="card p-5">
          <DataTable rows={D.districts} filename="harvestgap_soil_fertility_by_district.csv" initialSort={{ key: "inorganic_fertilizer_rate", dir: 1 }}
            columns={[
              { key: "district", label: "District" },
              { key: "inorganic_fertilizer_rate", label: "Mineral fertilizer", numeric: true, render: (r) => pct(r.inorganic_fertilizer_rate) },
              { key: "fertilizer_kg_ha_users_median", label: "kg/ha (users)", numeric: true, render: (r) => fmt(r.fertilizer_kg_ha_users_median) },
              { key: "organic_fertilizer_rate", label: "Manure/compost", numeric: true, render: (r) => pct(r.organic_fertilizer_rate) },
              { key: "anti_erosion_rate", label: "Anti-erosion", numeric: true, render: (r) => pct(r.anti_erosion_rate) },
              { key: "agroforestry_rate", label: "Trees on plot", numeric: true, render: (r) => pct(r.agroforestry_rate) },
              { key: "fertility_loss_threat_rate", label: "Fertility loss", numeric: true, render: (r) => pct(r.fertility_loss_threat_rate) },
              { key: "erosion_threat_rate", label: "Erosion", numeric: true, render: (r) => pct(r.erosion_threat_rate) },
            ]} />
        </div>
      </Section>
    </>
  );
}
