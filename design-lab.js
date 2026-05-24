const revealItems = document.querySelectorAll(".reveal");

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
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const demos = {
  receipt: {
    vendor: "Summit Supply",
    document: "Work order",
    total: "$52.97",
    review: "PO number",
  },
  statement: {
    vendor: "Monthly statement",
    document: "Bank activity",
    total: "18 lines",
    review: "2 matches",
  },
  note: {
    vendor: "Handwritten note",
    document: "Service memo",
    total: "AC Unit #3",
    review: "Date unclear",
  },
};

document.querySelectorAll("[data-demo]").forEach((button) => {
  button.addEventListener("click", () => {
    const data = demos[button.dataset.demo];
    if (!data) return;

    document.querySelectorAll("[data-demo]").forEach((item) => {
      const isSelected = item === button;
      item.classList.toggle("is-active", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });

    Object.entries(data).forEach(([key, value]) => {
      const field = document.querySelector(`[data-field="${key}"]`);
      if (field) field.textContent = value;
    });
  });
});

const signalLabel = document.querySelector("#signalLabel");
const signalValue = document.querySelector("#signalValue");

document.querySelectorAll(".signal").forEach((signal) => {
  signal.addEventListener("pointerenter", () => {
    if (signalLabel) signalLabel.textContent = signal.dataset.label;
    if (signalValue) signalValue.textContent = signal.dataset.value;
  });

  signal.addEventListener("focus", () => {
    if (signalLabel) signalLabel.textContent = signal.dataset.label;
    if (signalValue) signalValue.textContent = signal.dataset.value;
  });
});

const pipelineStage = document.querySelector(".pipeline-stage");
const pipelineButton = document.querySelector(".pipeline-button");

pipelineButton?.addEventListener("click", () => {
  pipelineStage.classList.remove("is-running");
  window.requestAnimationFrame(() => {
    pipelineStage.classList.add("is-running");
  });
});
