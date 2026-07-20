"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RECIPES, STITKY, STITKY_PRO_TYP, TYPY, byId, stitek } from "../lib/recipes";
import {
  AKTIVITA,
  CILE,
  KOJENI,
  migruj,
  PORADI,
  VYCHOZI_PROFILY,
  datumDne,
  formatDatum,
  generujPlan,
  makraDne,
  nakupniSeznam,
  porce,
  skaluj,
  spocitejMakra,
} from "../lib/plan";

const ULOZ = "stredomorsky-plan-v1";
const ULOZ_KOD = "stredomorsky-plan-kod";

function novyKod() {
  return "dom-" + Math.random().toString(36).slice(2, 8);
}
const BARVY = { bilkoviny: "#0d5eaf", sacharidy: "#f0b429", tuky: "#12a09b" };
const BARVA_TYPU = { snidane: "#f0b429", svacina: "#12a09b", obed: "#0d5eaf", vecere: "#062e5c" };

/* Navážka: kusy po čtvrtinách, malé množství po gramu, zbytek po pěti */
function zaokrouhli(q, u) {
  if (u === "ks" || u === "stroužek") return Math.round(q * 4) / 4;
  if (q < 20) return Math.round(q);
  return Math.round(q / 5) * 5;
}

function nactiUlozene() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(ULOZ) || "null");
  } catch {
    return null;
  }
}

/* ---------- Řecká vlajka: 9 pruhů, kříž v kantonu ---------- */
function Vlajka({ className = "flag" }) {
  return (
    <svg className={className} viewBox="0 0 27 18" role="img" aria-label="Řecká vlajka">
      <rect width="27" height="18" fill="#fff" />
      {[0, 4, 8, 12, 16].map((y) => (
        <rect key={y} y={y} width="27" height="2" fill="#0d5eaf" />
      ))}
      <rect width="10" height="10" fill="#0d5eaf" />
      <rect x="4" width="2" height="10" fill="#fff" />
      <rect y="4" width="10" height="2" fill="#fff" />
    </svg>
  );
}

