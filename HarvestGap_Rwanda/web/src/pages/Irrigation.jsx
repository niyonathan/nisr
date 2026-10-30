import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, Droplets, Waves } from "lucide-react";
import { useData } from "../data";
import { fmt, pct, PROVINCES } from "../format";
import RwandaMap from "../components/RwandaMap";
import { BarList, Card, DataTable, Headline, Note, PageHero, RankList, Section, StatCard, Tabs } from "../components/ui";

const LAYERS = {
  no_water_rate: "No water available",
  cannot_afford_irrigation_rate: "Can't afford irrigation",
  irrigated_rate: "Irrigated",
};

const pctTick = (v) => `${Math.round(v * 100)}%`;

export default function Irrigation() {
  const D = useData();
  const N = D.national;
  const [layer, setLayer] = useState("no_water_rate");
  const reliable = D.districts.filter((d) => !d.low_sample);
  const top = (key) => [...reliable].sort((a, b) => b[key] - a[key]).slice(0, 5).map((d) => ({ label: d.district, value: d[key], display: pct(d[key]) }));
  const driest = [...reliable].sort((a, b) => b.no_water_rate - a.no_water_rate);
  const manyDry = reliable.filter((d) => d.no_water_rate >= 0.4).length;

  const chart = [...D.districts]
    .sort((a, b) => b.no_water_rate + b.cannot_afford_irrigation_rate - (a.no_water_rate + a.cannot_afford_irrigation_rate))
    .map((d) => ({
      district: d.district,
      Irrigated: d.irrigated_rate,
      "Can't afford": d.cannot_afford_irrigation_rate,
      "No water": d.no_water_rate,
      "Not needed": Math.max(0, 1 - d.irrigated_rate - d.cannot_afford_irrigation_rate - d.no_water_rate),
    }));

  const byProvince = PROVINCES.map((p) => {
    const rows = D.districts.filter((d) => d.province === p);
    const w = rows.reduce((s, d) => s + d.n_plots, 0);
    const avg = (k) => rows.reduce((s, d) => s + d[k] * d.n_plots, 0) / w;
    return { province: p, irrigated: avg("irrigated_rate"), noWater: avg("no_water_rate"), cantAfford: avg("cannot_afford_irrigation_rate") };
  });

  const irrigatedCrops = D.crops.filter((c) => c.n >= 100 && c.irrigated != null).sort((a, b) => b.irrigated - a.irrigated).slice(0, 8)
    .map((c) => ({ label: c.crop, value: c.irrigated, display: pct(c.irrigated) }));

  return (
    <>
      <PageHero compact eyebrow="Water for my crops" challenge="Small-scale irrigation" title="Where water is missing, and where money is"
        intro="Farmers told the survey whether each plot was irrigated, and if not, why. The answer separates two different problems with two different solutions." />

      <div className="wrap"><Headline>
        Only <b>{pct(N.irrigated)}</b> of Rwanda's farm plots are irrigated. On <b>{pct(N.no_water)}</b> the farmer says there is no water to use, mostly in the East ({driest[0].district} {pct(driest[0].no_water_rate)}, {driest[1].district} {pct(driest[1].no_water_rate)}). On another <b>{pct(N.cannot_afford_irrigation)}</b> water exists but equipment is too expensive.
      </Headline></div>

      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Droplets} value={pct(N.irrigated)} label="of plots irrigated" note="All seasons, survey-weighted" />
          <StatCard icon={Waves} tone="red" value={pct(N.no_water)} label="have no water available" note="Needs water infrastructure" />
          <StatCard icon={Banknote} tone="amber" value={pct(N.cannot_afford_irrigation)} label="can't afford irrigation" note="Needs subsidies or credit" />
          <StatCard icon={Droplets} tone="grey" value={manyDry} label="districts where 40%+ lack water" note="Out of 26 with enough data" />
        </div>
      </Section>

      <Section alt title="Two problems, two solutions" intro="Colour the map by each problem. The lists show where each action would reach the most farms.">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="card p-6">
            <Tabs label="Map layer" value={layer} onChange={setLayer} options={Object.entries(LAYERS).map(([value, label]) => ({ value, label }))} />
            <div className="mt-5"><RwandaMap values={Object.fromEntries(D.districts.map((d) => [d.district, d[layer]]))} format={pct} caption={LAYERS[layer]} /></div>
          </div>
          <div className="grid content-start gap-6">
            <Card title="Build water sources" subtitle="Most plots with no water: valley dams, rainwater harvesting, water channels.">
              <RankList rows={top("no_water_rate")} />
            </Card>
            <Card title="Make equipment affordable" subtitle="Most plots where cost is the barrier: subsidies, SACCO loans, shared pumps.">
              <RankList rows={top("cannot_afford_irrigation_rate")} />
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Every district at a glance" intro="Share of farm plots by irrigation status, sorted by unmet need (no water + can't afford).">
        <div className="card p-4 sm:p-6">
          <div className="h-[920px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={4}>
                <CartesianGrid horizontal={false} stroke="#e6edf5" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={pctTick} tick={{ fontSize: 13, fill: "#5d6f84" }} />
                <YAxis type="category" dataKey="district" width={92} tick={{ fontSize: 13, fill: "#1b2a3d" }} interval={0} />
                <Tooltip formatter={(v) => pct(v)} cursor={{ fill: "#eef3f9" }} />
                <Legend wrapperStyle={{ fontSize: 14 }} />
                <Bar dataKey="Irrigated" stackId="a" fill="#1d7a46" />
                <Bar dataKey="Can't afford" stackId="a" fill="#4aa8e0" />
                <Bar dataKey="No water" stackId="a" fill="#0a4f94" />
                <Bar dataKey="Not needed" stackId="a" fill="#d4dde8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section alt>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="By province" subtitle="Share of plots, weighted by the number of plots in each district.">
            <table className="num w-full text-[15px]">
              <thead><tr className="text-left text-nisr-muted"><th className="py-2">Province</th><th className="text-right">Irrigated</th><th className="text-right">No water</th><th className="text-right">Can't afford</th></tr></thead>
              <tbody>{byProvince.map((p) => (
                <tr key={p.province} className="border-t border-nisr-line"><td className="py-2.5 font-semibold">{p.province}</td><td className="text-right">{pct(p.irrigated)}</td><td className="text-right">{pct(p.noWater)}</td><td className="text-right">{pct(p.cantAfford)}</td></tr>
              ))}</tbody>
            </table>
          </Card>
          <Card title="Crops most often irrigated" subtitle="Share of each crop's plots that were irrigated (crops with 100+ plots).">
            <BarList rows={irrigatedCrops} />
          </Card>
        </div>
        <div className="mt-6"><Note>
          Why no "irrigation raises yield by X%" figure? Irrigated plots in the survey are mostly dry-season vegetables and marshland rice, so they can't be fairly compared with rain-fed plots of the same crop. This page focuses on where irrigation is missing and why.
        </Note></div>
      </Section>

      <Section title="Full district table">
        <div className="card p-5">
          <DataTable rows={D.districts} filename="agrilens_irrigation_by_district.csv" initialSort={{ key: "no_water_rate", dir: -1 }}
            columns={[
              { key: "district", label: "District" },
              { key: "province", label: "Province" },
              { key: "n_plots", label: "Plots surveyed", numeric: true, render: (r) => fmt(r.n_plots) },
              { key: "irrigated_rate", label: "Irrigated", numeric: true, render: (r) => pct(r.irrigated_rate) },
              { key: "no_water_rate", label: "No water", numeric: true, render: (r) => pct(r.no_water_rate) },
              { key: "cannot_afford_irrigation_rate", label: "Can't afford", numeric: true, render: (r) => pct(r.cannot_afford_irrigation_rate) },
            ]} />
        </div>
      </Section>
    </>
  );
}
