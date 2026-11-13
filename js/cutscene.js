// Animated "video" between screens: boarding, launch, the trip, landing, first steps.
// Drawn with SVG + CSS so it is tiny, works on phones and needs no video file.
import { t } from './i18n.js';
import { svg, astronaut, rocket, lander, stars } from './art.js';

const W = 360;
const H = 520;

const earth = (x, y, r, cls = '') => `
  <g class="${cls}"><g transform="translate(${x} ${y})">
    <circle r="${r}" fill="#4aa3ff"/><path d="M${-r * 0.6} ${-r * 0.3}q${r * 0.5}-${r * 0.5} ${r} 0t${r * 0.4} ${r * 0.6}q-${r * 0.7} ${r * 0.4}-${r * 1.3}-${r * 0.1}z" fill="#5fd38d"/>
    <circle r="${r}" fill="none" stroke="#bfe0ff" stroke-width="2" opacity="0.5"/>
  </g></g>`;

const moon = (x, y, r, cls = '') => `
  <g class="${cls}"><g transform="translate(${x} ${y})">
    <circle r="${r}" fill="#c9cfdd"/><circle cx="${-r * 0.3}" cy="${-r * 0.2}" r="${r * 0.18}" fill="#aab1c4"/>
    <circle cx="${r * 0.35}" cy="${r * 0.3}" r="${r * 0.25}" fill="#aab1c4"/><circle cx="${r * 0.2}" cy="${-r * 0.5}" r="${r * 0.1}" fill="#aab1c4"/>
  </g></g>`;

const marsPlanet = (x, y, r, cls = '') => `
  <g class="${cls}"><g transform="translate(${x} ${y})">
    <circle r="${r}" fill="#c8623a"/><path d="M${-r * 0.7} ${r * 0.1}q${r * 0.6}-${r * 0.4} ${r * 1.3} 0" stroke="#9c4526" stroke-width="${r * 0.18}" fill="none"/>
    <circle cx="${-r * 0.2}" cy="${-r * 0.75}" r="${r * 0.2}" fill="#f2e6dc"/>
  </g></g>`;

function surface(color, dark) {
  return `<path d="M0 400q90-26 180-12t180-10v142H0z" fill="${color}"/>
    <ellipse cx="80" cy="470" rx="34" ry="8" fill="${dark}"/><ellipse cx="280" cy="490" rx="26" ry="6" fill="${dark}"/>
    <ellipse cx="200" cy="445" rx="16" ry="4" fill="${dark}"/>`;
}

