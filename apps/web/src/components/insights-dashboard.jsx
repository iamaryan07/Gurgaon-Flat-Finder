"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getMarket, predictPrice } from "@/lib/api";
import { SectorAlternatives } from "@/components/sector-alternatives";

const Plot = dynamic(() => import("react-plotly.js").then((module) => module.default), {
  ssr: false,
  loading: () => <p className="loading">Preparing charts…</p>,
});

const baseLayout = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#13241f", family: "Manrope" },
  margin: { l: 50, r: 20, t: 40, b: 50 },
  colorway: ["#1c5845", "#4c8a70", "#c4a86c"],
};

const WHAT_IF_FEATURES = [
  ["built_up_area", "Built-up area (ft²)", 50],
  ["bedroom", "Bedrooms", 1],
  ["bathroom", "Bathrooms", 1],
  ["rating", "Rating", 0.1],
  ["floor_num", "Floor number", 1],
];

const base = {
  sector: "Sector 65",
  built_up_area: 1500,
  bedroom: 3,
  bathroom: 3,
  balcony: 2,
  floor_num: 5,
  total_floor: 15,
  property_age: "1 to 5 Year Old",
  furnishing: "Semi Furnished",
  power_backup: "Full",
  covered_parking: 1,
  open_parking: 0,
  rating: 3.8,
  nearby: "Education",
  overlooking: "Club",
  servant_room: false,
  store_room: false,
  study_room: false,
};

function rupees(crore) {
  return `₹ ${Number(crore).toFixed(2)} Cr`;
}

export function InsightsDashboard() {
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  const [feature, setFeature] = useState("built_up_area");
  const [from, setFrom] = useState(1500);
  const [to, setTo] = useState(1800);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    getMarket("insights")
      .then(setInsights)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Insights unavailable.")
      );
  }, []);

  async function calculate(event) {
    event.preventDefault();
    setCalculating(true);
    try {
      const before = { ...base, [feature]: Number(from) };
      const after = { ...base, [feature]: Number(to) };
      const [a, b] = await Promise.all([predictPrice(before), predictPrice(after)]);
      setResult({ a, b });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Comparison failed.");
    } finally {
      setCalculating(false);
    }
  }

  if (error && !insights) return <p className="error">{error}</p>;
  if (!insights) return <p className="loading">Loading market insights…</p>;

  const step = WHAT_IF_FEATURES.find(([id]) => id === feature)?.[2] ?? 1;

  return (
    <div className="tool-content insights">
      <div className="tool-intro">
        <p className="eyebrow">Market insights</p>
        <h2>What the numbers say.</h2>
        <p>
          Summary statistics, price drivers and sector findings computed live from the
          packaged Gurgaon market dataset.
        </p>
      </div>

      <div className="metric-row">
        <article>
          <b>{insights.overview.properties.toLocaleString()}</b>
          <span>Listings analysed</span>
        </article>
        <article>
          <b>{insights.overview.sectors}</b>
          <span>Sectors covered</span>
        </article>
        <article>
          <b>{rupees(insights.overview.average_price)}</b>
          <span>Average price</span>
        </article>
        <article>
          <b>₹ {insights.overview.average_price_per_sqft.toLocaleString()}</b>
          <span>Avg price / sq ft</span>
        </article>
      </div>

      <div className="data-panel">
        <div>
          <h3>Price distribution</h3>
          <p>
            Listings range from ₹ {insights.price_quantiles.min} Cr to ₹{" "}
            {insights.price_quantiles.max} Cr, with a median of ₹{" "}
            {insights.price_quantiles.median} Cr.
          </p>
          <div className="bars">
            {[
              ["25th percentile", insights.price_quantiles.p25],
              ["Median", insights.price_quantiles.median],
              ["75th percentile", insights.price_quantiles.p75],
            ].map(([label, value]) => (
              <div className="bar" key={label}>
                <span>{label}</span>
                <i style={{ width: `${Math.min((value / insights.price_quantiles.max) * 100, 100)}%` }} />
                <strong>{rupees(value)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3>Average price by bedroom</h3>
          <Plot
            data={[
              {
                type: "bar",
                x: insights.price_by_bedroom.map((r) => `${r.Bedroom} BHK`),
                y: insights.price_by_bedroom.map((r) => r.average),
                marker: { color: "#1c5845" },
              },
            ]}
            layout={{ ...baseLayout, yaxis: { title: "Price (Cr)" }, height: 360 }}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <section>
        <h3>What drives price?</h3>
        <Plot
          data={[
            {
              type: "bar",
              orientation: "h",
              x: insights.price_drivers.map((d) => d.correlation).reverse(),
              y: insights.price_drivers.map((d) => d.feature).reverse(),
              marker: { color: "#1c5845" },
            },
          ]}
          layout={{ ...baseLayout, xaxis: { title: "Correlation with price" }, height: 380 }}
          style={{ width: "100%" }}
        />
      </section>

      <div className="insight-grid">
        <SectorList title="Most expensive sectors" items={insights.expensive_sectors} metric="average_price" />
        <SectorList title="Most affordable sectors" items={insights.affordable_sectors} metric="average_price" />
        <SectorList title="Best value (₹/sq ft)" items={insights.best_value_sectors} metric="average_price_per_sqft" />
      </div>

      <section>
        <h3>What-if studio</h3>
        <p className="data-note">
          Hold a typical Gurgaon property constant and test the impact of a single
          feature on the model estimate.
        </p>
        <form className="compact-form insight-form" onSubmit={calculate}>
          <label>
            Feature
            <select value={feature} onChange={(e) => setFeature(e.target.value)}>
              {WHAT_IF_FEATURES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Current value
            <input type="number" value={from} step={step} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            New value
            <input type="number" value={to} step={step} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button disabled={calculating}>{calculating ? "Comparing…" : "Compare values"}</button>
        </form>

        {result && (
          <div className="impact">
            <div>
              <span>Current estimate</span>
              <b>{rupees(result.a.predicted_price_crore)}</b>
            </div>
            <div>
              <span>New estimate</span>
              <b>{rupees(result.b.predicted_price_crore)}</b>
            </div>
            <div className="delta">
              <span>Estimated change</span>
              <b>
                {(result.b.predicted_price_crore - result.a.predicted_price_crore) >= 0 ? "+" : ""}
                {rupees(result.b.predicted_price_crore - result.a.predicted_price_crore)}
              </b>
            </div>
          </div>
        )}
      </section>
      <SectorAlternatives />
    </div>
  );
}

function SectorList({ title, items, metric }) {
  return (
    <article className="sector-card">
      <h3>{title}</h3>
      {items.map((item) => (
        <div className="sector-row" key={item.Sector}>
          <b>{item.Sector}</b>
          <span>
            {metric === "average_price_per_sqft"
              ? `₹ ${Math.round(item[metric]).toLocaleString()} / sq ft`
              : rupees(item[metric])}
          </span>
          <small>{item.listings} listings</small>
        </div>
      ))}
    </article>
  );
}
