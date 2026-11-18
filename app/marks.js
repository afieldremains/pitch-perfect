'use strict';
(function (root) {
  const styles = [
    ['star', 'Faceted star'], ['overlap', 'Overlap'], ['center', 'Center'], ['three-dots', 'Three dots'], ['three-stars', 'Three stars'],
    ['line', 'Line'], ['tile', 'Tile'], ['lowercase', 'Lowercase'], ['pixel', 'Pixel'],
    ['constellation', 'Constellation'], ['orbit', 'Orbit'], ['sky', 'Sky'], ['flow', 'Flow'], ['arrow', 'Arrow'],
    ['ribbon', 'Ribbon P'], ['paradox', 'Paradox P'],
    ['counterform', 'Counterform'], ['register', 'Register'], ['cut-paper', 'Cut paper'], ['relay', 'Relay']
  ].map(([id, name]) => ({ id, name }));
  const stem = 'var(--lg-stem,#2656D9)', ring = 'var(--lg-ring,#E22622)', gold = 'var(--lg-star,#FAC800)';
  const bar = '<rect width="87" height="383" rx="43.5" fill="' + stem + '"/>';
  const counter = '<path fill-rule="evenodd" fill="' + ring + '" d="M174 0a130 130 0 1 0 0 260a130 130 0 1 0 0-260ZM174 79a51 51 0 1 1 0 102a51 51 0 1 1 0-102Z"/>';
  const spark = '<path class="prio-star" fill="' + gold + '" d="M63 96C66 119 74 127 97 130C74 133 66 141 63 164C60 141 52 133 29 130C52 127 60 119 63 96Z"/>';
  function star(pitch = 0, yaw = 0) {
    const clamp = (n) => Number.isFinite(n) ? Math.max(-.35, Math.min(.35, n)) : 0;
    pitch = clamp(pitch) - .12; yaw = clamp(yaw) - .18;
    const rotate = ([x, y, z]) => {
      const xx = x * Math.cos(yaw) + z * Math.sin(yaw), zz = z * Math.cos(yaw) - x * Math.sin(yaw);
      return [xx, y * Math.cos(pitch) - zz * Math.sin(pitch), y * Math.sin(pitch) + zz * Math.cos(pitch)];
    };
    const ring = Array.from({ length: 8 }, (_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 4, radius = i % 2 ? .27 : 1;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
    });
    const faces = [];
    for (let i = 0; i < 8; i++) {
      for (const z of [-.16, .26]) {
        const points = [[0, 0, z], ring[i], ring[(i + 1) % 8]].map(rotate);
        const [a, b, c] = points, u = b.map((n, k) => n - a[k]), v = c.map((n, k) => n - a[k]);
        const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const light = normal.reduce((sum, n, k) => sum + n * [-.35, -.5, 1][k], 0) / Math.hypot(...normal);
        faces.push({ points, depth: points.reduce((sum, p) => sum + p[2], 0), shade: Math.round(68 + light * 20) });
      }
    }
    return '<svg class="prio-mark prio-star" data-mark="star" viewBox="0 0 304 383" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g style="color:var(--guide-tone,var(--lg-stem,#2656D9))">' +
      faces.sort((a, b) => a.depth - b.depth).map((face) => '<polygon points="' + face.points.map(([x, y, z]) => {
        const perspective = 1 / (1 - z / 4);
        return (152 + x * 140 * perspective).toFixed(2) + ',' + (191 + y * 140 * perspective).toFixed(2);
      }).join(' ') + '" fill="color-mix(in srgb,currentColor ' + face.shade + '%,var(--card,#FFFFFF))"/>').join('') + '</g></svg>';
  }
  function svg(id, options = {}) {
    if (!styles.some((s) => s.id === id)) id = 'overlap';
    if (id === 'star') return star();
    const simple = bar + counter;
    const drawings = {
      overlap: simple,
      center: simple + '<circle cx="174" cy="130" r="44" fill="' + gold + '"/>',
      'three-dots': [43.5, 191.5, 339.5].map((y, i) => '<circle cx="43.5" cy="' + y + '" r="43.5" fill="' + [stem, gold, stem][i] + '"/>').join('') + counter,
      'three-stars': simple + '<g transform="translate(145,-60) scale(.5)">' + spark + '</g><g transform="translate(-8,235) scale(.5)">' + spark + '</g>',
      line: '<rect x="8" y="8" width="71" height="367" rx="35.5" fill="none" stroke="' + stem + '" stroke-width="12"/><circle cx="174" cy="130" r="122" fill="none" stroke="' + ring + '" stroke-width="12"/>',
      tile: '<rect y="20" width="304" height="304" rx="28" fill="currentColor"/><g transform="translate(68,62) scale(.54)" style="--lg-stem:var(--ground,#F5F5F3);--lg-ring:var(--ground,#F5F5F3)">' + simple + '</g>',
      lowercase: '<path d="M40 95V364" stroke="' + stem + '" stroke-width="28" stroke-linecap="round"/><circle cx="146" cy="140" r="94" fill="none" stroke="' + ring + '" stroke-width="28"/>',
      pixel: ['11111', '11011', '11011', '11111', '11000', '11000', '11000'].map((row, y) => [...row].map((v, x) => v === '1' ? '<rect x="' + (12 + x * 52) + '" y="' + (12 + y * 52) + '" width="48" height="48" fill="' + (x < 2 ? stem : ring) + '"/>' : '').join('')).join(''),
      constellation: '<path d="M50 365V20L220 65L270 150L220 225L50 185" fill="none" stroke="currentColor" stroke-width="5"/>' + [[50, 365], [50, 20], [220, 65], [270, 150], [220, 225], [50, 185]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + stem + '"/>').join(''),
      orbit: simple + '<ellipse cx="153" cy="145" rx="145" ry="38" transform="rotate(-22 153 145)" fill="none" stroke="' + gold + '" stroke-width="8"/>',
      sky: simple + '<path d="M8 286h65M101 42h112M203 220h76" stroke="var(--ground,#F5F5F3)" stroke-width="18" stroke-linecap="round"/>',
      flow: '<rect width="87" height="280" rx="43.5" fill="' + stem + '"/><path d="M12 260V345M42 260V370M73 260V313" stroke="' + stem + '" stroke-width="20" stroke-linecap="round"/>' + counter,
      arrow: simple + '<path d="M175 178H90V147L36 191L90 235V204H175Z" fill="var(--ground,#F5F5F3)"/>',
      ribbon: '<path d="M40 355V51H198L272 117V173L198 238H108V355Z M108 115V174H174L207 144L174 115Z" fill-rule="evenodd" fill="' + stem + '"/><path d="M198 51L272 117V173L246 190V130L181 72Z" fill="' + ring + '"/><path d="M40 210L108 174H174L198 196L108 239L40 239Z" fill="' + gold + '"/>',
      paradox: '<path d="M40 361L66 342V56L40 74Z M40 74L66 56H204L278 125L253 144L181 74Z" fill="var(--ink,#111114)"/><path d="M40 74H181L253 144V188L181 255H109V361H40Z M109 139V187H160L187 163L160 139Z" fill-rule="evenodd" fill="' + stem + '"/><path d="M181 74L253 144V188L229 207V158L161 95Z" fill="' + ring + '"/><path d="M40 225L109 187H160L181 208L109 255H40Z" fill="' + gold + '"/><path d="M109 255L181 208L204 226L132 274L109 292Z" fill="var(--ink,#111114)"/>',
      counterform: '<path fill="' + stem + '" fill-rule="evenodd" d="M8 8H296V375H8Z M64 320H112V216H184L240 160V104L184 48H64Z M112 96H168L192 120V144L168 168H112Z"/>',
      register: '<path d="M24 364V32H174C300 32 300 236 174 236H72 M48 364V56H174C268 56 268 212 174 212H96 M72 364V80H174C236 80 236 188 174 188H120" fill="none" stroke="' + stem + '" stroke-width="12"/>',
      'cut-paper': '<path d="M24 20H188L280 104V180L196 260H104V364H24Z M104 100V180H164L200 144L164 100Z" fill-rule="evenodd" fill="' + stem + '"/><path d="M196 24L280 104H236L168 40Z" fill="' + ring + '"/><path d="M24 272H104V288H24Z" fill="var(--ground,#F5F5F3)"/>',
      relay: '<path d="M16 16H88V256H16Z M16 272H88V320H16Z M16 336H88V368H16Z" fill="' + stem + '"/><path d="M104 16H208L288 96V176L208 256H104V200H184L232 152V120L184 72H104Z" fill="' + ring + '"/>'
    };
    return '<svg class="prio-mark" data-mark="' + id + '" viewBox="0 0 304 383" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' + drawings[id] + (options.star === false ? '' : spark) + '</svg>';
  }
  function choose(previous, random = Math.random) {
    const available = styles.filter((style) => style.id !== previous);
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Choose a guide appearance with a number between zero and one.');
    return available[Math.floor(value * available.length)].id;
  }
  function progress(count, completed, failed = false) {
    if (!Number.isInteger(count) || count < 1 || count > 8 || !Number.isInteger(completed) || completed < 0 || completed > count || typeof failed !== 'boolean' || (failed && completed === count)) throw new Error('Choose a valid build stage and completed stage count.');
    const height = 383 / count;
    return '<svg class="build-mark" viewBox="-8 -4 336 392" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" data-purpose="build-stage-status">' +
      Array.from({ length: count }, (_, i) => '<svg class="build-stage" data-stage="' + i + '" data-state="' + (i < completed ? 'done' : i === completed ? failed ? 'fail' : 'now' : 'waiting') + '" x="0" y="' + (i * height) + '" width="304" height="' + (height - 7) + '" viewBox="0 ' + (i * height) + ' 304 ' + (height - 7) + '"><g style="--lg-stem:currentColor;--lg-ring:currentColor">' + bar + counter + '</g></svg>').join('') + spark + '</svg>';
  }
  const api = { styles, svg, star, choose, progress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PrioMarks = api;
})(globalThis);
