const flowShell = document.querySelector(".flow-shell");
const flowSteps = Array.from(document.querySelectorAll("[data-flow-step]"));

let activeStep = "1";
let ticking = false;

const setActiveStep = (stepNumber) => {
  if (!flowShell || activeStep === stepNumber) return;

  activeStep = stepNumber;
  flowShell.dataset.activeStep = stepNumber;
  flowSteps.forEach((step) => {
    step.classList.toggle("is-active", step.dataset.flowStep === stepNumber);
  });
};

const updateActiveStep = () => {
  ticking = false;

  if (!flowShell || !flowSteps.length) return;

  const targetY = window.innerHeight * 0.52;
  let closestStep = flowSteps[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  flowSteps.forEach((step) => {
    const rect = step.getBoundingClientRect();
    const stepCenter = rect.top + rect.height * 0.5;
    const distance = Math.abs(stepCenter - targetY);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestStep = step;
    }
  });

  setActiveStep(closestStep.dataset.flowStep);
};

const requestStepUpdate = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(updateActiveStep);
};

if (flowShell && flowSteps.length) {
  flowShell.dataset.activeStep = activeStep;
  flowSteps[0].classList.add("is-active");
  updateActiveStep();

  window.addEventListener("scroll", requestStepUpdate, { passive: true });
  window.addEventListener("resize", requestStepUpdate);
}
