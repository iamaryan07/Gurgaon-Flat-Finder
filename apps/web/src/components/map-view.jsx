"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

const GURGAON_CENTER = [28.4595, 77.0266];

const PLACES = [
  { name: "Delhi", lat: 28.6139, lon: 77.209, tier: "major" },
  { name: "Noida", lat: 28.5355, lon: 77.391, tier: "major" },
  { name: "Gurgaon", lat: 28.46461, lon: 77.02992, tier: "major" },
  { name: "Faridabad", lat: 28.40315, lon: 77.31056, tier: "major" },
  { name: "Manesar", lat: 28.36173, lon: 76.94022, tier: "major" },
  { name: "Farrukhnagar", lat: 28.44796, lon: 76.82293, tier: "minor" },
  { name: "Hailey Mandi", lat: 28.35075, lon: 76.75735, tier: "minor" },
  { name: "Pataudi", lat: 28.32591, lon: 76.7787, tier: "minor" },
  { name: "Naya Gaon", lat: 28.36683, lon: 77.08379, tier: "minor" },
  { name: "Manger", lat: 28.3787, lon: 77.1752, tier: "minor" },
  { name: "Bhondsi", lat: 28.35048, lon: 77.06187, tier: "minor" },
  { name: "Sohna", lat: 28.24599, lon: 77.0671, tier: "minor" },
];

const STOPS = [
  [0, [255, 255, 204]],
  [0.25, [255, 237, 160]],
  [0.5, [254, 178, 76]],
  [0.75, [240, 59, 32]],
  [1, [189, 0, 38]],
];

function ylOrRd(price, min, max) {
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (price - min) / (max - min)));
  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1][0]) i += 1;
  const [t0, c0] = STOPS[i];
  const [t1, c1] = STOPS[i + 1];
  const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * k);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * k);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function MapView({ geojson, priceMap, priceMin, priceMax }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      GURGAON_CENTER,
      11
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    PLACES.forEach((place) => {
      L.marker([place.lat, place.lon], {
        icon: L.divIcon({
          className: `map-geo-label map-label-${place.tier}`,
          html: place.name,
          iconSize: [180, 20],
          iconAnchor: [90, 10],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    if (map.geoLayer) {
      map.removeLayer(map.geoLayer);
      map.geoLayer = null;
    }

    map.geoLayer = L.geoJSON(geojson, {
      filter(feature) {
        const type = feature.geometry && feature.geometry.type;
        return type === "Polygon" || type === "MultiPolygon";
      },
      style(feature) {
        const name = feature.properties && feature.properties.name;
        const price = name ? priceMap[name] : null;
        if (price == null) {
          return {
            color: "#8a9094",
            weight: 1,
            opacity: 0.85,
            fillColor: "#23272b",
            fillOpacity: 0.35,
          };
        }
        return {
          color: "#101418",
          weight: 0.8,
          opacity: 0.9,
          fillColor: ylOrRd(price, priceMin, priceMax),
          fillOpacity: 0.78,
        };
      },
      onEachFeature(feature, layer) {
        const name = feature.properties && feature.properties.name;
        if (!name) return;
        const price = priceMap[name];
        layer.bindTooltip(
          price == null
            ? `<b>${name}</b><br><i>No price data</i>`
            : `<b>${name}</b><br><br>Average Price: ${price.toFixed(1)} Cr`,
          { sticky: true }
        );
      },
    }).addTo(map);
  }, [geojson, priceMap, priceMin, priceMax]);

  return <div ref={containerRef} className="leaflet-map" />;
}
