"use client";

import { useEffect, useState } from "react";
import { getPredictionOptions, predictPrice } from "@/lib/api";

const FALLBACK = {
  sectors: ["Sector 65"],
  property_age: ["10+ Year Old", "5 to 10 Year Old", "1 to 5 Year Old", "0 to 1 Year Old"],
  furnishing: ["Unfurnished", "Semi Furnished", "Furnished"],
  power_backup: ["None", "Partial", "Full"],
  nearby: ["Education", "Healthcare", "Religious", "Residentail", "Shopping", "Transport"],
  overlooking: ["Club", "Main Road"],
};

const initial = {
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

function Select({ label, name, options, value, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function NumberInput({ label, name, value, min = 0, step = 1, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(name, Number(event.target.value))}
      />
    </label>
  );
}

export function ValuationForm() {
  const [options, setOptions] = useState(FALLBACK);
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPredictionOptions()
      .then((data) => {
        setOptions(data);
        setForm((current) => ({
          ...current,
          sector: data.sectors?.[0] ?? current.sector,
          property_age: data.property_age?.[0] ?? current.property_age,
          furnishing: data.furnishing?.[0] ?? current.furnishing,
          power_backup: data.power_backup?.[0] ?? current.power_backup,
          nearby: data.nearby?.[0] ?? current.nearby,
          overlooking: data.overlooking?.[0] ?? current.overlooking,
        }));
      })
      .catch(() => setOptions(FALLBACK));
  }, []);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setResult(await predictPrice(form));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="valuation-layout">
      <form className="form-card" onSubmit={submit}>
        <div className="form-section">
          <h3>Location &amp; layout</h3>
          <div className="fields">
            <Select label="Sector" name="sector" options={options.sectors} value={form.sector} onChange={update} />
            <NumberInput label="Built-up area (sq ft)" name="built_up_area" value={form.built_up_area} min={300} step={50} onChange={update} />
            <NumberInput label="Bedrooms" name="bedroom" value={form.bedroom} min={1} onChange={update} />
            <NumberInput label="Bathrooms" name="bathroom" value={form.bathroom} min={1} onChange={update} />
            <NumberInput label="Balconies" name="balcony" value={form.balcony} onChange={update} />
            <NumberInput label="Floor number" name="floor_num" value={form.floor_num} onChange={update} />
            <NumberInput label="Total floors" name="total_floor" value={form.total_floor} min={1} onChange={update} />
          </div>
        </div>
        <div className="form-section">
          <h3>Condition &amp; extras</h3>
          <div className="fields">
            <Select label="Property age" name="property_age" options={options.property_age} value={form.property_age} onChange={update} />
            <Select label="Furnishing" name="furnishing" options={options.furnishing} value={form.furnishing} onChange={update} />
            <Select label="Power backup" name="power_backup" options={options.power_backup} value={form.power_backup} onChange={update} />
            <NumberInput label="Covered parking" name="covered_parking" value={form.covered_parking} onChange={update} />
            <NumberInput label="Open parking" name="open_parking" value={form.open_parking} onChange={update} />
            <NumberInput label="Rating" name="rating" value={form.rating} min={1} step={0.1} onChange={update} />
            <Select label="Nearest amenity" name="nearby" options={options.nearby} value={form.nearby} onChange={update} />
            <Select label="Overlooking" name="overlooking" options={options.overlooking} value={form.overlooking} onChange={update} />
          </div>
          <div className="checks">
            {[
              ["servant_room", "Servant room"],
              ["store_room", "Store room"],
              ["study_room", "Study room"],
            ].map(([name, label]) => (
              <label key={name}>
                <input
                  type="checkbox"
                  checked={form[name]}
                  onChange={(event) => update(name, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <button className="primary-button" disabled={loading}>
          {loading ? "Calculating estimate…" : "Calculate estimate →"}
        </button>
      </form>

      <aside className="result-panel">
        <p className="eyebrow">Your estimate</p>
        {result ? (
          <>
            <p className="price">
              ₹ {result.predicted_price_crore.toFixed(2)} <small>Cr</small>
            </p>
            <p className="lakh">₹ {result.predicted_price_lakh.toFixed(1)} lakh</p>
            <div className="result-note">
              Calculated using the trained Gurgaon property model.
            </div>
          </>
        ) : (
          <>
            <p className="empty-price">
              Your price
              <br />
              will appear here.
            </p>
            <p className="result-copy">
              Complete the form to get a data-backed starting point for this property.
            </p>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </aside>
    </div>
  );
}
