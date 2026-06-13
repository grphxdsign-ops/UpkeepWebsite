const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = Array.from(document.querySelectorAll(".reveal"));
const productFrame = document.querySelector(".hero-system");
const runStepLabel = document.querySelector("#runStepLabel");
const runTitle = document.querySelector("#runTitle");
const runBody = document.querySelector("#runBody");
const runRows = Array.from(document.querySelectorAll("[data-run-row]"));
const runCards = Array.from(document.querySelectorAll("[data-run-card]"));

const sampleRun = [
  {
    step: "1",
    state: "upload",
    label: "Upload",
    title: "Mixed files enter one stream.",
    body: "Receipts, statements, work orders, and notes become one organized trail.",
    row: "1"
  },
  {
    step: "2",
    state: "read",
    label: "Reading",
    title: "The useful details light up.",
    body: "Vendor, date, total, asset, and line items move out of the noise.",
    row: "1"
  },
  {
    step: "3",
    state: "match",
    label: "Matched",
    title: "Related pieces connect.",
    body: "The receipt, work order, and statement line form a traceable record.",
    row: "2"
  },
  {
    step: "4",
    state: "ready",
    label: "Ready",
    title: "The record is ready to use.",
    body: "Clean fields are ready for review, search, handoff, or export.",
    row: "3"
  }
];

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const applySampleRunStep = (current) => {
  if (productFrame) {
    productFrame.dataset.runStep = current.step;
    productFrame.dataset.flowState = current.state;
  }

  if (runStepLabel) runStepLabel.textContent = current.label;
  if (runTitle) runTitle.textContent = current.title;
  if (runBody) runBody.textContent = current.body;

  runRows.forEach((row) => {
    row.classList.toggle("is-active", row.dataset.runRow === current.row);
  });

  runCards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.runCard === current.step);
  });
};

const setSampleRunStep = (index, shouldFade = false) => {
  const current = sampleRun[index];

  if (!current) return;

  if (!shouldFade || !productFrame) {
    applySampleRunStep(current);
    return;
  }

  productFrame.classList.add("is-swapping");
  window.setTimeout(() => {
    applySampleRunStep(current);
    productFrame.classList.remove("is-swapping");
  }, 180);
};

let sampleRunIndex = 0;
setSampleRunStep(sampleRunIndex);

if (productFrame && !prefersReducedMotion) {
  window.setInterval(() => {
    sampleRunIndex = (sampleRunIndex + 1) % sampleRun.length;
    setSampleRunStep(sampleRunIndex, true);
  }, 2800);
}

const randomUnit = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const lerp = (a, b, amount) => a + (b - a) * amount;

const easeInOut = (value) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
};

const cubicPoint = (a, b, c, d, t) => {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
};

