import { Manrope, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./workspace.css";
import "./refinements.css";
import { Navbar } from "@/components/navbar";
import { LogoMark } from "@/components/icons";

const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata = {
  title: "Gurgaon Property Lens",
  description:
    "ML-powered property valuation, market analytics and recommendations for Gurgaon real estate.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${body.variable} ${display.variable}`}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <div>
              <p className="footer-brand">
                <span className="brand-mark">
                  <LogoMark size={17} />
                </span>
                Gurgaon Property Lens
              </p>
              <p className="footer-note" style={{ marginTop: 12, maxWidth: 340 }}>
                Independent model estimates for the Gurgaon housing market. Not financial advice.
              </p>
            </div>
            <nav className="footer-nav" aria-label="Footer">
              <Link href="/prediction">Prediction</Link>
              <Link href="/analysis">Market</Link>
              <Link href="/recommendation">Recommendations</Link>
              <Link href="/insights">Insights</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
