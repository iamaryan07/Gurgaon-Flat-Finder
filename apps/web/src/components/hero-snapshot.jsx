"use client";

import { useEffect, useState } from "react";
import { getMarket } from "@/lib/api";

const BARS = [42, 66, 48, 78, 58, 92, 72];

export function HeroSnapshot() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let active = true;
    getMarket("insights")
      .then((data) => {
        if (active) setOverview(data.overview ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: "Listings analysed",
      value: overview ? overview.properties.toLocaleString() : "—",
    },
    { label: "Sectors covered", value: overview ? overview.sectors.toLocaleString() : "—" },
    {
      label: "Avg ₹ / sq ft",
      value: overview
        ? `₹ ${Math.round(overview.average_price_per_sqft).toLocaleString()}`
        : "—",
    },
  ];

  return (
    <div className="hero-card" aria-label="Live Gurgaon market snapshot">
      <div className="hero-card-head">
        <h3>Gurgaon market snapshot</h3>
        <span className="badge">Live data</span>
      </div>
      <div className="hero-chart" aria-hidden="true">
        {BARS.map((height, index) => (
          <i
            key={index}
            className={index === BARS.length - 2 ? "hot" : ""}
            style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
          />
        ))}
      </div>
      <div className="hero-stats">
        {stats.map((stat) => (
          <div className="hero-stat" key={stat.label}>
            <b>{stat.value}</b>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <p className="hero-mini-row">
        <span className="live-dot">Live market dataset</span>
        <span>Updated continuously</span>
      </p>
    </div>
  );
}
