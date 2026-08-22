"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getMarket } from "@/lib/api";
import { WhatIfStudio } from "@/components/what-if-studio";
import { ChartSkeleton, ErrorState, KpiCard, Skeleton, rupees } from "@/components/ui";
import { IconChart, IconMapPin, IconSpark } from "@/components/icons";
import { baseLayout, plotConfig } from "@/lib/chart";

const Plot = dynamic(() => import("react-plotly.js").then((module) => module.default), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

function SectorList({ title, items, metric }) {
  const format = (item) =>
    metric === "average_price_per_sqft"
      ? `₹ ${Math.round(item[metric]).toLocaleString()} / sq ft`
      : rupees(item[metric]);
  return (
    <article className="card" style={{ padding: "22px 24px" }}>
      <h3 style={{ fontSize: 17 }}>{title}</h3>
      <div className="rank-list" style={{ marginTop: 10 }}>
        {items.map((item, index) => (
          <div className="rank-row" key={item.Sector}>
            <span className="rank-num">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <div className="rank-name">{item.Sector}</div>
              <small className="rank-meta">{item.listings} listings</small>
            </div>
            <span className="rank-value">{format(item)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function InsightsDashboard() {
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getMarket("insights")
      .then((data) => active && setInsights(data))
      .catch((caught) => {
        if (!active) return;
        setInsights(null);
        setError(caught instanceof Error ? caught.message : "Insights unavailable.");
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (error && !insights) {
    return (
      <ErrorState
        title="Insights could not load"
        message={error}
        onRetry={() => {
          setError("");
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  if (!insights) {
    return (
      <div aria-busy="true">
        <WhatIfStudio />
        <div className="kpi-grid">
          {[0, 1, 2, 3].map((index) => (
            <KpiCard key={index} label="" loading icon={null} />
          ))}
        </div>
        <div className="data-panel">
          {[0, 1].map((index) => (
            <div className="card data-panel-cell" key={index}>
              <Skeleton style={{ display: "block", width: "40%", height: 18 }} />
              <Skeleton style={{ display: "block", width: "100%", height: 200, borderRadius: 14 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <WhatIfStudio />

      <div className="kpi-grid">
        <KpiCard
          icon={<IconChart size={14} />}
          label="Listings analysed"
          value={insights.overview.properties.toLocaleString()}
        />
        <KpiCard
          icon={<IconMapPin size={14} />}
          label="Sectors covered"
          value={insights.overview.sectors}
        />
        <KpiCard
          icon={<IconSpark size={14} />}
          label="Average price"
          value={rupees(insights.overview.average_price)}
        />
        <KpiCard
          icon={<IconChart size={14} />}
          label="Avg price / sq ft"
          value={`₹ ${insights.overview.average_price_per_sqft.toLocaleString()}`}
        />
      </div>

      <div className="data-panel">
        <section className="card data-panel-cell">
          <div>
            <h3>Price distribution</h3>
            <p style={{ marginTop: 6 }}>
              Listings range from ₹ {insights.price_quantiles.min} Cr to ₹{" "}
              {insights.price_quantiles.max} Cr, with a median of ₹{" "}
              {insights.price_quantiles.median} Cr.
            </p>
          </div>
          <div className="quantiles">
            {[
              ["25th percentile", insights.price_quantiles.p25],
              ["Median", insights.price_quantiles.median],
              ["75th percentile", insights.price_quantiles.p75],
            ].map(([label, value]) => (
              <div className="quantile-row" key={label}>
                <span>{label}</span>
                <div className="quantile-track">
                  <i
                    className="quantile-fill"
                    style={{
                      display: "block",
                      width: `${Math.min((value / insights.price_quantiles.max) * 100, 100)}%`,
                    }}
                  />
                </div>
                <strong>{rupees(value)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card data-panel-cell">
          <h3>Average price by bedroom</h3>
          <Plot
            data={[
              {
                type: "bar",
                x: insights.price_by_bedroom.map((r) => `${r.Bedroom} BHK`),
                y: insights.price_by_bedroom.map((r) => r.average),
                marker: { color: "#1b5e4a" },
              },
            ]}
            layout={{
              ...baseLayout({ yaxis: { title: "Price (Cr)" } }),
              margin: { l: 56, r: 16, t: 10, b: 42 },
              height: 320,
            }}
            config={plotConfig}
            style={{ width: "100%" }}
          />
        </section>
      </div>

      <section className="card section-block" style={{ marginTop: 18 }}>
        <div className="plot-head">
          <div>
            <h3>What drives price?</h3>
            <p>Correlation between each feature and listing price across the dataset.</p>
          </div>
        </div>
        <Plot
          data={[
            {
              type: "bar",
              orientation: "h",
              x: insights.price_drivers.map((d) => d.correlation).reverse(),
              y: insights.price_drivers.map((d) => d.feature).reverse(),
              marker: { color: "#1b5e4a" },
            },
          ]}
          layout={{
            ...baseLayout({ xaxis: { title: "Correlation with price" } }),
            margin: { l: 130, r: 18, t: 18, b: 52 },
            height: 400,
          }}
          config={plotConfig}
          style={{ width: "100%" }}
        />
      </section>

      <div className="sector-grid" style={{ marginTop: 18 }}>
        <SectorList title="Most expensive sectors" items={insights.expensive_sectors} metric="average_price" />
        <SectorList title="Most affordable sectors" items={insights.affordable_sectors} metric="average_price" />
        <SectorList title="Best value (₹/sq ft)" items={insights.best_value_sectors} metric="average_price_per_sqft" />
      </div>
    </div>
  );
}
