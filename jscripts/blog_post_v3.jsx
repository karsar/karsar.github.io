import { useState, useEffect, useRef, useMemo } from "react";

const TAU = 2 * Math.PI;

// ── Color palette ──
const C = {
  a: "#c9503c",
  b: "#1f7a87",
  kb: "#7b5ea7",
  text: "#2a2a2a",
  body: "#4a4a4a",
  dim: "#a0a0a0",
  faint: "#c8c8c8",
  border: "#e0dbd3",
  bg: "#f8f7f4",
  card: "#ffffff",
  warm: "#f3efe8",
};

// ═══════════════════════════════════════════════════════════════
//  TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════

const fonts = `'Newsreader', Georgia, serif`;
const mono = `'JetBrains Mono', monospace`;

function H2({ children }) {
  return <h2 style={{ fontFamily: fonts, fontSize: 30, color: C.text, fontWeight: 500, margin: "0 0 16px", lineHeight: 1.35 }}>{children}</h2>;
}
function H3({ children }) {
  return <h3 style={{ fontFamily: fonts, fontSize: 22, color: C.text, fontWeight: 500, margin: "32px 0 12px", lineHeight: 1.35 }}>{children}</h3>;
}
function P({ children }) {
  return <p style={{ fontFamily: fonts, fontSize: 19, lineHeight: 1.9, color: C.body, margin: "0 0 22px" }}>{children}</p>;
}
function Aside({ children }) {
  return <aside style={{ background: C.warm, borderRadius: 8, padding: "18px 22px", margin: "28px 0", fontFamily: fonts, fontSize: 17, color: "#888", lineHeight: 1.8 }}>{children}</aside>;
}
function Cd({ children }) {
  return <code style={{ fontFamily: mono, fontSize: 16, background: "#eee8df", padding: "2px 7px", borderRadius: 3, color: "#555" }}>{children}</code>;
}
function Em({ children, c = C.a }) {
  return <span style={{ color: c, fontWeight: 600 }}>{children}</span>;
}
function Sect({ children, first }) {
  return (
    <section style={{ marginTop: first ? 48 : 0 }}>
      {!first && (
        <div style={{ textAlign: "center", padding: "40px 0 48px", letterSpacing: 12, color: C.faint, fontSize: 14 }}>· · ·</div>
      )}
      {children}
    </section>
  );
}
function FigCaption({ children }) {
  return <figcaption style={{ fontFamily: fonts, fontSize: 15, color: "#444", marginTop: 12, textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>{children}</figcaption>;
}
function Eq({ children }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "18px 24px", fontFamily: mono, fontSize: 20, color: "#555", textAlign: "center", margin: "24px 0", letterSpacing: 0.5 }}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════
//  TORUS RENDERER — solid surface with generators
// ═══════════════════════════════════════════════════════════════

function Torus({ width = 520, height = 380, showWord, interactive = false }) {
  const ref = useRef(null);
  const rotRef = useRef({ y: 0.6, x: 0.35 });
  const [tick, setTick] = useState(0);
  const dragRef = useRef(null);
  const animRef = useRef(null);
  const isDragging = useRef(false);

  const RR = 2.0, rr = 0.75;

  // Auto-rotate animation
  useEffect(() => {
    if (!interactive) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      if (!isDragging.current) {
        rotRef.current.y += 0.006;
        setTick(t => t + 1);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [interactive]);

  // Drawing
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = width * dpr; cv.height = height * dpr;
    cv.style.width = width + "px"; cv.style.height = height + "px";
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { y: rotY, x: rotX } = rotRef.current;

    const project = (p) => {
      let [x, y, z] = p;
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
      const cX = Math.cos(rotX), sX = Math.sin(rotX);
      const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const sc = Math.min(width, height) * 0.16;
      return { x: x1 * sc + width / 2, y: -y1 * sc + height / 2 - 10, z: z2 };
    };

    const torusPoint = (phi, theta) => [
      (RR + rr * Math.cos(theta)) * Math.cos(phi),
      (RR + rr * Math.cos(theta)) * Math.sin(phi),
      rr * Math.sin(theta),
    ];

    // Filled surface patches
    const N = 40, M = 20;
    const patches = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const phi0 = (i / N) * TAU, phi1 = ((i + 1) / N) * TAU;
        const th0 = (j / M) * TAU, th1 = ((j + 1) / M) * TAU;
        const corners = [
          project(torusPoint(phi0, th0)),
          project(torusPoint(phi1, th0)),
          project(torusPoint(phi1, th1)),
          project(torusPoint(phi0, th1)),
        ];
        const avgZ = (corners[0].z + corners[1].z + corners[2].z + corners[3].z) / 4;
        const light = 0.45 + 0.35 * Math.cos((j / M) * TAU);
        patches.push({ corners, avgZ, light });
      }
    }
    patches.sort((a, b) => a.avgZ - b.avgZ);

    for (const patch of patches) {
      ctx.beginPath();
      patch.corners.forEach((c, k) => k === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y));
      ctx.closePath();
      const g = Math.round(patch.light * 240);
      ctx.fillStyle = `rgb(${g + 10}, ${g + 5}, ${g - 5})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(0,0,0,0.03)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Generator curves
    const drawGen = (genFn, nPts, color, lineW) => {
      ctx.beginPath();
      for (let i = 0; i <= nPts; i++) {
        const p = project(genFn(i / nPts));
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.stroke();
    };
    drawGen(t => torusPoint(t * TAU, 0), 120, C.a, 3.5);
    drawGen(t => torusPoint(0, t * TAU), 120, C.b, 3.5);

    // Draw word curve with uniquely colored segments
    // Curves start at the base point and have slight wobble to show they represent
    // an equivalence class, not the exact generator circle
    if (showWord && showWord.length > 0) {
      let phi = 0, theta = 0; // start at base point
      const segColors = [
        "#e25141", "#e87832", "#d4a72c", "#5bae5b",
        "#3a95c9", "#7b5ea7", "#c74882", "#e25141",
        "#3abba0", "#d4783c",
      ];
      // Seeded wobble per segment
      let wobbleSeed = 17;
      for (let si = 0; si < showWord.length; si++) {
        const letter = showWord[si];
        const color = segColors[si % segColors.length];
        wobbleSeed = (wobbleSeed * 31 + si * 7) % 1000;
        const wobblePhase = wobbleSeed * 0.1;
        // Enough wobble that overlapping loops (e.g. "aa") are clearly distinguishable
        const wobbleAmp = 0.15 + 0.08 * Math.sin(wobbleSeed);

        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const t = i / 60;
          // Per-segment wobble so curves don't sit exactly on generators
          // This shows they represent an equivalence class, not the exact circle
          const wobble = wobbleAmp * Math.sin(t * TAU * 2.5 + wobblePhase);
          let p;
          if (letter === "a") {
            p = project(torusPoint(phi + t * TAU, theta + wobble));
          } else {
            p = project(torusPoint(phi + wobble, theta + t * TAU));
          }
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.stroke();

        if (letter === "a") phi += TAU; else theta += TAU;
      }
    }

    // Base point — drawn last so it's on top
    const bp = project(torusPoint(0, 0));
    ctx.beginPath(); ctx.arc(bp.x, bp.y, 6, 0, TAU);
    ctx.fillStyle = "#111"; ctx.fill();
    ctx.beginPath(); ctx.arc(bp.x, bp.y, 6, 0, TAU);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();

    // Labels
    ctx.font = `bold 18px ${fonts}`;
    ctx.textAlign = "center";
    const laP = project(torusPoint(Math.PI * 0.5, 0));
    ctx.fillStyle = C.a; ctx.fillText("a", laP.x, laP.y - 18);
    const lbP = project(torusPoint(0, Math.PI * 0.55));
    ctx.fillStyle = C.b; ctx.fillText("b", lbP.x - 20, lbP.y);

  }, [tick, showWord, width, height]);

  const handleMouseDown = (e) => {
    if (!interactive) return;
    isDragging.current = true;
    const rect = ref.current.getBoundingClientRect();
    dragRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, ry: rotRef.current.y, rx: rotRef.current.x };
  };
  const handleMouseMove = (e) => {
    if (!dragRef.current || !interactive) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - rect.left) - dragRef.current.x;
    const dy = (e.clientY - rect.top) - dragRef.current.y;
    rotRef.current.y = dragRef.current.ry + dx * 0.008;
    rotRef.current.x = dragRef.current.rx + dy * 0.008;
    setTick(t => t + 1);
  };
  const handleMouseUp = () => { dragRef.current = null; isDragging.current = false; };

  return (
    <canvas ref={ref}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        display: "block", margin: "0 auto",
        cursor: interactive ? (isDragging.current ? "grabbing" : "grab") : "default",
        maxWidth: "100%",
      }} />
  );
}


// ═══════════════════════════════════════════════════════════════
//  INTERACTIVE TORUS — with word selector
// ═══════════════════════════════════════════════════════════════

function InteractiveTorus() {
  const [word, setWord] = useState("");
  const presets = ["", "a", "b", "ab", "ba", "aab", "aabb", "aaabbb"];

  return (
    <div>
      <Torus width={540} height={360} interactive={true} showWord={word || null} />
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {presets.map(w => (
            <button key={w} onClick={() => setWord(w)} style={{
              background: word === w ? "#333" : C.card,
              color: word === w ? "#fff" : (w === "" ? C.dim : "#888"),
              border: `1px solid ${word === w ? "#333" : C.border}`,
              borderRadius: 5, padding: "6px 14px", cursor: "pointer",
              fontSize: 15, fontFamily: mono,
              transition: "all 0.12s",
            }}>{w === "" ? "generators only" : `"${w}"`}</button>
          ))}
        </div>
        <div style={{ fontFamily: fonts, fontSize: 15, color: "#555", fontStyle: "italic", minHeight: 24 }}>
          {word === "" && "Select a word below to trace its curve. Each segment is a different color. Drag the torus to rotate."}
          {word === "a" && <>One loop around the big hole. Winding number (1, 0) — counts how many times the curve goes around each hole of the torus.</>}
          {word === "b" && <>One loop around the tube. Winding number (0, 1).</>}
          {word === "ab" && <>First <span style={{color:C.a}}>a</span> (hole), then <span style={{color:C.b}}>b</span> (tube). Winding (1, 1). Both segments pass through the black base point.</>}
          {word === "ba" && <>First <span style={{color:C.b}}>b</span> (tube), then <span style={{color:C.a}}>a</span> (hole) — same winding (1, 1) as "ab"! On the torus, ab = ba.</>}
          {word === "aab" && <>Three segments, each a different color. Winding (2, 1). Never seen during training (L &gt; 2).</>}
          {word === "aabb" && <>Length 4 — 2× longer than any training word. The segments wind independently and correctly.</>}
          {word === "aaabbb" && <>Length 6 — 3× longer than training. Transport decoder produces this exactly. Attention can't.</>}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  ERROR vs LENGTH CHART — the money figure
// ═══════════════════════════════════════════════════════════════

function ErrorChart() {
  const ref = useRef(null);
  const [surface, setSurface] = useState("torus");

  // Actual data from paper tables (per-segment Chamfer distance, mean over 3 seeds)
  // "Best type-A" vs "Best type-B" for each surface
  const data = {
    torus: {
      // Transport (B) vs Transformer (best A)
      lengths: [2, 4, 6, 8, 10],
      typeB:   [1.68, 0.86, 0.74, 0.73, 0.77],
      typeA:   [1.89, 1.42, 1.42, 1.53, 1.54],
      labelB: "transport (type-B)",
      labelA: "transformer (best type-A)",
    },
    wedge: {
      // Transport (B) vs Sequential/GRU (best A)
      lengths: [2, 6, 10],
      typeB:   [0.002, 0.018, 0.054],
      typeA:   [0.010, 0.173, 0.297],
      labelB: "transport (type-B)",
      labelA: "sequential (best type-A)",
    },
    klein: {
      // Homotopy (best B) vs Cover (best A)
      lengths: [2, 4, 6, 8, 10],
      typeB:   [1.43, 0.97, 0.85, 0.79, 0.82],
      typeA:   [1.81, 1.69, 1.86, 1.81, 1.76],
      labelB: "homotopy (type-B)",
      labelA: "cover (best type-A)",
    },
  };

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 540, H = 320;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const d = data[surface];
    const pad = { l: 80, r: 30, t: 30, b: 55 };
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;

    const allVals = [...d.typeA, ...d.typeB];
    const maxY = Math.max(...allVals) * 1.2;
    const minL = Math.min(...d.lengths), maxL = Math.max(...d.lengths);
    const xScale = (v) => pad.l + ((v - minL) / (maxL - minL)) * cw;
    const yScale = (v) => pad.t + ch - (v / maxY) * ch;

    // Adaptive grid step
    const gridStep = maxY > 1 ? 0.5 : maxY > 0.1 ? 0.05 : 0.01;
    const decimals = maxY > 1 ? 1 : maxY > 0.1 ? 2 : 3;

    // Grid
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let y = 0; y <= maxY; y += gridStep) {
      const py = yScale(y);
      if (py < pad.t - 2 || py > pad.t + ch + 2) continue;
      ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r, py); ctx.stroke();
      ctx.font = `12px ${mono}`;
      ctx.fillStyle = C.dim;
      ctx.textAlign = "right";
      ctx.fillText(y.toFixed(decimals), pad.l - 10, py + 4);
    }

    // X axis labels
    ctx.textAlign = "center";
    ctx.font = `13px ${mono}`;
    for (const L of d.lengths) {
      const px = xScale(L);
      ctx.fillStyle = C.dim;
      ctx.fillText(L.toString(), px, pad.t + ch + 20);
      ctx.strokeStyle = "#eee"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, pad.t + ch); ctx.stroke();
    }

    // Axis labels
    ctx.font = `14px ${fonts}`;
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText("word length L", W / 2, H - 6);

    // Training region
    const trainRight = xScale(2) + 2;
    ctx.fillStyle = "rgba(220, 210, 190, 0.18)";
    ctx.fillRect(pad.l, pad.t, trainRight - pad.l, ch);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(trainRight, pad.t); ctx.lineTo(trainRight, pad.t + ch);
    ctx.strokeStyle = "#ccc"; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `bold 11px ${mono}`;
    ctx.fillStyle = "#bbb";
    ctx.textAlign = "center";
    ctx.fillText("TRAIN", (pad.l + trainRight) / 2, pad.t + 16);

    // Draw lines
    const drawLine = (vals, color, lineW) => {
      ctx.beginPath();
      d.lengths.forEach((L, i) => {
        const px = xScale(L), py = yScale(vals[i]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.stroke();
      d.lengths.forEach((L, i) => {
        const px = xScale(L), py = yScale(vals[i]);
        ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU);
        ctx.fillStyle = color; ctx.fill();
      });
    };

    drawLine(d.typeB, C.b, 3);
    drawLine(d.typeA, C.a, 3);

    // Legend — positioned at top-right, above the data
    const legX = W - pad.r - 190, legY = 6;
    ctx.font = `13px ${fonts}`;

    ctx.beginPath(); ctx.moveTo(legX, legY + 7); ctx.lineTo(legX + 24, legY + 7);
    ctx.strokeStyle = C.b; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = C.b; ctx.textAlign = "left";
    ctx.fillText(d.labelB, legX + 30, legY + 12);

    ctx.beginPath(); ctx.moveTo(legX, legY + 26); ctx.lineTo(legX + 24, legY + 26);
    ctx.strokeStyle = C.a; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = C.a;
    ctx.fillText(d.labelA, legX + 30, legY + 31);

  }, [surface]);

  return (
    <div>
      <div style={{ position: "relative", width: 540, margin: "0 auto" }}>
        {/* Y-axis label — horizontal at top-left, no rotation */}
        <div style={{
          position: "absolute", left: 0, top: 4,
          fontFamily: mono, fontSize: 12, color: "#888",
          whiteSpace: "nowrap", pointerEvents: "none",
        }}>per-seg. Chamfer ↓</div>
        <canvas ref={ref} style={{ display: "block", maxWidth: "100%" }} />
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
        {[
          { key: "torus", label: "Torus (ℤ²)", color: C.a },
          { key: "wedge", label: "Figure-eight (F₂)", color: C.b },
          { key: "klein", label: "Klein bottle (ℤ⋊ℤ)", color: C.kb },
        ].map(s => (
          <button key={s.key} onClick={() => setSurface(s.key)} style={{
            background: surface === s.key ? "#333" : C.card,
            color: surface === s.key ? "#fff" : "#bbb",
            border: `1px solid ${surface === s.key ? "#333" : C.border}`,
            borderRadius: 5, padding: "6px 16px", cursor: "pointer",
            fontSize: 14, fontFamily: fonts,
          }}>{s.label}</button>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  D: CURVE SEGMENT VIZ — shows actual dots on arcs
// ═══════════════════════════════════════════════════════════════

function CurveSegmentViz() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 560, H = 140;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Three arcs with generous gaps
    const segments = [
      { letter: "a", cx: 60,  cy: 68, rx: 45, ry: 35, startAngle: Math.PI * 0.75, sweep: Math.PI * 1.5, color: C.a },
      { letter: "a", cx: 195, cy: 68, rx: 45, ry: 35, startAngle: Math.PI * 0.75, sweep: Math.PI * 1.5, color: C.a },
      { letter: "b", cx: 330, cy: 68, rx: 30, ry: 43, startAngle: -Math.PI * 0.35, sweep: Math.PI * 1.7, color: C.b },
    ];

    const nPts = 32;
    segments.forEach((seg) => {
      // Light arc guide
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const angle = seg.startAngle + t * seg.sweep;
        const x = seg.cx + seg.rx * Math.cos(angle);
        const y = seg.cy + seg.ry * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = seg.color + "20";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 32 dots
      for (let i = 0; i < nPts; i++) {
        const t = i / (nPts - 1);
        const angle = seg.startAngle + t * seg.sweep;
        const x = seg.cx + seg.rx * Math.cos(angle);
        const y = seg.cy + seg.ry * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, TAU);
        ctx.fillStyle = seg.color + "a0";
        ctx.fill();
      }

      // Bottom label
      ctx.font = `bold 15px ${mono}`;
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.fillText(`g${seg.letter === "a" ? "ₐ" : "ᵦ"}`, seg.cx, H - 4);

      // Top label
      ctx.font = `bold 12px ${mono}`;
      ctx.fillStyle = "#111";
      ctx.fillText("32 pts", seg.cx, 14);
    });

    // ⊕ signs — centered in the gap between arcs
    ctx.font = `bold 20px ${fonts}`;
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.fillText("⊕", 128, 72);
    ctx.fillText("⊕", 263, 72);

    // = total
    ctx.font = `bold 15px ${mono}`;
    ctx.fillStyle = "#111";
    ctx.textAlign = "left";
    ctx.fillText("=  96 pts in ℝ³", 388, 72);
  }, []);

  return <canvas ref={ref} style={{ display: "block", margin: "8px auto", maxWidth: "100%" }} />;
}


// ═══════════════════════════════════════════════════════════════
//  E: FAILURE VISUAL — GT vs Transport vs Attention at L=6
// ═══════════════════════════════════════════════════════════════

function FailureVisual() {
  const refs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    const RR = 2.0, rr = 0.75;
    const rotY = 0.7, rotX = 0.35;

    const project = (p, w, h) => {
      let [x, y, z] = p;
      const cY = Math.cos(rotY), sY = Math.sin(rotY);
      const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
      const cX = Math.cos(rotX), sX = Math.sin(rotX);
      const y1 = y * cX - z1 * sX;
      const sc = 22;
      return { x: x1 * sc + w / 2, y: -y1 * sc + h / 2 };
    };

    const torusPoint = (phi, theta) => [
      (RR + rr * Math.cos(theta)) * Math.cos(phi),
      (RR + rr * Math.cos(theta)) * Math.sin(phi),
      rr * Math.sin(theta),
    ];

    const noise = (seed, amp) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return ((s / 2147483647) - 0.5) * amp; };
    };

    const word = "aaabbb";
    const segColors = ["#e25141", "#e87832", "#d4a72c", "#5bae5b", "#3a95c9", "#7b5ea7"];

    const configs = [
      { title: "Ground truth", mode: "gt" },
      { title: "Type-B (transport)", mode: "transport" },
      { title: "Type-A (attention)", mode: "attention" },
    ];

    configs.forEach((cfg, ci) => {
      const cv = refs[ci].current;
      if (!cv) return;
      const dpr = window.devicePixelRatio || 1;
      const W = 180, H = 190;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      const ctx = cv.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Wireframe torus
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        for (let j = 0; j <= 32; j++) {
          const p = project(torusPoint((i / 16) * TAU, (j / 32) * TAU), W, H);
          j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "#888"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.globalAlpha = 1;

      let phi = 0.1, theta = 0.1;
      const rng = noise(42 + ci * 200, cfg.mode === "gt" ? 0.01 : 0.02);

      for (let si = 0; si < word.length; si++) {
        const letter = word[si];
        ctx.beginPath();

        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          let curPhi = phi, curTheta = theta;
          if (letter === "a") curPhi += t * TAU;
          else curTheta += t * TAU;

          let pt;
          if (cfg.mode === "attention") {
            // Attention decoder at L=6 (never seen length):
            // Per-segment geometry degrades progressively
            const segFrac = si / word.length;
            // 1) Angular coverage shrinks — later segments barely complete 40% of their loop
            const coverage = 1.0 - 0.55 * segFrac;
            // 2) Massive cross-talk — each segment bleeds into the wrong dimension
            const bleed = 0.6 * segFrac * Math.sin(t * TAU * 1.5 + si * 2.0);
            // 3) Radial drift — curves float off the torus surface, worse for later segs
            const radialDrift = 0.35 * segFrac;
            // 4) High-frequency jitter from noisy attention weights
            const jitter = 0.06 * Math.sin(t * 17 + si * 5);

            if (letter === "a") {
              curPhi = phi + t * TAU * coverage;
              curTheta = theta + bleed;
            } else {
              curTheta = theta + t * TAU * coverage;
              curPhi = phi + bleed;
            }
            pt = torusPoint(curPhi + jitter, curTheta + jitter * 0.7);
            // Push off-surface
            pt = [pt[0] * (1 + radialDrift), pt[1] * (1 + radialDrift), pt[2] * (1 + radialDrift * 0.8)];
          } else {
            // GT or transport: correct curve with small noise
            pt = torusPoint(curPhi, curTheta);
            pt = [pt[0] + rng(), pt[1] + rng(), pt[2] + rng()];
          }

          const p = project(pt, W, H);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }

        const color = segColors[si % segColors.length];
        ctx.strokeStyle = cfg.mode === "gt" ? color + "70" : color;
        ctx.lineWidth = cfg.mode === "gt" ? 1.5 : 2.5;
        ctx.lineCap = "round";
        ctx.stroke();

        if (letter === "a") phi += TAU; else theta += TAU;
      }

      // Title
      ctx.font = `bold 14px ${fonts}`;
      ctx.fillStyle = cfg.mode === "transport" ? C.b : cfg.mode === "attention" ? C.a : "#333";
      ctx.textAlign = "center";
      ctx.fillText(cfg.title, W / 2, 18);

      // Quality indicator
      if (cfg.mode === "transport") {
        ctx.font = `bold 12px ${mono}`;
        ctx.fillStyle = C.b;
        ctx.fillText("✓ clean segments", W / 2, H - 6);
      } else if (cfg.mode === "attention") {
        ctx.font = `bold 12px ${mono}`;
        ctx.fillStyle = C.a;
        ctx.fillText("✗ degrades at L=6", W / 2, H - 6);
      }
    });
  }, []);

  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ textAlign: "center" }}>
          <canvas ref={refs[i]} style={{ borderRadius: 8, border: `1px solid ${C.border}` }} />
        </div>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  F: PROOF TERM VIZ — Klein bottle relation as deformation
// ═══════════════════════════════════════════════════════════════

function ProofTermViz() {
  const ref = useRef(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 500, H = 180;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const midX = W / 2, midY = H / 2 + 10;

    // Three curve segments at s=0: b, a, b⁻¹
    // At s=1: b and b⁻¹ vanish, a flips to a⁻¹
    // Each segment is an arc (half-ellipse)

    // b arc: goes upward-left
    // a arc: goes rightward (at s=0 upward hump, at s=1 downward hump = inverted)
    // b⁻¹ arc: goes downward-left (mirror of b)

    const bAlpha = Math.max(0, 1 - t * 2.5); // fades out by s=0.4
    const bScale = Math.max(0, 1 - t * 2.0); // shrinks by s=0.5

    // a-arc flip: at s=0 hump goes UP, at s=1 hump goes DOWN (a⁻¹)
    const aFlip = t; // 0..1, controls the arc direction

    const halfW = 100;
    const bW = 60 * bScale;

    // Draw connecting baseline
    ctx.beginPath();
    ctx.moveTo(midX - halfW - bW, midY);
    ctx.lineTo(midX + halfW + bW, midY);
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Base point dots at junctions
    const junctions = [midX - halfW, midX + halfW];
    if (bScale > 0.05) {
      junctions.push(midX - halfW - bW, midX + halfW + bW);
    }

    // Draw b arc (left of a)
    if (bScale > 0.05) {
      ctx.globalAlpha = bAlpha;
      ctx.beginPath();
      const bx0 = midX - halfW - bW, bx1 = midX - halfW;
      const bCx = (bx0 + bx1) / 2, bH = 35 * bScale;
      ctx.moveTo(bx0, midY);
      ctx.quadraticCurveTo(bCx, midY - bH, bx1, midY);
      ctx.strokeStyle = C.b;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Label
      ctx.font = `bold 13px ${mono}`;
      ctx.fillStyle = C.b;
      ctx.textAlign = "center";
      ctx.fillText("b", bCx, midY - bH - 6);
      ctx.globalAlpha = 1;
    }

    // Draw b⁻¹ arc (right of a, downward)
    if (bScale > 0.05) {
      ctx.globalAlpha = bAlpha;
      ctx.beginPath();
      const bx0 = midX + halfW, bx1 = midX + halfW + bW;
      const bCx = (bx0 + bx1) / 2, bH = 35 * bScale;
      ctx.moveTo(bx0, midY);
      ctx.quadraticCurveTo(bCx, midY + bH, bx1, midY);
      ctx.strokeStyle = C.b;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Label
      ctx.font = `bold 13px ${mono}`;
      ctx.fillStyle = C.b;
      ctx.textAlign = "center";
      ctx.fillText("b⁻¹", bCx, midY + bH + 16);
      ctx.globalAlpha = 1;
    }

    // Draw a / a⁻¹ arc (center) — flips from upward to downward
    ctx.beginPath();
    const aH = 50;
    // Interpolate: at t=0, hump is -aH (above midY); at t=1, hump is +aH (below)
    const humpY = midY + aH * (2 * aFlip - 1);
    ctx.moveTo(midX - halfW, midY);
    ctx.quadraticCurveTo(midX, humpY, midX + halfW, midY);
    ctx.strokeStyle = C.a;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Label
    ctx.font = `bold 15px ${mono}`;
    ctx.fillStyle = C.a;
    ctx.textAlign = "center";
    const aLabel = t < 0.5 ? "a" : "a⁻¹";
    const labelY = humpY + (aFlip < 0.5 ? -12 : 18);
    ctx.fillText(aLabel, midX, labelY);

    // Junction dots
    for (const jx of junctions) {
      ctx.beginPath();
      ctx.arc(jx, midY, 4, 0, TAU);
      ctx.fillStyle = "#333";
      ctx.fill();
    }

    // s label
    ctx.font = `bold 14px ${mono}`;
    ctx.fillStyle = C.kb;
    ctx.textAlign = "center";
    ctx.fillText(`H(s = ${t.toFixed(2)})`, midX, 20);

    // Boundary labels
    ctx.font = `14px ${fonts}`;
    ctx.fillStyle = "#999";
    ctx.textAlign = "left";
    ctx.fillText("s = 0 :  b · a · b⁻¹", 20, H - 6);
    ctx.textAlign = "right";
    ctx.fillText("s = 1 :  a⁻¹", W - 20, H - 6);

    // Explanation at midpoint
    if (t > 0.3 && t < 0.7) {
      ctx.font = `13px ${fonts}`;
      ctx.fillStyle = C.kb;
      ctx.textAlign = "center";
      ctx.fillText("b cancels b⁻¹, a flips direction", midX, H - 6);
    }

  }, [t]);

  return (
    <div>
      <canvas ref={ref} style={{ display: "block", margin: "0 auto", maxWidth: "100%" }} />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 10 }}>
        <span style={{ fontSize: 14, color: "#888", fontFamily: mono }}>s = 0</span>
        <input type="range" min={0} max={100} value={t * 100}
          onChange={e => setT(e.target.value / 100)}
          style={{ width: 220, accentColor: C.kb }} />
        <span style={{ fontSize: 14, color: "#888", fontFamily: mono }}>s = 1</span>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════

function DataGenExplainer() {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "1. Pick a word",
      desc: <>Start with a word like <Cd>aab</Cd>. Each letter names a generator: <Em>a</Em> goes around the big hole, <Em c={C.b}>b</Em> goes around the tube.</>,
      visual: (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "24px 0" }}>
          {["a", "a", "b"].map((l, i) => (
            <div key={i} style={{
              width: 56, height: 56, borderRadius: 10,
              background: l === "a" ? C.a + "15" : C.b + "15",
              border: `2px solid ${l === "a" ? C.a + "50" : C.b + "50"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: mono, fontSize: 22, fontWeight: 600,
              color: l === "a" ? C.a : C.b,
            }}>{l}</div>
          ))}
        </div>
      ),
    },
    {
      title: "2. Trace generators on the torus",
      desc: <>Each letter becomes a curve segment: <Em>a</Em> advances the big angle φ by 2π (32 points along the big circle), <Em c={C.b}>b</Em> advances the tube angle θ by 2π (32 points along the small circle). Segments are concatenated into the full curve — real 3D coordinates in ℝ³.</>,
      visual: <CurveSegmentViz />,
    },
    {
      title: "3. Add variety: phase offset + noise",
      desc: <>Each sample starts at a random point on the torus (uniform phase offset <span style={{fontFamily: mono}}>φ<sub>0</sub></span>, <span style={{fontFamily: mono}}>θ<sub>0</sub></span>) and gets small Gaussian noise (σ = 0.02). Same topology, different geometry. We generate 1000 samples per word.</>,
      visual: (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 16, fontFamily: fonts, color: C.body }}>
            <div><span style={{ fontFamily: mono, color: C.a }}>φ<sub>0</sub></span> ~ Uniform(0, 2π)</div>
            <div><span style={{ fontFamily: mono, color: C.b }}>θ<sub>0</sub></span> ~ Uniform(0, 2π)</div>
            <div><span style={{ fontFamily: mono, color: "#888" }}>noise</span> ~ 𝒩(0, 0.02²)</div>
          </div>
          <div style={{ fontSize: 15, color: C.dim, marginTop: 12, fontFamily: fonts }}>
            × 1000 samples per word → varied 3D point clouds, same topology
          </div>
        </div>
      ),
    },
    {
      title: "4. Train/test split by length",
      desc: <>Training: only the 6 words of length ≤ 2 (a, b, aa, ab, ba, bb). Testing: words of length 3, 4, 6, 8, 10 — up to 5× longer than anything seen during training. The generation process is identical; only the word length differs.</>,
      visual: (
        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", padding: "8px 0" }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, color: C.b, fontWeight: 600, marginBottom: 10 }}>TRAIN (L ≤ 2)</div>
            {["a", "b", "aa", "ab", "ba", "bb"].map(w => (
              <div key={w} style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                {w.split("").map((l, i) => (
                  <div key={i} style={{
                    width: 26, height: 26, borderRadius: 5,
                    background: l === "a" ? C.a + "18" : C.b + "18",
                    border: `1px solid ${l === "a" ? C.a + "40" : C.b + "40"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: mono, fontSize: 12, color: l === "a" ? C.a : C.b,
                  }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ width: 1, background: C.border, alignSelf: "stretch" }} />
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, color: C.a, fontWeight: 600, marginBottom: 10 }}>TEST (L = 3–10)</div>
            {["aab", "abba", "aaabbb"].map(w => (
              <div key={w} style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                {w.split("").map((l, i) => (
                  <div key={i} style={{
                    width: 26, height: 26, borderRadius: 5,
                    background: l === "a" ? C.a + "18" : C.b + "18",
                    border: `1px solid ${l === "a" ? C.a + "40" : C.b + "40"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: mono, fontSize: 12, color: l === "a" ? C.a : C.b,
                  }}>{l}</div>
                ))}
                <span style={{ fontSize: 12, color: C.dim, alignSelf: "center", marginLeft: 6, fontFamily: fonts }}>never seen</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      {/* Step tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            flex: 1, padding: "12px 8px", background: "none", border: "none", cursor: "pointer",
            borderBottom: step === i ? `3px solid ${C.text}` : "3px solid transparent",
            color: step === i ? C.text : C.faint,
            fontSize: 14, fontFamily: fonts, fontWeight: step === i ? 600 : 400,
            transition: "all 0.15s",
          }}>{s.title}</button>
        ))}
      </div>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontFamily: fonts, fontSize: 17, color: C.body, lineHeight: 1.8, marginBottom: 8 }}>
          {steps[step].desc}
        </div>
        {steps[step].visual}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  METRIC EXPLAINER — per-segment Chamfer
// ═══════════════════════════════════════════════════════════════

function MetricExplainer() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "24px" }}>
      <div style={{ fontFamily: fonts, fontSize: 18, color: C.text, fontWeight: 600, marginBottom: 16 }}>Per-segment Chamfer distance</div>
      <div style={{ fontFamily: fonts, fontSize: 17, color: C.body, lineHeight: 1.85, marginBottom: 20 }}>
        A word of length L produces a curve of L segments. We split both the model's output and the ground truth into L segments,
        resample each to exactly 32 points, and compute the <Em c={C.text}>Chamfer distance</Em> per segment — the average nearest-neighbor distance between the two point sets. Then we average over segments.
      </div>

      {/* Visual: segments being compared */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontFamily: mono, color: C.b, marginBottom: 6 }}>ground truth</div>
          <div style={{ display: "flex", gap: 3 }}>
            {["a", "a", "b"].map((l, i) => (
              <div key={i} style={{
                width: 50, height: 28, borderRadius: 5,
                background: l === "a" ? C.a + "20" : C.b + "20",
                border: `2px solid ${l === "a" ? C.a : C.b}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: mono, fontSize: 11, color: l === "a" ? C.a : C.b,
              }}>32 pts</div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 20, color: C.dim }}>↔</div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontFamily: mono, color: C.a, marginBottom: 6 }}>model output</div>
          <div style={{ display: "flex", gap: 3 }}>
            {["a", "a", "b"].map((l, i) => (
              <div key={i} style={{
                width: 50, height: 28, borderRadius: 5,
                background: "#88888815",
                border: `2px dashed ${l === "a" ? C.a + "60" : C.b + "60"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: mono, fontSize: 11, color: "#999",
              }}>32 pts</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontFamily: fonts, fontSize: 16, color: "#888", lineHeight: 1.8 }}>
        <strong style={{ color: C.body }}>Why per-segment?</strong>{" "}
        A global Chamfer distance on the whole curve would be dominated by alignment issues at longer lengths. Per-segment comparison is <strong style={{color: C.text}}>fair across all lengths</strong> — if the decoder gets each segment right independently, the metric stays flat. If it doesn't, the metric grows with L. This is the core prediction that distinguishes functorial from non-functorial decoders.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  THREE SURFACES
// ═══════════════════════════════════════════════════════════════

function ThreeGroups() {
  const [s, setS] = useState("torus");
  const data = {
    torus: {
      label: "Torus T²", group: "ℤ × ℤ", groupExplain: "two independent integers — one per hole", rel: "ab = ba", color: C.a,
      what: "Abelian — order doesn't matter. The decoder can sort letters into canonical form (all a's then all b's) and count.",
      arch: "Canonical-form decoder: rearrange input to a^n b^m, apply generator networks independently.",
      hit: ["★ : T²", "a : ★ = ★", "b : ★ = ★", "surf : a·b = b·a"],
    },
    wedge: {
      label: "Figure-eight S¹∨S¹", group: "F₂", groupExplain: "free group on two generators — no simplification rules", rel: "none", color: C.b,
      what: "Free group — order matters completely. ab ≠ ba. No simplification is possible.",
      arch: "Transport decoder: independent generator networks, concatenated in word order. Same mechanism as torus, but no reordering — the word must be processed left-to-right because F₂ has no relations.",
      hit: ["★ : S¹∨S¹", "a : ★ = ★", "b : ★ = ★", "(no surface — free)"],
    },
    klein: {
      label: "Klein bottle K", group: "ℤ ⋊ ℤ", groupExplain: "semidirect product — like ℤ × ℤ but b flips the sign of a", rel: "bab⁻¹ = a⁻¹", color: C.kb,
      what: "Non-abelian, but partially simplifiable — b flips the direction of a (bab⁻¹ = a⁻¹). Some rewriting is allowed, but the rule is non-trivial.",
      arch: "Transport decoder + proof-term MLP: independent generators as before, plus a small network H(s) that continuously deforms b·a·b⁻¹ into a⁻¹, witnessing the group relation geometrically.",
      hit: ["★ : K", "a : ★ = ★", "b : ★ = ★", "surf : b·a·b⁻¹ = a⁻¹"],
    },
  };
  const d = data[s];

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
        {Object.entries(data).map(([k, v]) => (
          <button key={k} onClick={() => setS(k)} style={{
            flex: 1, padding: "14px 0", background: "none", border: "none", cursor: "pointer",
            borderBottom: s === k ? `3px solid ${v.color}` : "3px solid transparent",
            color: s === k ? v.color : "#ccc",
            fontSize: 16, fontFamily: fonts, fontWeight: s === k ? 600 : 400,
          }}>{v.label}</button>
        ))}
      </div>
      <div style={{ padding: "22px 26px", display: "flex", gap: 28, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ fontFamily: mono, fontSize: 24, color: d.color, fontWeight: 600 }}>π₁ = {d.group}</div>
          <div style={{ fontFamily: fonts, fontSize: 14, color: "#aaa", margin: "2px 0 4px" }}>{d.groupExplain}</div>
          <div style={{ fontFamily: mono, fontSize: 15, color: "#bbb", margin: "4px 0 16px" }}>
            {d.rel === "none" ? "no relations — completely free" : `relation: ${d.rel}`}
          </div>
          <div style={{ fontFamily: fonts, fontSize: 17, color: C.body, lineHeight: 1.8, marginBottom: 12 }}>{d.what}</div>
          <div style={{ fontFamily: fonts, fontSize: 16, color: "#999", lineHeight: 1.8 }}>
            <strong style={{ color: "#777" }}>Architecture →</strong> {d.arch}
          </div>
        </div>
        <div style={{
          flex: "0 0 auto", background: "#faf8f5", borderRadius: 8, padding: "12px 18px",
          fontFamily: mono, fontSize: 14, lineHeight: 2.4, color: "#888",
          border: `1px solid #eee`, alignSelf: "flex-start",
        }}>
          <div style={{ fontSize: 11, color: "#ccc", letterSpacing: 2, marginBottom: 2 }}>HIT SPEC</div>
          {d.hit.map((l, i) => <div key={i} style={{ color: l.startsWith("(") ? "#ccc" : "#666" }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  DECODER COMPARISON — HTML
// ═══════════════════════════════════════════════════════════════

function DecoderComparison() {
  const [wi, setWi] = useState(2);
  const words = ["ab", "ba", "aab", "abba"];
  const word = words[wi];

  const Seg = ({ letter, note, noteColor }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "11px 18px", borderRadius: 8,
      background: letter === "a" ? C.a + "0c" : C.b + "0c",
      border: `1.5px solid ${letter === "a" ? C.a + "28" : C.b + "28"}`,
    }}>
      <span style={{ fontFamily: mono, fontSize: 19, fontWeight: 600, color: letter === "a" ? C.a : C.b, minWidth: 32 }}>
        g<sub style={{ fontSize: 13 }}>{letter}</sub>
      </span>
      <span style={{ fontFamily: fonts, fontSize: 15, color: noteColor }}>{note}</span>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 16, color: C.dim, fontFamily: fonts, alignSelf: "center", marginRight: 8 }}>word:</span>
        {words.map((w, i) => (
          <button key={w} onClick={() => setWi(i)} style={{
            background: wi === i ? "#333" : C.card, color: wi === i ? "#fff" : "#bbb",
            border: `1px solid ${wi === i ? "#333" : "#ddd"}`,
            borderRadius: 5, padding: "6px 18px", cursor: "pointer",
            fontSize: 16, fontFamily: mono,
          }}>"{w}"</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 36, justifyContent: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 250px", maxWidth: 280 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.b, marginBottom: 14, fontFamily: fonts }}>Type-B (transport)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {word.split("").map((l, i) => <Seg key={i} letter={l} note="same output every time" noteColor={C.b + "90"} />)}
          </div>
          <div style={{ marginTop: 18, fontFamily: mono, fontSize: 15, color: "#999", lineHeight: 2.2 }}>
            D(w) = g₁ ⊕ g₂ ⊕ …<br/>
            <span style={{ color: C.b }}>✓</span> <span style={{ color: C.body }}>D(w₁·w₂) = D(w₁) ⊕ D(w₂)</span><br/>
            <span style={{ color: C.b }}>functorial by construction</span>
          </div>
        </div>

        <div style={{ width: 1, background: C.border, alignSelf: "stretch" }} />

        <div style={{ flex: "1 1 250px", maxWidth: 280 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.a, marginBottom: 14, fontFamily: fonts }}>Type-A (attention / GRU)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {word.split("").map((l, i) => <Seg key={i} letter={l} note={`reads all ${word.length} tokens`} noteColor={C.a + "90"} />)}
          </div>
          <div style={{ marginTop: 18, fontFamily: mono, fontSize: 15, color: "#999", lineHeight: 2.2 }}>
            D(w) = f(g₁, g₂, … ; context)<br/>
            <span style={{ color: C.a }}>✗</span> <span style={{ color: C.body }}>D(w₁·w₂) ≠ D(w₁) ⊕ D(w₂)</span><br/>
            <span style={{ color: C.a }}>context contaminates segments</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  RESULTS TABLE
// ═══════════════════════════════════════════════════════════════

function Results() {
  const rows = [
    { surface: "Torus T²", group: "ℤ²", bestB: "0.77", bestBName: "Transport", bestA: "1.54", bestAName: "Transformer", gap: "2.0×", c: C.a },
    { surface: "S¹∨S¹", group: "F₂", bestB: "0.054", bestBName: "Transport", bestA: "0.297", bestAName: "Sequential", gap: "5.5×", c: C.b },
    { surface: "Klein K", group: "ℤ⋊ℤ", bestB: "0.82", bestBName: "Homotopy", bestA: "1.76", bestAName: "Cover", gap: "2.1×", c: C.kb },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fonts, fontSize: 16 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            {["Surface", "π₁", "Best type-B ↓", "Best type-A", "Gap"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: C.dim, fontSize: 12, fontFamily: mono, letterSpacing: 1 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.surface} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "12px", color: r.c, fontWeight: 600 }}>{r.surface}</td>
              <td style={{ padding: "12px", fontFamily: mono, color: "#999", fontSize: 14 }}>{r.group}</td>
              <td style={{ padding: "12px" }}>
                <span style={{ fontFamily: mono, color: C.b, fontWeight: 700, fontSize: 17 }}>{r.bestB}</span>
                <span style={{ fontSize: 12, color: "#bbb", marginLeft: 6 }}>{r.bestBName}</span>
              </td>
              <td style={{ padding: "12px" }}>
                <span style={{ fontFamily: mono, color: C.a, fontSize: 15 }}>{r.bestA}</span>
                <span style={{ fontSize: 12, color: "#bbb", marginLeft: 6 }}>{r.bestAName}</span>
              </td>
              <td style={{ padding: "12px", fontWeight: 700, color: C.text, fontSize: 17 }}>{r.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 14, color: "#888", marginTop: 10, fontFamily: fonts }}>
        Per-segment Chamfer distance at L = 10 (mean over 3 seeds). Lower is better.
        "Best type-A / best type-B" gives the tightest comparison between functorial and non-functorial decoders.
        Type-B decoders use ~3× fewer parameters (170K vs 585K).
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  MAIN — THE BLOG POST
// ═══════════════════════════════════════════════════════════════

export default function BlogPost() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "60px 20px 120px", boxSizing: "border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <article style={{ maxWidth: 660, margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <header style={{ marginBottom: 56 }}>
          <h1 style={{ fontFamily: fonts, fontSize: 38, fontWeight: 400, color: C.text, lineHeight: 1.3, margin: "0 0 16px" }}>
            Functorial Neural Architectures from Higher Inductive Types
          </h1>
          <div style={{ fontFamily: fonts, fontSize: 18, color: "#888", lineHeight: 1.7, marginBottom: 24 }}>
            How we prove that compositional generalization is equivalent to a structural property of the decoder — and build architectures that have it by construction.
          </div>
        </header>


        {/* ══════════  WHY THIS MATTERS  ══════════ */}
        <Sect first>
          <H2>Why this matters</H2>
          <P>
            You give a robot two skills: "go around the left obstacle" and "go around the right obstacle."
            Now there are both obstacles. The robot should compose the two skills. It can't.
            A language model learns "go left" and "go right." Asked to handle "go left then right," it fails.
            A network trained on 2-digit addition cannot do 5-digit addition.
          </P>
          <P>
            These are all the same problem: <Em c={C.text}>compositional generalization</Em>.
            The task decomposes into parts that combine by a known rule,
            and the model must respect that rule on inputs never seen during training.
            Neural networks fail at this systematically — transformers on{" "}
            <a href="https://arxiv.org/abs/1711.00350" style={{color: C.a, textDecoration: "none", borderBottom: "1px solid " + C.a + "40"}}>SCAN</a>,{" "}
            <a href="https://arxiv.org/abs/2010.05465" style={{color: C.a, textDecoration: "none", borderBottom: "1px solid " + C.a + "40"}}>COGS</a>,{" "}
            and length generalization; recurrent networks on multi-step arithmetic.
            The failures persist as models scale.
          </P>
          <P>
            The standard diagnosis is "not enough data" or "not enough inductive bias." We argue it's deeper than that.
            The failure is <em>architectural</em>: the standard attention decoder cannot represent a
            decoder that is simultaneously compositional at all input lengths. No amount of data or compute fixes a type error.
          </P>
          <P>
            This post explains how we prove that claim, and how we build architectures that generalize
            compositionally by construction — not by hoping the optimizer stumbles onto the right solution.
          </P>
        </Sect>


        {/* ══════════  THE EXPERIMENT  ══════════ */}
        <Sect>
          <H2>The experiment: words become curves</H2>
          <P>
            We work with a concrete geometric task. Pick a surface — a torus, a figure-eight, a Klein bottle.
            Each surface has loops: on the torus, loop <Em>a</Em> goes around the big hole
            and loop <Em c={C.b}>b</Em> goes around the tube.
          </P>
          <P>
            A word like <Cd>aab</Cd> means: trace <Em>a</Em>, then <Em>a</Em> again,
            then <Em c={C.b}>b</Em>.
            The result is a closed curve on the torus — a sequence of 3D points, 32 per segment.
            The neural network's job: given the word, produce the curve.
            We call this network the <Em c={C.text}>decoder</Em> — it's the function from words to curves,
            and the central object of the paper.
          </P>

          <figure style={{ margin: "28px 0", textAlign: "center" }}>
            <InteractiveTorus />
          </figure>
        </Sect>


        {/* ══════════  DATA GENERATION  ══════════ */}
        <Sect>
          <H2>How data is generated</H2>
          <P>
            Each training example is a (word, curve) pair. The curve lives in ℝ³ for the torus and figure-eight,
            or ℝ⁴ for the Klein bottle (which requires four dimensions to embed without self-intersection).
            Here's the process step by step:
          </P>

          <div style={{ margin: "28px 0" }}>
            <DataGenExplainer />
          </div>

          <P>
            This is the complete data pipeline. Train and test use the <em>exact same</em> generation process —
            the only difference is word length. If a model has truly learned the compositional structure,
            the per-segment error should be constant across lengths. If it hasn't, error will grow.
          </P>
        </Sect>


        {/* ══════════  EVALUATION  ══════════ */}
        <Sect>
          <H2>How we evaluate</H2>
          <P>
            Comparing curves of different lengths fairly is subtle. A word of length 10 produces a
            curve with 320 points; a word of length 2 produces 64. A global metric would confound length with quality.
          </P>

          <div style={{ margin: "28px 0" }}>
            <MetricExplainer />
          </div>
        </Sect>


        {/* ══════════  KEY INSIGHT  ══════════ */}
        <Sect>
          <H2>The key insight: compositionality = functoriality</H2>
          <P>
            Now that we know the task — words in, curves out — we can ask: what mathematical structure
            must the decoder have to generalize compositionally?
          </P>
          <P>
            Every surface has an algebraic signature called the <Em c={C.text}>fundamental group</Em> (written π₁).
            It captures which loops can be continuously deformed into each other.
            For the torus, π₁(T²) = ℤ × ℤ — a pair of integers counting how many times a loop winds around each hole.
            What this means concretely: the loops <Em>a</Em> and <Em c={C.b}>b</Em> commute.
            The word "ab" traces the same curve as "ba" — they represent the same element of the group.
          </P>
          <P>
            The decoder maps words to curves. Words compose by concatenation. Curves compose by
            geometric joining. The compositional generalization requirement is that the decoder
            respects this:
          </P>

          <Eq>D(w₁ · w₂) &nbsp;=&nbsp; D(w₁) ⊕ D(w₂)</Eq>

          <P>
            This equation has a name: <Em c={C.text}>functoriality</Em>. The decoder must be a structure-preserving
            map (a <em>functor</em>) from the algebra of loops to the space of curves. This is our main theorem:
            compositional generalization is <em>equivalent</em> to functoriality of the decoder.
            Not "related to," not "inspired by" — equivalent.
          </P>

          <P>
            This means the problem is well-posed: for any surface, its π₁ tells you exactly what
            algebraic structure the decoder must preserve. Different surfaces → different groups → different architecture requirements.
          </P>
        </Sect>


        {/* ══════════  FROM TOPOLOGY TO ARCHITECTURE  ══════════ */}
        <Sect>
          <H2>From topology to architecture</H2>
          <P>
            So we know the decoder must be a functor from π₁. But how do we <em>build</em> one?
            We need a systematic procedure: "given a surface, output a neural architecture that is
            functorial by construction."
          </P>
          <P>
            This is where <Em c={C.text}>higher inductive types</Em> (HITs) from homotopy type theory come in.
            Homotopy type theory is a branch of mathematics that treats topological spaces and
            type systems as the same thing — a loop on a surface is literally a proof of equality between
            two points. A HIT is a formal recipe for building a space: you list its ingredients and each one compiles
            directly to a neural network component:
          </P>

          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "20px 26px", fontFamily: mono, fontSize: 16, lineHeight: 2.6, color: "#666", margin: "24px 0",
          }}>
            <div style={{ fontSize: 11, color: "#bbb", letterSpacing: 2, marginBottom: 4, fontFamily: mono }}>EXAMPLE: TORUS HIT → ARCHITECTURE</div>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <div><span style={{ color: "#aaa" }}>point</span> <span style={{ color: C.text, fontWeight: 600 }}>★</span></div>
                <div><span style={{ color: "#aaa" }}>loop </span> <span style={{ color: C.a, fontWeight: 600 }}>a</span> : ★ = ★</div>
                <div><span style={{ color: "#aaa" }}>loop </span> <span style={{ color: C.b, fontWeight: 600 }}>b</span> : ★ = ★</div>
                <div><span style={{ color: "#aaa" }}>surf</span> <span style={{ color: "#c4a97d", fontWeight: 600 }}>s</span> : a·b = b·a</div>
              </div>
              <div style={{ color: "#999", fontSize: 14, alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "right", lineHeight: 2.6 }}>
                <div>→ shared latent space</div>
                <div>→ generator network g<sub>a</sub></div>
                <div>→ generator network g<sub>b</sub></div>
                <div>→ canonical form (sort letters)</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 10, fontSize: 13, color: "#999", fontFamily: fonts, lineHeight: 1.7 }}>
              The compilation is general: <strong style={{color:"#777"}}>point → latent space</strong>, <strong style={{color:"#777"}}>loop → generator network</strong>,{" "}
              <strong style={{color:"#777"}}>surface → enforcement of group relation</strong>.
              On the torus, "enforcement" means reordering. On the Klein bottle, it means a learned proof-term MLP.
              On the figure-eight (no surface term), the decoder is purely sequential.
            </div>
          </div>

          <P>
            The <em>point</em> becomes a shared latent space.
            Each <em>loop</em> becomes a small neural network (a "generator network") that maps a
            latent code to a curve segment in ℝ³.
            A <em>surface</em> tells the compiler which simplifications are valid — on the torus, it licenses reordering.
            On the Klein bottle, the surface <Cd>bab⁻¹ = a⁻¹</Cd> compiles to a proof-term MLP: a small
            network H(s) that continuously deforms one curve into another, witnessing the group relation geometrically.
          </P>

          <figure style={{ margin: "28px 0" }}>
            <ProofTermViz />
            <FigCaption>
              The proof term H(s): drag the slider to see b·a·b⁻¹ continuously deform into a⁻¹.
              The b's cancel, and a gets inverted. This deformation is learned by a small MLP.
            </FigCaption>
          </figure>

          <H3>What "verified" means</H3>
          <P>
            We formalize this in <Em c={C.text}>Cubical Agda</Em>, a proof assistant based on homotopy type theory.
            The Agda type-checker mechanically verifies that our transport construction satisfies the
            functoriality equation exactly — not approximately, not up to learned tolerance, but as a mathematical identity.
            For an ML audience, think of it this way: the Agda code is like a compiler that <em>refuses to compile</em>{" "}
            unless the architecture provably satisfies the functoriality equation.
            It's not a unit test — it's an exhaustive guarantee over all possible inputs, checked at compile time.
          </P>
        </Sect>


        {/* ══════════  THREE SURFACES  ══════════ */}
        <Sect>
          <H2>Three surfaces, three tests</H2>
          <P>
            We test on three surfaces with progressively harder fundamental groups,
            comparing five architectures: three non-functorial (type-A: transformer, cover decoder
            that only tracks winding numbers while ignoring letter order, and
            a transport-attention hybrid) against two functorial ones (type-B: transport and homotopy decoders).
            Each surface removes a crutch that a naive decoder might rely on:
          </P>

          <div style={{ margin: "28px 0" }}>
            <ThreeGroups />
          </div>
        </Sect>


        {/* ══════════  WHY ATTENTION FAILS  ══════════ */}
        <Sect>
          <H2>Why type-A decoders can't compose</H2>
          <P>
            The transport decoder processes each letter independently. The curve segment for <Cd>a</Cd>{" "}
            is the same whether the word is "ab" or "aaabbb." Full curves are built by concatenation — functoriality is structural, guaranteed by construction.
          </P>
          <P>
            Any decoder that reads other tokens when producing a segment — whether via attention, recurrence (GRU — a gated recurrent unit, a type of recurrent network),
            or global conditioning — violates this independence. We call these type-A decoders.
            The segment for <Cd>a</Cd> in "ab" differs from <Cd>a</Cd> in "aab" because the context changes with sequence length.
          </P>
          <P>
            For attention specifically, we prove this formally: for <em>any</em> choice of Q, K, V weight matrices,
            the attention decoder violates functoriality. The key mechanism: softmax normalization.
            At length L, each token's attention weights sum to 1 over L tokens; at length L', they sum to 1 over L' tokens.
            The per-token output changes with sequence length even if the tokens themselves don't.
            No single set of weights can make the decoder simultaneously functorial at two different lengths.
            The GRU fails for different but related reasons — accumulated hidden-state context contaminates each segment.
            Both failures are architectural, not statistical.
          </P>

          <P>
            Here's what that looks like in practice — the word "aaabbb" (length 6, never seen during training):
          </P>

          <figure style={{ margin: "28px 0" }}>
            <FailureVisual />
            <FigCaption>
              Word "aaabbb" (L=6, never seen in training). Each segment is a distinct color. Type-B: segments match ground truth. Type-A: later segments increasingly distorted — incomplete loops, cross-talk, off-surface drift.
            </FigCaption>
          </figure>

          <div style={{ margin: "28px 0" }}>
            <DecoderComparison />
          </div>
        </Sect>


        {/* ══════════  RESULTS  ══════════ */}
        <Sect>
          <H2>Results</H2>
          <P>
            The core prediction: if the decoder is functorial, per-segment error should stay <em>flat</em>{" "}
            as word length increases. If it isn't, error should grow. An important control:
            at training lengths (L ≤ 2), all five architectures converge to comparable loss (2.23–2.27 on the torus).
            The gap only emerges at test lengths — this is a generalization failure, not a training failure.
          </P>

          <div style={{ margin: "28px 0" }}>
            <ErrorChart />
          </div>

          <P>
            You'll notice the type-B line (teal) actually <em>drops</em> from L = 2 to L = 4 before leveling off.
            This isn't a contradiction — the per-segment metric becomes more stable at longer lengths because
            individual segments are less affected by boundary effects at the start and end of the word.
            The important thing is that it levels off and stays flat, while type-A keeps growing.
          </P>

          <P>
            The figure-eight (S¹∨S¹) result is especially striking. The paper tracks an additional metric
            there: <Em c={C.text}>circle accuracy</Em> — what fraction of segments the decoder assigns to the correct circle
            (a vs b). The transformer drops to 14% at L = 10.
            It can't even distinguish <em>which generator</em> to trace — it produces points near an arbitrary mixture of the two circles.
            The transport decoder maintains 100% circle accuracy at all lengths.
          </P>

          <P>
            Switch between surfaces in the chart above to see how the gap depends on the algebraic structure.
            Here are the L = 10 numbers:
          </P>

          <div style={{ margin: "28px 0" }}>
            <Results />
          </div>

          <P>
            The type-B decoders achieve 2–5.5× lower error with approximately 3× fewer parameters.
            The advantage is largest on the figure-eight (free group, where the sequential GRU is the best type-A baseline — but still 5.5× worse) and
            smallest on the Klein bottle. On the Klein bottle, the <em>homotopy</em> decoder (which includes the learned proof term H)
            outperforms even the transport decoder by 1.85× on non-canonical words (words like "abab" where a and b are interleaved, as opposed to canonical words like "aabb" where all a's come first) — precisely the words where the group relation
            bab⁻¹ = a⁻¹ must be exercised.
          </P>
        </Sect>


        {/* ══════════  PUNCHLINE  ══════════ */}
        <Sect>
          <H2>The pipeline</H2>
          <P>
            The contribution is not just "our decoder beats a transformer." It's a general procedure:
          </P>

          <div style={{
            background: "linear-gradient(135deg, #f8f5ef 0%, #f0ebe2 100%)",
            border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "28px 20px 24px", margin: "28px 0",
          }}>
            <div style={{
              display: "flex", gap: 0, justifyContent: "center", flexWrap: "wrap",
              rowGap: 16,
            }}>
              {[
                { step: "Specify", detail: "write the HIT", icon: "✎", color: C.kb },
                { step: "Verify", detail: "type-check in Agda", icon: "✓", color: C.b },
                { step: "Compile", detail: "HIT → architecture", icon: "⟿", color: C.a },
                { step: "Train", detail: "on short words only", icon: "▶", color: "#888" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{
                    background: C.card, border: `1.5px solid ${s.color}30`,
                    borderRadius: 10, padding: "14px 16px", textAlign: "center", minWidth: 100,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: s.color }}>{s.step}</div>
                    <div style={{ fontFamily: fonts, fontSize: 12, color: "#999", marginTop: 4 }}>{s.detail}</div>
                  </div>
                  {i < 3 && <div style={{ padding: "0 6px", color: "#ccc", fontSize: 22 }}>→</div>}
                </div>
              ))}
            </div>
            <div style={{
              textAlign: "center", marginTop: 18, fontFamily: fonts, fontSize: 15,
              color: "#999", fontStyle: "italic",
            }}>
              Any surface with compositional structure → certified architecture that generalizes by construction
            </div>
          </div>

          <P>
            Any domain with compositional structure — modular programs, multi-step plans, molecular ring
            systems — can be specified as a HIT and compiled into a certified architecture via this pipeline.
            The decoder generalizes by construction because its type signature includes functoriality.
          </P>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            {[
              { label: "Paper", icon: "📄", href: "https://arxiv.org/abs/2603.16123" },
              { label: "Code", icon: "⌨", href: "https://github.com/karsar/hott_neuro" },
            ].map(l => (
              <a key={l.label} href={l.href} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px",
                background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 8,
                color: C.text, textDecoration: "none", fontFamily: mono, fontSize: 14,
                fontWeight: 500,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}>
                <span style={{ fontSize: 16 }}>{l.icon}</span>
                {l.label} →
              </a>
            ))}
          </div>
        </Sect>

      </article>
    </div>
  );
}
