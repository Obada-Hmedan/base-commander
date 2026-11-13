// The animated picture of the base shown above the dashboard.
// It reflects the child's choices: systems light up, the crew walks outside or hides
// in the shelter, storms flash in the sky, dust covers Mars.
import { svg, astronaut, lander, stars } from './art.js';

export function baseScene({ level, night, plan, reactor, eventKinds, label }) {
  const mars = level === 'mars';
  const sheltered = plan.shelter;
  const on = (key) => plan.systems[key] && !(sheltered && key !== 'lifeSupport') && !(plan.blocked ?? []).includes(key);
  const storm = eventKinds.some((k) => ['FLR', 'SEP', 'CME_ARRIVAL'].includes(k));
  const dust = eventKinds.includes('DUST');
  const eva = plan.eva && !sheltered;

  const sky = mars
    ? '<stop offset="0" stop-color="#d9a066"/><stop offset="1" stop-color="#f0c79a"/>'
    : night
      ? '<stop offset="0" stop-color="#03050d"/><stop offset="1" stop-color="#0b1020"/>'
      : '<stop offset="0" stop-color="#060a1c"/><stop offset="1" stop-color="#1a2550"/>';
  const ground = mars ? '#b5562f' : night ? '#5a6074' : '#aeb4c6';
  const groundDark = mars ? '#8c3f20' : night ? '#3f4558' : '#8b92a8';

  const markup = `
    <defs><linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">${sky}</linearGradient></defs>
    <rect width="360" height="170" fill="url(#sc-sky)"/>
    ${mars ? '' : stars(40, 360, 100)}
    ${mars
      ? '<circle cx="300" cy="34" r="9" fill="#fff6e0" opacity="0.9"/>'
      : night
        ? ''
        : '<circle class="sun" cx="318" cy="96" r="13" fill="#ffe08a"/><circle cx="318" cy="96" r="20" fill="#ffe08a" opacity="0.25"/>'}
    ${mars ? '' : '<g><circle cx="186" cy="38" r="11" fill="#4aa3ff"/><path d="M179 34q6-5 11 0t5 8q-8 4-14-1z" fill="#5fd38d"/></g>'}
    <g class="storm-flash ${storm ? 'is-on' : ''}"><rect width="360" height="170" fill="#ff7a6b" opacity="0.35"/></g>

    <path d="M0 118q90-18 180-8t180-6v66H0z" fill="${ground}"/>
    <ellipse cx="70" cy="150" rx="22" ry="5" fill="${groundDark}"/><ellipse cx="300" cy="158" rx="16" ry="4" fill="${groundDark}"/>
    <ellipse cx="208" cy="162" rx="12" ry="3" fill="${groundDark}"/>

    ${lander(36, 104, 0.55)}

    <!-- Solar panels -->
    <g class="panel ${night && !mars ? 'is-dim' : ''}">
      <path d="M93 120v-14M117 120v-14" stroke="#c9cfdd" stroke-width="2"/>
      <path d="M82 106l4-13h16l-4 13z" fill="#2b5fd0" stroke="#dfe6ff" stroke-width="1"/>
      <path d="M106 106l4-13h16l-4 13z" fill="#2b5fd0" stroke="#dfe6ff" stroke-width="1"/>
    </g>

    <!-- Habitat (life support) -->
    <g class="sys ${on('lifeSupport') ? 'is-on' : ''}">
      <path d="M140 122a34 34 0 0 1 68 0z" fill="#f2f4fa" stroke="#0b1020" stroke-width="1.5"/>
      <rect class="glow" x="152" y="102" width="12" height="10" rx="3" fill="#22306b"/>
      <rect class="glow" x="184" y="102" width="12" height="10" rx="3" fill="#22306b"/>
      <rect x="168" y="106" width="12" height="16" rx="3" fill="#8b92a8"/>
      <text x="174" y="97" text-anchor="middle" font-size="11">🫁</text>
    </g>

    <!-- Greenhouse -->
    <g class="sys sys-green ${on('greenhouse') ? 'is-on' : ''}">
      <path d="M214 122v-12a18 18 0 0 1 36 0v12z" class="glow" fill="#22306b" stroke="#dfe6ff" stroke-width="1.5"/>
      <path d="M224 122v-8M232 122v-12M240 122v-8" stroke="#5fd38d" stroke-width="2" stroke-linecap="round"/>
      <circle cx="224" cy="112" r="3" fill="#5fd38d"/><circle cx="232" cy="108" r="3.5" fill="#5fd38d"/><circle cx="240" cy="112" r="3" fill="#5fd38d"/>
    </g>

    <!-- Science lab -->
    <g class="sys sys-lab ${on('science') ? 'is-on' : ''}">
      <rect x="258" y="104" width="30" height="18" rx="3" fill="#f2f4fa" stroke="#0b1020" stroke-width="1.5"/>
      <rect class="glow" x="263" y="109" width="9" height="7" rx="2" fill="#22306b"/>
      <path d="M280 104v-16" stroke="#c9cfdd" stroke-width="2"/>
      <path d="M272 90q8-8 16 0" fill="none" stroke="#c9cfdd" stroke-width="2"/>
      <circle class="beacon" cx="280" cy="86" r="3" fill="#ff7a6b"/>
    </g>

    <!-- Reactor -->
    ${reactor ? `<g class="reactor"><rect x="304" y="108" width="16" height="14" rx="2" fill="#8b92a8" stroke="#0b1020"/><circle class="pulse" cx="312" cy="115" r="4" fill="#7dffb0"/><text x="312" y="103" text-anchor="middle" font-size="10">⚛️</text></g>` : ''}

    <!-- Crew -->
    ${eva ? astronaut(118, 128, 0.9, 'walk') + astronaut(300, 136, 0.8, 'walk walk-2') : ''}
    ${sheltered ? '<g class="shield"><path d="M140 124a36 36 0 0 1 68 0" fill="none" stroke="#8ab4ff" stroke-width="3" stroke-dasharray="5 4"/><text x="174" y="80" text-anchor="middle" font-size="16">🛡️</text></g>' : ''}

    ${dust ? '<g class="dust"><rect width="360" height="170" fill="#c9824d" opacity="0.55"/><path d="M-40 60q80-20 160 0t160 0 160 0" stroke="#e8b98a" stroke-width="10" fill="none" opacity="0.5"/><path d="M-40 110q80-20 160 0t160 0 160 0" stroke="#e8b98a" stroke-width="14" fill="none" opacity="0.4"/></g>' : ''}
  `;
  const node = svg(markup, `viewBox="0 0 360 170" class="scene" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid slice"`);
  return node;
}