/* ---------- Kroužek plnění kalorií ---------- */
function Krouzek({ hodnota, cil, velikost = 76 }) {
  const r = velikost / 2 - 7;
  const obvod = 2 * Math.PI * r;
  const pomer = Math.min(1.25, cil ? hodnota / cil : 0);
  const barva = pomer > 1.12 || pomer < 0.85 ? "#e2574c" : "#0d5eaf";
  return (
    <svg className="ring" width={velikost} height={velikost} viewBox={`0 0 ${velikost} ${velikost}`}>
      <circle cx={velikost / 2} cy={velikost / 2} r={r} fill="none" stroke="#e9f1fc" strokeWidth="8" />
      <circle
        cx={velikost / 2}
        cy={velikost / 2}
        r={r}
        fill="none"
        stroke={barva}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${Math.min(1, pomer) * obvod} ${obvod}`}
        transform={`rotate(-90 ${velikost / 2} ${velikost / 2})`}
      />
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="16"
        fontWeight="800"
        fill="#0b1b2b"
      >
        {Math.round(pomer * 100)}%
      </text>
    </svg>
  );
}

/* ---------- Pruh rozložení maker ---------- */
function MakroPruh({ m }) {
  const e = { bilkoviny: m.bilkoviny * 4, sacharidy: m.sacharidy * 4, tuky: m.tuky * 9 };
  const soucet = e.bilkoviny + e.sacharidy + e.tuky || 1;
  return (
    <>
      <div className="bar" aria-hidden="true">
        {["bilkoviny", "sacharidy", "tuky"].map((k) => (
          <i key={k} style={{ width: `${(e[k] / soucet) * 100}%`, background: BARVY[k] }} />
        ))}
      </div>
      <div className="legend">
        {["bilkoviny", "sacharidy", "tuky"].map((k) => (
          <span key={k}>
            <i className="dot" style={{ background: BARVY[k] }} />
            {k[0].toUpperCase() + k.slice(1)} <b>{m[k]} g</b>
          </span>
        ))}
      </div>
    </>
  );
}

export default function Page() {
  const [zalozka, setZalozka] = useState("planovac");
  const [profily, setProfily] = useState(VYCHOZI_PROFILY);
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [den, setDen] = useState(0);
  const [tyden, setTyden] = useState(0);
  const [odskrtnuto, setOdskrtnuto] = useState({});
  const [vlastni, setVlastni] = useState({});
  const [otevrenyRecept, setOtevrenyRecept] = useState(null);
  const [nacteno, setNacteno] = useState(false);
  const [kod, setKod] = useState("");
  const [stav, setStav] = useState("nacitam");

  const planAuto = useMemo(() => generujPlan(28), []);
  const plan = useMemo(
    () => planAuto.map((d, i) => ({ ...d, ...(vlastni[i] || {}) })),
    [planAuto, vlastni]
  );

  // Uložená data mohou být z jiné verze nebo poškozená — bereme jen to, co dává smysl
  const pouzij = (u) => {
    if (!u || typeof u !== "object") return;
    try {
      if (Array.isArray(u.profily) && u.profily.length) {
        const ciste = u.profily
          .filter((p) => p && typeof p === "object" && Number(p.vaha) > 0 && Number(p.vyska) > 0)
          .map((p) => migruj(p));
        if (ciste.length) setProfily(ciste);
      }
      if (typeof u.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(u.start)) setStart(u.start);
      if (u.odskrtnuto && typeof u.odskrtnuto === "object") setOdskrtnuto(u.odskrtnuto);
      if (u.vlastni && typeof u.vlastni === "object") setVlastni(u.vlastni);
    } catch (e) {
      console.error("Uložená data se nepodařilo načíst:", e);
    }
  };

  // Načtení: nejdřív prohlížeč (okamžitě), pak databáze (má přednost)
  useEffect(() => {
    pouzij(nactiUlozene());
    let ulozenyKod = window.localStorage.getItem(ULOZ_KOD);
    if (!ulozenyKod) {
      ulozenyKod = novyKod();
      window.localStorage.setItem(ULOZ_KOD, ulozenyKod);
    }
    setKod(ulozenyKod);

    fetch("/api/data?id=" + encodeURIComponent(ulozenyKod))
      .then((r) => r.json())
      .then((o) => {
        if (o.ok) {
          pouzij(o.data);
          setStav("ulozeno");
        } else {
          setStav(o.duvod === "nenastaveno" ? "lokalne" : "chyba");
        }
      })
      .catch(() => setStav("chyba"))
      .finally(() => setNacteno(true));
  }, []);

  // Ukládání: prohlížeč hned, databáze se zpožděním
  useEffect(() => {
    if (!nacteno) return;
    const data = { profily, start, odskrtnuto, vlastni };
    window.localStorage.setItem(ULOZ, JSON.stringify(data));
    if (!kod || stav === "lokalne") return;

    setStav("ukladam");
    const casovac = setTimeout(() => {
      fetch("/api/data?id=" + encodeURIComponent(kod), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((r) => r.json())
        .then((o) => setStav(o.ok ? "ulozeno" : o.duvod === "nenastaveno" ? "lokalne" : "chyba"))
        .catch(() => setStav("chyba"));
    }, 900);
    return () => clearTimeout(casovac);
  }, [profily, start, odskrtnuto, vlastni, nacteno, kod]);

  // Ruční přepnutí na jiný kód domácnosti (párování druhého telefonu)
  const zmenKod = (novy) => {
    if (!novy) return;
    window.localStorage.setItem(ULOZ_KOD, novy);
    setKod(novy);
    setStav("nacitam");
    fetch("/api/data?id=" + encodeURIComponent(novy))
      .then((r) => r.json())
      .then((o) => {
        if (o.ok) {
          pouzij(o.data);
          setStav("ulozeno");
        } else setStav(o.duvod === "nenastaveno" ? "lokalne" : "chyba");
      })
      .catch(() => setStav("chyba"));
  };

  const cile = profily.map(spocitejMakra);
  const dnesniDen = plan[den];
  const zakladDne = makraDne(dnesniDen);
  const nasobky = cile.map((c) => porce(dnesniDen, c.kcal));

  const upravProfil = (i, klic, hodnota) =>
    setProfily((p) => p.map((x, j) => (j === i ? { ...x, [klic]: hodnota } : x)));

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="hero-top">
            <Vlajka />
            <div className="eyebrow">Ελληνική διατροφή · jídelníček pro dva</div>
          </div>
          <h1>Středomořský plán</h1>
          <p className="lead">
            Sestavte si jídelníček z {RECIPES.length} receptů — přetažením do kalendáře. Makra i
            nákupní seznam se přepočítají samy.
          </p>
        </div>
      </header>

      <nav className="tabs">
        <div className="tabs-inner">
          {[
            ["planovac", "Plánovač"],
            ["den", "Dnes"],
            ["nakup", "Nákup"],
            ["recepty", "Recepty"],
            ["makra", "Makra"],
          ].map(([k, l]) => (
            <button
              key={k}
              className="tab"
              data-on={zalozka === k}
              onClick={() => {
                setZalozka(k);
                setOtevrenyRecept(null);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        {otevrenyRecept ? (
          <Recept
            recept={byId(otevrenyRecept)}
            nasobky={nasobky}
            profily={profily}
            zpet={() => setOtevrenyRecept(null)}
          />
        ) : (
          <>
            {zalozka === "den" && (
              <DenView
                den={den}
                setDen={setDen}
                plan={plan}
                start={start}
                profily={profily}
                cile={cile}
                nasobky={nasobky}
                zaklad={zakladDne}
                otevri={setOtevrenyRecept}
              />
            )}
            {zalozka === "planovac" && (
              <PlanovacView
                plan={plan}
                planAuto={planAuto}
                vlastni={vlastni}
                setVlastni={setVlastni}
                start={start}
                profily={profily}
                cile={cile}
                otevriDen={(i) => {
                  setDen(i);
                  setZalozka("den");
                }}
              />
            )}
            {zalozka === "nakup" && (
              <NakupView
                plan={plan}
                tyden={tyden}
                setTyden={setTyden}
                cile={cile}
                odskrtnuto={odskrtnuto}
                setOdskrtnuto={setOdskrtnuto}
              />
            )}
            {zalozka === "recepty" && <ReceptyView otevri={setOtevrenyRecept} />}
            {zalozka === "makra" && (
              <MakraView
                profily={profily}
                cile={cile}
                uprav={upravProfil}
                start={start}
                setStart={setStart}
                kod={kod}
                zmenKod={zmenKod}
                stav={stav}
              />
            )}
          </>
        )}
        <p className="footer-note">Data zůstávají v tomhle prohlížeči. Nikam se neodesílají.</p>
      </main>
    </>
  );
}

/* ---------------- JÍDLO V SEZNAMU ---------------- */

function JidloRadek({ recept, typ, onClick, profily, nasobky }) {
  const t = typ || recept.typ;
  return (
    <button className="meal" onClick={onClick}>
      <span className="meal-mark" style={{ background: BARVA_TYPU[t] }} />
      <span className="meal-body">
        <span className="meal-type" style={{ color: BARVA_TYPU[t] }}>{TYPY[t]}</span>
        <span className="meal-name">{recept.nazev}</span>
        <span className="tags">
          <span className="tag">{recept.cas} min</span>
          <span className="tag">{recept.shop}</span>
          {stitek(recept) && <span className="tag">{STITKY[stitek(recept)]}</span>}
          {profily
            ? profily.map((p, i) => (
                <span className="tag strong" key={p.id}>
                  {p.jmeno} {Math.round(recept.kcal * nasobky[i])} kcal ·{" "}
                  {Math.round(recept.bilkoviny * nasobky[i])} g B
                </span>
              ))
            : <span className="tag">{recept.bilkoviny} g bílkovin</span>}
        </span>
      </span>
      <span className="meal-macros">
        <b>{recept.kcal}</b>
        kcal / porce
      </span>
    </button>
  );
}

/* ---------------- DEN ---------------- */

function DenView({ den, setDen, plan, start, profily, cile, nasobky, zaklad, otevri }) {
  return (
    <>
      <div className="card raised">
        <div className="daynav">
          <button className="ghost" onClick={() => setDen(Math.max(0, den - 1))} disabled={den === 0}>
            ← Včera
          </button>
          <div className="mid">
            <div className="eyebrow">Den {den + 1} z 28</div>
            <strong>{formatDatum(datumDne(start, den))}</strong>
          </div>
          <button className="ghost" onClick={() => setDen(Math.min(27, den + 1))} disabled={den === 27}>
            Zítra →
          </button>
        </div>
      </div>

      <div className="grid2">
        {profily.map((p, i) => {
          const m = skaluj(zaklad, nasobky[i]);
          const c = cile[i];
          const rozdil = m.kcal - c.kcal;
          const bilkOk = m.bilkoviny >= c.bilkoviny * 0.9;
          return (
            <div className="card" key={p.id}>
              <div className="person-head">
                <Krouzek hodnota={m.kcal} cil={c.kcal} />
                <div>
                  <div className="person-name">{p.jmeno}</div>
                  <div className="kcal-line">porce ×{nasobky[i].toFixed(2)}</div>
                  <div className="stat" style={{ marginTop: 8 }}>
                    {m.kcal} <small>/ {c.kcal} kcal</small>
                  </div>
                </div>
              </div>
              <MakroPruh m={m} />
              <p className="sub">
                <span className={Math.abs(rozdil) <= 120 ? "ok" : "off"}>
                  {rozdil >= 0 ? "+" : ""}
                  {rozdil} kcal
                </span>{" "}
                oproti cíli ·{" "}
                <span className={bilkOk ? "ok" : "off"}>
                  bílkoviny {m.bilkoviny} / {c.bilkoviny} g
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>Co se dneska vaří</h2>
        <p className="sub">Klikni na jídlo a dostaneš postup i navážku pro oba.</p>
        {PORADI.map((typ) => (
          <JidloRadek
            key={typ}
            typ={typ}
            recept={byId(plan[den][typ])}
            profily={profily}
            nasobky={nasobky}
            onClick={() => otevri(plan[den][typ])}
          />
        ))}
      </div>
    </>
  );
}

/* ---------------- PLÁNOVAČ (drag & drop / ťuk–ťuk) ---------------- */

function PlanovacView({ plan, planAuto, vlastni, setVlastni, start, profily, cile, otevriDen }) {
  const [tyden, setTyden] = useState(0);
  const [vybrany, setVybrany] = useState(null); // recept "v ruce" pro dotykové ovládání
  const [filtr, setFiltr] = useState("vse");
  const [hledat, setHledat] = useState("");
  const [cil, setCil] = useState(null); // zvýrazněné políčko při přetahování
  const [tazeny, setTazeny] = useState(null); // { id, x, y } během přetahování
  const drag = useRef({ id: null, x: 0, y: 0, aktivni: false, casovac: null, pohnuto: false });

  const [podfiltr, setPodfiltr] = useState("vse");

  const dostupneStitky =
    filtr === "vse"
      ? ["sladke", "slane", "bezmase", "kure", "ryba", "maso"]
      : STITKY_PRO_TYP[filtr] || [];

  const nabidka = RECIPES.filter(
    (r) =>
      (filtr === "vse" || r.typ === filtr) &&
      (podfiltr === "vse" || stitek(r) === podfiltr) &&
      r.nazev.toLowerCase().includes(hledat.toLowerCase().trim())
  );

  const prepniTyp = (t) => {
    setFiltr(t);
    if (t !== "vse" && podfiltr !== "vse" && !(STITKY_PRO_TYP[t] || []).includes(podfiltr)) {
      setPodfiltr("vse");
    }
  };

  const poloz = (den, typ, idReceptu) => {
    if (!idReceptu) return;
    setVlastni((v) => ({ ...v, [den]: { ...(v[den] || {}), [typ]: idReceptu } }));
    setVybrany(null);
  };

  const vratAutomat = (den, typ) =>
    setVlastni((v) => {
      const denni = { ...(v[den] || {}) };
      delete denni[typ];
      const novy = { ...v };
      if (Object.keys(denni).length) novy[den] = denni;
      else delete novy[den];
      return novy;
    });

  const resetTydne = () =>
    setVlastni((v) => {
      const novy = { ...v };
      for (let d = tyden * 7; d < tyden * 7 + 7; d++) delete novy[d];
      return novy;
    });

  // Přetahování postavené na pointer eventech, aby fungovalo i na dotykovém displeji.
  // Myš táhne hned, prst až po krátkém přidržení — jinak by nešlo scrollovat.
  const zacniTah = (e, id) => {
    if (e.button === 1 || e.button === 2) return;
    const d = drag.current;
    d.id = id;
    d.x = e.clientX;
    d.y = e.clientY;
    d.aktivni = false;
    d.pohnuto = false;
    const spustit = () => {
      d.aktivni = true;
      document.body.style.touchAction = "none";
      document.body.style.userSelect = "none";
      setTazeny({ id, x: d.x, y: d.y });
    };
    if (e.pointerType === "mouse") d.aktivni = true;
    else d.casovac = setTimeout(spustit, 220);
  };

  useEffect(() => {
    const pohyb = (e) => {
      const d = drag.current;
      if (!d.id) return;
      const vzdalenost = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (!d.aktivni) {
        if (vzdalenost > 10) {
          clearTimeout(d.casovac); // prst scrolluje, tah rušíme
          d.id = null;
        }
        return;
      }
      if (vzdalenost > 6) d.pohnuto = true;
      if (!tazeny) setTazeny({ id: d.id, x: e.clientX, y: e.clientY });
      else setTazeny((t) => ({ ...t, x: e.clientX, y: e.clientY }));

      const pod = document.elementFromPoint(e.clientX, e.clientY);
      const slot = pod && pod.closest ? pod.closest("[data-slot]") : null;
      setCil(slot ? slot.getAttribute("data-slot").replace("|", "-") : null);
    };

    const konec = (e) => {
      const d = drag.current;
      clearTimeout(d.casovac);
      if (d.id && d.aktivni && d.pohnuto) {
        const pod = document.elementFromPoint(e.clientX, e.clientY);
        const slot = pod && pod.closest ? pod.closest("[data-slot]") : null;
        if (slot) {
          const [den, typ] = slot.getAttribute("data-slot").split("|");
          poloz(Number(den), typ, d.id);
        }
      }
      document.body.style.touchAction = "";
      document.body.style.userSelect = "";
      drag.current = { id: null, x: 0, y: 0, aktivni: false, casovac: null, pohnuto: d.pohnuto };
      setTazeny(null);
      setCil(null);
      setTimeout(() => (drag.current.pohnuto = false), 0);
    };

    window.addEventListener("pointermove", pohyb);
    window.addEventListener("pointerup", konec);
    window.addEventListener("pointercancel", konec);
    return () => {
      window.removeEventListener("pointermove", pohyb);
      window.removeEventListener("pointerup", konec);
      window.removeEventListener("pointercancel", konec);
    };
  }, [tazeny]);

  const upravenych = Object.keys(vlastni).length;

  return (
    <>
      <div className="card raised">
        <h2>Plánovač</h2>
        <p className="sub">
          Myší přetáhněte recept na políčko. Na mobilu ťukněte na recept a pak na políčko, kam patří.
          Co nezměníte, zůstává podle automatického plánu.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          {[0, 1, 2, 3].map((t) => (
            <button key={t} className="ghost" data-on={tyden === t} onClick={() => setTyden(t)}>
              {t + 1}. týden
            </button>
          ))}
          <button className="ghost" onClick={resetTydne} style={{ marginLeft: "auto" }}>
            Vrátit týden do původního stavu
          </button>
        </div>
        {upravenych > 0 && (
          <p className="sub">Ručně upravených dnů: {upravenych}.</p>
        )}
      </div>

      {vybrany && (
        <div className="drzeny">
          V ruce máte <strong>{byId(vybrany).nazev}</strong> — ťukněte na políčko, kam ho chcete dát.
          <button className="ghost" onClick={() => setVybrany(null)}>
            Zrušit
          </button>
        </div>
      )}

      <div className="planovac-layout">
      <div className="card">
        {Array.from({ length: 7 }, (_, i) => tyden * 7 + i).map((d) => (
          <div className="plan-den" key={d}>
            <div className="plan-hlavicka">
              <div className="plan-datum">{formatDatum(datumDne(start, d))}</div>
              <div className="plan-souhrn">
                {profily.map((os, i) => {
                  const zaklad = makraDne(plan[d]);
                  const n = porce(plan[d], cile[i].kcal);
                  const m = skaluj(zaklad, n);
                  const bilkOk = m.bilkoviny >= cile[i].bilkoviny * 0.9;
                  return (
                    <span key={os.id} className="souhrn-osoba">
                      <b>{os.jmeno}</b> {m.kcal} kcal
                      <i className={bilkOk ? "ok" : "off"}> {m.bilkoviny} g B</i>
                    </span>
                  );
                })}
                <button className="ghost maly" onClick={() => otevriDen(d)}>
                  Detail
                </button>
              </div>
            </div>
            <div className="plan-sloty">
              {PORADI.map((typ) => {
                const r = byId(plan[d][typ]);
                const zmeneno = plan[d][typ] !== planAuto[d][typ];
                const aktivni = cil === d + "-" + typ;
                return (
                  <div
                    key={typ}
                    className="slot"
                    data-aktivni={aktivni}
                    data-zmeneno={zmeneno}
                    data-slot={d + "|" + typ}
                    onClick={() => vybrany && poloz(d, typ, vybrany)}
                    role={vybrany ? "button" : undefined}
                  >
                    <div className="slot-typ">{TYPY[typ]}</div>
                    <div className="slot-nazev">{r.nazev}</div>
                    <div className="slot-kcal">{r.kcal} kcal · {r.bilkoviny} g B</div>
                    {zmeneno && (
                      <button
                        className="slot-zpet"
                        title="Vrátit původní jídlo"
                        onClick={(e) => {
                          e.stopPropagation();
                          vratAutomat(d, typ);
                        }}
                      >
                        ↺
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {tazeny && (
        <div className="duch" style={{ left: tazeny.x, top: tazeny.y }}>
          {byId(tazeny.id).nazev}
        </div>
      )}

      <div className="card paleta-panel">
        <h3>Zásobník receptů</h3>
        <input
          placeholder="Hledat recept…"
          value={hledat}
          onChange={(e) => setHledat(e.target.value)}
          style={{ marginTop: 12 }}
        />
        <div className="filtr-radek">
          {[["vse", "Vše"], ...Object.entries(TYPY)].map(([k, l]) => (
            <button key={k} className="ghost maly" data-on={filtr === k} onClick={() => prepniTyp(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="filtr-radek">
          <button className="ghost maly" data-on={podfiltr === "vse"} onClick={() => setPodfiltr("vse")}>
            Bez omezení
          </button>
          {dostupneStitky.map((k) => (
            <button
              key={k}
              className="ghost maly"
              data-on={podfiltr === k}
              onClick={() => setPodfiltr(podfiltr === k ? "vse" : k)}
            >
              {STITKY[k]}
            </button>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 10 }}>
          {nabidka.length} {nabidka.length === 1 ? "recept" : nabidka.length < 5 ? "recepty" : "receptů"}
        </p>
        <div className="paleta">
          {nabidka.map((r) => (
            <button
              key={r.id}
              className="dlazdice"
              data-vybrany={vybrany === r.id}
              onPointerDown={(e) => zacniTah(e, r.id)}
              onClick={() => {
                if (drag.current.pohnuto) return; // byl to tah, ne ťuknutí
                setVybrany(vybrany === r.id ? null : r.id);
              }}
            >
              <span className="dlazdice-typ" style={{ color: BARVA_TYPU[r.typ] }}>
                {TYPY[r.typ]}
                {stitek(r) ? " · " + STITKY[stitek(r)] : ""}
              </span>
              <span className="dlazdice-nazev">{r.nazev}</span>
              <span className="dlazdice-kcal">
                {r.kcal} kcal · {r.bilkoviny} g B
              </span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </>
  );
}

/* ---------------- NÁKUP ---------------- */

function NakupView({ plan, tyden, setTyden, cile, odskrtnuto, setOdskrtnuto }) {
  const nasobky = useMemo(
    () =>
      cile.map((c) => {
        let s = 0;
        for (let d = tyden * 7; d < tyden * 7 + 7; d++) s += porce(plan[d], c.kcal);
        return s / 7;
      }),
    [plan, tyden, cile]
  );

  const skupiny = useMemo(() => nakupniSeznam(plan, tyden, nasobky), [plan, tyden, nasobky]);
  const pocet = Object.values(skupiny).reduce((a, g) => a + g.length, 0);

  return (
    <>
      <div className="card raised">
        <h2>Nákup na týden</h2>
        <p className="sub">
          {pocet} položek sečtených pro oba, včetně velikosti vašich porcí. Trvanlivé věci klidně
          kupujte rovnou na celý měsíc.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          {[0, 1, 2, 3].map((t) => (
            <button key={t} className="ghost" data-on={tyden === t} onClick={() => setTyden(t)}>
              {t + 1}. týden
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {Object.keys(skupiny).map((cat) => (
          <div key={cat}>
            <div className="group-title">{cat}</div>
            {skupiny[cat].map((p) => {
              const klic = tyden + "|" + p.n + p.u;
              const hotovo = !!odskrtnuto[klic];
              return (
                <label className="item" key={klic} data-done={hotovo}>
                  <input
                    type="checkbox"
                    checked={hotovo}
                    onChange={() => setOdskrtnuto((o) => ({ ...o, [klic]: !o[klic] }))}
                  />
                  <span>{p.n}</span>
                  <span className="q">
                    {p.q} {p.u}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
        <button
          className="ghost"
          style={{ marginTop: 18 }}
          onClick={() =>
            setOdskrtnuto((o) => {
              const n = { ...o };
              Object.keys(n).forEach((k) => k.startsWith(tyden + "|") && delete n[k]);
              return n;
            })
          }
        >
          Zrušit odškrtnutí
        </button>
      </div>
    </>
  );
}

/* ---------------- RECEPTY ---------------- */

function ReceptyView({ otevri }) {
  const [filtr, setFiltr] = useState("vse");
  const [podfiltr, setPodfiltr] = useState("vse");
  const [hledat, setHledat] = useState("");

  const dostupneStitky =
    filtr === "vse"
      ? ["sladke", "slane", "bezmase", "kure", "ryba", "maso"]
      : STITKY_PRO_TYP[filtr] || [];

  const seznam = RECIPES.filter(
    (r) =>
      (filtr === "vse" || r.typ === filtr) &&
      (podfiltr === "vse" || stitek(r) === podfiltr) &&
      r.nazev.toLowerCase().includes(hledat.toLowerCase().trim())
  );
  return (
    <>
      <div className="card raised">
        <h2>Receptář</h2>
        <p className="sub">{RECIPES.length} jednoduchých jídel, žádné na víc než 45 minut.</p>
        <input
          placeholder="Hledat recept…"
          value={hledat}
          onChange={(e) => setHledat(e.target.value)}
          style={{ marginTop: 14 }}
        />
        <div className="filtr-radek">
          {[["vse", "Vše"], ...Object.entries(TYPY)].map(([k, l]) => (
            <button
              key={k}
              className="ghost maly"
              data-on={filtr === k}
              onClick={() => {
                setFiltr(k);
                setPodfiltr("vse");
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="filtr-radek">
          <button className="ghost maly" data-on={podfiltr === "vse"} onClick={() => setPodfiltr("vse")}>
            Bez omezení
          </button>
          {dostupneStitky.map((k) => (
            <button
              key={k}
              className="ghost maly"
              data-on={podfiltr === k}
              onClick={() => setPodfiltr(podfiltr === k ? "vse" : k)}
            >
              {STITKY[k]}
            </button>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 10 }}>Nalezeno: {seznam.length}</p>
      </div>
      <div className="card">
        {seznam.length === 0 ? (
          <p className="sub">Nic takového tu není. Zkuste kratší slovo, třeba „losos“.</p>
        ) : (
          seznam.map((r) => <JidloRadek key={r.id} recept={r} onClick={() => otevri(r.id)} />)
        )}
      </div>
    </>
  );
}

/* ---------------- DETAIL RECEPTU ---------------- */

function Recept({ recept, nasobky, profily, zpet }) {
  const celkem = nasobky.reduce((a, b) => a + b, 0);
  return (
    <div className="card raised">
      <button className="back" onClick={zpet}>
        ← Zpět
      </button>
      <div className="meal-type" style={{ marginTop: 14 }}>
        {TYPY[recept.typ]}
      </div>
      <h2 style={{ marginTop: 6 }}>{recept.nazev}</h2>
      <div className="tags">
        <span className="tag">{recept.cas} min</span>
        <span className="tag">Nakoupíte: {recept.shop}</span>
      </div>
      <div className="stat" style={{ marginTop: 16 }}>
        {recept.kcal} <small>kcal na základní porci</small>
      </div>
      <MakroPruh m={recept} />

      <h3 style={{ marginTop: 24 }}>Kolik si kdo nabere</h3>
      <div className="portion-cards">
        {profily.map((p, i) => {
          const m = skaluj(recept, nasobky[i]);
          return (
            <div className="portion" key={p.id}>
              <div className="portion-name">{p.jmeno}</div>
              <div className="portion-mult">×{nasobky[i].toFixed(2)} porce</div>
              <div className="portion-kcal">{m.kcal} kcal</div>
              <div className="portion-macros">
                {m.bilkoviny} g B · {m.sacharidy} g S · {m.tuky} g T
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: 24 }}>Suroviny</h3>
      <p className="sub">Vážte dohromady a rozdělte podle sloupců, nebo si každý navažte to svoje.</p>
      <table className="ing-table">
        <thead>
          <tr>
            <th>Surovina</th>
            {profily.map((p) => (
              <th key={p.id}>{p.jmeno}</th>
            ))}
            <th>Celkem</th>
          </tr>
        </thead>
        <tbody>
          {recept.suroviny.map((s) => (
            <tr key={s.n}>
              <td>{s.n}</td>
              {nasobky.map((n, i) => (
                <td key={i}>
                  {zaokrouhli(s.q * n, s.u)} {s.u}
                </td>
              ))}
              <td className="total">
                {Math.round(nasobky.reduce((a, n) => a + zaokrouhli(s.q * n, s.u), 0) * 100) / 100}{" "}
                {s.u}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>Postup</h3>
      <ol className="steps">
        {recept.postup.map((k, i) => (
          <li key={i}>{k}</li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- MAKRA ---------------- */

function MakraView({ profily, cile, uprav, start, setStart, kod, zmenKod, stav }) {
  const [novyKodText, setNovyKodText] = useState("");

  const popisStavu = {
    nacitam: ["Načítám z databáze…", "var(--muted)"],
    ukladam: ["Ukládám…", "var(--muted)"],
    ulozeno: ["Uloženo v databázi", "#15803d"],
    lokalne: ["Databáze není nastavená — data jsou jen v tomhle prohlížeči", "#b45309"],
    chyba: ["Databáze neodpovídá, data zatím drží jen prohlížeč", "var(--rose)"],
  }[stav] || ["", "var(--muted)"];

  return (
    <>
      <div className="card raised">
        <h2>Nastavení maker</h2>
        <p className="sub">
          Klidový výdej podle Mifflin–St Jeor × aktivita, plus přirážka za kojení. Cíl zadáváte
          rychlostí hubnutí — kilo tuku odpovídá zhruba 7 700 kcal, takže půl kila týdně znamená
          550 kcal denně pod výdejem.
        </p>
        <label className="field">
          První den plánu
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
      </div>

      <div className="card">
        <h3>Ukládání dat</h3>
        <p className="sub" style={{ color: popisStavu[1], fontWeight: 600 }}>
          {popisStavu[0]}
        </p>
        <p className="sub">
          Kód domácnosti: <strong>{kod || "…"}</strong>. Zadejte ho ve druhém telefonu a uvidíte
          stejná data.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <input
            placeholder="Připojit se ke kódu…"
            value={novyKodText}
            onChange={(e) => setNovyKodText(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button className="ghost" onClick={() => zmenKod(novyKodText.trim())}>
            Připojit
          </button>
        </div>
      </div>

      {profily.map((p, i) => {
        const c = cile[i];
        const kojici = p.kojeni && p.kojeni !== "ne";
        const rychleKojeni = kojici && Number(p.ubytek) > 0.5;
        return (
          <div className="card" key={p.id}>
            <label className="field">
              Jméno
              <input value={p.jmeno} onChange={(e) => uprav(i, "jmeno", e.target.value)} />
            </label>
            <div className="inline-fields">
              <label className="field">
                Pohlaví
                <select value={p.pohlavi} onChange={(e) => uprav(i, "pohlavi", e.target.value)}>
                  <option value="muz">Muž</option>
                  <option value="zena">Žena</option>
                </select>
              </label>
              <label className="field">
                Věk
                <input type="number" value={p.vek} onChange={(e) => uprav(i, "vek", Number(e.target.value))} />
              </label>
              <label className="field">
                Výška (cm)
                <input type="number" value={p.vyska} onChange={(e) => uprav(i, "vyska", Number(e.target.value))} />
              </label>
              <label className="field">
                Váha (kg)
                <input type="number" value={p.vaha} onChange={(e) => uprav(i, "vaha", Number(e.target.value))} />
              </label>
            </div>
            <label className="field">
              Aktivita
              <select value={p.aktivita} onChange={(e) => uprav(i, "aktivita", Number(e.target.value))}>
                {Object.entries(AKTIVITA).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {p.pohlavi === "zena" && (
              <label className="field">
                Kojení
                <select value={p.kojeni || "ne"} onChange={(e) => uprav(i, "kojeni", e.target.value)}>
                  {KOJENI.map((k) => (
                    <option key={k.v} value={k.v}>
                      {k.label}
                      {k.kcal ? ` (+${k.kcal} kcal)` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="inline-fields">
              <label className="field">
                Cíl
                <select value={p.ubytek} onChange={(e) => uprav(i, "ubytek", e.target.value)}>
                  {CILE.map((k) => (
                    <option key={k.v} value={k.v}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Bílkoviny na kg
                <input
                  type="number"
                  step="0.1"
                  value={p.bilkovinyNaKg}
                  onChange={(e) => uprav(i, "bilkovinyNaKg", Number(e.target.value))}
                />
              </label>
            </div>

            {rychleKojeni && (
              <div className="varovani">
                Při kojení tříměsíčního dítěte je tempo nad 0,5 kg týdně rizikové — mléka bývá
                méně. Držte se raději 0,25–0,5 kg.
              </div>
            )}
            {c.omezeno && (
              <div className="varovani">
                Zvolené tempo by znamenalo příjem pod {c.min} kcal, takže appka zastavila na téhle
                hranici. Reálně z toho vyjde asi {c.skutecnyUbytek} kg týdně.
              </div>
            )}

            <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <div className="meal-type">
                Denní cíl · výdej {c.tdee} kcal
                {c.kojeniKcal ? ` + ${c.kojeniKcal} kcal na kojení` : ""}
              </div>
              <div className="stat" style={{ marginTop: 8 }}>
                {c.kcal} <small>kcal · tempo {c.skutecnyUbytek} kg/týden</small>
              </div>
              <MakroPruh m={c} />
            </div>
          </div>
        );
      })}

      <div className="card">
        <h3>Proč tu není 2 kg týdně</h3>
        <p className="sub">
          Dvě kila týdně znamenají schodek přes 2 000 kcal denně. To u naprosté většiny lidí
          nevychází ani při nulovém příjmu a co ubyde, je z velké části svalovina a voda. Nejrychlejší
          nabízená volba je 1 kg týdně a i tu berte jako krátkodobou. Kojící ženě appka nedovolí
          klesnout pod 1 800 kcal.
        </p>
      </div>
    </>
  );
}
