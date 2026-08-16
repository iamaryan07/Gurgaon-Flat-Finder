import { InsightsDashboard } from "@/components/insights-dashboard";

export const metadata = {
  title: "Market Insights · Gurgaon Property Lens",
};

export default function InsightsPage() {
  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Market insights</p>
        <h1>Read the signals.</h1>
        <p className="lede">
          Summary statistics, price drivers and a what-if studio to test how a single
          feature changes a valuation.
        </p>
      </header>
      <InsightsDashboard />
    </section>
  );
}
