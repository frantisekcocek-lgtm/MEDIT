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
const BARVY = { bilkoviny: "#2e6f76", sacharidy: "#e4a11b", tuky: "#6b7f3e" };

function nactiUlozene() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(ULOZ) || "null");
  } catch {
    return null;
  }
}

/* Mozaikový pásek: 20 dlaždic v poměru energie z bílkovin, sacharidů a tuků */
function Mozaika({ m }) {
  const e = { bilkoviny: m.bilkoviny * 4, sacharidy: m.sacharidy * 4, tuky: m.tuky * 9 };
  const soucet = e.bilkoviny + e.sacharidy + e.tuky || 1;
  const pocty = {
    bilkoviny: Math.round((e.bilkoviny / soucet) * 20),
    sacharidy: Math.round((e.sacharidy / soucet) * 20),
  };
  pocty.tuky = 20 - pocty.bilkoviny - pocty.sacharidy;
  const dlazdice = [];
  ["bilkoviny", "sacharidy", "tuky"].forEach((k) => {
    for (let i = 0; i < Math.max(0, pocty[k]); i++) {
      dlazdice.push(<i key={k + i} className="tile" style={{ "--tile": BARVY[k] }} />);
    }
  });
  return (
    <>
      <div className="mosaic" aria-hidden="true">
        {dlazdice}
      </div>
      <div className="mosaic-legend">
        <span>
          <i className="dot" style={{ background: BARVY.bilkoviny }} />
          bílkoviny {m.bilkoviny} g
        </span>
        <span>
          <i className="dot" style={{ background: BARVY.sacharidy }} />
          sacharidy {m.sacharidy} g
        </span>
        <span>
          <i className="dot" style={{ background: BARVY.tuky }} />
          tuky {m.tuky} g
        </span>
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
      <header className="top">
        <div className="wrap">
          <div className="eyebrow">28 dní · 27 receptů · 2 talíře</div>
          <h1>Středomořský plán</h1>
          <p>Jídelníček pro vás dva, počítaný na vaše makra a nakoupitelný v Rohlíku, Lidlu i Makru.</p>
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
                cile={cile}
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

/* ---------------- DEN ---------------- */

function DenView({ den, setDen, plan, start, profily, cile, nasobky, zaklad, otevri }) {
  const datum = datumDne(start, den);
  return (
    <>
      <div className="card">
        <div className="daynav">
          <button className="ghost" onClick={() => setDen(Math.max(0, den - 1))} disabled={den === 0}>
            ← Včera
          </button>
          <div style={{ textAlign: "center" }}>
            <div className="eyebrow" style={{ color: "var(--muted)" }}>
              Den {den + 1} / 28
            </div>
            <strong style={{ textTransform: "capitalize" }}>{formatDatum(datum)}</strong>
          </div>
          <button
            className="ghost"
            onClick={() => setDen(Math.min(27, den + 1))}
            disabled={den === 27}
          >
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
              <div className="eyebrow" style={{ color: "var(--muted)" }}>
                {p.jmeno} · porce ×{nasobky[i].toFixed(2)}
              </div>
              <div className="kcal">
                {m.kcal} <span className="unit">kcal / cíl {c.kcal}</span>
              </div>
              <Mozaika m={m} />
              <p className="sub">
                <span className={Math.abs(rozdil) <= 120 ? "diff-ok" : "diff-off"}>
                  {rozdil >= 0 ? "+" : ""}
                  {rozdil} kcal
                </span>{" "}
                ·{" "}
                <span className={bilkOk ? "diff-ok" : "diff-off"}>
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
        {PORADI.map((typ) => {
          const r = byId(plan[den][typ]);
          return (
            <button className="meal" key={typ} onClick={() => otevri(r.id)}>
              <span>
                <span className="meal-type">{TYPY[typ]}</span>
                <div className="meal-name">{r.nazev}</div>
                <span className="pill">{r.cas} min</span>{" "}
                <span className="pill">{r.shop}</span>
              </span>
              <span className="meal-macros">
                {r.kcal} kcal
                <br />
                {r.bilkoviny} g B
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- MĚSÍC ---------------- */

function MesicView({ plan, start, cile, naDen }) {
  const [tyden, setTyden] = useState(0);
  return (
    <>
      <div className="card">
        <h2>Celý měsíc</h2>
        <p className="sub">
          Čtyři týdny, recepty se vracejí zhruba po dvou týdnech — dost na rutinu, málo na nudu.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          {[0, 1, 2, 3].map((t) => (
            <button
              key={t}
              className="ghost"
              onClick={() => setTyden(t)}
              style={
                tyden === t
                  ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }
                  : undefined
              }
            >
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
              <strong style={{ textTransform: "capitalize" }}>{formatDatum(datumDne(start, d))}</strong>
              <button className="ghost" onClick={() => naDen(d)}>
                Otevřít den
              </button>
            </div>
            <p className="sub" style={{ marginTop: 8 }}>
              {PORADI.map((t) => byId(plan[d][t]).nazev).join(" · ")}
            </p>
            <p className="sub">
              Základní porce: {m.kcal} kcal, {m.bilkoviny} g bílkovin
            </p>
          </div>
        );
      })}
    </>
  );
}

/* ---------------- NÁKUP ---------------- */

function NakupView({ plan, tyden, setTyden, cile, odskrtnuto, setOdskrtnuto }) {
  const nasobky = useMemo(() => {
    // průměrný násobek porcí přes týden pro každého člověka
    return cile.map((c) => {
      let s = 0;
      for (let d = tyden * 7; d < tyden * 7 + 7; d++) s += porce(plan[d], c.kcal);
      return s / 7;
    });
  }, [plan, tyden, cile]);

  const skupiny = useMemo(() => nakupniSeznam(plan, tyden, nasobky), [plan, tyden, nasobky]);

  return (
    <>
      <div className="card">
        <h2>Nákup na týden</h2>
        <p className="sub">
          Sečteno pro oba, včetně vašich porcí. Trvanlivé věci klidně kupujte na celý měsíc.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          {[0, 1, 2, 3].map((t) => (
            <button
              key={t}
              className="ghost"
              onClick={() => setTyden(t)}
              style={
                tyden === t
                  ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }
                  : undefined
              }
            >
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
          style={{ marginTop: 16 }}
          onClick={() => setOdskrtnuto((o) => {
            const n = { ...o };
            Object.keys(n).forEach((k) => k.startsWith(tyden + "|") && delete n[k]);
            return n;
          })}
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
  const seznam = RECIPES.filter((r) => filtr === "vse" || r.typ === filtr);
  return (
    <>
      <div className="card">
        <h2>Všechny recepty</h2>
        <div className="row" style={{ marginTop: 12 }}>
          {[["vse", "Vše"], ...Object.entries(TYPY)].map(([k, l]) => (
            <button
              key={k}
              className="ghost"
              onClick={() => setFiltr(k)}
              style={
                filtr === k
                  ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }
                  : undefined
              }
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        {seznam.map((r) => (
          <button className="meal" key={r.id} onClick={() => otevri(r.id)}>
            <span>
              <span className="meal-type">{TYPY[r.typ]}</span>
              <div className="meal-name">{r.nazev}</div>
              <span className="pill">{r.cas} min</span> <span className="pill">{r.shop}</span>
            </span>
            <span className="meal-macros">
              {r.kcal} kcal
              <br />
              {r.bilkoviny} g B
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- DETAIL RECEPTU ---------------- */

function Recept({ recept, nasobky, profily, zpet }) {
  const celkem = nasobky.reduce((a, b) => a + b, 0);
  const m = {
    kcal: recept.kcal,
    bilkoviny: recept.bilkoviny,
    sacharidy: recept.sacharidy,
    tuky: recept.tuky,
  };
  return (
    <div className="card">
      <button className="recipe-back" onClick={zpet}>
        ← Zpět
      </button>
      <div className="eyebrow" style={{ color: "var(--muted)", marginTop: 10 }}>
        {TYPY[recept.typ]} · {recept.cas} min · {recept.shop}
      </div>
      <h2 style={{ marginTop: 6 }}>{recept.nazev}</h2>
      <div className="kcal" style={{ marginTop: 10 }}>
        {recept.kcal} <span className="unit">kcal na základní porci</span>
      </div>
      <Mozaika m={m} />

      <h3 style={{ marginTop: 20 }}>Navážka pro oba</h3>
      <p className="sub">
        {profily.map((p, i) => `${p.jmeno} ×${nasobky[i].toFixed(2)}`).join(", ")} — dohromady ×
        {celkem.toFixed(2)} základní porce.
      </p>
      <ul className="ing">
        {recept.suroviny.map((s) => {
          const q = s.u === "ks" || s.u === "stroužek"
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

      <h3 style={{ marginTop: 20 }}>Postup</h3>
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
      <div className="card">
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
                <input
                  type="number"
                  value={p.vek}
                  onChange={(e) => uprav(i, "vek", Number(e.target.value))}
                />
              </label>
              <label className="field">
                Výška (cm)
                <input
                  type="number"
                  value={p.vyska}
                  onChange={(e) => uprav(i, "vyska", Number(e.target.value))}
                />
              </label>
              <label className="field">
                Váha (kg)
                <input
                  type="number"
                  value={p.vaha}
                  onChange={(e) => uprav(i, "vaha", Number(e.target.value))}
                />
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

            <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <div className="eyebrow" style={{ color: "var(--muted)" }}>
                Denní cíl · výdej {c.tdee} kcal
              </div>
              <div className="kcal">
                {c.kcal} <span className="unit">kcal</span>
              </div>
              <Mozaika m={c} />
            </div>
          </div>
        );
      })}
    </>
  );
}
