import { useState } from "react";
import { Link } from "react-router-dom";
import { Award, BarChart3, MapPinned, TrendingDown } from "lucide-react";
import { useData } from "../data";
import { cropText, fmt, pct } from "../format";
import RwandaMap from "../components/RwandaMap";
import { BarList, Card, DataTable, Headline, Note, PageHero, RankList, Section, StatCard } from "../components/ui";

export default function Productivity() {
  const D = useData();
  const [crop, setCrop] = useState("Maize");
  const c = D.getCrop(crop);
  const rows = D.districtsForCrop(crop);
  const gaps = rows.map((r) => D.getGap(r.district, crop)).filter(Boolean).sort((a, b) => b.gap - a.gap);
  const best = [...rows].sort((a, b) => b.median - a.median)[0];
  const effects = D.getEffects(crop).filter((e) => e.effect > 0 && e.practice !== "irrigated").sort((a, b) => b.sig - a.sig || b.effect - a.effect);
  const scenarios = D.scenarios.filter((s) => s.crop === crop).sort((a, b) => b.gain - a.gain);
  const modelRow = D.model.byCrop.find((m) => m.crop === crop);
  const M = D.model.overall;

  return (
    <>
      <PageHero compact eyebrow="Compare harvests" challenge="Agricultural productivity" title="How much each district harvests, and why"
        intro="Typical yields for every crop and district, the gap to Rwanda's better farms, and the practices linked to closing it." />

      <div className="wrap relative z-10 -mt-14">
        <div className="card flex flex-wrap items-end gap-4 p-5">
          <div className="min-w-[240px]">
            <label className="label" htmlFor="crop">Choose a crop</label>
            <select id="crop" className="field" value={crop} onChange={(e) => setCrop(e.target.value)}>{D.farmCrops.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <p className="max-w-xl text-[15px] text-nisr-muted">Every number below updates for the crop you choose. Based on {fmt(c.n)} surveyed {cropText(crop)} plots.</p>
        </div>
      </div>

      <div className="wrap mt-8">
        {gaps.length > 0 && (
          <Headline>
            A typical {cropText(crop)} farm in Rwanda harvests <b>{fmt(c.median)} kg/ha</b>; the best quarter reach <b>{fmt(c.p75)} kg/ha</b> or more. In {gaps[0].district} the typical farm gets {fmt(gaps[0].median)} kg/ha, <b>{pct(gaps[0].gap)} below</b> that level{best ? `, while ${best.district} leads with ${fmt(best.median)} kg/ha` : ""}.
          </Headline>
        )}
      </div>

      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BarChart3} value={`${fmt(c.median)}`} label="kg/ha on a typical farm" note={`Middle half: ${fmt(c.p25)}–${fmt(c.p75)}`} />
          <StatCard icon={Award} tone="green" value={`${fmt(c.p75)}`} label="kg/ha: the best quarter of farms" note={`Top tenth: ${fmt(c.p90)}+`} />
          <StatCard icon={TrendingDown} tone="red" value={pct(c.decreased)} label="produced less than last season" note="As reported by farmers" />
          <StatCard icon={MapPinned} tone="grey" value={rows.length} label="districts with enough data" note="30+ surveyed plots each" />
        </div>
      </Section>

      <Section alt title={`${crop} yield across Rwanda`} intro="Typical yield in each district. Click a district for its profile.">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="card p-6"><RwandaMap values={Object.fromEntries(rows.map((r) => [r.district, r.median]))} format={(v) => `${fmt(v)} kg/ha`} caption={`${crop} yield`} /></div>
          <Card title="Furthest behind" subtitle={`Gap between the district's typical farm and the best quarter of farms nationally (${fmt(c.p75)} kg/ha).`}>
            {gaps.length ? <RankList rows={gaps.slice(0, 6).map((g) => ({ label: g.district, value: g.gap, display: `−${pct(g.gap)}` }))} /> : <p className="text-nisr-muted">Not enough district data.</p>}
          </Card>
        </div>
      </Section>

      <Section title={`What goes with bigger ${cropText(crop)} harvests`} intro="Yield difference on plots that use each practice compared with similar plots that don't (same district and season).">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Practices" subtitle="Faded: not statistically clear.">
            {effects.length ? <BarList rows={effects.map((e) => ({ label: e.label, value: e.effect, display: pct(e.effect, true), faint: !e.sig }))} />
              : <p className="text-nisr-muted">No practice shows a clear link for this crop.</p>}
            {effects.filter((e) => e.sig).length > 0 && (
              <ul className="mt-5 grid gap-1.5 text-sm text-nisr-muted">
                {effects.filter((e) => e.sig).map((e) => (
                  <li key={e.practice}><b className="text-nisr-navy">{e.label}:</b> {pct(e.effect, true)} (likely between {pct(e.low, true)} and {pct(e.high, true)}), {fmt(e.users)} plots use it.</li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="If more farms used better inputs" subtitle="Model-estimated change in typical yield if plots without improved seed or fertilizer adopted them.">
            {scenarios.length ? (
              <>
                <p className="mb-3 text-sm text-nisr-muted">Inputs included for {cropText(crop)}: {scenarios[0].inputs.toLowerCase()}.</p>
                <BarList rows={scenarios.slice(0, 8).map((s) => ({ label: s.district, value: s.gain, display: `${pct(s.gain, true)} → ${fmt(s.withInputs)} kg/ha`, to: `/districts/${encodeURIComponent(s.district)}` }))} />
              </>
            ) : <p className="text-nisr-muted">The model doesn't cover this crop, or too few farmers use these inputs on it to compare.</p>}
          </Card>
        </div>
        <div className="mt-5"><Note>Model estimates and survey links show where gains are likely, not guaranteed results. Weather, pests and soil quality are not in the survey.</Note></div>
      </Section>

      <Section alt title="All crops compared" intro="National typical yields and input use for every crop with 30+ surveyed plots.">
        <div className="card p-5">
          <DataTable rows={D.crops} filename="harvestgap_crop_yields.csv" initialSort={{ key: "n", dir: -1 }}
            columns={[
              { key: "crop", label: "Crop", render: (r) => <button className="font-semibold text-nisr-blue hover:underline" onClick={() => D.farmCrops.includes(r.crop) && setCrop(r.crop)}>{r.crop}</button> },
              { key: "group", label: "Group" },
              { key: "n", label: "Plots", numeric: true, render: (r) => fmt(r.n) },
              { key: "median", label: "Typical kg/ha", numeric: true, render: (r) => fmt(r.median) },
              { key: "p75", label: "Best quarter from", numeric: true, render: (r) => fmt(r.p75) },
              { key: "seed", label: "Improved seed", numeric: true, render: (r) => pct(r.seed) },
              { key: "fert", label: "Fertilizer", numeric: true, render: (r) => pct(r.fert) },
              { key: "decreased", label: "Output fell", numeric: true, render: (r) => pct(r.decreased) },
            ]} />
        </div>
      </Section>

      <Section title="How good is the yield model?">
        <div className="grid gap-5 md:grid-cols-3">
          <Card><span className="text-sm font-bold text-nisr-muted">Explains yield differences</span><b className="num block font-display text-4xl text-nisr-navy">{pct(M.model.r2_log)}</b><p className="mt-1 text-sm text-nisr-muted">vs {pct(M.baseline_crop_district_median.r2_log)} for a simple crop-and-district average.</p></Card>
          <Card><span className="text-sm font-bold text-nisr-muted">Tested on</span><b className="num block font-display text-4xl text-nisr-navy">{fmt(M.n_obs)}</b><p className="mt-1 text-sm text-nisr-muted">plots, {M.folds}-fold cross-validation grouped by survey area.</p></Card>
          <Card><span className="text-sm font-bold text-nisr-muted">For {cropText(crop)}</span><b className="num block font-display text-4xl text-nisr-navy">{modelRow ? pct(modelRow.r2) : "—"}</b><p className="mt-1 text-sm text-nisr-muted">{modelRow ? `vs ${pct(modelRow.r2Baseline)} for the simple average.` : "Not modelled (too few plots)."}</p></Card>
        </div>
        <p className="mt-5 text-[15px] text-nisr-muted">Details in <Link className="font-bold" to="/about">data and method</Link>.</p>
      </Section>
    </>
  );
}
