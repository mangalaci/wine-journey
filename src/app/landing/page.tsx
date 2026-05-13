const wines = [
  { name: "Cabernet Franc 2021", region: "Villány • Száraz vörös", price: "6 990 Ft" },
  { name: "Kékfrankos Reserve", region: "Szekszárd • Testes", price: "8 490 Ft" },
  { name: "Rosé Cuvée", region: "Eger • Friss, gyümölcsös", price: "4 290 Ft" },
  { name: "Furmint Selection", region: "Tokaj • Fehér", price: "7 290 Ft" },
];

export default function LandingPage() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <div className="brand">Wine Atelier</div>
          <nav className="nav-links">
            <a href="#">Borok</a>
            <a href="#">Pincészet</a>
            <a href="#">Kóstolók</a>
            <a href="#">Kapcsolat</a>
          </nav>
          <button className="btn btn-primary">Vásárlás</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="hero-kicker">Prémium válogatás</div>
              <h1>Kifinomult magyar borok modern köntösben</h1>
              <p>
                Kézműves tételek, egyedi karakter, elegáns megjelenés. Frissítsd a kínálatod
                egy letisztult, prémium boros élménnyel.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-primary">Kollekció megtekintése</button>
                <button className="btn btn-ghost">Rólunk</button>
              </div>
            </div>
            <div className="hero-media" />
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2 className="section-title">Kiemelt borok</h2>
            <p className="section-subtitle">Válogatott tételek a szezon legjobbjai közül.</p>

            <div className="grid">
              {wines.map((w) => (
                <article className="card" key={w.name}>
                  <div className="card-media" />
                  <div className="card-body">
                    <h3 className="card-title">{w.name}</h3>
                    <p className="card-meta">{w.region}</p>
                    <div className="card-row">
                      <span className="price">{w.price}</span>
                      <button className="btn btn-ghost">Kosárba</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Wine Atelier • Minden jog fenntartva</div>
      </footer>
    </>
  );
}
