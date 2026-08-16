import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { GeoMap } from "@/components/geo-map";

export const metadata = {
  title: "Market Analysis · Gurgaon Property Lens",
};

export default function AnalysisPage() {
  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Market analysis</p>
        <h1>Read the Gurgaon market.</h1>
        <p className="lede">
          Compare sectors, uncover price relationships and see which features drive
          value, directly from the live market dataset.
        </p>
      </header>
      <GeoMap />
      <AnalyticsDashboard />
    </section>
  );
}
