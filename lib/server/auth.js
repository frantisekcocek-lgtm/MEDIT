import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "sez";
const PLATNOST = 60 * 60 * 24 * 90; // 90 dní

function najdi(pripona) {
  if (process.env[pripona]) return process.env[pripona];
  const klic = Object.keys(process.env).find(
    (k) => k.endsWith("_" + pripona) || k === pripona
  );
  return klic ? process.env[klic] : undefined;
}

// Klíč pro podpis přihlašovacích cookies. Ideálně vlastní AUTH_SECRET,
// jinak spadneme na token databáze (stabilní napříč nasazeními).
function tajemstvi() {
  return (
    najdi("AUTH_SECRET") ||
    najdi("KV_REST_API_TOKEN") ||
    najdi("UPSTASH_REDIS_REST_TOKEN") ||
    ""
  );
}

/* ---------- hesla ---------- */

export function zahesluj(heslo) {
  const sul = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(heslo, sul, 64).toString("hex");
  return `${sul}:${hash}`;
}

export function overHeslo(heslo, ulozene) {
  try {
    const [sul, hash] = String(ulozene).split(":");
    if (!sul || !hash) return false;
    const zkusmo = crypto.scryptSync(heslo, sul, 64);
    const ulozeny = Buffer.from(hash, "hex");
    if (ulozeny.length !== zkusmo.length) return false;
    return crypto.timingSafeEqual(ulozeny, zkusmo);
  } catch {
    return false;
  }
}

/* ---------- relace ---------- */

function podepis(text) {
  return crypto.createHmac("sha256", tajemstvi()).update(text).digest("base64url");
}

export function vytvorRelaci(email, domacnost) {
  const telo = Buffer.from(
    JSON.stringify({ email, domacnost, do: Date.now() + PLATNOST * 1000 })
  ).toString("base64url");
  const token = `${telo}.${podepis(telo)}`;
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PLATNOST,
  });
}

export function zrusRelaci() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function nactiRelaci() {
  const token = cookies().get(COOKIE)?.value;
  if (!token || !tajemstvi()) return null;
  const [telo, podpis] = token.split(".");
  if (!telo || !podpis) return null;

  const ocekavany = podepis(telo);
  const a = Buffer.from(podpis);
  const b = Buffer.from(ocekavany);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(telo, "base64url").toString());
    if (!data.do || data.do < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/* ---------- vstupy ---------- */

export function upravEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function platnyEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function novaDomacnost() {
  return "dom-" + crypto.randomBytes(4).toString("hex");
}
