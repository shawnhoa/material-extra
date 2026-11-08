/* Code-native solar-term art: local assets, deterministic geometry, no canvas loop. */
(() => {
  let nextId = 0;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const leaf = (x, y, scale = 1, rotate = 0, cls = 'term-leaf') => `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})"><g class="${cls}"><path d="M0 0 Q-30-36 0-62 Q30-36 0 0" fill="var(--term-front)"/><path d="M0-4V-49" stroke="#ffffff66" stroke-width="2"/></g></g>`;
  const sprout = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="term-sprout"><path d="M0 0Q-7-42 0-81" fill="none" stroke="var(--term-front)" stroke-width="5" stroke-linecap="round"/><path d="M-2-35Q-45-37-38-65Q-10-67-2-35M-1-58Q32-92 39-64Q23-44-1-58" fill="var(--term-back)"/></g></g>`;
  const cloud = (x, y, scale = 1, cls = 'term-cloud') => `<g transform="translate(${x} ${y}) scale(${scale})"><path class="${cls}" d="M0 20C-10-2 15-13 29-3C40-28 75-22 82 0C110-8 126 21 107 30H10Q0 30 0 20Z" fill="#ffffff99"/></g>`;
  const flower = (x, y, scale = 1, color = '#f2b6ba', cls = 'term-flower') => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="${cls}" fill="${color}">${[0,72,144,216,288].map(a => `<ellipse cx="0" cy="-12" rx="9" ry="16" transform="rotate(${a})"/>`).join('')}<circle r="5" fill="var(--term-sun)"/></g></g>`;
  const wheat = (x, y, scale = 1, color = '#d7bb60') => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="term-wheat"><path d="M0 5Q8-65 0-122" fill="none" stroke="${color}" stroke-width="3"/>${[0,1,2,3].map(i => `<ellipse cx="-8" cy="${-65-i*14}" rx="6" ry="12" fill="${color}" transform="rotate(-32 -8 ${-65-i*14})"/><ellipse cx="8" cy="${-72-i*14}" rx="6" ry="12" fill="${color}" transform="rotate(32 8 ${-72-i*14})"/>`).join('')}</g></g>`;
  const particles = (count, shape, cls = 'term-particle') => Array.from({length:count}, (_,i) => `<g class="${cls}" style="--delay:-${(i*1.37).toFixed(2)}s;--duration:${(7+(i%7)*1.1).toFixed(1)}s">${shape(i)}</g>`).join('');
  const rain = (count = 18) => particles(count, i => `<path d="M${22+i*31} ${-20+(i%5)*61}l-10 28" stroke="#ffffff9e" stroke-width="2" stroke-linecap="round"/>`, 'term-rain');
  const snow = (count, radius = 3) => particles(count, i => `<circle cx="${12+(i*73)%540}" cy="${-30+(i*47)%340}" r="${radius+(i%3)}" fill="#fff"/>`, 'term-snow');
  const waves = (y = 266) => [0,1,2].map(i => `<path class="term-wave" style="--delay:-${i*1.8}s" d="M30 ${y+i*13}Q110 ${y-14+i*13}190 ${y+i*13}T350 ${y+i*13}" fill="none" stroke="#ffffff88" stroke-width="2"/>`).join('');
  const branches = (frost = false) => `<g class="term-branch" fill="none" stroke="${frost?'#eaf6ff':'var(--term-front)'}" stroke-width="${frost?5:7}" stroke-linecap="round"><path d="M75 320Q103 241 133 114M99 253L59 206M119 184L171 133M127 145L92 100M112 210L164 181"/></g>`;
  const starBurst = (x, y, scale = 1, delay = 0) => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="festival-firework" style="--delay:${delay}s" fill="none" stroke-linecap="round">${[0,30,60,90,120,150,180,210,240,270,300,330].map((angle, i) => `<path d="M0-22L0-53" stroke="${i%3===0?'var(--term-sun)':'#ffffffaa'}" stroke-width="2" transform="rotate(${angle})"/><circle cx="${Math.cos(angle*Math.PI/180)*58}" cy="${Math.sin(angle*Math.PI/180)*58}" r="${i%2+1.5}" fill="${i%3===0?'var(--term-sun)':'#fff'}"/>`).join('')}</g></g>`;
  const heart = (x, y, scale = 1, color = 'var(--term-accent)', cls = 'festival-heart', delay = 0) => `<g transform="translate(${x} ${y}) scale(${scale})"><path class="${cls}" style="--delay:${delay}s" d="M0 18C-32-4-21-31-3-23C2-21 5-18 8-14C12-19 16-23 23-24C43-28 48 2 18 22Z" fill="${color}" stroke="#ffffff66" stroke-width="1.5"/></g>`;
  const lantern = (x, y, scale = 1, delay = 0) => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="festival-lantern" style="--delay:${delay}s"><path d="M0-55V-20" stroke="var(--term-sun)" stroke-width="3"/><path d="M-24-21H24L17 29H-17Z" fill="var(--term-accent)" stroke="var(--term-sun)" stroke-width="3"/><path d="M-15-5H15M-12 12H12M0-21V29" stroke="#ffe7a6aa" stroke-width="2"/><path d="M-10 32H10L7 39H-7Z" fill="var(--term-sun)"/><path d="M-5 41L-2 61M4 41L2 61" stroke="var(--term-sun)" stroke-width="2"/></g></g>`;
  const pumpkin = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="-20" cy="0" rx="25" ry="35" fill="var(--term-accent)"/><ellipse cx="20" cy="0" rx="25" ry="35" fill="var(--term-accent)"/><ellipse cx="0" cy="0" rx="27" ry="38" fill="#f58a35"/><path d="M0-39q-4-17 10-20" fill="none" stroke="#527347" stroke-width="5" stroke-linecap="round"/><path d="M-17-6l9 10-11 2m31-2-12 3 7-12M-12 19Q0 30 13 19" fill="none" stroke="#3a2730" stroke-width="3" stroke-linecap="round"/></g>`;
  // ── Stage ────────────────────────────────────────────────────────────────
  // Every scene is a centred brand diorama: the mark stands on the near hill,
  // the sun sits behind the roof, and each season decorates the two flanks.
  // Nothing is inherited from the old landscape; the only constants are the
  // eye line, the hill crest and the two planting beds.
  const BED_Y = 306;
  const BED_LEFT = 118;
  const BED_RIGHT = 446;
  const SKY_LEFT = 104;
  const SKY_RIGHT = 458;

  function tuft(x, y, scale = 1, fill = 'var(--term-front)') {
    return `<g class="term-tuft" transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0Q-6-26-14-38Q-1-26 2 0M6 0Q10-30 18-46Q14-24 12 0M-2 0Q-18-20-28-26Q-12-16-6 0Z" fill="${fill}" opacity=".7"/></g>`;
  }

  function stone(x, y, scale = 1) {
    return `<g class="term-stone" transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="0" cy="0" rx="16" ry="7" fill="#ffffff" opacity=".28"/><ellipse cx="-4" cy="-4" rx="8" ry="4" fill="#ffffff" opacity=".25"/></g>`;
  }

  // ── Per-theme dressing ───────────────────────────────────────────────────
  // Zones: left bed (60–190), right bed (372–500), sky wings (60–190 | 380–520)
  // and the band above the roof (y 90–150). The house owns x 199–361, y 169–306.
  function details(key) {
    const L = BED_LEFT;
    const R = BED_RIGHT;
    switch (key) {
      case 'lichun': return sprout(L - 6, BED_Y, 1.35) + sprout(L + 34, BED_Y - 6, .8) + flower(L - 34, 272, .52) + sprout(R - 4, BED_Y - 2, .95) + flower(R + 28, 278, .46);
      case 'yushui': return cloud(SKY_LEFT, 86, 1.5) + cloud(SKY_RIGHT, 112, 1.05) + rain(16) + `<ellipse class="term-ripple" cx="338" cy="318" rx="34" ry="7" fill="none" stroke="#fff8" stroke-width="2"/>` + stone(R, 314, .9);
      case 'jingzhe': return cloud(SKY_LEFT - 4, 78, 1.45) + cloud(SKY_RIGHT - 20, 96, 1.0) + `<path class="term-lightning" d="M${L + 26} 118l-18 32h23l-14 26" fill="none" stroke="var(--term-sun)" stroke-width="6" stroke-linejoin="round"/>` + particles(8, i => `<circle cx="${64 + i * 33}" cy="${210 + (i % 3) * 34}" r="3" fill="var(--term-sun)"/>`, 'term-firefly') + tuft(R + 10, BED_Y, .8);
      case 'chunfen': return particles(4, i => `<path d="M${70 + i * 62} ${92 + (i % 2) * 26}q12-14 24 0q12-14 24 0" fill="none" stroke="var(--term-accent)" stroke-width="4" stroke-linecap="round"/>`, 'term-swallow') + flower(L + 4, 300, .6) + sprout(R + 6, BED_Y - 2, .72) + tuft(L - 44, BED_Y, .7);
      case 'qingming': return `<g transform="translate(-44 -14)"><g class="term-willow" fill="none" stroke="var(--term-front)" stroke-linecap="round"><path d="M-20 54Q78 11 175 62" stroke-width="7"/>${[30, 65, 100, 135, 169].map((x, i) => `<path d="M${x} ${40 + i * 3}q18 70-15 133" stroke-width="3"/>`).join('')}</g></g>` + particles(10, i => `<ellipse cx="${70 + (i * 21) % 150}" cy="${96 + (i * 17) % 90}" rx="5" ry="12" fill="var(--term-back)"/>`, 'term-willow-leaf') + cloud(300, 176, 1.15, 'term-mist') + tuft(R + 8, BED_Y, .85);
      case 'guyu': return leaf(L - 10, 300, 1.4, -27) + leaf(L + 30, 302, 1.1, 30) + leaf(L + 8, 320, .75, 12) + rain(11) + `<path d="M${L - 74} 322H${L + 64}" stroke="var(--term-front)" stroke-width="4" stroke-linecap="round"/>` + tuft(R + 4, BED_Y, .9);
      case 'lixia': return `<g class="term-lotus-leaf"><ellipse cx="${L - 4}" cy="288" rx="76" ry="28" fill="var(--term-front)"/><path d="M${L - 1} 285l62-16M${L - 1} 285l-58-15M${L - 1} 285l-30 26M${L - 1} 285l44 23" stroke="#ffffff55" stroke-width="2"/></g>` + waves(326) + flower(R + 16, 268, .66) + tuft(R + 44, BED_Y, .7);
      case 'xiaoman': return [0, 1, 2, 3].map(i => wheat(58 + i * 38, BED_Y, .72 + (i % 2) * .2, '#8ca45c')).join('') + [0, 1, 2].map(i => wheat(392 + i * 38, BED_Y, .7 + (i % 2) * .18, '#8ca45c')).join('') + particles(8, i => `<circle cx="${66 + i * 34}" cy="${104 + (i % 3) * 32}" r="2" fill="#fff9"/>`, 'term-grainlight');
      case 'mangzhong': return [0, 1, 2, 3, 4].map(i => wheat(46 + i * 40, BED_Y + 2, .8 + (i % 3) * .12)).join('') + [0, 1, 2, 3, 4].map(i => wheat(374 + i * 40, BED_Y + 2, .78 + (i % 3) * .12)).join('') + particles(9, i => `<ellipse cx="${58 + i * 36}" cy="${128 + (i % 4) * 34}" rx="2" ry="6" fill="#ffe2a0"/>`, 'term-seed');
      case 'xiazhi': return `<path class="term-dayarc" d="M42 176Q280-46 518 168" stroke="#fff6" stroke-width="2" fill="none" stroke-dasharray="5 9"/><g class="term-sunrays" fill="none" stroke="var(--term-sun)" stroke-width="3">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M280 -6v-18" transform="rotate(${a} 280 86)"/>`).join('')}</g>` + cloud(SKY_LEFT - 12, 92, 1.35) + sprout(R + 4, BED_Y, .78);
      case 'xiaoshu': return waves(326) + `<path class="term-lotus-stem" d="M${L - 2} 316Q${L + 6} 268 ${L} 236" fill="none" stroke="var(--term-front)" stroke-width="5"/>` + flower(L, 234, 1.1, '#f3bccd', 'term-lotus-flower') + particles(9, i => `<circle cx="${74 + i * 36}" cy="${150 + (i % 4) * 26}" r="2.5" fill="#fff8b5"/>`, 'term-firefly') + tuft(R + 6, BED_Y, .8);
      case 'dashu': return cloud(SKY_LEFT - 6, 84, 1.4, 'term-summer-cloud') + cloud(SKY_RIGHT - 30, 118, .95, 'term-summer-cloud') + `<g class="term-heat" fill="none" stroke="#ffffff66" stroke-width="3"><path d="M76 292q-12-29 0-60t0-60M126 300q-12-29 0-60t0-60M452 294q-12-29 0-60t0-60M502 286q-12-29 0-60t0-60"/></g>` + tuft(L - 6, BED_Y + 4, .8);
      case 'liqiu': return particles(10, i => leaf(48 + (i * 47) % 460, 76 + (i % 3) * 74, .34, 20 + i * 23), 'term-autumnleaf') + leaf(L + 10, BED_Y - 4, .5, -18) + tuft(R, BED_Y + 2, .82);
      case 'chushu': return cloud(SKY_LEFT - 14, 80, 1.55, 'term-clearing-cloud') + cloud(SKY_RIGHT - 40, 116, 1.05, 'term-clearing-cloud') + `<g class="term-breeze" fill="none" stroke="#fff9" stroke-width="3" stroke-linecap="round"><path d="M64 226h170q34 0 20-19M116 252h182M46 274h118"/></g>` + tuft(R + 8, BED_Y, .8);
      case 'bailu': return [0, 1, 2].map(i => `<path class="term-reed" style="--delay:-${i}s" d="M${L - 44 + i * 46} ${BED_Y + 6}q-30-92 ${10 - i * 8}-152" stroke="var(--term-front)" stroke-width="4" fill="none"/>`).join('') + particles(8, i => `<ellipse cx="${64 + i * 30}" cy="${180 + (i % 3) * 34}" rx="5" ry="8" fill="#fff9" stroke="#fff"/>`, 'term-dew') + tuft(R + 2, BED_Y, .9);
      case 'qiufen': return leaf(R + 18, BED_Y - 26, .5, 22) + tuft(R + 2, BED_Y, .9) + `<g class="term-balance" fill="none" stroke="#ffffff77" stroke-width="2" transform="translate(-118 4)"><circle cx="205" cy="155" r="66" stroke-dasharray="4 7"/><path d="M139 155h132"/></g>` + particles(7, i => leaf(56 + i * 40, 96 + (i % 3) * 66, .36, -30 + i * 25), 'term-equinoctial-leaf') + tuft(R + 4, BED_Y, .84);
      case 'hanlu': return tuft(R, BED_Y, .95) + cloud(SKY_LEFT - 40, 236, 2.1, 'term-cold-mist') + cloud(SKY_RIGHT - 70, 250, 1.5, 'term-cold-mist') + `<path d="M${L} 320q-16-88 28-148" fill="none" stroke="var(--term-front)" stroke-width="4"/>` + particles(5, i => `<circle cx="${L + i * 8}" cy="${184 + i * 22}" r="4" fill="#e7f8ff"/>`, 'term-cold-dew');
      case 'shuangjiang': return `<g transform="translate(-32 4)">${branches(true)}</g>` + `<g class="term-frost" stroke="#fff" stroke-width="2" stroke-linecap="round">${[0, 1, 2, 3, 4].map(i => `<path d="M${424 + i * 18} ${196 + i * 20}l18-16m-9 8v-11m0 11h13"/>`).join('')}</g>` + leaf(R - 10, BED_Y - 8, .55, -22) + tuft(R + 22, BED_Y, .7);
      case 'lidong': return `<g transform="translate(-16 0)">${branches()}</g><g class="term-smoke" fill="none" stroke="#ffffff7a" stroke-width="6" stroke-linecap="round"><path d="M${SKY_RIGHT - 18} 196q-17-23 0-42t0-39"/></g><path class="term-winter-wind" d="M56 196q54-33 134 0t111 0" fill="none" stroke="#ffffff66" stroke-width="3"/>` + tuft(R + 2, BED_Y, .9);
      case 'xiaoxue': return snow(14, 1) + `<path d="M40 330q96-26 208 0t268 0" fill="none" stroke="#ffffffa0" stroke-width="9" stroke-linecap="round"/>` + tuft(L - 8, BED_Y - 2, .8);
      case 'daxue': return snow(26, 2) + `<g class="term-snowdrift" fill="#f4f8ff"><path d="M-20 318Q80 290 180 318T380 318T580 318V380H-20Z"/></g>` + tuft(R + 6, BED_Y - 4, .78);
      case 'dongzhi': return cloud(SKY_RIGHT - 10, 104, 1.1, 'term-night-cloud') + `<path class="term-solstice-arc" d="M44 178Q280-24 516 172" fill="none" stroke="#ffe0a577" stroke-width="3"/>` + cloud(SKY_LEFT - 6, 96, 1.2, 'term-night-cloud') + tuft(R + 2, BED_Y, .82);
      case 'xiaohan': return tuft(R + 4, BED_Y, .9) + `<g transform="translate(-24 2)">${branches(true)}</g>` + particles(10, i => `<path d="M${180 + i * 24} ${120 + (i % 4) * 38}l4 8-4 8-4-8Z" fill="#dff5ff"/>`, 'term-ice-spark') + `<path class="term-ice-line" d="M60 322h206" stroke="#d9f4ff" stroke-width="3"/>`;
      case 'dahan': return `<g transform="translate(-30 4)">${branches()}</g>` + flower(L - 18, 150, .62, '#eeb3c4', 'term-plum') + flower(L + 8, 196, .48, '#eeb3c4', 'term-plum') + flower(L - 44, 224, .4, '#eeb3c4', 'term-plum') + snow(8, 1) + tuft(R, BED_Y, .86);
      case 'spring-festival': return starBurst(SKY_LEFT - 6, 100, 1.15, -1.1) + starBurst(SKY_RIGHT + 4, 116, .9, -2.8) + lantern(84, 74, .9) + lantern(492, 86, .7, -1.4) + particles(18, i => `<rect x="${24 + (i * 71) % 520}" y="${30 + (i * 47) % 190}" width="4" height="9" rx="1" fill="${i % 2 ? '#ffdd7a' : '#fff1c8'}"/>`, 'festival-spark');
      case 'lantern-festival': return lantern(96, 82, .82) + lantern(486, 96, .66, -1.6) + lantern(186, 64, .5, -.8) + particles(13, i => `<circle cx="${44 + i * 40}" cy="${86 + (i % 5) * 40}" r="${2 + i % 2}" fill="#ffe7a8"/>`, 'festival-twinkle') + waves(330);
      case 'dragon-boat-festival': return `<g transform="translate(4 288) scale(.6)"><g class="festival-boat"><path d="M-18 58Q119 92 252 49L279 70Q132 121-22 78Z" fill="#8a332e"/><path d="M237 53q41-27 53 5q-26-1-35 17q19 2 23 17q-35-4-49-16" fill="#d7a743" stroke="#fff0b0" stroke-width="2"/><path d="M33 12v51m-14-51h28" stroke="#d5aa55" stroke-width="5"/><path d="M-3 38L61 73M54 21L107 72M110 12L153 70M166 11L199 66" class="festival-oar" stroke="#ffeec0" stroke-width="3"/></g></g>` + waves(334) + particles(12, i => `<path d="M${34 + i * 46} ${168 + (i % 4) * 22}q5-14 10 0" fill="none" stroke="#fff9" stroke-width="2"/>`, 'festival-twinkle');
      case 'qixi': return particles(34, i => `<circle cx="${20 + (i * 79) % 530}" cy="${26 + (i * 53) % 210}" r="${i % 4 === 0 ? 2.2 : 1.2}" fill="${i % 3 === 0 ? '#ffe4a6' : '#fff'}"/>`, 'festival-twinkle') + `<path class="festival-star-river" d="M6 150Q282 92 556 142" fill="none" stroke="#ffffff66" stroke-width="13" stroke-dasharray="2 9"/><path class="festival-bridge" d="M70 178Q280 92 490 178" fill="none" stroke="#ffe6ae" stroke-width="5"/><circle cx="70" cy="178" r="6" fill="#fff2c2"/><circle cx="490" cy="178" r="6" fill="#fff2c2"/>` + heart(280, 76, .5, '#f2b4d1', 'festival-heart', -1.2);
      case 'mid-autumn-festival': return `<g transform="translate(452 292) scale(.92)"><g class="festival-rabbit"><ellipse cx="-14" cy="-30" rx="7" ry="24" fill="#f4e6c7" transform="rotate(-14 -14 -30)"/><ellipse cx="10" cy="-31" rx="7" ry="25" fill="#f4e6c7" transform="rotate(12 10 -31)"/><ellipse cx="0" cy="0" rx="29" ry="25" fill="#f4e6c7"/><circle cx="-9" cy="-5" r="2.5" fill="#5b4a40"/><circle cx="9" cy="-5" r="2.5" fill="#5b4a40"/><circle cx="0" cy="5" r="3" fill="#d38b8b"/></g></g>` + cloud(SKY_LEFT - 4, 108, 1.6, 'term-night-cloud') + particles(9, i => `<circle cx="${58 + i * 56}" cy="${168 + (i % 3) * 31}" r="3" fill="#ffe7a5"/>`, 'festival-twinkle') + tuft(L - 10, BED_Y, .8);
      case 'double-ninth': return `<path d="M-20 308L96 176L196 264L286 150L402 272T600 208V372H-20Z" fill="#6f7547" opacity=".34"/><path d="M-20 326L120 228L228 300L336 214L470 306T600 286V372H-20Z" fill="#505f36" opacity=".32"/>` + flower(L - 16, 286, .66, '#f1bd52', 'festival-chrysanthemum') + flower(R + 6, 292, .72, '#f4ca69', 'festival-chrysanthemum') + particles(8, i => leaf(40 + i * 62, 110 + (i % 3) * 54, .28, -18 + i * 21), 'term-autumnleaf');
      case 'new-year': return starBurst(SKY_LEFT, 98, 1.2, -2) + starBurst(SKY_RIGHT - 6, 118, 1.0, -.6) + `<g transform="translate(126 168) scale(.8)"><g class="festival-clock"><circle r="63" fill="#ffffff1c" stroke="#ffe69a" stroke-width="3"/><circle r="48" fill="#ffffff12"/><path d="M0 0V-34M0 0L25 16" stroke="#fff0b5" stroke-width="5" stroke-linecap="round"/><circle r="5" fill="#ffe08a"/></g></g>` + particles(26, i => `<rect x="${17 + (i * 67) % 540}" y="${26 + (i * 49) % 210}" width="4" height="8" rx="1" fill="${i % 3 === 0 ? '#ffe181' : i % 3 === 1 ? '#f5a9b8' : '#a9d8ff'}"/>`, 'festival-spark') + tuft(R + 2, BED_Y, .8);
      case 'valentines-day': return heart(280, 74, 1.15, '#d53c70', 'festival-heart', -1.3) + particles(18, i => heart(34 + i * 30, 128 + (i % 5) * 38, .2 + (i % 3) * .1, i % 2 ? '#fff0f4' : '#e65d87', 'festival-heart-rise', -(i * .41))) + flower(L - 6, 298, .7, '#ef9eb8', 'festival-chrysanthemum') + flower(R + 12, 294, .62, '#f6b1c6', 'festival-chrysanthemum');
      case 'labor-day': return `<g transform="translate(116 152) scale(.88)"><g class="festival-gear"><circle r="58" fill="none" stroke="#f4d474" stroke-width="12"/><circle r="22" fill="none" stroke="#f4d474" stroke-width="9"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M0-70V-49" transform="rotate(${a})" stroke="#f4d474" stroke-width="12" stroke-linecap="round"/>`).join('')}</g></g>` + `<g transform="translate(372 214) scale(.82)"><g class="festival-ribbon"><path d="M0 0C58-52 98 17 137-18" fill="none" stroke="#c85d36" stroke-width="19" stroke-linecap="round"/><path d="M0 0C58-52 98 17 137-18" fill="none" stroke="#e9b25f" stroke-width="4" stroke-dasharray="6 12"/></g></g>` + wheat(R + 12, BED_Y - 2, .9, '#d8b659') + wheat(R - 26, BED_Y + 4, .78, '#c9a951');
      case 'earth-day': return `<g transform="translate(${SKY_RIGHT - 4} 154) scale(.82)"><g class="festival-globe"><circle r="78" fill="#5da8c0" stroke="#dff8ee" stroke-width="3"/><path d="M-54-38Q-18-60 0-30T42-23Q65 2 44 20T22 55Q-4 45-9 19T-54-38Z" fill="#5a9d68"/><path d="M-14-70Q15-52 23-35T5-9Q-12-27-14-70Z" fill="#74b678"/><path d="M-79 5Q-48-13-28 4T-36 41Q-65 45-79 5Z" fill="#4a8e72"/><ellipse rx="104" ry="27" fill="none" stroke="#ffffff77" stroke-width="2" transform="rotate(-18)"/></g></g>` + leaf(L + 4, 300, .8, -26) + leaf(L - 36, 308, .66, 27) + particles(10, i => `<circle cx="${40 + i * 54}" cy="${70 + (i % 4) * 42}" r="2" fill="#fff9"/>`, 'festival-twinkle');
      case 'halloween': return `<g transform="translate(${SKY_RIGHT - 10} 150) scale(.72)"><g class="festival-moon"><circle r="58" fill="#ffd16e"/><circle cx="-18" cy="-12" r="10" fill="#e0b45f" opacity=".45"/><circle cx="22" cy="18" r="7" fill="#e0b45f" opacity=".4"/></g></g>` + pumpkin(L - 12, 286, 1.05) + particles(7, i => `<path class="festival-bat" style="--delay:-${i * .57}s" d="M${70 + i * 66} ${96 + (i % 4) * 40}q-19-18-31 5q12-5 18 9q10-12 13 8q3-20 13-8q6-14 18-9q-12-23-31-5" fill="#16121d" stroke="#5d4769" stroke-width="1"/>`, 'festival-bat-wrap') + `<g class="festival-cobweb" fill="none" stroke="#ffffff55" stroke-width="1.5"><path d="M0 0L95 45M0 0L53 89M0 0L107 8M31 15Q42 26 28 34M54 26Q69 44 47 57M76 35Q92 57 65 73"/></g>`;
      case 'christmas': return `<g transform="translate(146 176) scale(.7)"><g class="festival-tree"><path d="M0 0L-67 91H-35L-87 162H-36L-108 250H108L36 162H87L35 91H67Z" fill="#28644e"/><path d="M0-20l7 18 19 2-15 13 4 19-15-9-15 9 4-19-15-13 19-2Z" fill="#ffe69a"/><circle cx="-35" cy="64" r="6" fill="#c84545"/><circle cx="31" cy="81" r="5" fill="#f4c456"/><circle cx="-48" cy="135" r="6" fill="#e8d48b"/><circle cx="24" cy="154" r="6" fill="#c84545"/><circle cx="-61" cy="206" r="5" fill="#f4c456"/><circle cx="52" cy="209" r="6" fill="#d8e6dd"/></g></g>` + snow(20, 1) + `<g transform="translate(${R + 4} 300) scale(.72)"><g class="festival-gifts"><rect width="55" height="46" rx="5" fill="#b8373d"/><path d="M27 0v46M0 19h55" stroke="#f1cd72" stroke-width="5"/><path d="M22 0Q7-17 6-2Q8 7 27 8M33 0Q48-17 49-2Q47 7 27 8" fill="none" stroke="#f1cd72" stroke-width="4"/></g></g>` + particles(12, i => `<circle cx="${52 + i * 44}" cy="${58 + (i % 4) * 34}" r="2.5" fill="#fff5b8"/>`, 'festival-twinkle');
      default: return sprout(L, BED_Y, 1.3) + sprout(R, BED_Y - 2, 1.0);
    }
  }

  // ── The mark, rebuilt as the scene's cottage ─────────────────────────────
  const MARK_H = 84.65;
  const MARK_BODY = 'M47.9 0 47.61 0.24 46.94 0.26 46.67 0.47 45.41 0.77 43.39 2.03 36.43 8.99 36.34 9.33 27.27 18.39 27.18 18.73 18.61 27.31 18.52 27.65 2.52 43.89 1.01 46.16 0.97 46.67 0.26 48.18 0.24 49.09 0 49.47 0 52.26 0.24 52.64 0.26 53.55 0.47 53.83 0.77 55.08 2.27 57.6 4.29 59.61 5.81 60.62 6.32 60.67 7.05 61.12 7.51 61.15 8.58 61.63 14.88 61.63 15.3 61.96 15.35 75.77 15.59 76.15 15.86 77.61 17.37 80.37 19.38 82.38 22.15 83.89 22.61 83.92 23.68 84.4 25.03 84.41 25.46 84.65 74.54 84.65 74.91 84.41 76.32 84.4 76.6 84.18 77.31 84.15 78.09 83.69 78.6 83.64 80.37 82.63 81.51 81.48 81.88 81.36 81.98 81.02 83.39 79.34 84.65 76.57 84.66 75.91 84.9 75.53 84.95 61.96 85.37 61.63 91.42 61.63 91.75 61.39 93.2 61.12 95.18 60.13 95.87 59.45 96.21 59.36 98.47 56.85 99.23 55.33 99.27 54.87 99.74 53.8 99.76 52.89 100 52.51 100 49.23 99.76 48.85 99.74 47.93 99.53 47.66 99.48 47.15 98.47 45.13 97.82 44.48 97.73 44.14 95.59 42 95.5 41.66 94.97 41.14 94.63 41.04 92.37 38.78 92.28 38.44 84.2 30.37 84.11 30.03 74.3 20.22 74.21 19.88 65.39 11.06 65.3 10.72 56.36 1.78 54.59 0.77 54.12 0.73 53.06 0.26 52.39 0.24 52.07 0.01 48.14 0Z';
  const MARK_EYE_L = 'M28.22 41.71 28.43 41.58 31.22 41.58 32.31 42.1 33.86 43.39 34.63 44.67 34.66 45.13 34.89 45.46 34.9 70.33 34.11 71.95 32.6 73.47 31.57 73.99 30.86 74.02 30.48 74.26 29.42 74.26 29.05 74.02 28.13 74 27.06 73.47 25.54 71.95 25.02 71.17 24.74 69.72 24.51 69.39 24.51 68.97 24.75 68.6 24.75 47 24.5 46.5 24.74 46.12 24.78 45.17 25.54 43.64 26.56 42.62 28.09 41.83Z';
  const MARK_EYE_R = 'M68.81 41.71 69.03 41.58 71.62 41.59 73.19 42.37 74.46 43.64 74.55 43.98 74.95 44.38 75.02 44.93 75.24 45.21 75.26 45.88 75.49 46.2 75.5 69.59 75.26 69.96 75.22 70.68 74.21 72.45 72.94 73.47 71.87 74 71.2 74.02 70.82 74.26 69.77 74.26 69.39 74.02 68.48 74 67.4 73.47 65.89 71.95 65.11 70.13 65.1 45.51 65.34 45.13 65.37 44.67 66.14 43.39 67.65 42.13 68.23 41.84 68.69 41.83Z';
  const MARK_SMILE = 'M42.82 62.5 44.09 62.38 44.47 62.62 45.13 62.63 45.41 62.85 45.92 62.89 46.4 63.34 48.38 64.33 49.78 64.36 50.11 64.57 50.46 64.36 51.86 64.33 53.84 63.34 54.32 62.89 55.78 62.62 56.1 62.38 57.02 62.38 57.34 62.62 58.79 62.89 59.33 63.17 60.35 64.19 61.12 65.46 61.15 66.17 61.38 66.5 61.39 68.1 61.15 68.48 61.13 69.39 60.35 70.71 58.99 71.58 58.34 72.23 56.32 73.24 55.86 73.28 54.79 73.75 54.12 73.77 53.8 74 53.13 74.02 52.81 74.25 51.9 74.27 51.57 74.5 48.73 74.5 48.35 74.27 47.44 74.25 47.11 74.02 46.2 74 45.13 73.52 44.42 73.49 41.95 72.25 40.52 71.09 40.18 70.99 39.13 69.69 38.87 69.14 38.85 68.48 38.62 68.15 38.61 66.8 38.85 66.42 38.87 65.76 39.65 64.43 40.96 63.14 41.99 62.63 42.7 62.62Z';
  const HOUSE_SCALE = 1.62;
  const HOUSE_LEFT = 199;
  const HOUSE_BASE = 300;

  function logoHouse(theme) {
    const night = luminance(theme.palette?.sky2 || '#ffffff') < .46;
    const ty = HOUSE_BASE - MARK_H * HOUSE_SCALE;
    return `<g transform="translate(${HOUSE_LEFT} ${ty.toFixed(1)}) scale(${HOUSE_SCALE})"><g class="logo-house${night ? ' is-night' : ''}">`
      + `<path class="logo-body" d="${MARK_BODY}"/>`
      + `<g class="logo-gaze"><g class="logo-blink">`
      + `<path class="logo-eye" d="${MARK_EYE_L}"/>`
      + `<path class="logo-eye is-right" d="${MARK_EYE_R}"/>`
      + `</g></g>`
      + `<path class="logo-smile" d="${MARK_SMILE}"/>`
      + `</g></g>`;
  }

  function render(target, theme, language = 'zh') {
    if (!target || !theme?.key) return;
    const id = `solar-sky-${++nextId}`;
    const p = theme.palette || {};
    const properties = ['sky1', 'sky2', 'back', 'front', 'sun', 'accent'].map(key => `--term-${key}:${/^#[0-9a-f]{6}$/i.test(p[key]) ? p[key] : '#78958b'}`).join(';');
    const captions = {
      traditional: ['TRADITIONAL FESTIVALS', '传统节日'],
      world: ['WORLD FESTIVALS', '世界节日'],
      solar: ['TWENTY-FOUR SOLAR TERMS', '二十四节气'],
    };
    const [captionEn, captionZh] = captions[theme.category] || captions.solar;
    target.innerHTML = `<div class="solar-scene" data-term="${esc(theme.key)}" style="${properties}"><svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">`
      + `<defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="var(--term-sky1)"/><stop offset="1" stop-color="var(--term-sky2)"/></linearGradient>`
      + `<radialGradient id="${id}-glow"><stop stop-color="var(--term-sun)" stop-opacity=".55"/><stop offset="1" stop-color="var(--term-sun)" stop-opacity="0"/></radialGradient></defs>`
      + `<rect width="560" height="360" fill="url(#${id})"/>`
      + `<circle class="stage-sun-glow" cx="280" cy="86" r="108" fill="url(#${id}-glow)"/>`
      + `<g class="stage-sun"><circle class="stage-sun-ring" cx="280" cy="86" r="60" fill="none" stroke="var(--term-sun)" stroke-opacity=".4" stroke-width="1.4" stroke-dasharray="3 10"/><circle class="stage-sun-disc" cx="280" cy="86" r="40" fill="var(--term-sun)"/></g>`
      + `<path class="stage-hill-far" d="M-40 250Q120 206 280 238T600 218V380H-40Z" fill="var(--term-back)" opacity=".5"/>`
      + `<path class="stage-hill-mid" d="M-40 282Q150 240 300 272T600 252V380H-40Z" fill="var(--term-back)"/>`
      + `<path class="stage-hill-near" d="M-40 320Q120 292 290 306T600 296V380H-40Z" fill="var(--term-front)"/>`
      + `<path class="stage-lawn" d="M-40 344Q140 328 300 342T600 336V380H-40Z" fill="var(--term-front)" opacity=".6"/>`
      + `<path class="stage-path" d="M280 300C268 326 240 342 196 356" fill="none" stroke="#ffffff" stroke-opacity=".24" stroke-width="9" stroke-linecap="round"/>`
      + logoHouse(theme)
      + `<g class="stage-verge">` + tuft(22, 358, 1.1) + tuft(74, 350, 1.35) + tuft(146, 362, .9) + tuft(196, 352, 1.05) + tuft(366, 356, .95) + tuft(418, 348, 1.25) + tuft(486, 358, 1.0) + tuft(530, 350, .85) + stone(238, 354, .85) + stone(330, 358, .7) + stone(452, 352, .8) + `</g>`
      + details(theme.key)
      + `</svg><div class="solar-scene-caption"><span>${language === 'en' ? captionEn : captionZh}</span><strong>${esc(language === 'en' ? theme.label_en : theme.label)}</strong></div></div>`;
  }

  function festivalParticle(key) {
    const common = 'viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
    switch (key) {
      case 'spring-festival':
      case 'lantern-festival':
        return `<svg ${common}><path d="M7 5h10l-2 4 2 4H7L9 9 7 5Zm5 8v6M9 21h6" fill="none" stroke="var(--term-sun)" stroke-width="2" stroke-linejoin="round"/></svg>`;
      case 'dragon-boat-festival':
        return `<svg ${common}><path d="M3 15q4-5 9 0t9 0M5 19h14M12 3v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      case 'qixi':
      case 'valentines-day':
        return `<svg ${common}><path d="M12 21C4 15 2 11 4 7c2-4 7-2 8 2 1-4 6-6 8-2 2 4 0 8-8 14Z" fill="currentColor"/></svg>`;
      case 'mid-autumn-festival':
        return `<svg ${common}><circle cx="12" cy="12" r="8" fill="currentColor"/><path d="M18 5l1.5 3L23 9.5 19.5 11 18 14l-1.5-3L13 9.5 16.5 8Z" fill="var(--term-sun)"/></svg>`;
      case 'double-ninth':
        return `<svg ${common}><path d="M12 2v20M4 7l16 10M20 7 4 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="var(--term-sun)"/></svg>`;
      case 'new-year':
        return `<svg ${common}><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
      case 'labor-day':
        return `<svg ${common}><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`;
      case 'earth-day':
        return `<svg ${common}><path d="M20 4C10 4 4 8 4 15c5 1 12-1 16-11Z" fill="currentColor"/><path d="M5 19c4-5 8-7 13-10" stroke="var(--term-sun)" stroke-width="2" stroke-linecap="round"/></svg>`;
      case 'halloween':
        return `<svg ${common}><path d="M2 11q4-5 8 0 4-5 8 0-4 1-4 4-2 2-4 0 0-3-4-4Z" fill="currentColor"/></svg>`;
      case 'christmas':
        return `<svg ${common}><path d="M12 2v20M3 7l18 10M21 7 3 17M8 4l8 16M16 4 8 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
      default:
        return `<svg ${common}><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>`;
    }
  }
  function renderFestival(theme, language = 'zh') {
    const layer = document.querySelector('#festival-foreground');
    if (!layer) return;
    if (!['traditional', 'world'].includes(theme.category)) {
      layer.innerHTML = '';
      delete layer.dataset.festival;
      return;
    }
    const particles = Array.from({ length: 18 }, (_, index) => `<span class="festival-particle" style="--x:${4 + (index * 37) % 92}%;--delay:-${(index * .73).toFixed(2)}s;--duration:${(7 + index % 6).toFixed(1)}s;--size:${(13 + index % 5 * 4)}px">${festivalParticle(theme.key)}</span>`).join('');
    layer.dataset.festival = theme.key;
    layer.innerHTML = `<div class="festival-illustration"><svg viewBox="0 0 560 360" role="img" aria-label="${esc(theme.label)}">${details(theme.key)}</svg><span>${esc(language === 'en' ? theme.label_en : theme.label)}</span></div><div class="festival-particles">${particles}</div>`;
  }
  // Derive readable UI roles without altering the original illustration palette.
  function mix(seed, base, weight) {
    const a = seed.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16));
    const b = base.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16));
    return '#' + a.map((v, i) => Math.round(v * weight + b[i] * (1 - weight)).toString(16).padStart(2, '0')).join('');
  }
  function luminance(hex) {
    const c = hex.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  }
  function contrast(a, b) {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  }
  function readableAccent(seed, base, foreground) {
    for (let step = 0; step <= 100; step++) {
      const candidate = mix(seed, base, 1 - step / 100);
      if (contrast(candidate, foreground) >= 5.6) return candidate;
    }
    return base;
  }
  function syncChrome() {
    const root = document.documentElement;
    const seed = root.style.getPropertyValue('--term-accent').trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && /^#[0-9a-f]{6}$/i.test(seed)) {
      meta.content = root.dataset.theme === 'dark' ? mix(seed, '#151a18', .08) : mix(seed, '#fbfcfa', .02);
    }
  }
  function apply(theme, language = 'zh') {
    if (!theme) return;
    document.body.dataset.term = theme.key;
    document.body.dataset.season = theme.season || 'everyday';
    document.body.dataset.themeCategory = theme.category || 'solar';
    for (const [key, value] of Object.entries(theme.palette || {})) {
      if (/^#[0-9a-f]{6}$/i.test(value)) document.documentElement.style.setProperty(`--term-${key}`, value);
    }
    const root = document.documentElement;
    const seed = /^#[0-9a-f]{6}$/i.test(theme.palette?.accent || '') ? theme.palette.accent : '#6750a4';
    root.dataset.term = theme.key;
    root.style.setProperty('--theme-primary-light', readableAccent(seed, '#18231d', '#f1f4ef'));
    root.style.setProperty('--theme-primary-dark', readableAccent(mix(seed, '#ffffff', .38), '#ffffff', '#29332e'));
    syncChrome();
    renderFestival(theme, language);
    render(document.querySelector('.hero-art'), theme, language);
  }
  window.SolarThemes = {render, apply, syncChrome};
})();