const initHeroFlow = () => {
  const stage = document.querySelector(".hero-system");
  const canvas = document.querySelector("#heroFlowCanvas");

  if (!stage || !canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  const particles = Array.from({ length: 68 }, (_, index) => ({
    seed: randomUnit(index + 1),
    lane: randomUnit(index + 8) - 0.5,
    speed: 0.035 + randomUnit(index + 22) * 0.047,
    size: 0.72 + randomUnit(index + 40) * 1.16,
    tint: randomUnit(index + 61)
  }));

  let width = 0;
  let height = 0;
  let deviceScale = 1;

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * deviceScale);
    canvas.height = Math.round(height * deviceScale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  };

  const drawGlow = (x, y, radius, color, alpha) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color.replace("ALPHA", String(alpha)));
    gradient.addColorStop(1, color.replace("ALPHA", "0"));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawDocumentGlyph = (x, y, size, angle, alpha, tint) => {
    const glyphWidth = size * 0.62;
    const glyphHeight = size;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tint > 0.58 ? "rgba(217, 255, 88, 0.22)" : "rgba(246, 241, 223, 0.68)";
    ctx.strokeStyle = tint > 0.58 ? "rgba(217, 255, 88, 0.52)" : "rgba(62, 233, 255, 0.48)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-glyphWidth / 2, -glyphHeight / 2);
    ctx.lineTo(glyphWidth * 0.24, -glyphHeight / 2);
    ctx.lineTo(glyphWidth / 2, -glyphHeight * 0.24);
    ctx.lineTo(glyphWidth / 2, glyphHeight / 2);
    ctx.lineTo(-glyphWidth / 2, glyphHeight / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(16, 18, 37, 0.24)";
    ctx.lineWidth = 1;
    for (let index = 0; index < 3; index += 1) {
      const yOffset = -glyphHeight * 0.16 + index * glyphHeight * 0.18;
      ctx.beginPath();
      ctx.moveTo(-glyphWidth * 0.28, yOffset);
      ctx.lineTo(glyphWidth * (0.18 + index * 0.06), yOffset);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawRoute = (time) => {
    const coreX = width * (0.48 + (pointer.x - 0.5) * 0.035);
    const coreY = height * (0.48 + (pointer.y - 0.5) * 0.03);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    for (let index = 0; index < 7; index += 1) {
      const lane = (index - 3) * height * 0.035;
      const drift = Math.sin(time * 0.45 + index) * height * 0.018;
      const startX = width * (0.08 + index * 0.01);
      const startY = height * (0.28 + index * 0.065) + drift;
      const endX = width * (0.86 - index * 0.006);
      const endY = height * (0.32 + index * 0.062) - drift;

      ctx.setLineDash([8 + index * 2, 16 + index * 3]);
      ctx.lineDashOffset = -time * (32 + index * 4);
      ctx.lineWidth = index % 2 === 0 ? 1.2 : 1.8;
      ctx.strokeStyle = index % 2 === 0 ? "rgba(62, 233, 255, 0.22)" : "rgba(141, 108, 255, 0.2)";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(width * 0.27, startY - height * 0.18, coreX - width * 0.08, coreY + lane, coreX, coreY + lane * 0.2);
      ctx.bezierCurveTo(coreX + width * 0.16, coreY - lane * 0.2, width * 0.72, endY + height * 0.14, endX, endY);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  };

  const drawCore = (time) => {
    const coreX = width * (0.48 + (pointer.x - 0.5) * 0.035);
    const coreY = height * (0.48 + (pointer.y - 0.5) * 0.03);
    const radius = Math.min(width, height) * 0.19;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let index = 0; index < 4; index += 1) {
      const pulse = Math.sin(time * 0.9 + index * 1.4) * 0.5 + 0.5;
      ctx.strokeStyle = index % 2 === 0 ? `rgba(62, 233, 255, ${0.14 + pulse * 0.13})` : `rgba(217, 255, 88, ${0.08 + pulse * 0.1})`;
      ctx.lineWidth = 1 + index * 0.35;
      ctx.beginPath();
      ctx.ellipse(
        coreX,
        coreY,
        radius * (1.12 + index * 0.18),
        radius * (0.72 + index * 0.12),
        -0.32 + time * 0.06 + index * 0.6,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    const sweep = (time * 0.34) % 1;
    const scanY = coreY - radius * 0.62 + sweep * radius * 1.24;
    const scanGradient = ctx.createLinearGradient(coreX - radius * 0.84, scanY, coreX + radius * 0.84, scanY);
    scanGradient.addColorStop(0, "rgba(62, 233, 255, 0)");
    scanGradient.addColorStop(0.45, "rgba(62, 233, 255, 0.72)");
    scanGradient.addColorStop(0.58, "rgba(217, 255, 88, 0.9)");
    scanGradient.addColorStop(1, "rgba(62, 233, 255, 0)");
    ctx.strokeStyle = scanGradient;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(coreX - radius * 0.82, scanY);
    ctx.lineTo(coreX + radius * 0.82, scanY);
    ctx.stroke();

    ctx.restore();
  };

  const drawParticles = (time) => {
    const coreX = width * (0.48 + (pointer.x - 0.5) * 0.035);
    const coreY = height * (0.48 + (pointer.y - 0.5) * 0.03);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    particles.forEach((particle, index) => {
      const rawProgress = (particle.seed + time * particle.speed) % 1;
      const progress = easeInOut(rawProgress);
      const lane = particle.lane * height * 0.42;
      const startX = width * (0.06 + particle.seed * 0.08);
      const startY = height * (0.28 + randomUnit(index + 102) * 0.44);
      const endX = width * (0.77 + randomUnit(index + 133) * 0.12);
      const endY = height * (0.24 + randomUnit(index + 141) * 0.46);
      const x = cubicPoint(startX, width * 0.27, coreX + width * 0.08, endX, progress);
      const y = cubicPoint(startY, coreY + lane * 0.35, coreY - lane * 0.16, endY, progress);
      const alpha = Math.sin(rawProgress * Math.PI) * 0.74;

      if (rawProgress < 0.38) {
        drawDocumentGlyph(x, y, 24 * particle.size, (particle.lane * 0.9) + time * 0.08, alpha, particle.tint);
      } else {
        const dotRadius = 1.6 + particle.size * 2.2;
        ctx.fillStyle = particle.tint > 0.62 ? `rgba(217, 255, 88, ${alpha})` : `rgba(62, 233, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        if (rawProgress > 0.74) {
          ctx.strokeStyle = `rgba(246, 241, 223, ${alpha * 0.48})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 8, y);
          ctx.lineTo(x + 48 + particle.size * 10, y);
          ctx.stroke();
        }
      }
    });

    ctx.restore();
  };

  const drawOutput = (time) => {
    const spineX = width * 0.8;
    const top = height * 0.25;
    const gap = height * 0.105;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    for (let index = 0; index < 5; index += 1) {
      const rowY = top + index * gap;
      const shimmer = (Math.sin(time * 1.3 + index * 0.7) + 1) * 0.5;
      const lineLength = width * (0.09 + randomUnit(index + 300) * 0.08);

      ctx.strokeStyle = `rgba(246, 241, 223, ${0.16 + shimmer * 0.18})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(spineX, rowY);
      ctx.lineTo(spineX + lineLength, rowY);
      ctx.stroke();

      ctx.fillStyle = index === 3 ? "rgba(217, 255, 88, 0.88)" : "rgba(62, 233, 255, 0.72)";
      ctx.beginPath();
      ctx.arc(spineX - 13, rowY, 3.2 + shimmer * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const draw = (timestamp = 0) => {
    const time = timestamp / 1000;
    pointer.x = lerp(pointer.x, pointer.targetX, 0.035);
    pointer.y = lerp(pointer.y, pointer.targetY, 0.035);

    stage.style.setProperty("--hero-px", ((pointer.x - 0.5) * 2).toFixed(3));
    stage.style.setProperty("--hero-py", ((pointer.y - 0.5) * 2).toFixed(3));

    ctx.clearRect(0, 0, width, height);
    drawGlow(width * 0.5, height * 0.5, Math.min(width, height) * 0.54, "rgba(62, 233, 255, ALPHA)", 0.08);
    drawGlow(width * 0.67, height * 0.38, Math.min(width, height) * 0.42, "rgba(141, 108, 255, ALPHA)", 0.11);
    drawRoute(time);
    drawParticles(time);
    drawCore(time);
    drawOutput(time);

    if (!prefersReducedMotion) {
      window.requestAnimationFrame(draw);
    }
  };

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    pointer.targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    pointer.targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  });

  stage.addEventListener("pointerleave", () => {
    pointer.targetX = 0.5;
    pointer.targetY = 0.5;
  });

  resize();

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
  } else {
    window.addEventListener("resize", resize);
  }

  draw();
};

initHeroFlow();

const initKineticShaderBackground = () => {
  const hero = document.querySelector("[data-kinetic-scene]");
  const canvas = hero?.querySelector("#kineticParticleCanvas");

  if (!hero || !canvas) return;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: false
  });

  if (!gl) {
    canvas.style.background =
      "radial-gradient(circle at 62% 32%, rgba(215,243,44,.12), transparent 34%), #010403";
    return;
  }

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_progress;
    uniform vec2 u_pointer;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = p * 2.04 + vec2(8.13, 3.71);
        amplitude *= 0.5;
      }

      return value;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv * 2.0 - 1.0;
      p.x *= u_resolution.x / u_resolution.y;

      float t = u_time * 0.055;
      vec2 pointer = (u_pointer * 2.0 - 1.0);
      pointer.x *= u_resolution.x / u_resolution.y;

      vec2 drift = vec2(sin(t * 0.9), cos(t * 0.73)) * 0.18;
      float field = fbm(p * 1.35 + drift + u_progress * 0.72);
      float current = fbm(p * 2.2 - drift * 1.6 + vec2(u_progress * 0.9, -t));

      float receiptAura = smoothstep(1.06, 0.0, length(p - vec2(0.48 + sin(t) * 0.08, -0.05 + cos(t * 0.7) * 0.12)));
      float recordAura = smoothstep(1.15, 0.0, length(p - vec2(0.02, 0.02)));
      float pointerAura = smoothstep(0.82, 0.0, length(p - pointer));
      float lowerWash = smoothstep(-0.9, 0.46, -p.y + u_progress * 0.38);

      vec3 base = vec3(0.004, 0.015, 0.011);
      vec3 acid = vec3(0.84, 0.95, 0.17);
      vec3 oxide = vec3(0.43, 0.16, 0.07);
      vec3 paper = vec3(0.93, 0.89, 0.76);

      vec3 color = base;
      color += acid * (receiptAura * 0.065 + recordAura * 0.085 + pointerAura * 0.035);
      color += oxide * (lowerWash * 0.13 + current * 0.045);
      color += paper * max(field - 0.62, 0.0) * 0.05;

      float vignette = smoothstep(1.38, 0.34, length(p));
      float grain = noise(gl_FragCoord.xy * 0.72 + u_time * 0.28) * 0.018;
      color *= 0.52 + vignette * 0.68;
      color += grain;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const progressLocation = gl.getUniformLocation(program, "u_progress");
  const pointerLocation = gl.getUniformLocation(program, "u_pointer");
  const pointer = { x: 0.62, y: 0.38, targetX: 0.62, targetY: 0.38 };

  let heroTop = hero.offsetTop;
  let heroTravel = Math.max(1, hero.offsetHeight - window.innerHeight);
  let width = 0;
  let height = 0;

  const measure = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, Math.floor(rect.width * dpr));
    height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = width;
    canvas.height = height;
    heroTop = hero.offsetTop;
    heroTravel = Math.max(1, hero.offsetHeight - window.innerHeight);
  };

  const progress = () => Math.max(0, Math.min(1, (window.scrollY - heroTop) / heroTravel));
  const startedAt = performance.now();

  hero.addEventListener(
    "pointermove",
    (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      pointer.targetY = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    },
    { passive: true }
  );

  const renderShader = (time) => {
    pointer.x = lerp(pointer.x, pointer.targetX, 0.045);
    pointer.y = lerp(pointer.y, pointer.targetY, 0.045);

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolutionLocation, width, height);
    gl.uniform1f(timeLocation, (time - startedAt) * 0.001);
    gl.uniform1f(progressLocation, prefersReducedMotion ? 0.72 : progress());
    gl.uniform2f(pointerLocation, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!prefersReducedMotion) requestAnimationFrame(renderShader);
  };

  measure();
  renderShader(performance.now());
  window.addEventListener("resize", () => {
    measure();
    renderShader(performance.now());
  });
};

const initKineticHero = () => {
  const hero = document.querySelector("[data-kinetic-scene]");
  const stage = hero?.querySelector(".kinetic-stage");
  const receipt = hero?.querySelector(".kinetic-receipt-asset");
  const scanFrame = hero?.querySelector(".receipt-scan-frame");
  const shredLayer = hero?.querySelector(".receipt-shred-layer");
  const record = hero?.querySelector(".kinetic-record");
  const copy = hero?.querySelector(".kinetic-copy");
  const notes = Array.from(hero?.querySelectorAll("[data-scroll-note]") ?? []);
  const fields = Array.from(hero?.querySelectorAll(".record-field") ?? []);
  const wordmark = hero?.querySelector(".kinetic-wordmark");

  if (!hero || !stage || !receipt || !scanFrame || !shredLayer || !record || !fields.length) return;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (start, end, value) => {
    if (start === end) return value >= end ? 1 : 0;
    return easeInOut((value - start) / (end - start));
  };

  const polygonString = (points) =>
    `polygon(${points.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ")})`;

  const morphPolygon = (from, to, amount) =>
    polygonString(from.map(([x, y], index) => [lerp(x, to[index][0], amount), lerp(y, to[index][1], amount)]));

  const paperPieces = Array.from({ length: prefersReducedMotion ? 0 : 276 }, (_, index) => {
    const columns = 23;
    const rows = Math.ceil(276 / columns);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const isStrip = randomUnit(index + 2050) > 0.72;
    const jitterX = (randomUnit(index + 2100) - 0.5) * 0.018;
    const jitterY = (randomUnit(index + 2200) - 0.5) * 0.022;
    const width = isStrip ? 0.009 + randomUnit(index + 2300) * 0.026 : 0.0038 + randomUnit(index + 2300) * 0.011;
    const height = isStrip ? 0.004 + randomUnit(index + 2400) * 0.014 : 0.0036 + randomUnit(index + 2400) * 0.011;
    const x = clamp01(0.035 + column * (0.93 / columns) + jitterX);
    const y = clamp01(0.03 + row * (0.91 / Math.max(1, rows - 1)) + jitterY);
    const outward = column < columns * 0.42 ? -1 : column > columns * 0.58 ? 1 : randomUnit(index + 2500) > 0.5 ? 1 : -1;
    const field = Math.min(fields.length - 1, Math.floor((index / 276) * fields.length));
    const start = 0.36 + row * 0.008 + randomUnit(index + 2600) * 0.09;
    const buildStart = 0.56 + field * 0.035 + randomUnit(index + 3450) * 0.055;
    const buildEnd = Math.min(0.93, buildStart + 0.18 + randomUnit(index + 3550) * 0.07);
    const clipA = [
      [randomUnit(index + 3100) * 16, 0],
      [42 + randomUnit(index + 3150) * 16, randomUnit(index + 3200) * 10],
      [100, randomUnit(index + 3250) * 20],
      [84 + randomUnit(index + 3300) * 16, 100],
      [38 + randomUnit(index + 3350) * 24, 84 + randomUnit(index + 3375) * 16],
      [0, 70 + randomUnit(index + 3400) * 28]
    ];
    const clipB = [
      [0, 30 + randomUnit(index + 4100) * 10],
      [42 + randomUnit(index + 4150) * 12, 18 + randomUnit(index + 4200) * 8],
      [100, 14 + randomUnit(index + 4250) * 10],
      [100, 66 + randomUnit(index + 4300) * 10],
      [46 + randomUnit(index + 4350) * 12, 76 + randomUnit(index + 4375) * 10],
      [0, 82 + randomUnit(index + 4400) * 10]
    ];

    return {
      x,
      y,
      w: width,
      h: height,
      field,
      tx: 0.12 + randomUnit(index + 3600) * 0.76,
      ty: 0.18 + randomUnit(index + 3700) * 0.55,
      targetW: isStrip ? 5 + randomUnit(index + 3800) * 15 : 2 + randomUnit(index + 3800) * 6,
      targetH: isStrip ? 1.6 + randomUnit(index + 3900) * 3.2 : 1.4 + randomUnit(index + 3900) * 2.8,
      dx: outward * (28 + randomUnit(index + 2700) * 134),
      dy: 24 + row * 12 + randomUnit(index + 2800) * 132,
      rot: (randomUnit(index + 2900) - 0.5) * 86,
      targetRot: (randomUnit(index + 3000) - 0.5) * 9,
      start,
      end: start + 0.18 + randomUnit(index + 4500) * 0.17,
      buildStart,
      buildEnd,
      absorbStart: Math.max(buildStart, buildEnd - 0.07),
      absorbEnd: Math.min(0.99, buildEnd + 0.07),
      clipA,
      clipB
    };
  });

  const pieceNodes = paperPieces.map((piece, index) => {
    const node = document.createElement("span");
    node.className = "receipt-piece";
    node.style.clipPath = polygonString(piece.clipA);
    node.style.setProperty("--piece-origin", `${40 + randomUnit(index + 1700) * 35}% ${35 + randomUnit(index + 1800) * 42}%`);
    shredLayer.append(node);
    return node;
  });

  const fieldCharacters = fields.map((field) => {
    const value = field.querySelector("strong");
    if (!value) return [];
    const hasIndicator = Boolean(value.querySelector("em"));
    const text = value.textContent.trim();
    value.textContent = "";
    const chars = Array.from(text).map((char) => {
      const span = document.createElement("span");
      span.className = char === " " ? "record-char is-space" : "record-char";
      span.textContent = char === " " ? "\u00a0" : char;
      value.append(span);
      return span;
    });

    if (hasIndicator) {
      value.append(document.createElement("em"));
    }

    return chars;
  });

  let viewportHeight = window.innerHeight;
  let heroTop = hero.offsetTop;
  let heroTravel = Math.max(1, hero.offsetHeight - viewportHeight);
  let latestProgress = -1;
  let ticking = false;

  const measure = () => {
    viewportHeight = window.innerHeight;
    heroTop = hero.offsetTop;
    heroTravel = Math.max(1, hero.offsetHeight - viewportHeight);
  };

  const currentProgress = () => clamp01((window.scrollY - heroTop) / heroTravel);

  const setHeroVariables = (progress) => {
    const receiptFlow = smoothstep(0.04, 0.58, progress);
    const tearFlow = smoothstep(0.34, 0.66, progress);
    const parseFlow = smoothstep(0.46, 0.84, progress);
    const recordFlow = smoothstep(0.48, 0.64, progress);
    const completeFlow = smoothstep(0.8, 0.94, progress);
    const absorbFlow = smoothstep(0.54, 0.88, progress) * (1 - smoothstep(0.94, 1, progress) * 0.35);
    const isMobile = window.innerWidth <= 640;
    const copyFade = smoothstep(isMobile ? 0.16 : 0.2, isMobile ? 0.32 : 0.38, progress);
    const receiptDrop = isMobile ? 34 : 154;
    const parseLift = isMobile ? -20 : -26;
    const mobileStageLift = isMobile ? smoothstep(0.27, 0.48, progress) * -160 : 0;
    const mobileScanLift = isMobile ? Math.sin(clamp01((progress - 0.22) / 0.3) * Math.PI) * -138 : 0;
    const scanFlow = smoothstep(0.24, 0.38, progress) * (1 - smoothstep(0.54, 0.64, progress));
    const scanSweep = smoothstep(0.25, 0.52, progress);
    const receiptSway = Math.sin(progress * Math.PI * 2.8) * (isMobile ? 8 : 18);
    const receiptX = lerp(0, isMobile ? 0 : -42, receiptFlow) + lerp(0, isMobile ? -8 : -68, parseFlow) + receiptSway * (1 - tearFlow * 0.7);
    const receiptY = lerp(0, receiptDrop, receiptFlow) + lerp(0, parseLift, parseFlow) + mobileStageLift + mobileScanLift;
    const receiptRotate = lerp(-10, 5.5, receiptFlow) + lerp(0, 8.5, parseFlow) + Math.sin(progress * Math.PI * 2.2) * (1 - tearFlow) * 1.8;
    const receiptFlipY = lerp(isMobile ? -8 : -18, 0, smoothstep(0, 0.22, progress)) + Math.sin(progress * Math.PI * 1.4) * (1 - tearFlow) * (isMobile ? 1.4 : 2.8);
    const receiptFlipX = lerp(isMobile ? 5 : 8, 0, smoothstep(0.02, 0.28, progress));
    const receiptScale = lerp(1, isMobile ? 0.76 : 0.84, parseFlow);
    const intactFade = smoothstep(0.4, 0.64, progress);
    const dissolveFade = smoothstep(0.5, 0.8, progress);
    const receiptOpacity = Math.max(0, (1 - intactFade * 0.72) * (1 - dissolveFade));
    const shadowPeak = Math.sin(clamp01((progress - 0.05) / 0.58) * Math.PI);

    hero.style.setProperty("--receipt-x", `${receiptX.toFixed(2)}px`);
    hero.style.setProperty("--receipt-y", `${receiptY.toFixed(2)}px`);
    hero.style.setProperty("--receipt-rotate", `${receiptRotate.toFixed(2)}deg`);
    hero.style.setProperty("--receipt-flip-y", `${receiptFlipY.toFixed(2)}deg`);
    hero.style.setProperty("--receipt-flip-x", `${receiptFlipX.toFixed(2)}deg`);
    hero.style.setProperty("--receipt-scale", receiptScale.toFixed(3));
    hero.style.setProperty("--receipt-opacity", receiptOpacity.toFixed(3));
    hero.style.setProperty("--scan-opacity", scanFlow.toFixed(3));
    hero.style.setProperty("--scan-y", `${lerp(7, 93, scanSweep).toFixed(2)}%`);
    hero.style.setProperty("--scan-intensity", (0.35 + Math.sin(scanSweep * Math.PI) * 0.65).toFixed(3));
    hero.style.setProperty("--receipt-shadow-alpha", (0.5 + shadowPeak * 0.22).toFixed(3));
    hero.style.setProperty("--wordmark-shadow-x", `${(receiptX * 0.38).toFixed(2)}px`);
    hero.style.setProperty("--wordmark-shadow-y", `${(receiptY * 0.12).toFixed(2)}px`);
    hero.style.setProperty("--wordmark-shadow-scale", (0.82 + shadowPeak * 0.42 + parseFlow * 0.12).toFixed(3));
    hero.style.setProperty("--wordmark-shadow-opacity", ((0.2 + shadowPeak * 0.48) * (1 - parseFlow * 0.42)).toFixed(3));
    hero.style.setProperty("--record-opacity", recordFlow.toFixed(3));
    hero.style.setProperty("--record-x", `${lerp(isMobile ? 0 : 10, 0, recordFlow).toFixed(2)}px`);
    hero.style.setProperty("--record-y", `${lerp(isMobile ? 18 : 30, 0, recordFlow).toFixed(2)}px`);
    hero.style.setProperty("--record-scale", lerp(0.97, 1, recordFlow).toFixed(3));
    hero.style.setProperty("--record-rotate-y", `${lerp(-5.5, -1.6, recordFlow).toFixed(2)}deg`);
    hero.style.setProperty("--record-rotate-x", `${lerp(2.2, 0.8, recordFlow).toFixed(2)}deg`);
    record.style.setProperty("--record-complete", completeFlow.toFixed(3));
    record.style.setProperty("--record-absorb", absorbFlow.toFixed(3));

    if (copy) {
      copy.style.setProperty("--copy-opacity", (1 - copyFade).toFixed(3));
      copy.style.setProperty("--copy-y", `${lerp(0, isMobile ? -20 : -16, copyFade).toFixed(2)}px`);
    }

    if (wordmark) {
      const wordmarkExit = smoothstep(isMobile ? 0.24 : 0.26, isMobile ? 0.48 : 0.56, progress);
      wordmark.style.setProperty("--wordmark-opacity", (0.95 * (1 - wordmarkExit)).toFixed(3));
      wordmark.style.setProperty("--kinetic-x", `${lerp(0, isMobile ? -8 : -18, progress).toFixed(2)}px`);
      wordmark.style.setProperty("--kinetic-y", `${lerp(0, isMobile ? 74 : 132, wordmarkExit).toFixed(2)}px`);
    }

    fields.forEach((field, index) => {
      const fieldProgress = smoothstep(0.62 + index * 0.04, 0.78 + index * 0.028, progress);
      field.style.setProperty("--field-fill", fieldProgress.toFixed(3));
      field.classList.toggle("is-filled", fieldProgress > 0.84);
      field.tabIndex = recordFlow > 0.72 ? 0 : -1;
      field.setAttribute("aria-hidden", recordFlow > 0.72 ? "false" : "true");

      const chars = fieldCharacters[index] ?? [];
      chars.forEach((char, charIndex) => {
        const charStart = charIndex / Math.max(1, chars.length);
        const charReveal = smoothstep(charStart, charStart + 0.22, fieldProgress);
        char.style.setProperty("--char-opacity", charReveal.toFixed(3));
        char.style.setProperty("--char-y", `${lerp(8, 0, charReveal).toFixed(2)}px`);
      });
    });

    record.tabIndex = recordFlow > 0.35 ? 0 : -1;
    record.setAttribute("aria-hidden", recordFlow > 0.35 ? "false" : "true");

    const noteStarts = [0.56, 0.66, 0.76, 0.86];
    const currentNote = noteStarts.reduce((current, start, index) => (progress >= start - 0.02 ? index : current), -1);

    notes.forEach((note, index) => {
      const start = noteStarts[index] ?? 0;
      const opacity = smoothstep(start, start + 0.055, progress);
      note.style.setProperty("--note-opacity", opacity.toFixed(3));
      note.style.setProperty("--note-y", `${lerp(16, 0, opacity).toFixed(2)}px`);
      note.classList.toggle("is-active", opacity > 0.92);
      note.classList.toggle("is-current", index === currentNote);
      note.setAttribute("aria-hidden", opacity > 0.05 ? "false" : "true");
    });
  };

  const clearRecordFocus = () => {
    record.classList.remove("is-inspecting");
    record.style.setProperty("--record-tilt-x", "0deg");
    record.style.setProperty("--record-tilt-y", "0deg");
  };

  record.addEventListener("pointermove", (event) => {
    const rect = record.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);
    record.classList.add("is-inspecting");
    record.style.setProperty("--record-focus-x", `${(x * 100).toFixed(2)}%`);
    record.style.setProperty("--record-focus-y", `${(y * 100).toFixed(2)}%`);
    record.style.setProperty("--record-tilt-y", `${((x - 0.5) * 4.4).toFixed(2)}deg`);
    record.style.setProperty("--record-tilt-x", `${((0.5 - y) * 3.6).toFixed(2)}deg`);
  });

  record.addEventListener("pointerleave", clearRecordFocus);
  record.addEventListener("focusin", () => record.classList.add("is-inspecting"));
  record.addEventListener("focusout", clearRecordFocus);

  fields.forEach((field) => {
    field.tabIndex = -1;
    field.setAttribute("aria-hidden", "true");
    field.addEventListener("pointerenter", () => field.classList.add("is-focus"));
    field.addEventListener("pointerleave", () => field.classList.remove("is-focus"));
    field.addEventListener("focus", () => field.classList.add("is-focus"));
    field.addEventListener("blur", () => field.classList.remove("is-focus"));
  });

  const setPaperPieces = (progress) => {
    const stageRect = stage.getBoundingClientRect();
    const receiptRect = receipt.getBoundingClientRect();
    const fieldRects = fields.map((field) => field.getBoundingClientRect());
    const mobileScale = window.innerWidth <= 640 ? 0.55 : 1;

    paperPieces.forEach((piece, index) => {
      const node = pieceNodes[index];
      const pieceProgress = smoothstep(piece.start, piece.end, progress);
      const appear = smoothstep(piece.start, piece.start + 0.055, progress);
      const build = smoothstep(piece.buildStart, piece.buildEnd, progress);
      const absorb = smoothstep(piece.absorbStart, piece.absorbEnd, progress);
      const x = receiptRect.left - stageRect.left + receiptRect.width * piece.x;
      const y = receiptRect.top - stageRect.top + receiptRect.height * piece.y;
      const startWidth = receiptRect.width * piece.w;
      const startHeight = receiptRect.height * piece.h;
      const width = lerp(startWidth, piece.targetW, build);
      const height = lerp(startHeight, piece.targetH, build);
      const fieldRect = fieldRects[piece.field] ?? fieldRects[0];
      const targetX = fieldRect.left - stageRect.left + fieldRect.width * piece.tx - width * 0.5;
      const targetY = fieldRect.top - stageRect.top + fieldRect.height * piece.ty - height * 0.5;
      const tumble = Math.sin(pieceProgress * Math.PI) * (18 + index * 0.42);
      const pour = smoothstep(piece.buildStart - 0.08, piece.buildEnd, progress);
      const gravity = pieceProgress * pieceProgress * (window.innerWidth <= 640 ? 34 : 92);
      const drop = piece.dy * pieceProgress * mobileScale + gravity - pour * (window.innerWidth <= 640 ? 42 : 74);
      const drift = piece.dx * pieceProgress * mobileScale + Math.sin(progress * 20 + index) * 9 * pieceProgress * (1 - pour * 0.45);
      const midX = x + drift;
      const midY = y + drop;
      const currentX = lerp(midX, targetX, build);
      const currentY = lerp(midY, targetY, build);
      const settlePulse = Math.sin(build * Math.PI);
      const opacity = appear * (1 - absorb * 0.96) * (0.18 + settlePulse * 0.42);

      node.style.left = `${x.toFixed(2)}px`;
      node.style.top = `${y.toFixed(2)}px`;
      node.style.width = `${width.toFixed(2)}px`;
      node.style.height = `${height.toFixed(2)}px`;
      node.style.backgroundSize = `${receiptRect.width.toFixed(2)}px ${receiptRect.height.toFixed(2)}px`;
      node.style.backgroundPosition = `${(-receiptRect.width * piece.x).toFixed(2)}px ${(-receiptRect.height * piece.y).toFixed(2)}px`;
      node.style.clipPath = morphPolygon(piece.clipA, piece.clipB, build);
      node.style.setProperty("--piece-opacity", opacity.toFixed(3));
      node.style.setProperty("--piece-x", `${(currentX - x).toFixed(2)}px`);
      node.style.setProperty("--piece-y", `${(currentY - y).toFixed(2)}px`);
      node.style.setProperty("--piece-rotate", `${lerp(piece.rot * pieceProgress + tumble, piece.targetRot, build).toFixed(2)}deg`);
      node.style.setProperty("--piece-scale", (1 - pieceProgress * 0.06 - build * 0.34 - absorb * 0.28).toFixed(3));
      node.style.setProperty("--piece-brightness", (1 - pieceProgress * 0.08 + build * 0.32).toFixed(3));
      node.style.setProperty("--piece-saturation", (1 + build * 0.35).toFixed(3));
      node.style.setProperty("--piece-blur", `${(absorb * 1.25).toFixed(2)}px`);
      node.style.setProperty("--piece-radius", `${lerp(0.5, 7, build).toFixed(2)}px`);
      node.style.setProperty("--piece-paper-alpha", (build * 0.02).toFixed(3));
    });
  };

  const render = () => {
    ticking = false;
    const progress = prefersReducedMotion ? 0.86 : currentProgress();
    if (Math.abs(progress - latestProgress) < 0.001) return;
    latestProgress = progress;
    setHeroVariables(progress);
    setPaperPieces(progress);
  };

  const requestRender = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };

  measure();
  render();

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    requestRender();
  });
};

const initSmoothAnchors = () => {
  if (prefersReducedMotion) return;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const kineticScene = document.querySelector("[data-kinetic-scene]");

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const progressTarget = anchor.dataset.scrollProgress;
      if (progressTarget && kineticScene) {
        event.preventDefault();
        const sceneTop = kineticScene.getBoundingClientRect().top + window.scrollY;
        const sceneTravel = Math.max(0, kineticScene.offsetHeight - window.innerHeight);
        const targetY = sceneTop + sceneTravel * clamp01(Number(progressTarget));
        window.scrollTo({ top: targetY, behavior: "smooth" });
        return;
      }

      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
};

initKineticShaderBackground();
initKineticHero();
initSmoothAnchors();
