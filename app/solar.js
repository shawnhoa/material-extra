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
  function details(key) {
    switch (key) {
      case 'lichun': return sprout(125,294,1.25)+sprout(245,300,.7)+flower(220,232,.35);
      case 'yushui': return cloud(65,64,1.6)+rain()+waves()+`<ellipse class="term-ripple" cx="164" cy="282" rx="44" ry="8" fill="none" stroke="#fff8" stroke-width="2"/>`;
      case 'jingzhe': return sprout(113,305,1.1)+cloud(95,58,1.4)+`<path class="term-lightning" d="M206 112l-22 38h27l-17 30" fill="none" stroke="var(--term-sun)" stroke-width="6" stroke-linejoin="round"/>`+particles(8,i=>`<circle cx="${45+i*31}" cy="${170+(i%3)*30}" r="3" fill="var(--term-sun)"/>`,'term-firefly');
      case 'chunfen': return particles(4,i=>`<path d="M${55+i*70} ${80+(i%2)*30}q12-14 24 0q12-14 24 0" fill="none" stroke="var(--term-accent)" stroke-width="4" stroke-linecap="round"/>`,'term-swallow')+flower(142,245,.6)+sprout(230,304,.65);
      case 'qingming': return `<g class="term-willow" fill="none" stroke="var(--term-front)" stroke-linecap="round"><path d="M-20 54Q78 11 175 62" stroke-width="7"/>${[30,65,100,135,169].map((x,i)=>`<path d="M${x} ${40+i*3}q18 70-15 133" stroke-width="3"/>`).join('')}</g>`+particles(10,i=>`<ellipse cx="${34+(i*19)%150}" cy="${80+(i*17)%90}" rx="5" ry="12" fill="var(--term-back)"/>`,'term-willow-leaf')+cloud(145,180,1.2,'term-mist');
      case 'guyu': return leaf(120,277,1.4,-27)+leaf(170,279,1.1,30)+leaf(210,300,.8,12)+rain(11)+`<path d="M65 306H275" stroke="var(--term-front)" stroke-width="4" stroke-linecap="round"/>`;
      case 'lixia': return `<g class="term-lotus-leaf"><ellipse cx="146" cy="242" rx="93" ry="33" fill="var(--term-front)"/><path d="M149 239l73-19M149 239l-68-18M149 239l-35 30M149 239l52 27" stroke="#ffffff55" stroke-width="2"/></g>`+waves(285)+flower(250,205,.7,'#f8d3d8');
      case 'xiaoman': return [0,1,2,3,4].map(i=>wheat(76+i*40,315,.7+(i%2)*.2,'#8ca45c')).join('')+particles(8,i=>`<circle cx="${40+i*32}" cy="${93+(i%3)*32}" r="2" fill="#fff9"/>`,'term-grainlight');
      case 'mangzhong': return [0,1,2,3,4,5].map(i=>wheat(45+i*43,326,.8+(i%3)*.12)).join('')+particles(9,i=>`<ellipse cx="${50+i*36}" cy="${125+(i%4)*35}" rx="2" ry="6" fill="#ffe2a0"/>`,'term-seed');
      case 'xiazhi': return `<path class="term-dayarc" d="M50 196Q245-80 490 150" stroke="#fff6" stroke-width="2" fill="none" stroke-dasharray="5 9"/><g class="term-sunrays" fill="none" stroke="var(--term-sun)" stroke-width="3">${[0,45,90,135,180,225,270,315].map(a=>`<path d="M422 5v-18" transform="rotate(${a} 422 80)"/>`).join('')}</g>`+cloud(73,83,1.5)+sprout(180,308,.7);
      case 'xiaoshu': return waves(275)+`<path class="term-lotus-stem" d="M155 294Q163 232 157 195" fill="none" stroke="var(--term-front)" stroke-width="5"/>`+flower(157,193,1.2,'#f3bccd','term-lotus-flower')+particles(9,i=>`<circle cx="${48+i*30}" cy="${140+(i%4)*24}" r="2.5" fill="#fff8b5"/>`,'term-firefly');
      case 'dashu': return cloud(55,71,1.5,'term-summer-cloud')+cloud(253,109,.9,'term-summer-cloud')+`<g class="term-heat" fill="none" stroke="#ffffff66" stroke-width="3"><path d="M99 279q-12-29 0-60t0-60M161 293q-12-29 0-60t0-60M223 282q-12-29 0-60t0-60"/></g>`;
      case 'liqiu': return particles(9,i=>leaf(45+i*42,70+(i%3)*78,.32,20+i*23),'term-autumnleaf')+`<path d="M98 315Q111 231 153 171" stroke="var(--term-accent)" stroke-width="5" fill="none"/>`;
      case 'chushu': return cloud(40,70,1.8,'term-clearing-cloud')+cloud(205,127,1.1,'term-clearing-cloud')+`<g class="term-breeze" fill="none" stroke="#fff9" stroke-width="3" stroke-linecap="round"><path d="M42 205h178q35 0 20-20M91 231h190M32 253h124"/></g>`;
      case 'bailu': return [0,1,2].map(i=>`<path class="term-reed" style="--delay:-${i}s" d="M${91+i*56} 318q-40-106 ${15-i*12}-179" stroke="var(--term-front)" stroke-width="5" fill="none"/>`).join('')+particles(8,i=>`<ellipse cx="${65+i*28}" cy="${150+(i%3)*38}" rx="5" ry="8" fill="#fff9" stroke="#fff"/>`,'term-dew');
      case 'qiufen': return `<g class="term-balance" fill="none" stroke="#ffffff77" stroke-width="2"><circle cx="205" cy="155" r="72" stroke-dasharray="4 7"/><path d="M117 155h176"/></g>`+particles(7,i=>leaf(55+i*42,90+(i%3)*68,.37,-30+i*25),'term-equinoctial-leaf');
      case 'hanlu': return cloud(15,216,2.5,'term-cold-mist')+cloud(144,172,1.6,'term-cold-mist')+`<path d="M107 316q-20-103 41-176" fill="none" stroke="var(--term-front)" stroke-width="4"/>`+particles(5,i=>`<circle cx="${107+i*9}" cy="${172+i*24}" r="4" fill="#e7f8ff"/>`,'term-cold-dew');
      case 'shuangjiang': return branches(true)+`<g class="term-frost" stroke="#fff" stroke-width="2" stroke-linecap="round">${[0,1,2,3,4].map(i=>`<path d="M${195+i*18} ${160+i*20}l18-16m-9 8v-11m0 11h13"/>`).join('')}</g>`+leaf(254,286,.6,-22);
      case 'lidong': return `<g class="term-smoke" fill="none" stroke="#ffffff7a" stroke-width="6" stroke-linecap="round"><path d="M442 193q-17-23 0-42t0-39"/></g><path class="term-winter-wind" d="M35 180q54-33 134 0t111 0" fill="none" stroke="#ffffff66" stroke-width="3"/>`+branches();
      case 'xiaoxue': return snow(14,1)+`<path d="M47 290q95-29 206 0" fill="none" stroke="#ffffffa0" stroke-width="11" stroke-linecap="round"/>`;
      case 'daxue': return snow(28,2)+`<g class="term-snowdrift" fill="#f4f8ff"><path d="M0 301Q90 270 185 301T390 301T560 301V360H0Z"/></g>`+branches(true);
      case 'dongzhi': return `<path class="term-solstice-arc" d="M51 199Q250 10 483 194" fill="none" stroke="#ffe0a577" stroke-width="3"/><g class="term-window-glow"><ellipse cx="441" cy="274" rx="67" ry="43" fill="#ffd39644"/></g>`+cloud(69,92,1.2,'term-night-cloud');
      case 'xiaohan': return branches(true)+particles(10,i=>`<path d="M${185+i*25} ${98+(i%4)*40}l4 8-4 8-4-8Z" fill="#dff5ff"/>`,'term-ice-spark')+`<path class="term-ice-line" d="M63 310h220" stroke="#d9f4ff" stroke-width="3"/>`;
      case 'dahan': return branches()+flower(135,117,.62,'#eeb3c4','term-plum')+flower(99,171,.48,'#eeb3c4','term-plum')+flower(166,181,.65,'#eeb3c4','term-plum')+flower(68,212,.42,'#eeb3c4','term-plum')+snow(8,1);
      case 'spring-festival': return starBurst(105,105,1.15,-1.1)+starBurst(392,120,.85,-2.8)+lantern(82,92,.88)+lantern(476,103,.68,-1.4)+`<g class="festival-couplet"><rect x="365" y="240" width="19" height="72" rx="3" fill="#a6292d"/><path d="M370 250h9m-9 15h9m-9 15h9m-9 15h9m-9 15h9" stroke="#ffe49a" stroke-width="2"/></g>`+particles(18,i=>`<rect x="${24+(i*71)%520}" y="${36+(i*47)%250}" width="4" height="9" rx="1" fill="${i%2?'#ffdd7a':'#fff1c8'}"/>`,'festival-spark');
      case 'lantern-festival': return `<circle class="festival-moon" cx="422" cy="77" r="54" fill="#fff0c2" opacity=".92"/>`+lantern(92,72,.78)+lantern(206,112,.52,-.8)+lantern(472,87,.65,-1.6)+particles(13,i=>`<circle cx="${40+i*40}" cy="${92+(i%5)*42}" r="${2+i%2}" fill="#ffe7a8"/>`,'festival-twinkle')+waves(306);
      case 'dragon-boat-festival': return `<g transform="translate(38 206)"><g class="festival-boat"><path d="M-18 58Q119 92 252 49L279 70Q132 121-22 78Z" fill="#8a332e"/><path d="M237 53q41-27 53 5q-26-1-35 17q19 2 23 17q-35-4-49-16" fill="#d7a743" stroke="#fff0b0" stroke-width="2"/><path d="M33 12v51m-14-51h28" stroke="#d5aa55" stroke-width="5"/><path d="M-3 38L61 73M54 21L107 72M110 12L153 70M166 11L199 66" class="festival-oar" stroke="#ffeec0" stroke-width="3"/></g></g>`+waves(281)+particles(12,i=>`<path d="M${28+i*45} ${145+(i%4)*22}q5-14 10 0" fill="none" stroke="#fff9" stroke-width="2"/>`,'festival-twinkle');
      case 'qixi': return particles(32,i=>`<circle cx="${22+(i*79)%530}" cy="${32+(i*53)%230}" r="${i%4===0?2.2:1.2}" fill="${i%3===0?'#ffe4a6':'#fff'}"/>`,'festival-twinkle')+`<path class="festival-star-river" d="M18 202Q195 143 544 188" fill="none" stroke="#ffffff66" stroke-width="13" stroke-dasharray="2 9"/><path d="M145 271Q279 171 416 270" fill="none" stroke="#ffe6ae" stroke-width="5"/><circle cx="145" cy="271" r="7" fill="#fff2c2"/><circle cx="416" cy="270" r="7" fill="#fff2c2"/>`+heart(280,151,.62,'#f2b4d1','festival-heart',-1.2);
      case 'mid-autumn-festival': return `<circle class="festival-moon" cx="421" cy="83" r="66" fill="#ffe6a9"/><circle cx="399" cy="70" r="10" fill="#dfbd79" opacity=".35"/><circle cx="444" cy="109" r="7" fill="#dfbd79" opacity=".3"/>`+cloud(47,117,1.7,'term-night-cloud')+`<g transform="translate(260 284)"><g class="festival-rabbit"><ellipse cx="-14" cy="-30" rx="7" ry="24" fill="#f4e6c7" transform="rotate(-14 -14 -30)"/><ellipse cx="10" cy="-31" rx="7" ry="25" fill="#f4e6c7" transform="rotate(12 10 -31)"/><ellipse cx="0" cy="0" rx="29" ry="25" fill="#f4e6c7"/><circle cx="-9" cy="-5" r="2.5" fill="#5b4a40"/><circle cx="9" cy="-5" r="2.5" fill="#5b4a40"/><circle cx="0" cy="5" r="3" fill="#d38b8b"/></g></g>`+particles(8,i=>`<circle cx="${52+i*63}" cy="${156+(i%3)*33}" r="3" fill="#ffe7a5"/>`,'festival-twinkle');
      case 'double-ninth': return `<path d="M-20 300L91 128L177 229L256 104L392 261L452 185L590 297V350H-20Z" fill="#6f7547" opacity=".72"/><path d="M-20 318L113 199L211 292L315 195L457 311T600 266V360H-20Z" fill="#505f36" opacity=".72"/>`+flower(135,259,.64,'#f1bd52','festival-chrysanthemum')+flower(242,287,.8,'#f4ca69','festival-chrysanthemum')+flower(352,254,.58,'#e9ab42','festival-chrysanthemum')+particles(8,i=>leaf(42+i*63,97+(i%3)*61,.28,-18+i*21),'term-autumnleaf');
      case 'new-year': return starBurst(108,103,1.2,-2)+starBurst(427,112,1.05,-.6)+`<g transform="translate(280 159)"><g class="festival-clock"><circle r="63" fill="#ffffff1c" stroke="#ffe69a" stroke-width="3"/><circle r="48" fill="#ffffff12"/><path d="M0 0V-34M0 0L25 16" stroke="#fff0b5" stroke-width="5" stroke-linecap="round"/><circle r="5" fill="#ffe08a"/></g></g>`+particles(26,i=>`<rect x="${17+(i*67)%540}" y="${35+(i*49)%260}" width="4" height="8" rx="1" fill="${i%3===0?'#ffe181':i%3===1?'#f5a9b8':'#a9d8ff'}"/>`,'festival-spark');
      case 'valentines-day': return heart(279,150,1.55,'#d53c70','festival-heart',-1.3)+particles(18,i=>heart(32+i*31,90+(i%5)*39,.22+(i%3)*.1,i%2?'#fff0f4':'#e65d87','festival-heart-rise',-(i*.41)))+flower(104,288,.72,'#ef9eb8','festival-chrysanthemum')+flower(467,276,.62,'#f6b1c6','festival-chrysanthemum');
      case 'labor-day': return `<g transform="translate(151 148)"><g class="festival-gear"><circle r="58" fill="none" stroke="#f4d474" stroke-width="12"/><circle r="22" fill="none" stroke="#f4d474" stroke-width="9"/>${[0,45,90,135,180,225,270,315].map(a=>`<path d="M0-70V-49" transform="rotate(${a})" stroke="#f4d474" stroke-width="12" stroke-linecap="round"/>`).join('')}</g></g>`+`<g transform="translate(282 210)"><g class="festival-ribbon"><path d="M0 0C58-52 98 17 137-18" fill="none" stroke="#c85d36" stroke-width="19" stroke-linecap="round"/><path d="M0 0C58-52 98 17 137-18" fill="none" stroke="#e9b25f" stroke-width="4" stroke-dasharray="6 12"/></g></g>`+wheat(359,305,.9,'#d8b659')+wheat(411,311,.8,'#c9a951');
      case 'earth-day': return `<g transform="translate(278 166)"><g class="festival-globe"><circle r="78" fill="#5da8c0" stroke="#dff8ee" stroke-width="3"/><path d="M-54-38Q-18-60 0-30T42-23Q65 2 44 20T22 55Q-4 45-9 19T-54-38Z" fill="#5a9d68"/><path d="M-14-70Q15-52 23-35T5-9Q-12-27-14-70Z" fill="#74b678"/><path d="M-79 5Q-48-13-28 4T-36 41Q-65 45-79 5Z" fill="#4a8e72"/><ellipse rx="104" ry="27" fill="none" stroke="#ffffff77" stroke-width="2" transform="rotate(-18)"/></g></g>`+leaf(94,289,.8,-26)+leaf(466,294,.7,27)+particles(10,i=>`<circle cx="${34+i*54}" cy="${75+(i%4)*43}" r="2" fill="#fff9"/>`,'festival-twinkle');
      case 'halloween': return `<circle class="festival-moon" cx="422" cy="82" r="58" fill="#ffd16e" opacity=".95"/>`+pumpkin(132,230,1.18)+particles(7,i=>`<path class="festival-bat" style="--delay:-${i*.57}s" d="M${58+i*68} ${92+(i%4)*43}q-19-18-31 5q12-5 18 9q10-12 13 8q3-20 13-8q6-14 18-9q-12-23-31-5" fill="#16121d" stroke="#5d4769" stroke-width="1"/>`,'festival-bat-wrap')+`<g class="festival-cobweb" fill="none" stroke="#ffffff66" stroke-width="1.5"><path d="M0 0L95 45M0 0L53 89M0 0L107 8M31 15Q42 26 28 34M54 26Q69 44 47 57M76 35Q92 57 65 73"/></g>`;
      case 'christmas': return `<g transform="translate(166 122)"><g class="festival-tree"><path d="M0 0L-67 91H-35L-87 162H-36L-108 250H108L36 162H87L35 91H67Z" fill="#28644e"/><path d="M0-20l7 18 19 2-15 13 4 19-15-9-15 9 4-19-15-13 19-2Z" fill="#ffe69a"/><circle cx="-35" cy="64" r="6" fill="#c84545"/><circle cx="31" cy="81" r="5" fill="#f4c456"/><circle cx="-48" cy="135" r="6" fill="#e8d48b"/><circle cx="24" cy="154" r="6" fill="#c84545"/><circle cx="-61" cy="206" r="5" fill="#f4c456"/><circle cx="52" cy="209" r="6" fill="#d8e6dd"/></g></g>`+snow(20,1)+`<g transform="translate(364 275)"><g class="festival-gifts"><rect width="55" height="46" rx="5" fill="#b8373d"/><path d="M27 0v46M0 19h55" stroke="#f1cd72" stroke-width="5"/><path d="M22 0Q7-17 6-2Q8 7 27 8M33 0Q48-17 49-2Q47 7 27 8" fill="none" stroke="#f1cd72" stroke-width="4"/></g></g>`+particles(12,i=>`<circle cx="${56+i*42}" cy="${66+(i%4)*35}" r="2.5" fill="#fff5b8"/>`,'festival-twinkle');
      default: return sprout(135,295,1.3);
    }
  }
  function render(target, theme, language = 'zh') {
    if (!target || !theme?.key) return;
    const id = `solar-sky-${++nextId}`;
    const p = theme.palette || {};
    const properties = ['sky1','sky2','back','front','sun','accent'].map(key => `--term-${key}:${/^#[0-9a-f]{6}$/i.test(p[key])?p[key]:'#78958b'}`).join(';');
    const sunY = ['dongzhi','lidong','xiaohan','dahan','spring-festival','lantern-festival','mid-autumn-festival','halloween','christmas'].includes(theme.key) ? 138 : 80;
    const captions = {
      traditional: ['TRADITIONAL FESTIVALS', '传统节日'],
      world: ['WORLD FESTIVALS', '世界节日'],
      solar: ['TWENTY-FOUR SOLAR TERMS', '二十四节气'],
    };
    const [captionEn, captionZh] = captions[theme.category] || captions.solar;
    target.innerHTML = `<div class="solar-scene" data-term="${esc(theme.key)}" style="${properties}"><svg viewBox="0 0 560 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="var(--term-sky1)"/><stop offset="1" stop-color="var(--term-sky2)"/></linearGradient></defs><rect width="560" height="360" fill="url(#${id})"/><circle class="term-sun-halo" cx="422" cy="${sunY}" r="62" fill="var(--term-sun)" opacity=".17"/><circle class="term-sun" cx="422" cy="${sunY}" r="40" fill="var(--term-sun)"/><path d="M-40 277Q85 135 244 241T610 220V380H-40Z" fill="var(--term-back)"/><path d="M-30 344Q144 238 310 307T600 283V380H-30Z" fill="var(--term-front)"/><g class="term-cottage"><path d="M385 239l57-51 58 51" fill="var(--term-accent)"/><rect x="395" y="235" width="94" height="75" rx="8" fill="#fff9"/><rect class="term-window" x="412" y="251" width="27" height="30" rx="5" fill="var(--term-sun)"/><path d="M425 251v30m-13-15h27" stroke="#fff9" stroke-width="2"/><rect x="457" y="268" width="17" height="42" rx="6" fill="var(--term-accent)" opacity=".65"/><path d="M445 208v-18h11v28" fill="var(--term-accent)"/></g>${details(theme.key)}</svg><div class="solar-scene-caption"><span>${language==='en'?captionEn:captionZh}</span><strong>${esc(language==='en'?theme.label_en:theme.label)}</strong></div></div>`;
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
