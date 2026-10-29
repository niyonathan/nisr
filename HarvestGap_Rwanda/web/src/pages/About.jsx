import { useData } from "../data";
import { fmt, pct } from "../format";
import { Card, DataTable, PageHero, Section } from "../components/ui";

function Step({ n, title, children }) {
  return (
    <li className="card flex gap-4 p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nisr-blue font-display text-white">{n}</span>
      <div><h3 className="text-lg">{title}</h3><div className="mt-1 text-[15px] text-nisr-muted">{children}</div></div>
    </li>
  );
}

export default function About() {
  const D = useData();
  const M = D.model.overall;
  return (
    <>
      <PageHero compact eyebrow="About & Method" title="How HarvestGap works"
        intro="The data behind every number on this site, how it was analysed, and what it can and can't tell you." />

      <Section title="The data">
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Agricultural Household Survey 2024">
            <p className="text-[15px] text-nisr-muted">
              Collected by the National Institute of Statistics of Rwanda (NISR) and published on its microdata portal. It covers {fmt(D.survey.households)} farming households in all {D.survey.districts} districts and records {fmt(D.survey.cropRecords)} crops on their plots across Seasons A, B and C: plot area, harvest, seed, fertilizer, pesticide, irrigation, soil conservation, extension advice, livestock, fruit and household characteristics.
            </p>
          </Card>
          <Card title="Privacy">
            <p className="text-[15px] text-nisr-muted">
              NISR microdata may not be redistributed. This site only publishes survey-weighted summaries, and any group with fewer than 30 plots is left out. No household or plot record is included in the website or the public code repository.
            </p>
          </Card>
        </div>
      </Section>

      <Section alt title="The method, step by step">
        <ol className="grid gap-4">
          <Step n={1} title="Yield for every crop on every plot">
            Yield (kg/ha) = harvest ÷ (plot area × the crop's share of the plot). {fmt(D.survey.validYields)} crop records have a usable yield; plots under 10 m² and extreme values (beyond 3× the interquartile range of that crop's log-yield) are excluded.
          </Step>
          <Step n={2} title="Weighted to represent Rwanda">
            Every average, share and percentile uses the AHS survey weights, so results describe all of Rwanda's farms, not just the ones visited. "Typical" means the median; "best quarter" means the 75th percentile.
          </Step>
          <Step n={3} title="Comparing similar plots">
            For each crop, a regression compares the log-yield of plots that use a practice with plots that don't, holding district, season, plot size, crop share, intercropping, soil threats and household characteristics constant. Uncertainty accounts for plots in the same survey area being alike (clustered standard errors). Results are reported as % difference with a 95% range.
          </Step>
          <Step n={4} title="A yield model for 'what if' estimates">
            Gradient-boosted trees predict yield for {M.n_crops} major crops. Tested with {M.folds}-fold cross-validation where whole survey areas are held out, the model explains {pct(M.model.r2_log)} of yield differences (log scale), against {pct(M.baseline_crop_district_median.r2_log)} for a crop-and-district average. Scenarios only switch on an input for crops where at least 5% of plots already use it.
          </Step>
        </ol>
      </Section>

      <Section title="What the results can and can't say">
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Associations, not guarantees">
            <p className="text-[15px] text-nisr-muted">
              The survey observes farms; it doesn't run experiments. Farmers who use fertilizer may also have better soil or more experience. That's why the site says practices are "linked to" bigger harvests, not that they "cause" them.
            </p>
          </Card>
          <Card title="Known gaps">
            <ul className="grid list-disc gap-1 pl-5 text-[15px] text-nisr-muted">
              <li>No weather, pest or soil-test data, so single-farm estimates stay uncertain.</li>
              <li>No direct measure of storage losses or export values.</li>
              <li>Kigali's urban districts have few farming households; their figures are less precise.</li>
              <li>Irrigation's effect on yield can't be fairly measured, because irrigated plots are mostly dry-season vegetables and marshland rice.</li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section alt title="Model accuracy by crop" intro="Share of yield differences explained (log scale) in cross-validation, compared with a crop-and-district average.">
        <div className="card p-5">
          <DataTable rows={D.model.byCrop} initialSort={{ key: "n", dir: -1 }} maxHeight={420}
            columns={[
              { key: "crop", label: "Crop" },
              { key: "n", label: "Plots", numeric: true, render: (r) => fmt(r.n) },
              { key: "r2", label: "Model", numeric: true, render: (r) => pct(r.r2) },
              { key: "r2Baseline", label: "Simple average", numeric: true, render: (r) => pct(r.r2Baseline) },
            ]} />
        </div>
      </Section>

      <Section title="Credits">
        <Card title="Sources and licences" className="max-w-3xl">
          <ul className="grid gap-1.5 text-[15px] text-nisr-muted">
            <li>Survey data: NISR, Agricultural Household Survey 2024.</li>
            <li>District boundaries: geoBoundaries (Runfola et al. 2020), source Open Data Rwanda, CC BY 4.0.</li>
            <li>Built with React, Tailwind CSS, Recharts and Lucide icons; analysis in Python (pandas, statsmodels, scikit-learn).</li>
            <li>NISR Big Data Hackathon 2026 · Track 1: Agricultural Productivity.</li>
          </ul>
        </Card>
      </Section>
    </>
  );
}
