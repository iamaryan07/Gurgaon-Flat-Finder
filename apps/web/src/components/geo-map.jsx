"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getMarket } from "@/lib/api";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <p className="loading">Loading map…</p>,
});

export function GeoMap() {
  const [sectors, setSectors] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getMarket("sectors"),
      fetch("/map.geojson").then((response) => {
        if (!response.ok) throw new Error("Sector boundaries could not be loaded.");
        return response.json();
      }),
    ])
      .then(([sectorData, geoData]) => {
        setSectors(sectorData);
        setGeojson(geoData);
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Map data unavailable.")
      );
  }, []);

  const { priceMap, priceMin, priceMax } = useMemo(() => {
    const map = {};
    const prices = [];
    for (const sector of sectors ?? []) {
      map[sector.Sector] = sector.average_price;
      prices.push(sector.average_price);
    }
    return {
      priceMap: map,
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 1,
    };
  }, [sectors]);

  if (error) return <p className="error">{error}</p>;
  if (!sectors || !geojson) return <p className="loading">Loading price map…</p>;

  return (
    <div className="geo-map">
      <div className="geo-map-header">
        <div>
          <p className="eyebrow">Gurgaon property price map</p>
          <h3>Average price by sector</h3>
        </div>
        <p className="geo-map-legend">{sectors.length} sectors</p>
      </div>
      <MapView
        geojson={geojson}
        priceMap={priceMap}
        priceMin={priceMin}
        priceMax={priceMax}
      />
      <div className="map-legend">
        <span>₹ {priceMin.toFixed(1)} Cr</span>
        <div className="map-legend-gradient" />
        <span>₹ {priceMax.toFixed(1)} Cr</span>
      </div>
    </div>
  );
}
