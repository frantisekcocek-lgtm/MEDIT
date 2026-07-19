"use client";

import { useEffect, useState } from "react";

export default function Error({ error, reset }) {
  const [smazano, setSmazano] = useState(false);

  useEffect(() => {
    console.error("Chyba aplikace:", error);
  }, [error]);

  const smazData = () => {
    try {
      window.localStorage.removeItem("stredomorsky-plan-v1");
      window.localStorage.removeItem("stredomorsky-plan-kod");
      setSmazano(true);
    } catch (e) {
      setSmazano(false);
    }
  };

  return (
    <main className="wrap" style={{ paddingTop: 40, maxWidth: 640 }}>
      <div className="card raised">
        <h2>Něco se rozbilo</h2>
        <p className="sub">
          Aplikace narazila na chybu a nemohla stránku vykreslit. Nejčastěji za to může poškozené
          uložené nastavení — smazáním se appka vrátí do výchozího stavu.
        </p>

        <div className="varovani" style={{ fontFamily: "monospace", fontSize: 12.5 }}>
          {error?.message || "Neznámá chyba"}
          {error?.digest ? ` (digest ${error.digest})` : ""}
        </div>

        <div className="row" style={{ marginTop: 18 }}>
          <button className="ghost" data-on="true" onClick={() => reset()}>
            Zkusit znovu
          </button>
          <button className="ghost" onClick={smazData}>
            Smazat uložená data
          </button>
        </div>

        {smazano && (
          <p className="sub" style={{ color: "#15803d", fontWeight: 600 }}>
            Hotovo. Načtěte stránku znovu (Ctrl+F5).
          </p>
        )}
      </div>
    </main>
  );
}
