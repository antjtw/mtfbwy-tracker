/*
 * One-off: turns the supplied STL dice into the files the roller loads (public/dice/<name>.json and .bin).
 * Usage: node scripts/build-dice.mjs <folder with the .stl files>
 * For each die it centres it on its centre of mass, scales it, finds the flat faces (the big ones; the engraved numerals are
 * the small recessed bits), and writes the mesh with a per-vertex "engraved" flag so the numerals can be coloured separately,
 * the face directions, and a convex collider made from the face planes. Face values live in scripts/dice-values.json.
 */
import fs from "node:fs";
import path from "node:path";
import { ConvexHull } from "three/addons/math/ConvexHull.js";
import { Vector3 } from "three";

const dir = process.argv[2];
const OUT = path.resolve("public/dice");
const values = JSON.parse(fs.readFileSync(path.resolve("scripts/dice-values.json"), "utf8"));
// Each die is scaled to the real dice's relative sizes (insphere diameter in mm: d20 20.23, d12 20, d10 16, d8 15.35, d6 15.87), at 0.1022
// world units per mm. R is the circumradius that gives that: it was found by printing each die's size ("size (...)" below).
// The g4 is a rhombic dodecahedron, not a tetrahedron, so it takes the d4's 18.35 mm (tip to base) as its overall width.
const SPEC = { d12: { faces: 12, R: 1.2, crystal: true }, d6: { faces: 6, R: 1.263 }, d20: { faces: 20, R: 1.181 }, g4: { faces: 12, R: 0.9375 }, g8: { faces: 24, R: 0.862 }, g10: { faces: 30, R: 0.939 } };

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

function readStl(file) {
  const b = fs.readFileSync(file);
  const n = b.readUInt32LE(80);
  const map = new Map();
  const pos = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50;
    for (let k = 0; k < 3; k++) {
      const v = [b.readFloatLE(o + 12 + k * 12), b.readFloatLE(o + 16 + k * 12), b.readFloatLE(o + 20 + k * 12)];
      const key = v.map((x) => Math.round(x * 1e4)).join(",");
      let id = map.get(key);
      if (id === undefined) { id = pos.length; map.set(key, id); pos.push(v); }
      idx.push(id);
    }
  }
  return { pos, idx };
}

