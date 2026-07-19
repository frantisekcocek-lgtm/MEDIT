# Středomořský plán

Jídelníček a sledování maker pro dvojici. Next.js (App Router), žádná databáze —
nastavení se ukládá do localStorage prohlížeče.

## Co appka umí

- **Den** — dnešní snídaně, svačina, oběd a večeře, přepočítané zvlášť pro každého z vás
  (porce se škáluje tak, aby seděl kalorický cíl).
- **Měsíc** — 28 dní dopředu, recepty se vracejí zhruba po dvou týdnech.
- **Nákup** — týdenní seznam sečtený pro oba, seřazený podle regálů, s odškrtáváním.
- **Recepty** — 56 receptů se surovinami, postupem a makry.
- **Makra** — Mifflin–St Jeor výpočet výdeje, cíl (hubnutí/udržení/nabírání),
  bílkoviny na kg, tuky 30 % energie, zbytek sacharidy.

## Spuštění lokálně

```bash
npm install
npm run dev
```

## Nasazení na Vercel

Varianta přes web (nejjednodušší):

1. Nahrajte složku na GitHub jako nový repozitář.
2. Na vercel.com dejte **Add New… → Project** a repozitář naimportujte.
3. Framework se detekuje jako Next.js, nic nenastavujte, dejte **Deploy**.

Varianta z terminálu:

```bash
npm i -g vercel
vercel
```

## Úpravy

- Recepty: `lib/recipes.js` — makra i suroviny jsou vždy na **jednu základní porci**.
- Skladba plánu a výpočty: `lib/plan.js`.
- Barvy a typografie: `app/globals.css`.

## Na co pozor

Makra receptů jsou odhad podle běžných hodnot surovin, ne laboratorní analýza —
počítejte s odchylkou kolem 10 %. Vypočtený výdej energie je jen startovní bod:
pokud se váha po dvou třech týdnech nehýbe kýženým směrem, upravte kalorie
o 150–200 kcal, ne víc. A tohle není lékařská rada; při zdravotních komplikacích
nebo těhotenství si plán projděte s lékařem či nutričním terapeutem.
