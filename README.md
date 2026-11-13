# قائد القاعدة · Base Commander

لعبة تعليمية بالمتصفح والهاتف لأطفال 7–12 سنة: بتدير قاعدة على القطب الجنوبي للقمر، وكل قرار إله ثمن، وكل رقم من بيانات ناسا الحقيقية.

A browser and mobile game for kids aged 7–12: run a base at the Moon's south pole, where every choice has a cost and every number comes from real NASA data.

**NASA International Space Apps Challenge 2026, Palestine. Team MME.**

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
js/main.js          Boot: loads JSON and language
js/i18n.js          Arabic/English switching
js/ui.js            Screens
js/engine.js        Game logic, no DOM
js/events.js        DONKI events -> game days
js/quiz.js          Quiz with shuffled options
i18n/ar.json        Arabic strings
i18n/en.json        English strings
data/               constants.json, donki-events.json, quiz-bank.json
assets/             Images
scripts/            fetch-donki.mjs
```

## النشر · Deploy

GitHub Pages: Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## المصادر · Sources

All data sources, image credits and AI-use disclosure are listed in the in-game "Where do the numbers come from?" page. NASA images are used with credit; the NASA logo is not used, and this project is not endorsed by NASA.

## License

MIT. See [LICENSE](LICENSE).
