"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { getMarket } from "@/lib/api";
import { ErrorState, Skeleton } from "@/components/ui";
import { IconMapPin } from "@/components/icons";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 24 }} aria-label="Loading map">
      <Skeleton style={{ display: "block", width: "100%", height: 480, borderRadius: 14 }} />
    </div>
  ),
});

export function GeoMap() {
  const [sectors, setSectors] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      getMarket("sectors"),
      fetch("/map.geojson").then((response) => {
        if (!response.ok) throw new Error("Sector boundaries could not be loaded.");
        return response.json();
      }),
    ])
      .then(([sectorData, geoData]) => {
        if (!active) return;
        setSectors(sectorData);
        setGeojson(geoData);
      })
      .catch((caught) => {
        if (active) {
          setSectors(null);
          setGeojson(null);
          setError(caught instanceof Error ? caught.message : "Map data unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

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

  if (error) {
    return (
      <ErrorState
        title="The price map could not load"
        message={error}
        onRetry={() => {
          setError("");
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  if (!sectors || !geojson) {
    return (
      <div className="card" aria-busy="true">
        <div className="map-head">
          <div>
            <p className="eyebrow">Gurgaon property price map</p>
            <h3>Average price by sector</h3>
            <p>Hover any sector boundary to see its average listing price.</p>
          </div>
        </div>
        <div className="map-frame" style={{ marginInline: 24 }}>
          <Skeleton style={{ display: "block", width: "100%", height: 520, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="card map-card">
      <div className="map-head">
        <div>
          <p className="eyebrow">Gurgaon property price map</p>
          <h3>Average price by sector</h3>
          <p>
            Darker sectors command higher average prices. Hover any boundary for the
            exact figure.
          </p>
        </div>
        <span className="badge badge-neutral">
          <IconMapPin size={13} />
          {sectors.length} sectors
        </span>
      </div>
      <div className="map-frame">
        <MapView
          geojson={geojson}
          priceMap={priceMap}
          priceMin={priceMin}
          priceMax={priceMax}
        />
      </div>
      <div className="map-legend">
        <span>₹ {priceMin.toFixed(1)} Cr</span>
        <div className="map-legend-gradient" aria-hidden="true" />
        <span>₹ {priceMax.toFixed(1)} Cr</span>
      </div>
    </div>
  );
}
