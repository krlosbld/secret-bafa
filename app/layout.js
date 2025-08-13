import Link from "next/link";
import Prenom from "../components/Prenom";
import "./globals.css";

export const metadata = {
  title: "Secret BAFA",
  description: "Soumettre, voir, buzzer, classer (anonyme).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <header className="site-header">
          <nav className="container navbar">
            <Link href="/" className="logo">Secret BAFA</Link>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <ul className="nav">
                <li><Link href="/soumettre">Soumettre un Secret</Link></li>
                <li><Link href="/secrets">Voir les Secrets</Link></li>
                <li><Link href="/buzzer">Buzzer</Link></li>
                <li><Link href="/classement">Classement</Link></li>
                <li><Link href="/admin">Admin</Link></li>
              </ul>
              <Prenom />
            </div>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">© {new Date().getFullYear()} Secret BAFA</div>
        </footer>
      </body>
    </html>
  );
}
