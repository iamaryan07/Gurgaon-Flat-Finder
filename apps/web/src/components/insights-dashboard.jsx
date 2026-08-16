"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getMarket } from "@/lib/api";
import { WhatIfStudio } from "@/components/what-if-studio";

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

function rupees(crore) {
  return `₹ ${Number(crore).toFixed(2)} Cr`;
}

export function InsightsDashboard() {
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMarket("insights")
      .then(setInsights)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Insights unavailable.")
      );
  }, []);

  if (error && !insights) return <p className="error">{error}</p>;
  if (!insights) return <p className="loading">Loading market insights…</p>;

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

      <WhatIfStudio />

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
