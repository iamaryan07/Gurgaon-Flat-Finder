import { RecommendationTool } from "@/components/recommendation-tool";

export const metadata = {
  title: "Recommendations · Gurgaon Property Lens",
};

export default function RecommendationPage() {
  return (
    <section className="page">
      <div className="container">
        <header className="page-header">
          <p className="eyebrow">Recommendations</p>
          <h1>Find your next shortlist.</h1>
          <p className="lede">
            Search by landmark radius, by similar configuration, or blend both with the
            hybrid matcher — every result links straight to its listing.
          </p>
        </header>
        <RecommendationTool />
      </div>
    </section>
  );
}
