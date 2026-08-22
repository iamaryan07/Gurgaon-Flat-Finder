import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { GeoMap } from "@/components/geo-map";

export const metadata = {
  title: "Market Analysis · Gurgaon Property Lens",
};

export default function AnalysisPage() {
  return (
    <section className="page">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Market analysis</p>
          <h1>Read the Gurgaon market.</h1>
          <p className="lede">
            Compare sectors on an interactive price map, uncover price relationships
            and see which features drive value — computed live from the packaged
            market dataset.
          </p>
        </header>
        <div className="stack">
          <GeoMap />
          <AnalyticsDashboard />
        </div>
      </div>
    </section>
  );
}
