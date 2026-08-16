import { Manrope, Space_Grotesk } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./workspace.css";
import "./refinements.css";
import { Navbar } from "@/components/navbar";

const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata = {
  title: "Gurgaon Property Lens",
  description: "A considered property valuation and market intelligence tool for Gurgaon.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable}`}>
        <Navbar />
        <main>{children}</main>
        <footer>
          <span>Gurgaon Property Lens</span>
          <span>Independent model estimate · Not financial advice</span>
        </footer>
      </body>
    </html>
  );
}
