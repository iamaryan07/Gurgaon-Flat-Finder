"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getMarket, getPredictionOptions } from "@/lib/api";
import { MultiSelect } from "@/components/multi-select";
import { ChartSkeleton, ErrorState, KpiCard, Skeleton } from "@/components/ui";
import { IconChart, IconMapPin, IconSpark } from "@/components/icons";
import { baseLayout, plotConfig, polarLayout } from "@/lib/chart";

const Plot = dynamic(() => import("react-plotly.js").then((module) => module.default), {
  ssr: false,
  loading: () => <ChartSkeleton />,
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

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [picked, setPicked] = useState([]);
  const [sector, setSector] = useState("Overall Gurgaon");
  const [x, setX] = useState("Built Up Area");
  const [y, setY] = useState("Price");
  const [dist, setDist] = useState("Bedroom");
  const [featureImportance, setFeatureImportance] = useState([]);

  useEffect(() => {
    let active = true;
    getMarket("analytics")
      .then((result) => {
        if (!active) return;
        setData(result);
        if (result.sectors?.length) {
          setPicked(result.sectors.slice(0, 3));
        }
      })
      .catch((caught) => {
        if (!active) return;
        setData(null);
        setError(caught instanceof Error ? caught.message : "Failed to load analytics.");
      });
    getPredictionOptions()
      .then((options) => active && setFeatureImportance(options.feature_importance ?? []))
      .catch(() => active && setFeatureImportance([]));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (sector === "Overall Gurgaon") return data.records;
    return data.records.filter((record) => record.Sector === sector);
  }, [data, sector]);

  const kpis = useMemo(() => {
    if (!data?.records?.length) return null;
    const prices = data.records.map((r) => r.Price).filter((p) => typeof p === "number");
    const perSqft = data.records
      .map((r) => r["Price Per Sqft"])
      .filter((p) => typeof p === "number");
    return {
      listings: data.records.length,
      sectors: (data.sectors ?? []).length,
      medianPrice: median(prices),
      avgPerSqft: perSqft.length
        ? Math.round(perSqft.reduce((sum, value) => sum + value, 0) / perSqft.length)
        : 0,
    };
  }, [data]);

  if (error && !data) {
    return (
      <ErrorState
        title="Analytics could not load"
        message={error}
        onRetry={() => {
          setError("");
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  if (!data) {
    return (
      <div className="analytics-sections" aria-busy="true">
        <div className="kpi-grid" style={{ marginBottom: 0 }}>
          {[0, 1, 2, 3].map((index) => (
            <div className="kpi-card" key={index}>
              <Skeleton style={{ display: "block", width: "60%", height: 12 }} />
              <Skeleton style={{ display: "block", width: "45%", height: 28, marginTop: 14 }} />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="plot-head">
            <div>
              <h3>Preparing charts…</h3>
              <p>Loading the Gurgaon market dataset.</p>
            </div>
          </div>
          <ChartSkeleton />
        </div>
      </div>
    );
  }

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
        marker: { color: "#1b5e4a", opacity: 0.5 },
      }
    : {
        type: "box",
        x: rows.map((r) => r[x]),
        y: rows.map((r) => r[y]),
        marker: { color: "#1b5e4a" },
        fillcolor: "#d9e8df",
      };

  const xAxisOptions = [...NUMERIC_COLUMNS, ...CATEGORICAL_COLUMNS];
  const yAxisOptions = NUMERIC_COLUMNS;

  return (
    <div className="analytics-sections">
      {kpis && (
        <div className="kpi-grid">
          <KpiCard icon={<IconSpark size={14} />} label="Listings analysed" value={kpis.listings.toLocaleString()} />
          <KpiCard icon={<IconMapPin size={14} />} label="Sectors covered" value={kpis.sectors} />
          <KpiCard icon={<IconChart size={14} />} label="Median listing price" value={`₹ ${kpis.medianPrice.toFixed(2)} Cr`} />
          <KpiCard icon={<IconSpark size={14} />} label="Avg price / sq ft" value={`₹ ${kpis.avgPerSqft.toLocaleString()}`} />
        </div>
      )}

      <section className="card section-block">
        <div className="section-block-head">
          <h3>Sector comparison radar</h3>
          <p>
            Each axis ranks a sector against every other sector in the dataset — pick up
            to five to compare.
          </p>
        </div>
        <div style={{ padding: "18px 24px 8px" }}>
          <MultiSelect
            options={sectors}
            value={picked}
            onChange={setPicked}
            max={5}
            placeholder="Select sectors to compare"
          />
        </div>
        <Plot
          data={radar}
          layout={{
            ...polarLayout({ height: 480 }),
          }}
          config={plotConfig}
          style={{ width: "100%" }}
        />
      </section>

      <div className="chart-grid">
        <section className="card section-block">
          <div className="plot-head">
            <div>
              <h3>Price vs built-up area</h3>
              <p>Every listing in the dataset, coloured by furnishing level.</p>
            </div>
          </div>
          <Plot
            data={["Unfurnished", "Semi Furnished", "Furnished"].map((furnishing) => ({
              type: "scatter",
              mode: "markers",
              name: furnishing,
              x: rows.filter((r) => r.Furnishing === furnishing).map((r) => r["Built Up Area"]),
              y: rows.filter((r) => r.Furnishing === furnishing).map((r) => r.Price),
              marker: { opacity: 0.55 },
            }))}
            layout={{
              ...baseLayout({ xaxis: { title: "Area (sq ft)" }, yaxis: { title: "Price (Cr)" } }),
              legend: { orientation: "h", y: -0.18, font: { size: 11.5 } },
              height: 430,
            }}
            config={plotConfig}
            style={{ width: "100%" }}
          />
        </section>

        <section className="card section-block">
          <div className="plot-head">
            <div>
              <h3>Key price drivers</h3>
              <p>Feature importance from the trained valuation model.</p>
            </div>
          </div>
          {featureImportance.length ? (
            <Plot
              data={[
                {
                  type: "bar",
                  orientation: "h",
                  x: featureImportance.map((f) => f.importance).reverse(),
                  y: featureImportance.map((f) => f.feature).reverse(),
                  marker: { color: "#1b5e4a" },
                },
              ]}
              layout={{ ...baseLayout(), margin: { l: 130, r: 18, t: 18, b: 48 }, height: 430 }}
              config={plotConfig}
              style={{ width: "100%" }}
            />
          ) : (
            <div className="plot-box" style={{ paddingInline: 24 }}>
              <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
                Feature importance is not available right now.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="card section-block">
        <div className="plot-head">
          <div>
            <h3>Interactive bivariate analysis</h3>
            <p>Choose any two dimensions and a sector to see how they relate.</p>
          </div>
        </div>
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="bi-sector">Sector</label>
            <div className="select-wrap">
              <select
                id="bi-sector"
                className="select-input"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <option>Overall Gurgaon</option>
                {sectors.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="bi-x">X axis</label>
            <div className="select-wrap">
              <select id="bi-x" className="select-input" value={x} onChange={(e) => setX(e.target.value)}>
                {xAxisOptions.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="bi-y">Y axis</label>
            <div className="select-wrap">
              <select id="bi-y" className="select-input" value={y} onChange={(e) => setY(e.target.value)}>
                {yAxisOptions.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <Plot
          data={[bivariate]}
          layout={{
            ...baseLayout({ xaxis: { title: x }, yaxis: { title: y } }),
            boxgap: 0.4,
            height: 460,
          }}
          config={plotConfig}
          style={{ width: "100%" }}
        />
      </section>

      <section className="card section-block">
        <div className="plot-head">
          <div>
            <h3>Price distribution by feature</h3>
            <p>How listing prices spread across each value of the chosen feature.</p>
          </div>
          <div className="field" style={{ minWidth: 190 }}>
            <label className="field-label" htmlFor="violin-feature">Feature</label>
            <div className="select-wrap">
              <select
                id="violin-feature"
                className="select-input"
                value={dist}
                onChange={(e) => setDist(e.target.value)}
              >
                {["Bedroom", "Bathroom", "Furnishing", "Power Backup", "Property Age"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <Plot
          data={[
            {
              type: "violin",
              x: rows.map((r) => r[dist]),
              y: rows.map((r) => r.Price),
              box: { visible: true },
              points: false,
              fillcolor: "#d9e8df",
              line: { color: "#1b5e4a" },
            },
          ]}
          layout={{
            ...baseLayout({ yaxis: { title: "Price (Cr)" } }),
            height: 450,
          }}
          config={plotConfig}
          style={{ width: "100%" }}
        />
      </section>
    </div>
  );
}
