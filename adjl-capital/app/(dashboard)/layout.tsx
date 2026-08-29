import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <Navbar user={session.user} />
      <main>{children}</main>
      <footer className="adjl-footer">
        <div
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: "var(--cream)",
          }}
        >
          ADJL <span style={{ color: "var(--gold)" }}>Capital</span>
        </div>
        <p
          style={{
            fontSize: "0.62rem",
            color: "rgba(248,245,239,0.2)",
            maxWidth: 500,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Data from Yardi Matrix, CBRE, FreeFinCalc, Redfin, Zillow, WorldPopulationReview,
          PropertyCEO — June 2026. Informational only. Not an offer of securities.
        </p>
        <div style={{ fontSize: "0.62rem", color: "rgba(248,245,239,0.18)" }}>
          © 2026 ADJL Capital, LLC
        </div>
      </footer>
    </>
  );
}
