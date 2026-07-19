import { byType, byId } from "./recipes";

// ---------- MAKRA ----------

export const AKTIVITA = {
  1.2: "Sedavá práce, žádný pohyb",
  1.375: "Lehký pohyb 1–3× týdně",
  1.55: "Trénink 3–5× týdně",
  1.725: "Trénink 6–7× týdně",
  1.9: "Těžká fyzická práce nebo dvoufázové tréninky",
};

export const CILE = {
  "-20": "Hubnutí rychleji (−20 %)",
  "-10": "Hubnutí (−10 %)",
  "0": "Udržení",
  "10": "Nabírání (+10 %)",
};

// Mifflin–St Jeor
export function bmr({ pohlavi, vaha, vyska, vek }) {
  const base = 10 * vaha + 6.25 * vyska - 5 * vek;
  return Math.round(pohlavi === "muz" ? base + 5 : base - 161);
}

export function spocitejMakra(p) {
  const tdee = Math.round(bmr(p) * Number(p.aktivita));
  const kcal = Math.round(tdee * (1 + Number(p.cil) / 100));
  const bilkoviny = Math.round(p.vaha * Number(p.bilkovinyNaKg));
  const tuky = Math.round((kcal * 0.3) / 9);
  const sacharidy = Math.max(0, Math.round((kcal - bilkoviny * 4 - tuky * 9) / 4));
  return { tdee, kcal, bilkoviny, sacharidy, tuky };
}

export const VYCHOZI_PROFILY = [
  {
    id: "a",
    jmeno: "Já",
    pohlavi: "muz",
    vek: 35,
    vyska: 182,
    vaha: 88,
    aktivita: 1.55,
    cil: "-10",
    bilkovinyNaKg: 1.8,
  },
  {
    id: "b",
    jmeno: "Žena",
    pohlavi: "zena",
    vek: 33,
    vyska: 168,
    vaha: 65,
    aktivita: 1.375,
    cil: "-10",
    bilkovinyNaKg: 1.6,
  },
];

// ---------- PLÁN ----------

// Deterministická rotace: každý týden se posune index, takže se recepty
// opakují, ale ne pořád ve stejný den.
function vyber(seznam, den, offset) {
  const tyden = Math.floor(den / 7);
  return seznam[(den + offset + tyden * 2) % seznam.length].id;
}

export function generujPlan(dnu = 28) {
  const sn = byType("snidane");
  const sv = byType("svacina");
  const ob = byType("obed");
  const ve = byType("vecere");
  const dny = [];
  for (let d = 0; d < dnu; d++) {
    dny.push({
      snidane: vyber(sn, d, 0),
      svacina: vyber(sv, d, 1),
      obed: vyber(ob, d, 2),
      vecere: vyber(ve, d, 3),
    });
  }
  return dny;
}

export const PORADI = ["snidane", "svacina", "obed", "vecere"];

export function makraDne(den) {
  return PORADI.reduce(
    (acc, t) => {
      const r = byId(den[t]);
      if (!r) return acc;
      acc.kcal += r.kcal;
      acc.bilkoviny += r.bilkoviny;
      acc.sacharidy += r.sacharidy;
      acc.tuky += r.tuky;
      return acc;
    },
    { kcal: 0, bilkoviny: 0, sacharidy: 0, tuky: 0 }
  );
}

// Kolikrát si daný člověk nabere oproti základní porci receptu
export function porce(den, cilKcal) {
  const zaklad = makraDne(den).kcal;
  if (!zaklad) return 1;
  const k = cilKcal / zaklad;
  return Math.round(Math.min(1.6, Math.max(0.6, k)) * 20) / 20; // krok 0,05
}

export function skaluj(makra, k) {
  return {
    kcal: Math.round(makra.kcal * k),
    bilkoviny: Math.round(makra.bilkoviny * k),
    sacharidy: Math.round(makra.sacharidy * k),
    tuky: Math.round(makra.tuky * k),
  };
}

// ---------- NÁKUPNÍ SEZNAM ----------

export function nakupniSeznam(plan, tyden, nasobky) {
  const start = tyden * 7;
  const mapa = new Map();
  const celkem = nasobky.reduce((a, b) => a + b, 0);

  for (let d = start; d < start + 7 && d < plan.length; d++) {
    for (const typ of PORADI) {
      const r = byId(plan[d][typ]);
      if (!r) continue;
      for (const s of r.suroviny) {
        const klic = s.n + "|" + s.u;
        const prev = mapa.get(klic) || { n: s.n, u: s.u, cat: s.cat, q: 0 };
        prev.q += s.q * celkem;
        mapa.set(klic, prev);
      }
    }
  }

  const polozky = [...mapa.values()].map((p) => ({
    ...p,
    q: p.u === "ks" || p.u === "stroužek" ? Math.ceil(p.q * 4) / 4 : Math.round(p.q / 5) * 5,
  }));

  const skupiny = {};
  for (const p of polozky) {
    (skupiny[p.cat] ||= []).push(p);
  }
  for (const k of Object.keys(skupiny)) {
    skupiny[k].sort((a, b) => a.n.localeCompare(b.n, "cs"));
  }
  return skupiny;
}

export function datumDne(start, index) {
  const d = new Date(start);
  d.setDate(d.getDate() + index);
  return d;
}

export function formatDatum(d) {
  return d.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" });
}
