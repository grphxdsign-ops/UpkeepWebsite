const revealItems = Array.from(document.querySelectorAll(".reveal"));
const productFrame = document.querySelector(".product-frame");
const runStepLabel = document.querySelector("#runStepLabel");
const runTitle = document.querySelector("#runTitle");
const runBody = document.querySelector("#runBody");
const runRows = Array.from(document.querySelectorAll("[data-run-row]"));
const runCards = Array.from(document.querySelectorAll("[data-run-card]"));

const sampleRun = [
  {
    step: "1",
    label: "Step 1 of 4",
    title: "Drop in the day's paperwork.",
    body: "A receipt, a service work order, and a bank statement enter one intake.",
    row: "1"
  },
  {
    step: "2",
    label: "Step 2 of 4",
    title: "Vision OCR reads the useful details.",
    body: "Vendor, total, date, asset, and statement lines are pulled into focus.",
    row: "1"
  },
  {
    step: "3",
    label: "Step 3 of 4",
    title: "Upkeep prepares the record.",
    body: "The receipt and work order become structured fields you can search later.",
    row: "2"
  },
  {
    step: "4",
    label: "Step 4 of 4",
    title: "Clear the one exception.",
    body: "The statement charge is confirmed while the rest stays ready.",
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
  productFrame.dataset.runStep = current.step;
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

  if (!current || !productFrame) return;

  if (!shouldFade) {
    applySampleRunStep(current);
    return;
  }

  productFrame.classList.add("is-swapping");
  window.setTimeout(() => {
    applySampleRunStep(current);
    productFrame.classList.remove("is-swapping");
  }, 160);
};

if (productFrame && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let sampleRunIndex = 0;
  setSampleRunStep(sampleRunIndex);

  window.setInterval(() => {
    sampleRunIndex = (sampleRunIndex + 1) % sampleRun.length;
    setSampleRunStep(sampleRunIndex, true);
  }, 2600);
}
