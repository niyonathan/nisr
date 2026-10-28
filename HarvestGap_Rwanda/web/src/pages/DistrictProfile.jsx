import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Droplets, Lightbulb, Mountain, Package, Sprout, Users } from "lucide-react";
import { useData } from "../data";
import { fmt, pct } from "../format";
import RwandaMap from "../components/RwandaMap";
import { BarList, Card, DataTable, HeroStat, Note, PageHero, Pill, Section, Tabs } from "../components/ui";

const MAP_OPTIONS = {
  irrigated_rate: "Irrigated plots",
  no_water_rate: "No water for irrigation",
  inorganic_fertilizer_rate: "Fertilizer use",
  extension_this_season_rate: "Extension advice",
};

/** Compares a district rate to the national rate and returns a short verdict. */
function versus(value, national, higherIsBetter = true) {
  const ratio = value / national;
  if (ratio >= 1.25) return higherIsBetter ? ["green", "Above Rwanda"] : ["red", "Above Rwanda"];
  if (ratio <= 0.75) return higherIsBetter ? ["amber", "Below Rwanda"] : ["green", "Below Rwanda"];
  return ["blue", "Close to Rwanda"];
}

export default function DistrictProfile() {
  const D = useData();
  const { name } = useParams();
  const d = D.getDistrict(decodeURIComponent(name));
  const [mapKey, setMapKey] = useState("irrigated_rate");

  if (!d) {
    return (
      <div className="wrap py-24 text-center">
        <h1 className="text-3xl">District not found</h1>
        <p className="mt-2 text-nisr-muted"><Link className="font-bold" to="/districts">See all 30 districts</Link></p>
      </div>
    );
  }

  const N = D.national;
  const crops = D.cropsInDistrict(d.district).map((r) => {
    const nat = D.getCrop(r.crop);
    return { ...r, national: nat?.median, vsNational: nat ? r.median / nat.median - 1 : null };
  });
  const notNeeded = Math.max(0, 1 - d.irrigated_rate - d.no_water_rate - d.cannot_afford_irrigation_rate);

  // Priorities: indicators clearly worse than the national picture.
  const priorities = [
    d.no_water_rate > N.no_water * 1.3 && [Droplets, "Water sources", `${pct(d.no_water_rate)} of plots have no water for irrigation (Rwanda: ${pct(N.no_water)}). Valley dams and rainwater harvesting would help most.`],
    d.cannot_afford_irrigation_rate > N.cannot_afford_irrigation * 1.3 && [Droplets, "Irrigation finance", `${pct(d.cannot_afford_irrigation_rate)} of plots could be irrigated but farmers can't afford equipment (Rwanda: ${pct(N.cannot_afford_irrigation)}).`],
    d.inorganic_fertilizer_rate < N.inorganic_fertilizer * 0.75 && [Sprout, "Access to fertilizer", `Only ${pct(d.inorganic_fertilizer_rate)} of plots use mineral fertilizer (Rwanda: ${pct(N.inorganic_fertilizer)}).`],
    d.improved_seed_rate < N.improved_seed * 0.75 && [Lightbulb, "Improved seed", `Only ${pct(d.improved_seed_rate)} of crops are grown from improved seed (Rwanda: ${pct(N.improved_seed)}).`],
    d.erosion_threat_rate > N.erosion_threat * 1.3 && [Mountain, "Erosion control", `${pct(d.erosion_threat_rate)} of plots report erosion (Rwanda: ${pct(N.erosion_threat)}).`],
    d.extension_post_harvest_rate < N.extension_post_harvest * 0.75 && [Package, "Post-harvest training", `Only ${pct(d.extension_post_harvest_rate)} of households got post-harvest advice (Rwanda: ${pct(N.extension_post_harvest)}).`],
    d.extension_this_season_rate < N.extension_this_season * 0.75 && [Users, "Extension reach", `${pct(d.extension_this_season_rate)} of households got any extension advice this season (Rwanda: ${pct(N.extension_this_season)}).`],
  ].filter(Boolean);

  const comparisons = [
    ["Irrigated plots", d.irrigated_rate, N.irrigated, true],
    ["Mineral fertilizer", d.inorganic_fertilizer_rate, N.inorganic_fertilizer, true],
    ["Manure or compost", d.organic_fertilizer_rate, N.organic_fertilizer, true],
    ["Improved seed", d.improved_seed_rate, N.improved_seed, true],
    ["Pesticide", d.pesticide_rate, N.pesticide, true],
    ["Anti-erosion measures", d.anti_erosion_rate, N.anti_erosion, true],
    ["Erosion reported", d.erosion_threat_rate, N.erosion_threat, false],
    ["Extension advice", d.extension_this_season_rate, N.extension_this_season, true],
    ["Post-harvest advice", d.extension_post_harvest_rate, N.extension_post_harvest, true],
    ["Cooperative members", d.cooperative_member_rate, N.cooperative_member, true],
    ["Land with a title", d.land_titled_rate, N.land_titled, true],
  ];

  return (
    <>
      <PageHero compact eyebrow={`${d.province} Province`} title={d.district}
        intro={`What the 2024 survey recorded for ${d.n_households} farming households and ${fmt(d.n_plots)} plots in ${d.district}.`}>
        <div className="grid grid-cols-2 gap-3.5">
          <HeroStat value={pct(d.irrigated_rate)} label="plots irrigated" />
          <HeroStat value={pct(d.inorganic_fertilizer_rate)} label="plots with mineral fertilizer" />
          <HeroStat value={pct(d.improved_seed_rate)} label="crops from improved seed" />
          <HeroStat value={pct(d.poor_rate)} label="farming households below the poverty line" />
        </div>
      </PageHero>

      <div className="wrap relative z-10 -mt-14 grid gap-4">
        <Link to="/districts" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[15px] font-bold text-nisr-blue shadow-card"><ArrowLeft size={16} /> All districts</Link>
        {d.low_sample && (
          <div className="card flex gap-3 border-l-4 border-l-[#f2a33a] p-5">
            <AlertTriangle className="shrink-0 text-[#b45a14]" />
            <p className="text-[15px]">Only {d.n_households} farming households were surveyed here, so these figures are less precise than for other districts.</p>
          </div>
        )}
      </div>

      <Section title="Priorities for this district" intro="Where this district falls clearly behind the national picture.">
        {priorities.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {priorities.map(([Icon, title, text]) => (
              <div key={title} className="card flex gap-4 border-l-4 border-l-nisr-blue p-5">
                <Icon className="mt-0.5 shrink-0 text-nisr-blue" />
                <div><h3 className="text-lg">{title}</h3><p className="mt-1 text-[15px] text-nisr-muted">{text}</p></div>
              </div>
            ))}
          </div>
        ) : <p className="text-nisr-muted">No indicator is far behind the national picture. Compare the details below.</p>}
      </Section>

      <Section alt title="Crops and yields" intro={`Typical yield of each crop with at least 30 surveyed plots in ${d.district}, compared with Rwanda.`}>
        <div className="card p-5">
          <DataTable rows={crops} filename={`harvestgap_${d.district.toLowerCase()}_crops.csv`} initialSort={{ key: "n", dir: -1 }}
            columns={[
              { key: "crop", label: "Crop" },
              { key: "n", label: "Plots surveyed", numeric: true },
              { key: "median", label: "Typical kg/ha", numeric: true, render: (r) => fmt(r.median) },
              { key: "national", label: "Rwanda kg/ha", numeric: true, render: (r) => fmt(r.national) },
              { key: "vsNational", label: "vs Rwanda", numeric: true, render: (r) => <span className={r.vsNational >= 0 ? "text-[#1d7a46]" : "text-[#b3261e]"}>{pct(r.vsNational, true)}</span> },
              { key: "p75", label: "Best quarter from", numeric: true, render: (r) => fmt(r.p75) },
              { key: "seed", label: "Improved seed", numeric: true, render: (r) => pct(r.seed) },
              { key: "fert", label: "Fertilizer", numeric: true, render: (r) => pct(r.fert) },
            ]} />
        </div>
      </Section>

      <Section title={`${d.district} compared with Rwanda`}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card title="Practices and services" subtitle="Share of plots or households; badge compares with the national rate.">
            <ul className="grid gap-2.5">
              {comparisons.map(([label, v, n, good]) => {
                const [tone, text] = versus(v, n, good);
                return (
                  <li key={label} className="num grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-nisr-line pt-2.5 text-[15px] first:border-t-0 first:pt-0">
                    <span>{label}</span>
                    <span><b className="text-nisr-navy">{pct(v)}</b> <span className="text-nisr-muted">/ {pct(n)}</span></span>
                    <Pill tone={tone}>{text}</Pill>
                  </li>
                );
              })}
            </ul>
          </Card>
          <div className="grid content-start gap-6">
            <Card title="Why plots are not irrigated" subtitle="Share of all farm plots in the district.">
              <BarList max={1} rows={[
                { label: "Irrigated", value: d.irrigated_rate, display: pct(d.irrigated_rate), color: "#1d7a46" },
                { label: "No water available", value: d.no_water_rate, display: pct(d.no_water_rate), color: "#0a4f94" },
                { label: "Can't afford it", value: d.cannot_afford_irrigation_rate, display: pct(d.cannot_afford_irrigation_rate), color: "#4aa8e0" },
                { label: "Not needed (rain is enough)", value: notNeeded, display: pct(notNeeded), color: "#a9b8c8" },
              ]} />
            </Card>
            <Card title="Soil threats reported" subtitle="Share of plots; a plot can report more than one.">
              <BarList rows={[
                { label: "Fertility loss", value: d.fertility_loss_threat_rate, display: pct(d.fertility_loss_threat_rate) },
                { label: "Erosion", value: d.erosion_threat_rate, display: pct(d.erosion_threat_rate) },
                { label: "Landslides", value: d.landslide_threat_rate, display: pct(d.landslide_threat_rate) },
              ]} max={Math.max(0.15, d.fertility_loss_threat_rate, d.erosion_threat_rate)} />
            </Card>
          </div>
        </div>
      </Section>

      <Section alt title="Where it sits on the map" intro={`${d.district} is outlined. Click any other district to open its profile.`}>
        <div className="card p-6">
          <Tabs label="Map topic" value={mapKey} onChange={setMapKey} options={Object.entries(MAP_OPTIONS).map(([value, label]) => ({ value, label }))} />
          <div className="mx-auto mt-5 max-w-3xl">
            <RwandaMap values={Object.fromEntries(D.districts.map((x) => [x.district, x[mapKey]]))} format={pct} selected={d.district} caption={MAP_OPTIONS[mapKey]} />
          </div>
          <div className="mt-4"><Note>Shares are survey-weighted estimates from AHS 2024.</Note></div>
        </div>
      </Section>
    </>
  );
}
