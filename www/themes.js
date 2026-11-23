// RepWise rank themes: design tokens for each overall rank, in dark and light. Screens read ONLY these tokens
// (as CSS variables). Higher ranks get richer surfaces and effects; layouts never change. Original art only.
// Each palette must pass WCAG AA (checked by test/themes.test.js): ink/ink2 on bg+surface ≥ 4.5, onAccent on accent ≥ 4.5,
// ink3 (hints, icons) ≥ 3.
(function (root) {
  'use strict';
  const P = (o) => o; // palette: bg surface fill ink ink2 ink3 line accent onAccent accent2 ok warn danger
  const THEMES = {
    iron: { name: 'Iron', effects: 0, font: { display: "'Inter', system-ui, sans-serif", weight: 800, transform: 'none', tracking: '-.01em' },
      shape: { card: '4px', button: '6px', chip: '4px' }, haptic: [12],
      look: 'Raw and utilitarian: matte gunmetal, brushed metal, hard edges, corner rivets, a rust accent.',
      dark: P({ bg: '#15171a', surface: '#1e2125', fill: '#2a2e33', ink: '#e8eaed', ink2: '#b0b6bd', ink3: '#848c95', line: '#353a40', accent: '#b8521d', onAccent: '#ffffff', accent2: '#8a9199', ok: '#5fbf7f', warn: '#e0a040', danger: '#ef6a5b' }),
      light: P({ bg: '#e7e9ec', surface: '#f4f5f6', fill: '#dcdfe3', ink: '#1a1d21', ink2: '#454c55', ink3: '#6c747d', line: '#c9ced4', accent: '#9e4416', onAccent: '#ffffff', accent2: '#5b636c', ok: '#1d7a3e', warn: '#8a5a00', danger: '#b3261e' }) },
    bronze: { name: 'Bronze', effects: 1, font: { display: "'Inter', system-ui, sans-serif", weight: 800, transform: 'none', tracking: '-.015em' },
      shape: { card: '10px', button: '12px', chip: '999px' }, haptic: [14],
      look: 'Warm metal: brown-black surfaces, bronze and copper gradients, embossed cards, a soft patina.',
      dark: P({ bg: '#160f0a', surface: '#211811', fill: '#2d2118', ink: '#f4e8db', ink2: '#cdb59e', ink3: '#9d846d', line: '#3f2f22', accent: '#d38a45', onAccent: '#1a0e05', accent2: '#b5653a', ok: '#7cc58f', warn: '#e7b15a', danger: '#f07a64' }),
      light: P({ bg: '#f3ece4', surface: '#fbf7f2', fill: '#e8ddd0', ink: '#24170d', ink2: '#5e4633', ink3: '#86705c', line: '#d8c8b6', accent: '#8f4f1c', onAccent: '#ffffff', accent2: '#a0522d', ok: '#25713f', warn: '#8a5300', danger: '#a8321f' }) },
    silver: { name: 'Silver', effects: 1, font: { display: "'Inter', system-ui, sans-serif", weight: 800, transform: 'none', tracking: '-.02em' },
      shape: { card: '14px', button: '14px', chip: '999px' }, haptic: [10, 30, 10],
      look: 'Clean and polished: cool steel, mirror sheens, crisp thin borders, a shine sweep on rank-up.',
      dark: P({ bg: '#111418', surface: '#1a1f25', fill: '#252b33', ink: '#eef2f6', ink2: '#b6c0ca', ink3: '#8590a0', line: '#313842', accent: '#c9d3dd', onAccent: '#0f1418', accent2: '#8fa3b8', ok: '#6fd19a', warn: '#f0c060', danger: '#f27d72' }),
      light: P({ bg: '#eef1f4', surface: '#ffffff', fill: '#e2e7ec', ink: '#12171c', ink2: '#4b5662', ink3: '#717d89', line: '#d2d9e0', accent: '#46576a', onAccent: '#ffffff', accent2: '#6c7f93', ok: '#1b7a45', warn: '#8a5a00', danger: '#b02a2a' }) },
    gold: { name: 'Gold', effects: 2, font: { display: "'Inter', system-ui, sans-serif", weight: 900, transform: 'none', tracking: '-.02em' },
      shape: { card: '16px', button: '14px', chip: '999px' }, haptic: [12, 40, 18],
      look: 'Prestige: black and charcoal with gold foil titles, engraved borders, gold progress rings, a gentle shimmer.',
      dark: P({ bg: '#0c0b09', surface: '#16140f', fill: '#221e15', ink: '#f6edd8', ink2: '#cdbd93', ink3: '#958867', line: '#3b3323', accent: '#d9aa2e', onAccent: '#170f02', accent2: '#f1d27a', ok: '#7fcf8e', warn: '#f0c25a', danger: '#f0796a' }),
      light: P({ bg: '#f7f2e6', surface: '#fffcf4', fill: '#efe5cc', ink: '#1d170a', ink2: '#5a4a24', ink3: '#7f6d44', line: '#e0d2ad', accent: '#7a5a00', onAccent: '#ffffff', accent2: '#a07a1a', ok: '#256b37', warn: '#7d5300', danger: '#a32a1c' }) },
    platinum: { name: 'Platinum', effects: 2, font: { display: "'Inter', system-ui, sans-serif", weight: 800, transform: 'none', tracking: '-.025em' },
      shape: { card: '20px', button: '16px', chip: '999px' }, haptic: [8, 24, 8],
      look: 'Sleek and modern: pearl and graphite frosted glass, thin glowing platinum-blue edges, smooth gradients.',
      dark: P({ bg: '#101318', surface: '#1a1e25', fill: '#242a33', ink: '#eef3fa', ink2: '#b4c0d0', ink3: '#8593a6', line: '#2f3743', accent: '#9cc3ff', onAccent: '#0a1a30', accent2: '#c7d6ea', ok: '#75d6a6', warn: '#f2c76a', danger: '#f58a80' }),
      light: P({ bg: '#f3f5f8', surface: '#ffffff', fill: '#e6eaf0', ink: '#0f141b', ink2: '#4a5566', ink3: '#6f7b8c', line: '#d6dce5', accent: '#2f5e9e', onAccent: '#ffffff', accent2: '#5b7ba6', ok: '#1a7449', warn: '#855700', danger: '#ad2b2b' }) },
    diamond: { name: 'Diamond', effects: 3, font: { display: "'Inter', system-ui, sans-serif", weight: 900, transform: 'none', tracking: '-.025em' },
      shape: { card: '18px', button: '14px', chip: '8px' }, haptic: [8, 20, 8, 20, 16],
      look: 'Crystalline: deep midnight, faceted cards, prismatic edges, sparkles on achievements, icy cyan and violet.',
      dark: P({ bg: '#070b19', surface: '#0f1630', fill: '#18213f', ink: '#ecf7ff', ink2: '#a9c1e4', ink3: '#7d93b8', line: '#26335a', accent: '#5fe4ff', onAccent: '#03202b', accent2: '#b19bff', ok: '#6fe0b0', warn: '#ffd27a', danger: '#ff8a9a' }),
      light: P({ bg: '#eef4fb', surface: '#ffffff', fill: '#e1eaf6', ink: '#0a1430', ink2: '#3d4f78', ink3: '#62739a', line: '#cfdbec', accent: '#0d6a86', onAccent: '#ffffff', accent2: '#6047c9', ok: '#14724e', warn: '#7d5400', danger: '#b0263f' }) },
    master: { name: 'Master', effects: 3, font: { display: "'Inter', system-ui, sans-serif", weight: 900, transform: 'none', tracking: '-.025em' },
      shape: { card: '18px', button: '16px', chip: '999px' }, haptic: [10, 30, 10, 30, 20],
      look: 'Mastery: deep amethyst, crystal-cut glowing edges, violet aura on achievements, refined and calm.',
      dark: P({ bg: '#0f0a17', surface: '#19112a', fill: '#24193a', ink: '#f4edff', ink2: '#c7b6e8', ink3: '#9282b0', line: '#34274f', accent: '#b98dff', onAccent: '#1a0a33', accent2: '#e3c6ff', ok: '#7ad7a6', warn: '#f2c76a', danger: '#ff8a9a' }),
      light: P({ bg: '#f5f1fb', surface: '#ffffff', fill: '#ece4f8', ink: '#170d29', ink2: '#4d3d6e', ink3: '#73639a', line: '#dcd1ee', accent: '#6a2ec2', onAccent: '#ffffff', accent2: '#8f4fe6', ok: '#1d6e43', warn: '#7a5200', danger: '#a8281f' }) },
    grandmaster: { name: 'Grandmaster', effects: 3, font: { display: "'Inter', system-ui, sans-serif", weight: 900, transform: 'none', tracking: '-.02em' },
      shape: { card: '12px', button: '12px', chip: '8px' }, haptic: [20, 40, 20, 40, 30],
      look: 'Obsidian and fire: volcanic black glass, molten crimson edges, ember glow — intense and commanding.',
      dark: P({ bg: '#0b0707', surface: '#160e0e', fill: '#221515', ink: '#ffeeee', ink2: '#dcb6b6', ink3: '#a27e7e', line: '#3e2323', accent: '#ff5d5d', onAccent: '#2a0505', accent2: '#ff9b6b', ok: '#7fd39a', warn: '#f5c35c', danger: '#ff8a8a' }),
      light: P({ bg: '#faf1f1', surface: '#ffffff', fill: '#f2e2e2', ink: '#200a0a', ink2: '#5e3434', ink3: '#855a5a', line: '#e6cfcf', accent: '#a8161b', onAccent: '#ffffff', accent2: '#b8441d', ok: '#1d6e43', warn: '#7a5200', danger: '#9e1b1b' }) },
    legend: { name: 'Legend', effects: 3, font: { display: "Georgia, 'Times New Roman', serif", weight: 800, transform: 'none', tracking: '-.01em' },
      shape: { card: '16px', button: '999px', chip: '999px' }, haptic: [16, 40, 16, 40, 30],
      look: "Champion's arena: marble and stone, laurel motifs, white and gold with royal blue, spotlight on Today, trophy progress.",
      dark: P({ bg: '#0c1126', surface: '#141b37', fill: '#1d2647', ink: '#f7f2e4', ink2: '#cdc6ae', ink3: '#959083', line: '#2d3760', accent: '#e4bf4b', onAccent: '#191303', accent2: '#8fa6ff', ok: '#7dd3a0', warn: '#f2c25e', danger: '#f48678' }),
      light: P({ bg: '#f4f2ec', surface: '#fffdf8', fill: '#ebe7dc', ink: '#111a35', ink2: '#414c75', ink3: '#677095', line: '#ddd8c9', accent: '#1d3790', onAccent: '#ffffff', accent2: '#8a6d12', ok: '#1d6e43', warn: '#7a5200', danger: '#a8281f' }) },
    arnold: { name: 'Arnold', effects: 3, font: { display: "'Oswald', 'Bebas Neue', 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif", weight: 900, transform: 'uppercase', tracking: '.01em' },
      shape: { card: '10px', button: '10px', chip: '6px' }, haptic: [30, 50, 30, 50, 60],
      look: 'Built for big men: black stage, spotlight and light beams, gold and crimson, heavy condensed type, metallic bevels, plate-loaded progress bars.',
      dark: P({ bg: '#050505', surface: '#111010', fill: '#1c1a18', ink: '#fff6e0', ink2: '#dac69c', ink3: '#9e8d6b', line: '#3b2f1d', accent: '#e3b43a', onAccent: '#120b01', accent2: '#d0213c', ok: '#86d39a', warn: '#f2c55c', danger: '#ff6d7d' }),
      light: P({ bg: '#f5f0e4', surface: '#fffaf0', fill: '#ece2cb', ink: '#110d06', ink2: '#4f4127', ink3: '#76664a', line: '#dccdab', accent: '#7a1022', onAccent: '#ffffff', accent2: '#7a5600', ok: '#256b37', warn: '#7a5200', danger: '#9e1b2c' }) },
  };
  const ORDER = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend', 'arnold'];
  // WCAG relative luminance / contrast ratio.
  function lum(hex) { const h = hex.replace('#', ''), v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // CSS variables for a theme + mode.
  function vars(id, mode) { const t = THEMES[id] || THEMES.iron, c = t[mode] || t.dark;
    return { '--bg': c.bg, '--surface': c.surface, '--fill': c.fill, '--ink': c.ink, '--ink-2': c.ink2, '--ink-3': c.ink3, '--line': c.line,
      '--accent': c.accent, '--on-accent': c.onAccent, '--accent-2': c.accent2, '--ok': c.ok, '--warn': c.warn, '--danger': c.danger,
      '--accent-soft': c.accent + '22', '--r-card': t.shape.card, '--r-btn': t.shape.button, '--r-chip': t.shape.chip,
      ...Object.fromEntries([['accent',16],['accent2',18],['ok',18],['warn',18],['accent2',26],['accent',24],['accent2',10],['ok',26]].map(([k,p],i)=>['--tile-'+(i+1),`color-mix(in srgb,${c[k]} ${mode==='dark'?p+6:p}%,${c.surface})`])),
      '--shadow-c': mode === 'dark' ? '#00000066' : '#15151f14', '--scrim': mode === 'dark' ? '#000000b3' : '#00000066',
      '--font-display': t.font.display, '--fw-display': String(t.font.weight), '--tt-display': t.font.transform, '--ls-display': t.font.tracking }; }
  const API = { THEMES, ORDER, lum, contrast, vars };
  root.RWThemes = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
