import { ValuationForm } from "@/components/valuation-form";

export const metadata = {
  title: "Price Prediction · Gurgaon Property Lens",
};

export default function PredictionPage() {
  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Price prediction</p>
        <h1>Estimate a property&apos;s value.</h1>
        <p className="lede">
          Describe the property and the trained Gurgaon model returns a data-backed
          starting price in crores and lakhs.
        </p>
      </header>
      <ValuationForm />
    </section>
  );
}
