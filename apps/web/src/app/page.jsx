import Link from "next/link";
import { HeroSnapshot } from "@/components/hero-snapshot";
import { IconArrowRight, IconChart, IconCheck, IconMapPin, IconSpark } from "@/components/icons";

export const metadata = {
  title: "Gurgaon Property Lens · Know the price before you buy",
};

const features = [
  {
    href: "/prediction",
    icon: <IconSpark />,
    title: "ML-powered valuation",
    copy: "Describe any Gurgaon apartment — sector, size, age, furnishing — and get an instant, data-backed price estimate in crores and lakhs.",
    cta: "Value a property",
  },
  {
    href: "/analysis",
    icon: <IconChart />,
    title: "Market analytics",
    copy: "Compare sectors on price, area and quality. Explore price maps, bivariate relationships and what really drives value across the city.",
    cta: "Explore the market",
  },
  {
    href: "/recommendation",
    icon: <IconMapPin />,
    title: "Smart recommendations",
    copy: "Shortlist societies by landmark radius, similar configuration or a hybrid blend of location and price — with direct listing links.",
    cta: "Find societies",
  },
];

const proof = [
  "Trained on real Gurgaon listings",
  "Valuations in under a second",
  "Sector-level market intelligence",
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Real-estate intelligence for Gurgaon</p>
            <h1>
              Understand Gurgaon property prices <em>before</em> you buy.
            </h1>
            <p className="lede">
              Gurgaon Property Lens combines machine-learning valuation, live market
              analytics and society-level recommendations into one clear view of the
              Millennium City&apos;s housing market.
            </p>
            <div className="hero-actions">
              <Link className="btn" href="/prediction">
                Predict property value
                <IconArrowRight />
              </Link>
              <Link className="btn btn-secondary" href="/analysis">
                Explore market
              </Link>
            </div>
            <div className="hero-proof">
              {proof.map((item) => (
                <span key={item}>
                  <IconCheck />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-blob" aria-hidden="true" />
            <HeroSnapshot />
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">One platform, three lenses</p>
            <h2>Everything you need to read the market.</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <Link key={feature.href} href={feature.href} className="feature-card">
                <span className="feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
                <span className="feature-link">
                  {feature.cta}
                  <IconArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "clamp(56px, 8vw, 104px)" }}>
        <div className="container">
          <div className="band">
            <div>
              <h2>Ready to see what a property is really worth?</h2>
              <p>
                Start with a free valuation. No sign-up, no guesswork — just the trained
                model and the numbers behind it.
              </p>
            </div>
            <div className="band-actions">
              <Link className="btn" href="/prediction">
                Predict property value
                <IconArrowRight />
              </Link>
              <Link className="btn btn-ghost-light" href="/insights">
                View insights
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
