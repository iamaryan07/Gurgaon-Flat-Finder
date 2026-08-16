"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getMarket } from "@/lib/api";
import { MultiSelect } from "@/components/multi-select";

const Plot = dynamic(() => import("react-plotly.js").then((module) => module.default), {
  ssr: false,
  loading: () => <p className="loading">Preparing charts…</p>,
});

const RADAR_METRICS = [
  "Price",
  "Built Up Area",
  "Rating",
  "Total Parking",
  "Extra Rooms",
  "Modernity",
  "Furnishing Level",
  "Power Backup Level",
];

const NUMERIC_COLUMNS = [
  "Price",
  "Built Up Area",
  "Rating",
  "Price Per Sqft",
  "Bedroom",
  "Bathroom",
  "Balcony",
  "Floor Num",
  "Total Floor",
  "Total Parking",
  "Extra Rooms",
];

const CATEGORICAL_COLUMNS = ["Property Age", "Furnishing", "Power Backup"];

const baseLayout = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#13241f", family: "Manrope" },
  margin: { l: 50, r: 20, t: 40, b: 50 },
  colorway: ["#1c5845", "#4c8a70", "#c4a86c", "#8b2e23", "#65716a"],
};

export function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState([]);
  const [sector, setSector] = useState("Overall Gurgaon");
  const [x, setX] = useState("Built Up Area");
  const [y, setY] = useState("Price");
  const [dist, setDist] = useState("Bedroom");

  useEffect(() => {
    getMarket("analytics")
      .then((result) => {
        setData(result);
        if (result.sectors?.length) {
          setPicked(result.sectors.slice(0, 3));
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Failed to load analytics."));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    if (sector === "Overall Gurgaon") return data.records;
    return data.records.filter((record) => record.Sector === sector);
  }, [data, sector]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="loading">Loading Analytics Dashboard…</p>;

  const sectors = data.sectors ?? data.sector_stats.map((s) => s.Sector);

  const radar = picked
    .map((name) => {
      const row = data.sector_stats.find((s) => s.Sector === name);
      if (!row) return null;
      const values = RADAR_METRICS.map((metric) => {
        const below = data.sector_stats.filter((s) => s[metric] < row[metric]).length;
        return (below / Math.max(data.sector_stats.length, 1)) * 100;
      });
      return {
        type: "scatterpolar",
        r: values,
        theta: RADAR_METRICS,
        fill: "toself",
        name,
      };
    })
    .filter(Boolean);

  const isNumericX = NUMERIC_COLUMNS.includes(x);
  const bivariate = isNumericX
    ? {
        type: "scatter",
        x: rows.map((r) => r[x]),
        y: rows.map((r) => r[y]),
        mode: "markers",
        marker: { color: "#1c5845", opacity: 0.45 },
      }
    : {
        type: "box",
        x: rows.map((r) => r[x]),
        y: rows.map((r) => r[y]),
        marker: { color: "#1c5845" },
      };

  const xAxisOptions = [...NUMERIC_COLUMNS, ...CATEGORICAL_COLUMNS];
  const yAxisOptions = NUMERIC_COLUMNS;

  return (
    <div className="tool-content analytics">
      <div className="tool-intro">
        <p className="eyebrow">Analytics dashboard</p>
        <h2>Explore the Gurgaon market.</h2>
        <p>
          Sector comparison, price relationships, bivariate analysis and price drivers,
          all computed from the packaged market dataset.
        </p>
      </div>

      <section>
        <h3>Sector comparison radar</h3>
        <MultiSelect
          options={sectors}
          value={picked}
          onChange={setPicked}
          max={5}
          placeholder="Select sectors to compare"
        />
        <Plot
          data={radar}
          layout={{
            ...baseLayout,
            polar: { radialaxis: { range: [0, 100] } },
            showlegend: true,
            height: 470,
          }}
          style={{ width: "100%" }}
        />
      </section>

      <section className="chart-grid">
        <div>
          <h3>Price vs built-up area</h3>
          <Plot
            data={["Unfurnished", "Semi Furnished", "Furnished"].map((furnishing) => ({
              type: "scatter",
              mode: "markers",
              name: furnishing,
              x: rows.filter((r) => r.Furnishing === furnishing).map((r) => r["Built Up Area"]),
              y: rows.filter((r) => r.Furnishing === furnishing).map((r) => r.Price),
              marker: { opacity: 0.5 },
            }))}
            layout={{
              ...baseLayout,
              xaxis: { title: "Area (sq ft)" },
              yaxis: { title: "Price (Cr)" },
              height: 410,
            }}
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <h3>Key price drivers</h3>
          <Plot
            data={[
              {
                type: "bar",
                orientation: "h",
                x: data.feature_importance.map((f) => f.importance).reverse(),
                y: data.feature_importance.map((f) => f.feature).reverse(),
                marker: { color: "#1c5845" },
              },
            ]}
            layout={{ ...baseLayout, height: 410 }}
            style={{ width: "100%" }}
          />
        </div>
      </section>

      <section>
        <h3>Interactive bivariate analysis</h3>
        <div className="compact-form">
          <label>
            Sector
            <select value={sector} onChange={(e) => setSector(e.target.value)}>
              <option>Overall Gurgaon</option>
              {sectors.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            X axis
            <select value={x} onChange={(e) => setX(e.target.value)}>
              {xAxisOptions.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Y axis
            <select value={y} onChange={(e) => setY(e.target.value)}>
              {yAxisOptions.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
        </div>
        <Plot
          data={[bivariate]}
          layout={{
            ...baseLayout,
            xaxis: { title: x },
            yaxis: { title: y },
            height: 440,
          }}
          style={{ width: "100%" }}
        />
      </section>

      <section>
        <h3>Price distribution by feature</h3>
        <select value={dist} onChange={(e) => setDist(e.target.value)}>
          {["Bedroom", "Bathroom", "Furnishing", "Power Backup", "Property Age"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <Plot
          data={[
            {
              type: "violin",
              x: rows.map((r) => r[dist]),
              y: rows.map((r) => r.Price),
              box: { visible: true },
              points: false,
              fillcolor: "#c4e0c8",
              line: { color: "#1c5845" },
            },
          ]}
          layout={{ ...baseLayout, yaxis: { title: "Price (Cr)" }, height: 430 }}
          style={{ width: "100%" }}
        />
      </section>
    </div>
  );
}
