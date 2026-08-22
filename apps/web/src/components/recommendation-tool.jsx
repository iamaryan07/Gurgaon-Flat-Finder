"use client";

import { useEffect, useState } from "react";
import { getApi } from "@/lib/api";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { IconArrowRight, IconMapPin } from "@/components/icons";

const MODES = [
  ["location", "Near a landmark"],
  ["similar", "Similar society"],
  ["hybrid", "Hybrid match"],
];

function PropertyCard({ item, index }) {
  return (
    <article className="prop-card" style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}>
      <div className="prop-tags">
        <span className="badge">{item.sector}</span>
        {item.distance_km ? (
          <span className="badge badge-neutral">
            <IconMapPin size={12} />
            {item.distance_km} km away
          </span>
        ) : null}
      </div>
      <h3 className="prop-name">{item.property_name}</h3>
      <p className="prop-price">₹ {item.price} Cr</p>
      <div className="prop-specs">
        <span>{item.bedroom} BHK</span>
        <span>{item.area.toLocaleString()} sq ft</span>
      </div>
      <a className="prop-link" href={item.url} target="_blank" rel="noreferrer">
        View listing
        <IconArrowRight size={14} />
      </a>
    </article>
  );
}

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
    let active = true;
    Promise.all([getApi("recommendations/landmarks"), getApi("recommendations/societies")])
      .then(([landmarkList, societyList]) => {
        if (!active) return;
        setLandmarks(landmarkList);
        setLandmark(landmarkList[0] ?? "");
        setSocieties(societyList);
        setSociety(societyList[0] ?? "");
      })
      .catch(() => {
        if (active) setError("Could not load landmarks and societies. Check your connection and retry.");
      });
    return () => {
      active = false;
    };
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

  function changeMode(next) {
    setMode(next);
    setItems([]);
    setError("");
  }

  return (
    <div>
      <div className="segmented" role="tablist" aria-label="Recommendation mode">
        {MODES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? "selected" : ""}
            onClick={() => changeMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="rec-controls" onSubmit={search}>
        {mode === "location" ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="rec-landmark">Landmark</label>
              <div className="select-wrap">
                <select
                  id="rec-landmark"
                  className="select-input"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                >
                  {landmarks.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="rec-radius">
                Radius
                <span className="field-unit">km</span>
              </label>
              <input
                id="rec-radius"
                className="input"
                type="number"
                min="1"
                max="30"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label className="field-label" htmlFor="rec-society">Society</label>
              <div className="select-wrap">
                <select
                  id="rec-society"
                  className="select-input"
                  value={society}
                  onChange={(e) => setSociety(e.target.value)}
                >
                  {societies.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            {mode === "hybrid" && (
              <div className="field">
                <label className="field-label" htmlFor="rec-preference">Prioritise</label>
                <div className="select-wrap">
                  <select
                    id="rec-preference"
                    className="select-input"
                    value={preference}
                    onChange={(e) => setPreference(e.target.value)}
                  >
                    <option value="location">Location similarity</option>
                    <option value="price">Price &amp; configuration</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
        <button className="btn" type="submit" disabled={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Searching…" : "Find recommendations"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 22 }}>
          <ErrorState title="Search failed" message={error} onRetry={() => changeMode(mode)} />
        </div>
      )}

      {loading && (
        <div className="property-grid" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div className="prop-card" key={index}>
              <Skeleton style={{ display: "block", width: 90, height: 24, borderRadius: 999 }} />
              <Skeleton style={{ display: "block", width: "80%", height: 20 }} />
              <Skeleton style={{ display: "block", width: "45%", height: 26 }} />
              <Skeleton style={{ display: "block", width: "100%", height: 14 }} />
              <Skeleton style={{ display: "block", width: "35%", height: 14 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <p style={{ marginTop: 26, color: "var(--muted)", fontSize: 13.5, fontWeight: 600 }}>
            {items.length} {items.length === 1 ? "match" : "matches"} found
          </p>
          <div className="property-grid">
            {items.map((item, index) => (
              <PropertyCard item={item} index={index} key={`${item.property_name}-${index}`} />
            ))}
          </div>
        </>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ marginTop: 26 }}>
          <EmptyState
            title="No recommendations yet"
            message={
              mode === "location"
                ? `Pick a landmark such as “${landmarks[0] ?? "Cyber Hub"}”, set a radius and search to see societies nearby.`
                : "Choose a society and run a search to see similar configurations."
            }
          />
        </div>
      )}
    </div>
  );
}
