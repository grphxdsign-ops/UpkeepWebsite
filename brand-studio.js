const motionEnabled = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const visibleSections = Array.from(document.querySelectorAll(".studio-hero, .map-section, .looks-section, .critique-section, .motion-section, .stack-section"));
const lookButtons = Array.from(document.querySelectorAll("[data-look-target]"));
const lookPanels = Array.from(document.querySelectorAll("[data-look]"));
const scrim = document.querySelector(".transition-scrim");

const setStatus = (key, text) => {
  const node = document.querySelector(`[data-stack-status="${key}"]`);
  if (node) node.textContent = text;
};

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
  );

  visibleSections.forEach((section) => observer.observe(section));
} else {
  visibleSections.forEach((section) => section.classList.add("is-visible"));
}

lookButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.lookTarget;
    lookButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    lookPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.look === target);
    });
  });
});

document.querySelector(".transition-trigger")?.addEventListener("click", () => {
  if (!scrim) return;
  scrim.classList.remove("is-running");
  void scrim.offsetWidth;
  scrim.classList.add("is-running");
});

const initSmoothScroll = async () => {
  if (!motionEnabled) {
    setStatus("lenis", "Reduced motion is on, native scroll kept.");
    return;
  }

  try {
    const module = await import("https://esm.sh/lenis@1.3.23");
    const Lenis = module.default || module.Lenis;
    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);
    setStatus("lenis", "Running with Lenis 1.3.23 for smooth scroll.");
  } catch {
    document.documentElement.style.scrollBehavior = "smooth";
    setStatus("lenis", "CDN blocked, native smooth scroll fallback active.");
  }
};

const initBarbaProbe = async () => {
  try {
    const module = await import("https://esm.sh/@barba/core@2.10.3");
    const barba = module.default || module;
    if (!barba?.init) throw new Error("Barba unavailable");

    barba.init({
      preventRunning: true,
      prevent: ({ el }) => {
        const href = el?.getAttribute?.("href") || "";
        return href.startsWith("#") || el?.target === "_blank";
      },
      transitions: [
        {
          name: "upkeep-wipe",
          leave(data) {
            data.current.container.style.opacity = "0";
          },
          enter(data) {
            data.next.container.style.opacity = "1";
          }
        }
      ]
    });
    setStatus("barba", "Barba.js 2.10.3 initialized for future page transitions.");
  } catch {
    setStatus("barba", "Transition preview active, Barba CDN unavailable in this run.");
  }
};

const fitCanvas = (canvas) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
};

const cubic = (a, b, c, d, t) => {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
};

const drawPaper = (ctx, x, y, size, angle, alpha = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255, 253, 246, 0.78)";
  ctx.strokeStyle = "rgba(215, 243, 44, 0.24)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-size * 0.36, -size * 0.48);
  ctx.lineTo(size * 0.22, -size * 0.48);
  ctx.lineTo(size * 0.36, -size * 0.28);
  ctx.lineTo(size * 0.36, size * 0.48);
  ctx.lineTo(-size * 0.36, size * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(7, 21, 17, 0.22)";
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.12 + i * size * 0.16);
    ctx.lineTo(size * (0.1 + i * 0.04), -size * 0.12 + i * size * 0.16);
    ctx.stroke();
  }
  ctx.restore();
};

const drawRecord = (ctx, x, y, width, height, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255, 253, 246, 0.9)";
  ctx.strokeStyle = "rgba(215, 243, 44, 0.32)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(7, 21, 17, 0.88)";
  ctx.font = "800 18px Bricolage Grotesque, Manrope, sans-serif";
  ctx.fillText("Ready record", x + 18, y + 34);
  ctx.strokeStyle = "rgba(7, 21, 17, 0.22)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 62 + i * 28);
    ctx.lineTo(x + width - 22 - (i % 2) * 28, y + 62 + i * 28);
    ctx.stroke();
  }
  ctx.restore();
};

