"use client";

import { useEffect, useState } from "react";
import { getPredictionOptions, predictPrice } from "@/lib/api";
import { ErrorState, Skeleton } from "@/components/ui";

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

function Field({ id, label, unit, children }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {unit && <span className="field-unit">{unit}</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ label, name, options, value, onChange }) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label}>
      <div className="select-wrap">
        <select
          id={id}
          name={name}
          className="select-input"
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </Field>
  );
}

function NumberField({ label, name, value, min = 0, max, step = 1, onChange }) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label}>
      <input
        id={id}
        name={name}
        className="input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(name, Number(event.target.value))}
      />
    </Field>
  );
}

export function ValuationForm() {
  const [options, setOptions] = useState(FALLBACK);
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [estimatedAt, setEstimatedAt] = useState(null);
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

  async function runPrediction() {
    setLoading(true);
    setError("");
    try {
      setResult(await predictPrice(form));
      setEstimatedAt(new Date());
    } catch (caught) {
      setResult(null);
      setEstimatedAt(null);
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    runPrediction();
  }

  return (
    <div className="tool-layout">
      <form className="card form-card" onSubmit={submit}>
        <div className="card-pad form-body">
          <div className="form-section">
            <div className="form-section-head">
              <h3>Property details</h3>
              <p>Where the home is and how it is laid out.</p>
            </div>
            <div className="fields">
              <SelectField
                label="Sector"
                name="sector"
                options={options.sectors}
                value={form.sector}
                onChange={update}
              />
              <NumberField
                label="Built-up area"
                unit="sq ft"
                name="built_up_area"
                value={form.built_up_area}
                min={300}
                step={50}
                onChange={update}
              />
              <NumberField
                label="Bedrooms"
                name="bedroom"
                value={form.bedroom}
                min={1}
                onChange={update}
              />
              <NumberField
                label="Bathrooms"
                name="bathroom"
                value={form.bathroom}
                min={1}
                onChange={update}
              />
              <NumberField
                label="Balconies"
                name="balcony"
                value={form.balcony}
                min={0}
                onChange={update}
              />
              <NumberField
                label="Floor number"
                name="floor_num"
                value={form.floor_num}
                min={0}
                onChange={update}
              />
              <NumberField
                label="Total floors"
                name="total_floor"
                value={form.total_floor}
                min={1}
                onChange={update}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <h3>Property condition</h3>
              <p>Age, furnishing and overall quality of the home.</p>
            </div>
            <div className="fields">
              <SelectField
                label="Property age"
                name="property_age"
                options={options.property_age}
                value={form.property_age}
                onChange={update}
              />
              <SelectField
                label="Furnishing"
                name="furnishing"
                options={options.furnishing}
                value={form.furnishing}
                onChange={update}
              />
              <SelectField
                label="Power backup"
                name="power_backup"
                options={options.power_backup}
                value={form.power_backup}
                onChange={update}
              />
              <NumberField
                label="Rating"
                unit="1 – 5"
                name="rating"
                value={form.rating}
                min={1}
                step={0.1}
                onChange={update}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <h3>Amenities &amp; location</h3>
              <p>Parking, extra rooms and what surrounds the property.</p>
            </div>
            <div className="fields">
              <SelectField
                label="Nearest amenity"
                name="nearby"
                options={options.nearby}
                value={form.nearby}
                onChange={update}
              />
              <SelectField
                label="Overlooking"
                name="overlooking"
                options={options.overlooking}
                value={form.overlooking}
                onChange={update}
              />
              <NumberField
                label="Covered parking"
                name="covered_parking"
                value={form.covered_parking}
                min={0}
                onChange={update}
              />
              <NumberField
                label="Open parking"
                name="open_parking"
                value={form.open_parking}
                min={0}
                onChange={update}
              />
            </div>
            <div className="toggle-grid">
              {[
                ["servant_room", "Servant room"],
                ["store_room", "Store room"],
                ["study_room", "Study room"],
              ].map(([name, label]) => (
                <label className="toggle-pill" key={name}>
                  <input
                    type="checkbox"
                    checked={form[name]}
                    onChange={(event) => update(name, event.target.checked)}
                  />
                  <span className="dot" aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button className="btn btn-block" type="submit" disabled={loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? "Calculating estimate…" : result ? "Recalculate estimate" : "Calculate estimate"}
          </button>
        </div>
      </form>

      <aside className="card result-panel" aria-live="polite">
        <div className="result-inner">
          <p className="result-eyebrow">Estimated property value</p>

          {loading && (
            <div style={{ marginTop: 22 }}>
              <Skeleton style={{ display: "block", width: "85%", height: 58, borderRadius: 14 }} />
              <Skeleton style={{ display: "block", width: "45%", height: 18, marginTop: 16 }} />
              <Skeleton style={{ display: "block", width: "100%", height: 64, marginTop: 26, borderRadius: 12 }} />
            </div>
          )}

          {!loading && !error && result && (
            <>
              <p className="result-value pop">
                ₹{result.predicted_price_crore.toFixed(2)}
                <small>Cr</small>
              </p>
              <p className="result-lakh">≈ ₹ {result.predicted_price_lakh.toFixed(1)} lakh</p>
              <p className="result-copy">
                A model-backed starting point for this configuration in{" "}
                {form.sector}. Compare it with live listings before you negotiate.
              </p>
              <div className="result-divider">
                <p className="result-note">
                  <span>Trained Gurgaon price model · estimate generated</span>
                  <b>
                    {estimatedAt?.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </b>
                </p>
              </div>
            </>
          )}

          {!loading && !result && !error && (
            <>
              <p className="result-value" style={{ color: "#c9c7bc" }}>
                ₹—<small>Cr</small>
              </p>
              <p className="result-copy">
                Complete the form and calculate to see a data-backed valuation for this
                property.
              </p>
            </>
          )}

          {!loading && error && (
            <div style={{ marginTop: 22 }}>
              <ErrorState title="Estimate failed" message={error} onRetry={runPrediction} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
