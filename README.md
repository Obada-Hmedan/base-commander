# قائد القاعدة · Base Commander

لعبة تعليمية بالمتصفح والهاتف لأطفال 7–12 سنة: بتدير قاعدة على القطب الجنوبي للقمر، وكل قرار إله ثمن، وكل رقم من بيانات ناسا الحقيقية.

A browser and mobile game for kids aged 7–12: run a base at the Moon's south pole, where every choice has a cost and every number comes from real NASA data.

**NASA International Space Apps Challenge 2026, Palestine. Team MME.**

**Play: https://obada-hmedan.github.io/base-commander/**

## التشغيل على جهازك · Run locally

JSON files are loaded with `fetch`, so opening `index.html` directly will not work. Use a local server:

```bash
npx serve .
```

Or use the **Live Server** extension in VS Code.

To test on a phone, connect it to the same Wi-Fi and open `http://<your-computer-ip>:<port>`.

## هيكل المشروع · Structure

```
index.html          Entry page
css/style.css       Mobile-first styles (RTL/LTR via logical properties)
js/main.js          Boot: loads JSON and language, opens the game stage
js/page.js          Scrolling page: intro, about NASA, how to become an astronaut, sources
js/ui.js            Game screens: site choice, dashboard, events, results
js/engine.js        Game logic, no DOM (Moon and Mars use the same rules with different numbers)
js/events.js        Real DONKI events -> Moon days; scripted Mars scenario
js/cutscene.js      Animated launch / travel / landing "video" (SVG + CSS)
js/scene.js         Animated picture of the base
js/art.js           Original SVG drawings (logo, rocket, lander, astronaut)
js/i18n.js          Arabic/English switching
i18n/               Arabic and English strings
data/               constants.json (balance, sources, image credits), donki-events.json
assets/img/         NASA photos (credits in data/constants.json)
scripts/            fetch-donki.mjs (download archive), simulate.mjs (balance check)
```

## النشر · Deploy

GitHub Pages: Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## المصادر · Sources

All data sources, image credits and AI-use disclosure are listed in the in-game "Where do the numbers come from?" page. NASA images are used with credit; the NASA logo is not used, and this project is not endorsed by NASA.

## License

MIT. See [LICENSE](LICENSE).
