import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Bannière (Hero) */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-2))",
          color: "#fff",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 20px 60px rgba(20,184,166,.25)",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 36, letterSpacing: ".3px" }}>
          Secret BAFA
        </h1>
        <p style={{ margin: "8px 0 0", opacity: 0.95, fontSize: 16 }}>
          Soumets anonymement. Buzzer pour accuser. Classement des points. Révélations le soir.
        </p>

        <div className="inline-actions" style={{ marginTop: 16 }}>
          <Link href="/soumettre" className="btn">Soumettre un secret</Link>
          <Link
            href="/buzzer"
            className="btn"
            style={{
              background: "#fff",
              color: "var(--text)",
              boxShadow: "0 6px 16px rgba(255,255,255,.25)",
            }}
          >
            Buzzer
          </Link>
        </div>
      </section>

      {/* Petit rappel des étapes */}
      <section className="card">
        <h2>Comment ça marche ?</h2>
        <div className="secret-list" style={{ marginTop: 12 }}>
          <div className="secret-card">
            <p className="secret-field">
              <b>1.</b> Les stagiaires <strong>soumettent</strong> leurs secrets (anonyme côté public).
            </p>
          </div>
          <div className="secret-card">
            <p className="secret-field">
              <b>2.</b> Ils <strong>buzzent</strong> la personne et le secret (envoyé à l’admin).
            </p>
          </div>
          <div className="secret-card">
            <p className="secret-field">
              <b>3.</b> Le soir, l’admin <strong>révèle</strong> les noms, attribue les <strong>points</strong>, et peut <strong>archiver</strong>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