const initPaperFlow = () => {
  const canvas = document.querySelector("#paperFlowCanvas");
  if (!canvas) return;

  const draw = (timestamp = 0) => {
    const { ctx, width, height } = fitCanvas(canvas);
    const time = timestamp / 1000;
    ctx.clearRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.52, height * 0.42, 0, width * 0.52, height * 0.42, Math.min(width, height) * 0.56);
    glow.addColorStop(0, "rgba(215, 243, 44, 0.2)");
    glow.addColorStop(0.36, "rgba(8, 117, 70, 0.18)");
    glow.addColorStop(1, "rgba(7, 21, 17, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 253, 246, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i += 1) {
      ctx.beginPath();
      ctx.ellipse(width * 0.52, height * 0.42, width * (0.16 + i * 0.045), height * (0.1 + i * 0.035), time * 0.1 + i * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.setLineDash([10, 18]);
    ctx.lineDashOffset = -time * 42;
    ctx.strokeStyle = "rgba(215, 243, 44, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.58);
    ctx.bezierCurveTo(width * 0.28, height * 0.18, width * 0.5, height * 0.72, width * 0.66, height * 0.38);
    ctx.bezierCurveTo(width * 0.75, height * 0.2, width * 0.84, height * 0.28, width * 0.9, height * 0.42);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 11; i += 1) {
      const progress = (time * (0.045 + i * 0.002) + i * 0.087) % 1;
      const x = cubic(width * 0.12, width * 0.26, width * 0.55, width * 0.86, progress);
      const y = cubic(height * 0.58, height * 0.18, height * 0.68, height * 0.4, progress);
      const alpha = Math.sin(progress * Math.PI);
      if (progress < 0.42) {
        drawPaper(ctx, x, y, 58 + (i % 3) * 10, -0.3 + i * 0.08, alpha * 0.9);
      } else if (progress < 0.74) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 2 ? "rgba(215, 243, 44, 0.92)" : "rgba(255, 253, 246, 0.86)";
        ctx.font = `800 ${16 + (i % 3) * 5}px Bricolage Grotesque, Manrope, sans-serif`;
        ctx.fillText(["$84.20", "12", "MAY", "1042"][i % 4], x, y);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = "rgba(215, 243, 44, 0.92)";
        ctx.beginPath();
        ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawRecord(ctx, width * 0.58, height * 0.56, Math.min(250, width * 0.32), 178, 0.92);

    if (motionEnabled) requestAnimationFrame(draw);
  };

  draw();
  window.addEventListener("resize", () => draw());
};

const initShaderField = () => {
  const canvas = document.querySelector("#shaderCanvas");
  if (!canvas) return;

  const draw = (timestamp = 0) => {
    const { ctx, width, height } = fitCanvas(canvas);
    const time = timestamp / 1000;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#062018";
    ctx.fillRect(0, 0, width, height);

    const blobs = [
      [0.34 + Math.sin(time * 0.34) * 0.08, 0.34 + Math.cos(time * 0.3) * 0.06, "rgba(215, 243, 44, 0.34)"],
      [0.64 + Math.cos(time * 0.24) * 0.08, 0.42 + Math.sin(time * 0.4) * 0.09, "rgba(182, 92, 37, 0.28)"],
      [0.52 + Math.sin(time * 0.2) * 0.12, 0.7 + Math.cos(time * 0.28) * 0.08, "rgba(8, 117, 70, 0.46)"]
    ];

    ctx.globalCompositeOperation = "screen";
    blobs.forEach(([x, y, color], index) => {
      const radius = Math.min(width, height) * (0.34 + index * 0.08);
      const gradient = ctx.createRadialGradient(width * x, height * y, 0, width * x, height * y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(255, 253, 246, 0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i += 1) {
      const y = height * (0.12 + i * 0.055);
      ctx.beginPath();
      ctx.moveTo(width * 0.1, y + Math.sin(time + i) * 10);
      ctx.lineTo(width * 0.9, y + Math.cos(time * 0.7 + i) * 8);
      ctx.stroke();
    }

    if (motionEnabled) requestAnimationFrame(draw);
  };

  draw();
  window.addEventListener("resize", () => draw());
};

await initSmoothScroll();
await initBarbaProbe();
initPaperFlow();
initShaderField();
