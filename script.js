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
    ctx.fillStyle = tint > 0.58 ? "rgba(158, 232, 111, 0.24)" : "rgba(246, 241, 223, 0.68)";
    ctx.strokeStyle = tint > 0.58 ? "rgba(158, 232, 111, 0.5)" : "rgba(202, 232, 184, 0.42)";
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
      ctx.strokeStyle = index % 2 === 0 ? "rgba(158, 232, 111, 0.22)" : "rgba(214, 239, 198, 0.16)";
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
      ctx.strokeStyle = index % 2 === 0 ? `rgba(158, 232, 111, ${0.14 + pulse * 0.13})` : `rgba(214, 239, 198, ${0.08 + pulse * 0.1})`;
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
    scanGradient.addColorStop(0, "rgba(158, 232, 111, 0)");
    scanGradient.addColorStop(0.45, "rgba(158, 232, 111, 0.72)");
    scanGradient.addColorStop(0.58, "rgba(214, 239, 198, 0.82)");
    scanGradient.addColorStop(1, "rgba(158, 232, 111, 0)");
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
        ctx.fillStyle = particle.tint > 0.62 ? `rgba(158, 232, 111, ${alpha})` : `rgba(214, 239, 198, ${alpha * 0.78})`;
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

      ctx.fillStyle = index === 3 ? "rgba(158, 232, 111, 0.88)" : "rgba(214, 239, 198, 0.58)";
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
    drawGlow(width * 0.5, height * 0.5, Math.min(width, height) * 0.54, "rgba(158, 232, 111, ALPHA)", 0.08);
    drawGlow(width * 0.67, height * 0.38, Math.min(width, height) * 0.42, "rgba(94, 148, 104, ALPHA)", 0.1);
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
      "radial-gradient(circle at 62% 32%, rgba(82,198,160,.14), transparent 34%), #050806";
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

      for (int i = 0; i < 4; i++) {
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

      vec3 base = vec3(0.022, 0.023, 0.030);
      vec3 acid = vec3(0.49, 0.73, 0.53);
      vec3 oxide = vec3(0.10, 0.20, 0.12);
      vec3 teal = vec3(0.07, 0.10, 0.08);
      vec3 paper = vec3(0.92, 0.88, 0.78);

      vec3 color = base;
      color += acid * (receiptAura * 0.055 + recordAura * 0.07 + pointerAura * 0.026);
      color += teal * (receiptAura * 0.08 + pointerAura * 0.034);
      color += oxide * (lowerWash * 0.11 + current * 0.038);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    width = Math.max(1, Math.floor(rect.width * dpr));
    height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = width;
    canvas.height = height;
    heroTop = hero.offsetTop;
    heroTravel = Math.max(1, hero.offsetHeight - window.innerHeight);
  };

  const progress = () => Math.max(0, Math.min(1, (window.scrollY - heroTop) / heroTravel));
  const startedAt = performance.now();
  let lastShaderFrame = 0;
  let shaderVisible = true;
  let shaderQueued = false;
  const shaderFrameInterval = window.innerWidth <= 640 ? 84 : 50;

  const requestShaderFrame = () => {
    if (prefersReducedMotion || !shaderVisible || shaderQueued) return;
    shaderQueued = true;
    requestAnimationFrame(renderShader);
  };

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
    shaderQueued = false;
    if (!shaderVisible) return;

    if (time - lastShaderFrame < shaderFrameInterval) {
      requestShaderFrame();
      return;
    }

    lastShaderFrame = time;
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

    requestShaderFrame();
  };

  measure();
  renderShader(performance.now());

  if ("IntersectionObserver" in window) {
    const shaderObserver = new IntersectionObserver(
      ([entry]) => {
        shaderVisible = Boolean(entry?.isIntersecting);
        if (shaderVisible) requestShaderFrame();
      },
      { threshold: 0.01 }
    );
    shaderObserver.observe(canvas);
  }

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
  const recordTip = hero?.querySelector("[data-record-hover-tip]");
  const copy = hero?.querySelector(".kinetic-copy");
  const notes = Array.from(hero?.querySelectorAll("[data-scroll-note]") ?? []);
  const fields = Array.from(hero?.querySelectorAll(".record-field") ?? []);
  const wordmark = hero?.querySelector(".kinetic-wordmark");

  if (!hero || !stage || !receipt || !scanFrame || !shredLayer || !record || !fields.length) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (start, end, value) => {
    if (start === end) return value >= end ? 1 : 0;
    return easeInOut((value - start) / (end - start));
  };
  const shatterStart = 0.705;
  const shatterComplete = 0.855;
  const recordRevealStart = 0.865;
  const recordRevealEnd = 0.915;
  const shatterEnd = 0.999;
  const particleFieldStarts = [0.91, 0.925, 0.94, 0.955, 0.968, 0.978];
  const accentCanvasRgb = (getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "158 232 111")
    .split(/\s+/)
    .slice(0, 3)
    .join(", ");
  const fieldFromReceiptDepth = (depth) => {
    if (depth > 0.82) return 5;
    if (depth > 0.66) return 4;
    if (depth > 0.5) return 3;
    if (depth > 0.34) return 2;
    if (depth > 0.18) return 1;
    return 0;
  };

  const shredContext = shredLayer instanceof HTMLCanvasElement ? shredLayer.getContext("2d", { alpha: true }) : null;
  const grid = window.innerWidth <= 640
    ? { columns: 18, rows: 28 }
    : window.innerWidth <= 980
      ? { columns: 24, rows: 36 }
      : { columns: 30, rows: 44 };
  const pieceCount = prefersReducedMotion || !shredContext ? 0 : grid.columns * grid.rows;

  const paperPieces = Array.from({ length: pieceCount }, (_, index) => {
    const columns = grid.columns;
    const rows = grid.rows;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rowDepth = (row + 0.5) / rows;
    const columnDepth = (column + 0.5) / columns;
    const jitterX = (randomUnit(index + 2100) - 0.5) * 0.16;
    const jitterY = (randomUnit(index + 2200) - 0.5) * 0.18;
    const width = (1 / columns) * (1.04 + randomUnit(index + 2300) * 0.24);
    const height = (1 / rows) * (1.04 + randomUnit(index + 2400) * 0.3);
    const x = clamp01(column / columns + jitterX / columns);
    const y = clamp01(row / rows + jitterY / rows);
    const outward = column < columns * 0.42 ? -1 : column > columns * 0.58 ? 1 : randomUnit(index + 2500) > 0.5 ? 1 : -1;
    const field = Math.min(fields.length - 1, fieldFromReceiptDepth(rowDepth));
    const start = shatterStart + (1 - rowDepth) * 0.085 + randomUnit(index + 2600) * 0.015;
    const pourStart = Math.min(0.982, Math.max(recordRevealEnd + 0.006, particleFieldStarts[field] + randomUnit(index + 3450) * 0.026));
    const pourEnd = Math.min(0.997, pourStart + 0.055 + randomUnit(index + 3550) * 0.026);

    return {
      x,
      y,
      w: width,
      h: height,
      field,
      tx: 0.09 + columnDepth * 0.82 + (randomUnit(index + 3600) - 0.5) * 0.12,
      ty: 0.22 + randomUnit(index + 3700) * 0.5,
      dx: outward * (18 + randomUnit(index + 2700) * 94),
      dy: 34 + rowDepth * 132 + randomUnit(index + 2800) * 92,
      rot: (randomUnit(index + 2900) - 0.5) * 144,
      targetRot: (randomUnit(index + 3000) - 0.5) * 12,
      depth: rowDepth,
      flutter: 0.55 + randomUnit(index + 3150) * 1.2,
      spin: randomUnit(index + 3200) > 0.5 ? 1 : -1,
      start,
      end: Math.min(shatterComplete, start + 0.095 + randomUnit(index + 4500) * 0.035),
      pourStart,
      pourEnd,
      absorbStart: Math.max(pourStart + 0.026, pourEnd - 0.034),
      absorbEnd: Math.min(0.999, pourEnd + 0.026 + randomUnit(index + 4600) * 0.02)
    };
  });

  let shredWidth = 0;
  let shredHeight = 0;
  let shredDpr = 1;

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

  const setReceiptPointer = (event) => {
    const rect = receipt.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);
    hero.classList.add("is-receipt-hot");
    hero.style.setProperty("--receipt-pointer-x", `${(x * 100).toFixed(2)}%`);
    hero.style.setProperty("--receipt-pointer-y", `${(y * 100).toFixed(2)}%`);
    hero.style.setProperty("--receipt-tilt-y", `${((x - 0.5) * 5.2).toFixed(2)}deg`);
    hero.style.setProperty("--receipt-tilt-x", `${((0.5 - y) * 4.4).toFixed(2)}deg`);
    hero.style.setProperty("--receipt-hover-lift", "-10px");
  };

  const clearReceiptPointer = () => {
    hero.classList.remove("is-receipt-hot");
    hero.style.setProperty("--receipt-tilt-y", "0deg");
    hero.style.setProperty("--receipt-tilt-x", "0deg");
    hero.style.setProperty("--receipt-hover-lift", "0px");
  };

  [receipt, scanFrame].forEach((target) => {
    target.addEventListener("pointermove", setReceiptPointer, { passive: true });
    target.addEventListener("pointerleave", clearReceiptPointer);
    target.addEventListener("focus", () => hero.classList.add("is-receipt-hot"));
    target.addEventListener("blur", clearReceiptPointer);
  });

  let viewportHeight = window.innerHeight;
  let heroTop = hero.offsetTop;
  let heroTravel = Math.max(1, hero.offsetHeight - viewportHeight);
  let latestProgress = -1;
  let latestPieceProgress = Number.NaN;
  let displayedProgress = 0;
  let targetProgress = 0;
  let ticking = false;

  const resizeShredCanvas = () => {
    if (!shredContext) return;

    const width = Math.max(1, Math.round(stage.clientWidth));
    const height = Math.max(1, Math.round(stage.clientHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 640 ? 1 : 1.25);

    if (width === shredWidth && height === shredHeight && dpr === shredDpr) return;

    shredWidth = width;
    shredHeight = height;
    shredDpr = dpr;
    shredLayer.width = Math.round(width * dpr);
    shredLayer.height = Math.round(height * dpr);
    shredLayer.style.width = `${width}px`;
    shredLayer.style.height = `${height}px`;
    shredContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const measure = () => {
    viewportHeight = window.innerHeight;
    heroTop = hero.offsetTop;
    heroTravel = Math.max(1, hero.offsetHeight - viewportHeight);
    resizeShredCanvas();
  };

  const currentProgress = () => clamp01((window.scrollY - heroTop) / heroTravel);

  const setHeroVariables = (progress) => {
    const receiptFlow = smoothstep(0.04, 0.58, progress);
    const centerFlow = smoothstep(0.14, 0.54, progress);
    const tearFlow = smoothstep(shatterStart, shatterComplete, progress);
    const parseFlow = smoothstep(0.74, 0.92, progress);
    const recordFlow = smoothstep(recordRevealStart, recordRevealEnd, progress);
    const completeFlow = smoothstep(recordRevealEnd, 0.99, progress);
    const absorbFlow = smoothstep(recordRevealEnd, 0.995, progress) * (1 - smoothstep(0.992, 1, progress) * 0.2);
    const isMobile = window.innerWidth <= 640;
    const copyFade = smoothstep(isMobile ? 0.16 : 0.2, isMobile ? 0.32 : 0.38, progress);
    const receiptDrop = isMobile ? 46 : 166;
    const parseLift = isMobile ? -10 : -18;
    const mobileStageLift = isMobile ? smoothstep(shatterStart, shatterComplete, progress) * -72 : 0;
    const mobileScanLift = 0;
    const scanFlow = smoothstep(0.5, 0.6, progress) * (1 - smoothstep(shatterStart, shatterStart + 0.065, progress));
    const scanSweep = smoothstep(0.52, 0.7, progress);
    const stageWidth = stage.clientWidth || window.innerWidth;
    const anchorX = isMobile
      ? stageWidth * 0.5
      : window.innerWidth <= 980
        ? stageWidth * 0.62
        : window.innerWidth <= 1280
          ? Math.min(stageWidth * 0.64, 820)
          : Math.min(stageWidth * 0.66, 960);
    const centerOffsetX = stageWidth * 0.5 - anchorX;
    const receiptSway = Math.sin(progress * Math.PI * 2.8) * (isMobile ? 8 : 18);
    const receiptX = lerp(0, centerOffsetX, centerFlow) + lerp(0, isMobile ? -2 : 0, parseFlow) + receiptSway * (1 - tearFlow * 0.82);
    const receiptY = lerp(0, receiptDrop, receiptFlow) + lerp(0, parseLift, parseFlow) + mobileStageLift + mobileScanLift;
    const scanSettle = smoothstep(0.34, 0.58, progress) * (1 - smoothstep(shatterStart - 0.055, shatterStart + 0.045, progress));
    const baseReceiptRotate = lerp(-10, 3.2, receiptFlow);
    const receiptRotate = lerp(baseReceiptRotate, 0.35, scanSettle) + lerp(0, 5.8, parseFlow) + Math.sin(progress * Math.PI * 2.2) * (1 - tearFlow) * 1.25;
    const receiptFlipY = lerp(isMobile ? -8 : -18, 0, smoothstep(0, 0.22, progress)) + Math.sin(progress * Math.PI * 1.4) * (1 - tearFlow) * (isMobile ? 1.4 : 2.8);
    const receiptFlipX = lerp(isMobile ? 5 : 8, 0, smoothstep(0.02, 0.28, progress));
    const receiptScale = lerp(1, isMobile ? 0.76 : 0.84, parseFlow);
    const cutFlow = smoothstep(shatterStart, shatterComplete, progress);
    const dissolveFade = smoothstep(shatterStart + 0.035, recordRevealStart - 0.01, progress);
    const receiptOpacity = Math.max(0, 1 - dissolveFade);
    const shadowPeak = Math.sin(clamp01((progress - 0.05) / 0.58) * Math.PI);
    const scannerLock = smoothstep(0.24, 0.34, progress);
    const scanAnchorX = centerOffsetX;
    const scanAnchorY = isMobile ? -8 : 118;
    const scanAnchorRotate = isMobile ? 0.15 : 0.05;
    const scanAnchorScale = isMobile ? 1.12 : 1.16;
    const receiptScanHighlight = scanFlow * Math.sin(scanSweep * Math.PI);

    hero.style.setProperty("--receipt-x", `${receiptX.toFixed(2)}px`);
    hero.style.setProperty("--receipt-y", `${receiptY.toFixed(2)}px`);
    hero.style.setProperty("--receipt-rotate", `${receiptRotate.toFixed(2)}deg`);
    hero.style.setProperty("--receipt-flip-y", `${receiptFlipY.toFixed(2)}deg`);
    hero.style.setProperty("--receipt-flip-x", `${receiptFlipX.toFixed(2)}deg`);
    hero.style.setProperty("--receipt-scale", receiptScale.toFixed(3));
    hero.style.setProperty("--receipt-opacity", receiptOpacity.toFixed(3));
    hero.style.setProperty("--receipt-cut", `${(cutFlow * 100).toFixed(2)}%`);
    hero.style.setProperty("--receipt-brightness", (1 + receiptScanHighlight * 0.16).toFixed(3));
    hero.style.setProperty("--receipt-saturate", (1 + receiptScanHighlight * 0.14).toFixed(3));
    hero.style.setProperty("--scan-opacity", scanFlow.toFixed(3));
    hero.style.setProperty("--scan-y", `${lerp(7, 93, scanSweep).toFixed(2)}%`);
    hero.style.setProperty("--scan-intensity", (0.35 + Math.sin(scanSweep * Math.PI) * 0.65).toFixed(3));
    hero.style.setProperty("--scan-frame-x", `${lerp(receiptX, scanAnchorX, scannerLock).toFixed(2)}px`);
    hero.style.setProperty("--scan-frame-y", `${lerp(receiptY, scanAnchorY, scannerLock).toFixed(2)}px`);
    hero.style.setProperty("--scan-frame-rotate", `${lerp(receiptRotate, scanAnchorRotate, scannerLock).toFixed(2)}deg`);
    hero.style.setProperty("--scan-frame-scale", lerp(receiptScale, scanAnchorScale, scannerLock).toFixed(3));
    hero.style.setProperty("--scan-frame-flip-y", `${lerp(receiptFlipY, 0, scannerLock).toFixed(2)}deg`);
    hero.style.setProperty("--scan-frame-flip-x", `${lerp(receiptFlipX, 0, scannerLock).toFixed(2)}deg`);
    const wordmarkShadowPass = smoothstep(0.08, 0.48, progress) * (1 - smoothstep(0.58, 0.78, progress));
    hero.style.setProperty("--receipt-shadow-alpha", (0.48 + shadowPeak * 0.2).toFixed(3));
    hero.style.setProperty("--wordmark-shadow-x", `${(receiptX * 0.42).toFixed(2)}px`);
    hero.style.setProperty("--wordmark-shadow-y", `${(receiptY * 0.16 + lerp(0, 22, receiptFlow)).toFixed(2)}px`);
    hero.style.setProperty("--wordmark-shadow-scale", (1.05 + shadowPeak * 0.18).toFixed(3));
    hero.style.setProperty("--wordmark-shadow-opacity", (wordmarkShadowPass * (0.16 + shadowPeak * 0.22)).toFixed(3));
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
      copy.style.pointerEvents = copyFade > 0.72 ? "none" : "auto";
    }

    if (wordmark) {
      const wordmarkFade = smoothstep(isMobile ? 0.42 : 0.44, isMobile ? 0.68 : 0.66, progress);
      wordmark.style.setProperty("--wordmark-opacity", ((isMobile ? 0.86 : 0.9) * (1 - wordmarkFade)).toFixed(3));
      wordmark.style.setProperty("--kinetic-x", "0px");
      wordmark.style.setProperty("--kinetic-y", "0px");
    }

    fields.forEach((field, index) => {
      const fieldStart = particleFieldStarts[index] ?? particleFieldStarts[particleFieldStarts.length - 1];
      const fieldProgress = smoothstep(fieldStart, Math.min(0.995, fieldStart + 0.06), progress);
      field.style.setProperty("--field-fill", fieldProgress.toFixed(3));
      field.classList.toggle("is-filled", fieldProgress > 0.84);
      field.tabIndex = recordFlow > 0.72 ? 0 : -1;
      field.setAttribute("aria-hidden", recordFlow > 0.72 ? "false" : "true");

      const chars = fieldCharacters[index] ?? [];
      chars.forEach((char, charIndex) => {
        const charStart = (charIndex / Math.max(1, chars.length - 1)) * 0.72;
        const charReveal = smoothstep(charStart, charStart + 0.16, fieldProgress);
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
    record.classList.remove("is-showing-tip");
    if (recordTip) {
      recordTip.setAttribute("aria-hidden", "true");
    }
    record.style.setProperty("--record-tilt-x", "0deg");
    record.style.setProperty("--record-tilt-y", "0deg");
  };

  const showRecordTip = (field) => {
    if (!recordTip) return;

    const text = field.dataset.recordTip || "";
    if (!text) return;

    const recordRect = record.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const centerY = fieldRect.top - recordRect.top + fieldRect.height / 2;
    const y = clamp(centerY, 52, Math.max(52, recordRect.height - 52));

    recordTip.textContent = text;
    recordTip.style.setProperty("--record-tip-y", `${y.toFixed(2)}px`);
    recordTip.setAttribute("aria-hidden", "false");
    record.classList.add("is-showing-tip");
  };

  const hideRecordTip = () => {
    record.classList.remove("is-showing-tip");
    if (recordTip) {
      recordTip.setAttribute("aria-hidden", "true");
    }
  };

  document.addEventListener("pointermove", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".record-field")) return;

    fields.forEach((field) => field.classList.remove("is-focus"));
    hideRecordTip();
  }, { passive: true });

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
    field.addEventListener("pointerenter", () => {
      field.classList.add("is-focus");
      showRecordTip(field);
    });
    field.addEventListener("pointermove", () => showRecordTip(field), { passive: true });
    field.addEventListener("pointerleave", () => {
      field.classList.remove("is-focus");
      hideRecordTip();
    });
    field.addEventListener("focus", () => {
      field.classList.add("is-focus");
      showRecordTip(field);
    });
    field.addEventListener("blur", () => {
      field.classList.remove("is-focus");
      hideRecordTip();
    });
  });

  const setPaperPieces = (progress) => {
    if (!shredContext) return;

    resizeShredCanvas();
    shredContext.clearRect(0, 0, shredWidth, shredHeight);

    if (progress < shatterStart || progress > shatterEnd || !receipt.complete || !receipt.naturalWidth) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const receiptRect = receipt.getBoundingClientRect();
    const recordRect = record.getBoundingClientRect();
    const fieldRects = fields.map((field) => field.getBoundingClientRect());
    const valueRects = fields.map((field) => (field.querySelector("strong") || field).getBoundingClientRect());
    const mobileScale = window.innerWidth <= 640 ? 0.55 : 1;
    const naturalWidth = receipt.naturalWidth;
    const naturalHeight = receipt.naturalHeight;
    const recordLocalX = recordRect.left - stageRect.left;
    const recordLocalY = recordRect.top - stageRect.top;
    const absorbX = recordLocalX + recordRect.width * 0.5;
    const absorbY = recordLocalY + recordRect.height * 0.54;

    paperPieces.forEach((piece, index) => {
      const pieceProgress = smoothstep(piece.start, piece.end, progress);
      const appear = smoothstep(piece.start - 0.018, piece.start + 0.045, progress);
      const pour = smoothstep(piece.pourStart, piece.pourEnd, progress);
      const absorb = smoothstep(piece.absorbStart, piece.absorbEnd, progress);
      const visible = appear * (1 - absorb);

      if (visible <= 0.006) return;

      const x = receiptRect.left - stageRect.left + receiptRect.width * piece.x;
      const y = receiptRect.top - stageRect.top + receiptRect.height * piece.y;
      const startWidth = receiptRect.width * piece.w;
      const startHeight = receiptRect.height * piece.h;
      const chipScale = Math.max(0.055, 1 - pieceProgress * 0.34 - pour * 0.94 - absorb * 0.6);
      const width = Math.max(1.1, startWidth * chipScale);
      const height = Math.max(1.1, startHeight * chipScale);
      const fieldRect = fieldRects[piece.field] ?? fieldRects[0];
      const valueRect = valueRects[piece.field] ?? fieldRect;
      const targetX = valueRect.left - stageRect.left + valueRect.width * clamp01(piece.tx) - width * 0.5;
      const targetY = valueRect.top - stageRect.top + valueRect.height * clamp01(piece.ty) - height * 0.5;
      const settleX = lerp(targetX, absorbX - width * 0.5, absorb * 0.4);
      const settleY = lerp(targetY, absorbY - height * 0.5, absorb * 0.28);
      const tumble = Math.sin(pieceProgress * Math.PI * piece.flutter) * (18 + (index % 31) * 1.8);
      const gravity = pieceProgress * pieceProgress * (window.innerWidth <= 640 ? 34 : 92);
      const drop = piece.dy * pieceProgress * mobileScale + gravity - pour * (window.innerWidth <= 640 ? 12 : 24);
      const drift = piece.dx * pieceProgress * mobileScale + Math.sin(progress * 24 + index * 0.37) * 11 * pieceProgress * (1 - pour * 0.45);
      const midX = x + drift;
      const midY = y + drop;
      const currentX = lerp(midX, settleX, pour);
      const currentY = lerp(midY, settleY, pour) + Math.sin(pour * Math.PI) * (window.innerWidth <= 640 ? -18 : -44);
      const alpha = Math.min(0.46, visible * (0.26 + pour * 0.18));
      const sourceX = Math.max(0, naturalWidth * piece.x);
      const sourceY = Math.max(0, naturalHeight * piece.y);
      const sourceW = Math.min(naturalWidth - sourceX, naturalWidth * piece.w);
      const sourceH = Math.min(naturalHeight - sourceY, naturalHeight * piece.h);

      if (sourceW <= 0 || sourceH <= 0) return;

      shredContext.save();
      shredContext.globalAlpha = alpha;
      shredContext.translate(currentX + width * 0.5, currentY + height * 0.5);
      shredContext.rotate((lerp(piece.rot * pieceProgress * piece.spin + tumble, piece.targetRot, pour) * Math.PI) / 180);
      shredContext.drawImage(receipt, sourceX, sourceY, sourceW, sourceH, -width * 0.5, -height * 0.5, width, height);

      if (pour > 0.18) {
        shredContext.globalCompositeOperation = "screen";
        shredContext.fillStyle = `rgba(${accentCanvasRgb}, ${0.035 + pour * 0.085})`;
        shredContext.fillRect(-width * 0.5, -height * 0.5, width, height);
      }

      shredContext.restore();
    });
  };

  const render = () => {
    ticking = false;
    targetProgress = prefersReducedMotion ? 0.9 : currentProgress();
    const delta = targetProgress - displayedProgress;
    const progress = Math.abs(delta) < 0.0008 ? targetProgress : displayedProgress + delta * 0.24;

    displayedProgress = progress;
    if (Math.abs(progress - latestProgress) >= 0.0005) {
      latestProgress = progress;
      setHeroVariables(progress);

      const pieceActiveNow = progress >= shatterStart && progress <= shatterEnd;
      const pieceWasActive = latestPieceProgress >= shatterStart && latestPieceProgress <= shatterEnd;
      const pieceDelta = window.innerWidth <= 640 ? 0.008 : 0.005;
      const shouldFlushPieces = !pieceActiveNow || !Number.isFinite(latestPieceProgress) || !pieceWasActive;
      const shouldStepPieces = pieceActiveNow && Math.abs(progress - latestPieceProgress) >= pieceDelta;

      if (pieceActiveNow || pieceWasActive || !Number.isFinite(latestPieceProgress)) {
        if (shouldFlushPieces || shouldStepPieces) {
          setPaperPieces(progress);
          latestPieceProgress = progress;
        }
      }
    }

    if (Math.abs(targetProgress - displayedProgress) > 0.0008) {
      requestRender();
    }
  };

  const requestRender = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  };

  measure();
  displayedProgress = prefersReducedMotion ? 0.9 : currentProgress();
  targetProgress = displayedProgress;
  render();

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    requestRender();
  });
  window.addEventListener("load", () => {
    measure();
    requestRender();
  });
};

