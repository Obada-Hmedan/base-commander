// Original hand-drawn SVG art shared by the logo, the base scene and the cutscenes.
// Everything here is our own drawing (no NASA logos, no third-party art).

export function svg(markup, attrs = '') {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${markup}</svg>`;
  return wrap.firstElementChild;
}

// Game logo: a little base dome on the Moon with an orbiting ship.
export function logoMarkup() {
  return `
    <defs>
      <linearGradient id="lg-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1b2a6b"/><stop offset="1" stop-color="#0b1020"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="url(#lg-sky)" stroke="#ffc94d" stroke-width="4"/>
    <circle cx="30" cy="30" r="2" fill="#fff"/><circle cx="88" cy="24" r="1.5" fill="#fff"/>
    <circle cx="96" cy="48" r="1.2" fill="#fff"/><circle cx="22" cy="54" r="1.2" fill="#fff"/>
    <circle cx="84" cy="34" r="9" fill="#4aa3ff"/><path d="M78 31q5-4 9 0t4 6q-6 3-11-1z" fill="#5fd38d"/>
    <path d="M8 84q52-22 104 0a56 56 0 0 1-104 0z" fill="#b9bfd0"/>
    <circle cx="34" cy="92" r="5" fill="#9aa1b5"/><circle cx="88" cy="96" r="4" fill="#9aa1b5"/>
    <path d="M44 82a16 16 0 0 1 32 0z" fill="#f2f4fa" stroke="#0b1020" stroke-width="2"/>
    <rect x="56" y="72" width="8" height="10" rx="2" fill="#ffc94d"/>
    <path d="M60 66v-12" stroke="#f2f4fa" stroke-width="2"/><circle cx="60" cy="52" r="3" fill="#ff7a6b"/>
    <ellipse cx="60" cy="60" rx="50" ry="16" fill="none" stroke="#ffc94d" stroke-width="1.5" stroke-dasharray="3 5" transform="rotate(-20 60 60)"/>
  `;
}

export function astronaut(x, y, scale = 1, extraClass = '') {
  return `
    <g class="astro ${extraClass}"><g transform="translate(${x} ${y}) scale(${scale})">
      <rect x="-9" y="-2" width="5" height="14" rx="2" fill="#c9cfdd"/>
      <rect x="-6" y="0" width="12" height="15" rx="4" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <rect x="-5" y="14" width="4" height="8" rx="2" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <rect x="1" y="14" width="4" height="8" rx="2" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <circle cx="0" cy="-7" r="8" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <rect x="-5" y="-11" width="10" height="7" rx="3.5" fill="#22306b"/>
      <circle cx="2.5" cy="-9" r="1.2" fill="#8ab4ff"/>
      <rect x="-3" y="4" width="6" height="3" rx="1" fill="#ff7a6b"/>
    </g></g>`;
}

// A rocket in the style of a tall orange core with two white boosters (our own drawing).
export function rocket(x, y, scale = 1) {
  return `
    <g class="rocket" transform="translate(${x} ${y}) scale(${scale})">
      <g class="flame">
        <path d="M-9 0q9 46 18 0z" fill="#ffc94d"/><path d="M-5 0q5 28 10 0z" fill="#fff3c4"/>
        <path d="M-20 -6q4 26 8 0z" fill="#ff9d4d"/><path d="M12 -6q4 26 8 0z" fill="#ff9d4d"/>
      </g>
      <rect x="-21" y="-70" width="10" height="64" rx="4" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <rect x="11" y="-70" width="10" height="64" rx="4" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <path d="M-21 -70q5-12 10 0z" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <path d="M11 -70q5-12 10 0z" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <rect x="-10" y="-104" width="20" height="104" rx="3" fill="#e8823a" stroke="#0b1020" stroke-width="1"/>
      <rect x="-10" y="-112" width="20" height="10" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <path d="M-10 -112q10-30 20 0z" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <path d="M0 -140v-12" stroke="#f2f4fa" stroke-width="2"/>
      <circle cx="0" cy="-118" r="3" fill="#22306b"/>
    </g>`;
}

// Small lander used for Moon and Mars landings.
export function lander(x, y, scale = 1) {
  return `
    <g class="lander" transform="translate(${x} ${y}) scale(${scale})">
      <g class="flame"><path d="M-7 14q7 34 14 0z" fill="#ffc94d"/><path d="M-3 14q3 18 6 0z" fill="#fff3c4"/></g>
      <path d="M-16 4l-10 18M16 4l10 18" stroke="#c9cfdd" stroke-width="3" stroke-linecap="round"/>
      <path d="M-30 22h8M22 22h8" stroke="#c9cfdd" stroke-width="3" stroke-linecap="round"/>
      <rect x="-18" y="-6" width="36" height="16" rx="3" fill="#ffc94d" stroke="#0b1020" stroke-width="1"/>
      <path d="M-13 -6q0-22 13-22t13 22z" fill="#f2f4fa" stroke="#0b1020" stroke-width="1"/>
      <circle cx="0" cy="-15" r="5" fill="#22306b"/><circle cx="1.5" cy="-16.5" r="1.3" fill="#8ab4ff"/>
      <path d="M0 -28v-8" stroke="#f2f4fa" stroke-width="1.5"/><circle cx="0" cy="-37" r="2" fill="#ff7a6b"/>
    </g>`;
}

export function stars(count, width, height, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<circle cx="${(rnd() * width).toFixed(1)}" cy="${(rnd() * height).toFixed(1)}" r="${(0.5 + rnd() * 1.3).toFixed(1)}" fill="#fff" opacity="${(0.4 + rnd() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}