for (const name of Object.keys(SPEC)) {
  const { faces: N, R } = SPEC[name]; const ENG_DEPTH = () => (SPEC[name].depth ?? 0.004) * R; const ENG_EDGE = () => (SPEC[name].edge ?? 0.08) * R;
  const m = readStl(path.join(dir, `${name}.stl`));
  // Centre of mass from signed tetrahedra
  let vol = 0; const com = [0, 0, 0];
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = m.pos[m.idx[t]], b = m.pos[m.idx[t + 1]], c = m.pos[m.idx[t + 2]];
    const v = dot(a, cross(b, c)) / 6; vol += v;
    for (let k = 0; k < 3; k++) com[k] += v * (a[k] + b[k] + c[k]) / 4;
  }
  if (vol < 0) { m.idx = m.idx.map((_, i, arr) => (i % 3 === 1 ? arr[i + 1] : i % 3 === 2 ? arr[i - 1] : arr[i])); vol = -vol; for (let k = 0; k < 3; k++) com[k] *= -1; }
  for (let k = 0; k < 3; k++) com[k] /= vol;
  m.pos = m.pos.map((p) => sub(p, com));
  const maxR = Math.max(...m.pos.map((p) => Math.hypot(...p)));
  const s = R / maxR;
  m.pos = m.pos.map((p) => p.map((x) => x * s));

  // Flat faces: cluster triangles by normal, keep the N largest
  const clusters = [];
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = m.pos[m.idx[t]], b = m.pos[m.idx[t + 1]], c = m.pos[m.idx[t + 2]];
    const cr = cross(sub(b, a), sub(c, a));
    const area = Math.hypot(...cr) / 2;
    if (area < 1e-9) continue;
    const nn = [cr[0] / (2 * area), cr[1] / (2 * area), cr[2] / (2 * area)];
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    let f = clusters.find((k) => dot(k.n, nn) > 0.9995);
    if (!f) { f = { n: nn, A: 0, sn: [0, 0, 0], sh: 0 }; clusters.push(f); }
    f.A += area; f.sn = f.sn.map((x, i) => x + nn[i] * area); f.sh += dot(nn, cen) * area;
  }
  clusters.sort((a, b) => b.A - a.A);
  const faces = clusters.slice(0, N).map((c) => ({ normal: norm(c.sn), h: c.sh / c.A }));
  console.log(name, "faces", faces.length, "area ratio smallest big/largest small", (clusters[N - 1].A / clusters[N].A).toFixed(2), "h range", Math.min(...faces.map((f) => f.h)).toFixed(3), Math.max(...faces.map((f) => f.h)).toFixed(3));

  {
    // Insphere diameter: the distance across two opposite faces (the d4 is measured tip to base), for checking sizes against real dice
    const dots = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const sums = []; faces.forEach((f, i) => { const j = faces.findIndex((g) => dots(g.normal, f.normal) < -0.98); if (j > i) sums.push(f.h + faces[j].h); });
    let diam = sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : 2 * faces.reduce((a, f) => a + f.h, 0) / faces.length;
    let note = sums.length ? "opposite faces" : "mean inradius x2";
    if (name === "g4") note += `, overall width ${(2 * R).toFixed(2)}`;
    console.log("  size (" + note + ")", diam.toFixed(3), "world units");
  }
  // Numerals: each face's flat top is one big connected patch; the floors of the engraved numerals are small separate patches
  // with the same normal (they only meet the top through the numeral's walls). Mark every vertex on such a floor.
  const T = m.idx.length / 3;
  const triFace = new Int16Array(T).fill(-1);
  for (let t = 0; t < T; t++) {
    const a = m.pos[m.idx[t * 3]], b = m.pos[m.idx[t * 3 + 1]], c = m.pos[m.idx[t * 3 + 2]];
    const cr = cross(sub(b, a), sub(c, a)); const l = Math.hypot(...cr); if (l < 1e-12) continue;
    const nn = [cr[0] / l, cr[1] / l, cr[2] / l];
    faces.forEach((f, k) => { if (dot(f.normal, nn) > 0.9995 && triFace[t] < 0) triFace[t] = k; });
  }
  const edgeTris = new Map();
  for (let t = 0; t < T; t++) for (let e = 0; e < 3; e++) {
    const u = m.idx[t * 3 + e], v = m.idx[t * 3 + (e + 1) % 3]; const key = u < v ? `${u}_${v}` : `${v}_${u}`;
    (edgeTris.get(key) ?? edgeTris.set(key, []).get(key)).push(t);
  }
  const comp = new Int32Array(T).fill(-1); const compInfo = [];
  for (let t = 0; t < T; t++) {
    if (triFace[t] < 0 || comp[t] >= 0) continue;
    const id = compInfo.length; const info = { face: triFace[t], tris: [], area: 0 }; compInfo.push(info);
    const stack = [t]; comp[t] = id;
    while (stack.length) {
      const q = stack.pop(); info.tris.push(q);
      const a = m.pos[m.idx[q * 3]], b = m.pos[m.idx[q * 3 + 1]], c = m.pos[m.idx[q * 3 + 2]];
      info.area += Math.hypot(...cross(sub(b, a), sub(c, a))) / 2;
      for (let e = 0; e < 3; e++) {
        const u = m.idx[q * 3 + e], v = m.idx[q * 3 + (e + 1) % 3]; const key = u < v ? `${u}_${v}` : `${v}_${u}`;
        for (const r of edgeTris.get(key)) if (comp[r] < 0 && triFace[r] === info.face) { comp[r] = id; stack.push(r); }
      }
    }
  }
  const top = new Map(); // face -> its biggest patch
  compInfo.forEach((c, i) => { if (!top.has(c.face) || compInfo[top.get(c.face)].area < c.area) top.set(c.face, i); });
  const eng = new Float32Array(m.pos.length);
  const owner = new Int16Array(m.pos.length);
  const planeH = faces.map((f, k) => { const c = compInfo[top.get(k)]; let sh = 0, sa = 0; c.tris.forEach((t) => { for (let e = 0; e < 3; e++) { sh += dot(f.normal, m.pos[m.idx[t * 3 + e]]); sa++; } }); return sh / sa; });
  const depthOf = (c) => { let sd = 0, n = 0; c.tris.forEach((t) => { for (let e = 0; e < 3; e++) { sd += planeH[c.face] - dot(faces[c.face].normal, m.pos[m.idx[t * 3 + e]]); n++; } }); return sd / n; };
  const cenOf = (c) => { const q = [0, 0, 0]; let n = 0; c.tris.forEach((t) => { for (let e = 0; e < 3; e++) { const p = m.pos[m.idx[t * 3 + e]]; q[0] += p[0]; q[1] += p[1]; q[2] += p[2]; n++; } }); return q.map((x) => x / n); };
  const topCen = faces.map((_, k) => cenOf(compInfo[top.get(k)]));
  const topRad = faces.map((_, k) => Math.sqrt(compInfo[top.get(k)].area / Math.PI));
  compInfo.forEach((c, i) => { c.sunk = top.get(c.face) !== i && depthOf(c) > (Number(process.env.DEPTH) || SPEC[name].depth || 0.002) * R && Math.hypot(...sub(cenOf(c), topCen[c.face])) < 0.8 * topRad[c.face]; });
  compInfo.forEach((c, i) => { if (c.sunk) c.tris.forEach((t) => { for (let e = 0; e < 3; e++) { eng[m.idx[t * 3 + e]] = 1; owner[m.idx[t * 3 + e]] = c.face; } }); });
  const patches = new Array(faces.length).fill(0); compInfo.forEach((c) => { if (c.sunk) patches[c.face]++; });
  if (process.env.COMPS) console.log("  comps", faces.map((_, k) => k + ":" + compInfo.filter((c) => c.face === k).map((c) => c.area.toFixed(3) + (c.sunk ? "S" : "") + "d" + depthOf(c).toFixed(3)).join("/")).join(" "));
  console.log("  engraved vertices", eng.reduce((a, b) => a + b, 0), "of", m.pos.length, "| numeral patches per face", patches.join(","));

  // Collider: corners where three face planes meet and no plane cuts them off
  const verts = [];
  for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length; j++) for (let k = j + 1; k < faces.length; k++) {
    const n1 = faces[i].normal, n2 = faces[j].normal, n3 = faces[k].normal;
    const det = dot(n1, cross(n2, n3));
    if (Math.abs(det) < 1e-4) continue;
    const c23 = cross(n2, n3), c31 = cross(n3, n1), c12 = cross(n1, n2);
    const p = [0, 1, 2].map((q) => (faces[i].h * c23[q] + faces[j].h * c31[q] + faces[k].h * c12[q]) / det);
    if (faces.every((f) => dot(f.normal, p) <= f.h + 0.01)) if (!verts.some((v) => Math.hypot(...sub(v, p)) < 0.03)) verts.push(p);
  }
  console.log("  collider corners", verts.length);

  // Panels: every vertex knows its face, which kind of panel that face is (ivory, grey or orange) and how far it is inside the face's edge
  const polys = faces.map((f, k) => {
    const idxs = verts.map((v, i) => (Math.abs(dot(f.normal, v) - f.h) < 0.012 ? i : -1)).filter((i) => i >= 0);
    const ref = Math.abs(f.normal[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(f.normal, ref)); const w = cross(f.normal, u);
    const c = [0, 0, 0]; idxs.forEach((i) => { c[0] += verts[i][0] / idxs.length; c[1] += verts[i][1] / idxs.length; c[2] += verts[i][2] / idxs.length; });
    idxs.sort((a, b) => { const pa = sub(verts[a], c), pb = sub(verts[b], c); return Math.atan2(dot(pa, w), dot(pa, u)) - Math.atan2(dot(pb, w), dot(pb, u)); });
    return idxs.map((i) => verts[i]);
  });
  const faceOf = new Float32Array(m.pos.length);
  const kindOf = new Float32Array(m.pos.length);
  const edgeOf = new Float32Array(m.pos.length);
  m.pos.forEach((p, i) => {
    let best = -1e9, bk = 0;
    faces.forEach((f, k) => { const d = dot(f.normal, p) - f.h; if (d > best) { best = d; bk = k; } });
    faceOf[i] = bk;
    kindOf[i] = [0, 0, 0, 1, 2][(bk * 3 + 1) % 5]; // mostly ivory, some grey, some orange
    const poly = polys[bk]; let inward = 1e9;
    for (let e = 0; e < poly.length; e++) {
      const a = poly[e], b = poly[(e + 1) % poly.length];
      const edge = sub(b, a); const inn = norm(cross(faces[bk].normal, edge)); // points to the inside for a counter-clockwise polygon
      const d = dot(sub(p, a), inn);
      inward = Math.min(inward, d);
    }
    edgeOf[i] = inward;
  });
  // The inward direction depends on the polygon's winding: if most vertices came out negative, flip the sign
  const neg = edgeOf.reduce((n, x) => n + (x < 0 ? 1 : 0), 0);
  if (neg > m.pos.length / 2) for (let i = 0; i < edgeOf.length; i++) edgeOf[i] = 0; // fallback, replaced below
  if (neg > m.pos.length / 2) {
    m.pos.forEach((p, i) => {
      const poly = polys[faceOf[i]]; let inward = 1e9;
      for (let e = 0; e < poly.length; e++) { const a = poly[e], b = poly[(e + 1) % poly.length]; const inn = norm(cross(sub(b, a), faces[faceOf[i]].normal)); inward = Math.min(inward, dot(sub(p, a), inn)); }
      edgeOf[i] = inward;
    });
  }

  if (SPEC[name].crystal) {
    // Frosted crystal dice: split into a glass body and a numeral mesh using the convex hull (every numeral pocket is deeper than the
    // hull), and bake each glass vertex's distance to the nearest real facet edge so bevels can be polished and faces left frosted.
    const hull = new ConvexHull().setFromPoints(m.pos.map((p) => new Vector3(...p)));
    const planeMap = new Map();
    for (const f of hull.faces) {
      const k = [f.normal.x, f.normal.y, f.normal.z].map((x) => Math.round(x * 1e3)).join("|") + "|" + Math.round(f.constant * 1e3);
      if (!planeMap.has(k)) planeMap.set(k, [f.normal.x, f.normal.y, f.normal.z, f.constant]);
    }
    const planes = [...planeMap.values()];
    const minCos = Math.cos((6 * Math.PI) / 180);
    const depthU = new Float32Array(m.pos.length), edgeU = new Float32Array(m.pos.length);
    const dist = new Float32Array(planes.length);
    m.pos.forEach((p, i) => {
      let best = 0, bd = -Infinity;
      planes.forEach((pl, j) => { const d = pl[0] * p[0] + pl[1] * p[1] + pl[2] * p[2] - pl[3]; dist[j] = d; if (d > bd) { bd = d; best = j; } });
      depthU[i] = -bd;
      const nb = planes[best]; let e = 5;
      planes.forEach((pl, j) => {
        if (j === best) return;
        const cos = nb[0] * pl[0] + nb[1] * pl[1] + nb[2] * pl[2];
        if (cos > minCos) return;
        const sn = Math.sqrt(Math.max(1 - cos * cos, 1e-9));
        e = Math.min(e, -dist[j] / sn);
      });
      edgeU[i] = e;
    });
    const pocket = 0.05 * s;
    const glassP = [], glassE = [], goldP = [];
    for (let t = 0; t < m.idx.length; t += 3) {
      const tri = [m.idx[t], m.idx[t + 1], m.idx[t + 2]];
      const inPocket = tri.some((v) => depthU[v] > pocket);
      tri.forEach((v) => { if (inPocket) goldP.push(...m.pos[v]); else { glassP.push(...m.pos[v]); glassE.push(edgeU[v]); } });
    }
    console.log("  glass tris", glassP.length / 9, "numeral tris", goldP.length / 9, "hull planes", planes.length);
    const bin = Buffer.concat([Buffer.from(new Float32Array(glassP).buffer), Buffer.from(new Float32Array(glassE).buffer), Buffer.from(new Float32Array(goldP).buffer)]);
    fs.writeFileSync(path.join(OUT, `${name}.bin`), bin);
    const vals = values[name];
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({
      name, crystal: true, radius: R, glassTris: glassP.length / 9, goldTris: goldP.length / 9,
      faces: faces.map((f, i) => ({ normal: f.normal.map((x) => +x.toFixed(5)), h: +f.h.toFixed(5), value: vals ? vals[i] : 0 })),
      colliderVertices: verts.map((v) => v.map((x) => +x.toFixed(5))),
    }));
    fs.writeFileSync(`/tmp/dz/${name}.gold.json`, JSON.stringify(goldP));
    console.log("  wrote", (bin.length / 1024).toFixed(0), "KB");
    continue;
  }

  // Write the mesh
  const V = m.pos.length;
  const posBuf = new Float32Array(V * 3); m.pos.forEach((p, i) => posBuf.set(p, i * 3));
  const idxBuf = V > 65535 ? new Uint32Array(m.idx) : new Uint16Array(m.idx);
  const bin = Buffer.concat([Buffer.from(posBuf.buffer), Buffer.from(eng.buffer), Buffer.from(kindOf.buffer), Buffer.from(edgeOf.buffer), Buffer.from(idxBuf.buffer)]);
  fs.writeFileSync(path.join(OUT, `${name}.bin`), bin);
  const vals = values[name];
  const meta = {
    name, vertices: V, indices: m.idx.length, indexBytes: idxBuf.BYTES_PER_ELEMENT, radius: R,
    faces: faces.map((f, i) => ({ normal: f.normal.map((x) => +x.toFixed(5)), h: +f.h.toFixed(5), value: vals ? vals[i] : 0 })),
    colliderVertices: verts.map((v) => v.map((x) => +x.toFixed(5))),
  };
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(meta));
  fs.writeFileSync(`/tmp/dz/${name}.owner.json`, JSON.stringify(Array.from(owner)));
  console.log("  wrote", (bin.length / 1024).toFixed(0), "KB");
}

