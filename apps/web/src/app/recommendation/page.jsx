import { RecommendationTool } from "@/components/recommendation-tool";

export const metadata = {
  title: "Recommendations · Gurgaon Property Lens",
};

export default function RecommendationPage() {
  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Recommendations</p>
        <h1>Find comparable societies.</h1>
        <p className="lede">
          Search by landmark radius, by similar configuration, or blend both with the
          hybrid matcher.
        </p>
      </header>
      <RecommendationTool />
    </section>
  );
}
