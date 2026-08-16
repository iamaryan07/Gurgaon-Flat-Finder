"use client";

import { useEffect, useState } from "react";
import { getApi } from "@/lib/api";

const MODES = [
  ["location", "Near a landmark"],
  ["similar", "Similar society"],
  ["hybrid", "Hybrid match"],
];

export function RecommendationTool() {
  const [mode, setMode] = useState("location");
  const [landmarks, setLandmarks] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [landmark, setLandmark] = useState("");
  const [society, setSociety] = useState("");
  const [radius, setRadius] = useState(5);
  const [preference, setPreference] = useState("location");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getApi("recommendations/landmarks")
      .then((result) => {
        setLandmarks(result);
        setLandmark(result[0] ?? "");
      })
      .catch(() => setError("Could not load landmarks."));
    getApi("recommendations/societies")
      .then((result) => {
        setSocieties(result);
        setSociety(result[0] ?? "");
      })
      .catch(() => setError("Could not load societies."));
  }, []);

  async function search(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      let url;
      if (mode === "location") {
        url = `recommendations/location?landmark=${encodeURIComponent(landmark)}&radius=${radius}`;
      } else if (mode === "similar") {
        url = `recommendations/similar?property_name=${encodeURIComponent(society)}`;
      } else {
        url = `recommendations/hybrid?property_name=${encodeURIComponent(society)}&preference=${preference}`;
      }
      setItems(await getApi(url));
    } catch (caught) {
      setItems([]);
      setError(caught instanceof Error ? caught.message : "Recommendations unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tool-content">
      <div className="tool-intro">
        <p className="eyebrow">Society recommender</p>
        <h2>Find your next shortlist.</h2>
        <p>
          Three retrieval modes: landmark radius, similar configuration, or a hybrid
          blend of location and price.
        </p>
      </div>

      <div className="mode-tabs">
        {MODES.map(([id, label]) => (
          <button
            className={mode === id ? "selected" : ""}
            onClick={() => {
              setMode(id);
              setItems([]);
              setError("");
            }}
            key={id}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="compact-form recommendation-form" onSubmit={search}>
        {mode === "location" ? (
          <>
            <label>
              Landmark
              <select value={landmark} onChange={(e) => setLandmark(e.target.value)}>
                {landmarks.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Radius (km)
              <input
                type="number"
                min="1"
                max="30"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Society
              <select value={society} onChange={(e) => setSociety(e.target.value)}>
                {societies.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            {mode === "hybrid" && (
              <label>
                Prioritise
                <select value={preference} onChange={(e) => setPreference(e.target.value)}>
                  <option value="location">Location similarity</option>
                  <option value="price">Price &amp; configuration</option>
                </select>
              </label>
            )}
          </>
        )}
        <button disabled={loading}>{loading ? "Searching…" : "Find recommendations"}</button>
      </form>

      {error && <p className="error">{error}</p>}

      {items.length > 0 && (
        <div className="match-grid">
          {items.map((item, index) => (
            <article key={`${item.property_name}-${index}`}>
              <span>
                {item.sector}
                {item.distance_km ? ` · ${item.distance_km} km` : ""}
              </span>
              <b>{item.property_name}</b>
              <p>
                {item.bedroom} BHK · {item.area.toLocaleString()} ft² · ₹ {item.price} Cr
              </p>
              <a href={item.url} target="_blank" rel="noreferrer">
                View listing →
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
