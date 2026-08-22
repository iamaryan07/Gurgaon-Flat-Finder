"use client";

import { useEffect, useState } from "react";
import { getPredictionOptions, predictPrice } from "@/lib/api";
import { rupees } from "@/components/ui";

const BASE = {
  sector: "Sector 65",
  built_up_area: 1500,
  bedroom: 3,
  bathroom: 3,
  balcony: 2,
  floor_num: 5,
  total_floor: 15,
  property_age: "1 to 5 Year Old",
  furnishing: "Semi Furnished",
  power_backup: "Full",
  covered_parking: 1,
  open_parking: 0,
  rating: 3.8,
  nearby: "Education",
  overlooking: "Club",
  servant_room: false,
  store_room: false,
  study_room: false,
};

const FEATURES = [
  { key: "sector", label: "Sector", type: "select", optionsKey: "sectors" },
  { key: "built_up_area", label: "Built-up area (sq ft)", type: "number", min: 300, max: 20000, step: 50 },
  { key: "bedroom", label: "Bedrooms", type: "number", min: 1, max: 10, step: 1 },
  { key: "bathroom", label: "Bathrooms", type: "number", min: 1, max: 10, step: 1 },
  { key: "balcony", label: "Balconies", type: "number", min: 0, max: 10, step: 1 },
  { key: "floor_num", label: "Floor number", type: "number", min: 0, max: 150, step: 1 },
  { key: "total_floor", label: "Total floors", type: "number", min: 1, max: 150, step: 1 },
  { key: "property_age", label: "Property age", type: "select", optionsKey: "property_age" },
  { key: "furnishing", label: "Furnishing", type: "select", optionsKey: "furnishing" },
  { key: "power_backup", label: "Power backup", type: "select", optionsKey: "power_backup" },
  { key: "covered_parking", label: "Covered parking", type: "number", min: 0, max: 10, step: 1 },
  { key: "open_parking", label: "Open parking", type: "number", min: 0, max: 10, step: 1 },
  { key: "rating", label: "Rating", type: "number", min: 1, max: 5, step: 0.1 },
  { key: "nearby", label: "Nearest amenity", type: "select", optionsKey: "nearby" },
  { key: "overlooking", label: "Overlooking", type: "select", optionsKey: "overlooking" },
  { key: "servant_room", label: "Servant room", type: "boolean" },
  { key: "store_room", label: "Store room", type: "boolean" },
  { key: "study_room", label: "Study room", type: "boolean" },
];

const FALLBACK_OPTIONS = {
  sectors: ["Sector 65"],
  property_age: ["10+ Year Old", "5 to 10 Year Old", "1 to 5 Year Old", "0 to 1 Year Old"],
  furnishing: ["Unfurnished", "Semi Furnished", "Furnished"],
  power_backup: ["None", "Partial", "Full"],
  nearby: ["Education", "Healthcare", "Religious", "Residentail", "Shopping", "Transport"],
  overlooking: ["Club", "Main Road"],
};

function nextValue(feature, current, options) {
  if (feature.type === "boolean") return !current;
  if (feature.type === "number") {
    return Math.min(current + (feature.step ?? 1), feature.max);
  }
  const list = options[feature.optionsKey] ?? [];
  const index = list.indexOf(current);
  return list[(index + 1) % list.length] ?? current;
}

export function WhatIfStudio() {
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [featureKey, setFeatureKey] = useState("built_up_area");
  const [original, setOriginal] = useState(BASE.built_up_area);
  const [newValue, setNewValue] = useState(BASE.built_up_area + 50);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPredictionOptions()
      .then((data) => setOptions({ ...FALLBACK_OPTIONS, ...data }))
      .catch(() => setOptions(FALLBACK_OPTIONS));
  }, []);

  const feature = FEATURES.find((f) => f.key === featureKey) ?? FEATURES[0];
  const list = options[feature.optionsKey] ?? [];

  function changeFeature(key) {
    const selected = FEATURES.find((f) => f.key === key) ?? FEATURES[0];
    const current = BASE[key];
    setFeatureKey(key);
    setOriginal(current);
    setNewValue(nextValue(selected, current, options));
    setResult(null);
    setError("");
  }

  async function compare(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const before = { ...BASE, [featureKey]: original };
      const after = { ...BASE, [featureKey]: newValue };
      const [a, b] = await Promise.all([predictPrice(before), predictPrice(after)]);
      setResult({ a, b });
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  function renderInput(value, onChange, id) {
    if (feature.type === "select") {
      return (
        <div className="select-wrap">
          <select id={id} className="select-input" value={value} onChange={(e) => onChange(e.target.value)}>
            {list.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }
    if (feature.type === "boolean") {
      return (
        <div className="select-wrap">
          <select
            id={id}
            className="select-input"
            value={String(value)}
            onChange={(e) => onChange(e.target.value === "true")}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
      );
    }
    return (
      <input
        id={id}
        className="input"
        type="number"
        min={feature.min}
        max={feature.max}
        step={feature.step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  const diff = result ? result.b.predicted_price_crore - result.a.predicted_price_crore : 0;

  return (
    <section className="whatif-card">
      <h3>What-if studio</h3>
      <p>
        Hold a typical Gurgaon property constant and test how changing a single feature
        affects the model estimate.
      </p>
      <form className="whatif-form" onSubmit={compare}>
        <div className="field">
          <label className="field-label" htmlFor="wi-feature">Feature</label>
          <div className="select-wrap">
            <select
              id="wi-feature"
              className="select-input"
              value={featureKey}
              onChange={(e) => changeFeature(e.target.value)}
            >
              {FEATURES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="wi-original">Original value</label>
          {renderInput(original, setOriginal, "wi-original")}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="wi-new">New value</label>
          {renderInput(newValue, setNewValue, "wi-new")}
        </div>
        <button className="btn btn-light" type="submit" disabled={loading}>
          {loading && <span className="spinner" aria-hidden="true" style={{ borderTopColor: "#14171a", borderColor: "rgba(20,23,26,.25)" }} />}
          {loading ? "Comparing…" : "Compare values"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ marginTop: 16, color: "#e8a08d", fontSize: 13.5, fontWeight: 600 }}>
          {error}
        </p>
      )}

      {result && (
        <div className="impact-grid">
          <div className="impact-cell">
            <span>Current estimate</span>
            <b>{rupees(result.a.predicted_price_crore)}</b>
          </div>
          <div className="impact-cell">
            <span>New estimate</span>
            <b>{rupees(result.b.predicted_price_crore)}</b>
          </div>
          <div className={`impact-cell${diff >= 0 ? " delta" : ""}`}>
            <span>Estimated change</span>
            <b style={diff < 0 ? { color: "#e8a08d" } : undefined}>
              {diff >= 0 ? "+" : ""}
              {rupees(diff)}
            </b>
          </div>
        </div>
      )}
    </section>
  );
}