// Each stage: [id, seconds, markup]
function stagesFor(kind) {
  const toMars = kind === 'toMars';
  const space = `<rect width="${W}" height="${H}" fill="#050814"/>${stars(90, W, H)}`;
  const destColor = toMars ? '#b5562f' : '#aeb4c6';
  const destDark = toMars ? '#8c3f20' : '#8b92a8';
  const destSky = toMars
    ? `<rect width="${W}" height="${H}" fill="#e3ad78"/>`
    : `<rect width="${W}" height="${H}" fill="#050814"/>${stars(70, W, 380)}${earth(70, 90, 26)}`;

  const list = [];

  if (!toMars) {
    list.push(['board', 3.6, `
      <rect width="${W}" height="${H}" fill="#7ec8f5"/>
      <circle cx="300" cy="80" r="30" fill="#fff3a8"/>
      <ellipse cx="80" cy="110" rx="46" ry="14" fill="#fff" opacity="0.8"/><ellipse cx="230" cy="170" rx="56" ry="16" fill="#fff" opacity="0.7"/>
      <rect y="430" width="${W}" height="90" fill="#6fae5a"/><rect x="150" y="424" width="130" height="12" fill="#9aa1b5"/>
      <rect x="252" y="250" width="8" height="180" fill="#8b92a8"/><path d="M252 290h-26M252 340h-26" stroke="#8b92a8" stroke-width="5"/>
      ${rocket(214, 424, 1.25)}
      <g class="crew-walk">${astronaut(0, 404, 1.3)}${astronaut(-34, 404, 1.3)}${astronaut(-68, 404, 1.3)}${astronaut(-102, 404, 1.3)}</g>
    `]);
    list.push(['launch', 4.4, `
      <rect width="${W}" height="${H}" fill="#7ec8f5"/>
      <g class="sky-dark"><rect width="${W}" height="${H}" fill="#050814"/>${stars(60, W, H)}</g>
      <g class="ground-drop"><rect y="430" width="${W}" height="90" fill="#6fae5a"/><rect x="115" y="424" width="130" height="12" fill="#9aa1b5"/></g>
      <g class="liftoff">${rocket(180, 424, 1.25)}</g>
      <g class="smoke-wrap"><g class="smoke"><circle cx="150" cy="430" r="26" fill="#fff"/><circle cx="210" cy="436" r="30" fill="#fff"/><circle cx="180" cy="446" r="34" fill="#f2f4fa"/></g>
      </g>
      <text class="count c3" x="180" y="170" text-anchor="middle">3</text>
      <text class="count c2" x="180" y="170" text-anchor="middle">2</text>
      <text class="count c1" x="180" y="170" text-anchor="middle">1</text>
    `]);
  } else {
    list.push(['leave', 3.8, `
      <rect width="${W}" height="${H}" fill="#050814"/>${stars(70, W, 380)}${earth(70, 90, 26)}
      ${surface('#aeb4c6', '#8b92a8')}
      <g class="ascend">${lander(180, 372, 1.6)}</g>
      <path d="M120 404a60 60 0 0 1 80 0z" fill="#f2f4fa" stroke="#0b1020"/><rect x="152" y="386" width="16" height="18" rx="3" fill="#8b92a8"/>
    `]);
  }

  list.push(['space', toMars ? 5 : 4, `
    ${space}
    <g class="streaks">${Array.from({ length: 14 }, (_, i) => `<rect x="${(i * 53) % W}" y="${(i * 97) % H}" width="2" height="40" fill="#fff" opacity="0.5"/>`).join('')}</g>
    ${toMars ? moon(70, 430, 60, 'shrink') : earth(70, 430, 60, 'shrink')}
    ${toMars ? marsPlanet(290, 90, 26, 'grow') : moon(290, 90, 26, 'grow')}
    <g class="cruise">${lander(180, 270, 1.5)}</g>
  `]);

  list.push(['landing', 4.4, `
    ${destSky}
    ${surface(destColor, destDark)}
    <g class="descend">${lander(180, 372, 1.6)}</g>
    <g class="dust-puff"><ellipse cx="130" cy="408" rx="30" ry="9" fill="${destColor}"/><ellipse cx="232" cy="408" rx="30" ry="9" fill="${destColor}"/></g>
  `]);

  list.push(['step', 3.4, `
    ${destSky}
    ${surface(destColor, destDark)}
    <g class="landed">${lander(180, 372, 1.6)}</g>
    <path d="M200 380l22 30" stroke="#c9cfdd" stroke-width="3"/>
    <g class="climb-down">${astronaut(214, 384, 1.5)}</g>
    <g class="flag"><path d="M270 410v-46" stroke="#f2f4fa" stroke-width="3"/><path d="M270 364h30l-8 9 8 9h-30z" fill="#ffc94d"/></g>
  `]);

  return list;
}

// Plays the cutscene inside `container`, then calls onDone. Returns a cancel function.
export function playCutscene(container, kind, onDone) {
  const stages = stagesFor(kind);
  let index = 0;
  let timer = null;
  let finished = false;

  const art = document.createElement('div');
  art.className = 'cut-art';
  const caption = document.createElement('p');
  caption.className = 'cut-caption';
  caption.setAttribute('aria-live', 'polite');
  const skip = document.createElement('button');
  skip.className = 'btn btn-small cut-skip';
  skip.textContent = t('cut.skip');
  const dots = document.createElement('div');
  dots.className = 'cut-dots';

  const wrap = document.createElement('div');
  wrap.className = `cutscene cut-${kind}`;
  wrap.append(art, dots, caption, skip);
  container.replaceChildren(wrap);

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    onDone();
  };

  const show = () => {
    const [id, seconds, markup] = stages[index];
    art.replaceChildren(svg(markup, `viewBox="0 0 ${W} ${H}" class="cut-svg stage-${id}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"`));
    caption.textContent = t(`cut.${kind}.${id}`);
    dots.replaceChildren(...stages.map((_, i) => {
      const d = document.createElement('span');
      d.className = i === index ? 'is-on' : '';
      return d;
    }));
    timer = setTimeout(() => {
      index += 1;
      if (index >= stages.length) finish();
      else show();
    }, seconds * 1000);
  };

  skip.addEventListener('click', finish);
  show();
  // Cancel without calling onDone (used when the child exits the game mid-video).
  return () => {
    finished = true;
    clearTimeout(timer);
  };
}