const initReviewScroller = () => {
  const section = document.querySelector("[data-review-scroll]");
  const track = section?.querySelector("[data-review-track]");
  if (!section || !track) return;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothStep = (value) => value * value * (3 - 2 * value);

  let sectionTop = 0;
  let viewportHeight = window.innerHeight;
  let scrollDistance = 0;
  let latestX = Number.NaN;
  let ticking = false;

  const isStacked = () => window.matchMedia("(max-width: 980px)").matches || prefersReducedMotion;

  const applyX = (value) => {
    if (Number.isFinite(latestX) && Math.abs(value - latestX) < 0.35) return;
    latestX = value;
    track.style.setProperty("--review-track-x", `${value.toFixed(2)}px`);
  };

  const measure = () => {
    viewportHeight = window.innerHeight;
    sectionTop = section.getBoundingClientRect().top + window.scrollY;

    if (isStacked()) {
      scrollDistance = 0;
      section.style.removeProperty("--review-scroll-height");
      section.style.setProperty("--review-progress", "0");
      applyX(0);
      return;
    }

    const trackWidth = track.scrollWidth;
    const viewportWidth = section.clientWidth;
    scrollDistance = Math.max(0, trackWidth - viewportWidth);
    const travel = Math.max(viewportHeight * 0.9, scrollDistance + viewportHeight * 0.34);

    section.style.setProperty("--review-scroll-height", `${Math.round(travel + viewportHeight)}px`);
  };

  const render = () => {
    ticking = false;

    if (isStacked() || scrollDistance <= 0) {
      section.style.setProperty("--review-progress", "0");
      applyX(0);
      return;
    }

    const travel = Math.max(1, section.offsetHeight - viewportHeight);
    const progress = clamp01((window.scrollY - sectionTop) / travel);
    const eased = smoothStep(progress);

    section.style.setProperty("--review-progress", progress.toFixed(3));
    applyX(-scrollDistance * eased);
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
  window.addEventListener("load", () => {
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
initReviewScroller();
initSmoothAnchors();
