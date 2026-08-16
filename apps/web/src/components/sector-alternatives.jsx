"use client";

import { useEffect, useState } from "react";
import { getMarket } from "@/lib/api";

function rupees(crore) {
  return `₹ ${Number(crore).toFixed(2)} Cr`;
}

export function SectorAlternatives() {
  const [sectors, setSectors] = useState([]);
  const [sector, setSector] = useState("");
  const [bedroom, setBedroom] = useState(3);
  const [budget, setBudget] = useState(2.5);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMarket("sectors")
      .then((rows) => {
        const names = rows.map((row) => row.Sector);
        setSectors(names);
        setSector(names[0] ?? "");
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Could not load sectors.")
      );
  }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ sector, bedroom, budget });
      setResults(await getMarket(`sector-alternatives?${params.toString()}`));
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : "Could not find alternatives.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h3>Sector alternatives</h3>
      <p className="data-note">
        Priced out of {sector || "your sector"}? Enter a budget and bedroom count to
        find the closest matching sectors across Gurgaon.
      </p>
      <form className="compact-form" onSubmit={submit}>
        <label>
          Sector
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            {sectors.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Bedrooms
          <input
            type="number"
            min="1"
            max="10"
            value={bedroom}
            onChange={(e) => setBedroom(Number(e.target.value))}
          />
        </label>
        <label>
          Budget (Cr)
          <input
            type="number"
            min="0"
            step="0.1"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </label>
        <button disabled={loading}>{loading ? "Finding…" : "Find alternatives"}</button>
      </form>

      {error && <p className="error">{error}</p>}

      {results.length > 0 && (
        <div className="insight-grid">
          {results.map((row) => (
            <article className="sector-card" key={row.Sector}>
              <h3>{row.Sector}</h3>
              <div className="sector-row">
                <b>Match</b>
                <span>{Math.round(row.match_score)}%</span>
              </div>
              <div className="sector-row">
                <b>Avg price</b>
                <span>{rupees(row.price)}</span>
              </div>
              <div className="sector-row">
                <b>Bedrooms</b>
                <span>{Math.round(row.bedrooms)} BHK</span>
              </div>
              <div className="sector-row">
                <b>Area</b>
                <span>{Math.round(row.area).toLocaleString()} ft²</span>
              </div>
              <div className="sector-row">
                <b>Listings</b>
                <span>{row.listings}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
