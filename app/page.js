"use client";

import { useEffect, useMemo, useState } from "react";
import { RECIPES, TYPY, byId } from "../lib/recipes";
import {
  AKTIVITA,
  CILE,
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
const BARVY = { bilkoviny: "#0d5eaf", sacharidy: "#f0b429", tuky: "#12a09b" };
const BARVA_TYPU = { snidane: "#f0b429", svacina: "#12a09b", obed: "#0d5eaf", vecere: "#062e5c" };

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
  const [zalozka, setZalozka] = useState("den");
  const [profily, setProfily] = useState(VYCHOZI_PROFILY);
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [den, setDen] = useState(0);
  const [tyden, setTyden] = useState(0);
  const [odskrtnuto, setOdskrtnuto] = useState({});
  const [otevrenyRecept, setOtevrenyRecept] = useState(null);
  const [nacteno, setNacteno] = useState(false);

  const plan = useMemo(() => generujPlan(28), []);

  useEffect(() => {
    const u = nactiUlozene();
    if (u) {
      if (u.profily) setProfily(u.profily);
      if (u.start) setStart(u.start);
      if (u.odskrtnuto) setOdskrtnuto(u.odskrtnuto);
    }
    setNacteno(true);
  }, []);

  useEffect(() => {
    if (!nacteno) return;
    window.localStorage.setItem(ULOZ, JSON.stringify({ profily, start, odskrtnuto }));
  }, [profily, start, odskrtnuto, nacteno]);

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
            Čtyři týdny jídel v řeckém duchu, spočítané na vaše makra a nakoupitelné v Rohlíku,
            Lidlu i Makru.
          </p>
          <div className="chips">
            <span className="chip">{RECIPES.length} receptů</span>
            <span className="chip">28 dní</span>
            <span className="chip">Vysoký příjem bílkovin</span>
            <span className="chip">Nákup na klik</span>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <div className="tabs-inner">
          {[
            ["den", "Den"],
            ["plan", "Měsíc"],
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
            {zalozka === "plan" && (
              <MesicView
                plan={plan}
                start={start}
                naDen={(i) => {
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

function JidloRadek({ recept, typ, onClick }) {
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
          <span className="tag">{recept.bilkoviny} g bílkovin</span>
        </span>
      </span>
      <span className="meal-macros">
        <b>{recept.kcal}</b>
        kcal
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
            onClick={() => otevri(plan[den][typ])}
          />
        ))}
      </div>
    </>
  );
}

/* ---------------- MĚSÍC ---------------- */

function MesicView({ plan, start, naDen }) {
  const [tyden, setTyden] = useState(0);
  return (
    <>
      <div className="card raised">
        <h2>Celý měsíc</h2>
        <p className="sub">
          Čtyři týdny. Recepty se vracejí zhruba po dvou týdnech — dost na rutinu, málo na nudu.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          {[0, 1, 2, 3].map((t) => (
            <button key={t} className="ghost" data-on={tyden === t} onClick={() => setTyden(t)}>
              {t + 1}. týden
            </button>
          ))}
        </div>
      </div>

      {Array.from({ length: 7 }, (_, i) => tyden * 7 + i).map((d) => {
        const m = makraDne(plan[d]);
        return (
          <div className="card" key={d}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong style={{ textTransform: "capitalize", fontSize: 16 }}>
                {formatDatum(datumDne(start, d))}
              </strong>
              <button className="ghost" onClick={() => naDen(d)}>
                Otevřít den
              </button>
            </div>
            <MakroPruh m={m} />
            <p className="sub">{PORADI.map((t) => byId(plan[d][t]).nazev).join(" · ")}</p>
          </div>
        );
      })}
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
  const [hledat, setHledat] = useState("");
  const seznam = RECIPES.filter(
    (r) =>
      (filtr === "vse" || r.typ === filtr) &&
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
        <div className="row" style={{ marginTop: 12 }}>
          {[["vse", "Vše"], ...Object.entries(TYPY)].map(([k, l]) => (
            <button key={k} className="ghost" data-on={filtr === k} onClick={() => setFiltr(k)}>
              {l}
            </button>
          ))}
        </div>
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

      <h3 style={{ marginTop: 24 }}>Navážka pro oba</h3>
      <p className="sub">
        {profily.map((p, i) => `${p.jmeno} ×${nasobky[i].toFixed(2)}`).join(", ")} — dohromady ×
        {celkem.toFixed(2)} základní porce.
      </p>
      <ul className="ing">
        {recept.suroviny.map((s) => {
          const q =
            s.u === "ks" || s.u === "stroužek"
              ? Math.round(s.q * celkem * 4) / 4
              : Math.round((s.q * celkem) / 5) * 5;
          return (
            <li key={s.n}>
              <span>{s.n}</span>
              <span>
                {q} {s.u}
              </span>
            </li>
          );
        })}
      </ul>

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

function MakraView({ profily, cile, uprav, start, setStart }) {
  return (
    <>
      <div className="card raised">
        <h2>Nastavení maker</h2>
        <p className="sub">
          Počítáme podle Mifflin–St Jeor: klidový výdej × aktivita, pak úprava podle cíle. Tuky
          držíme na 30 % energie, bílkoviny podle váhy, zbytek jsou sacharidy.
        </p>
        <label className="field">
          První den plánu
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
      </div>

      {profily.map((p, i) => {
        const c = cile[i];
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
            <div className="inline-fields">
              <label className="field">
                Cíl
                <select value={p.cil} onChange={(e) => uprav(i, "cil", e.target.value)}>
                  {Object.entries(CILE).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
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

            <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <div className="meal-type">Denní cíl · výdej {c.tdee} kcal</div>
              <div className="stat" style={{ marginTop: 8 }}>
                {c.kcal} <small>kcal</small>
              </div>
              <MakroPruh m={c} />
            </div>
          </div>
        );
      })}
    </>
  );
}
