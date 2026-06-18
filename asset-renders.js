const params = new URLSearchParams(window.location.search);
const render = params.get("render") || "6";
document.body.dataset.render = render;

for (const link of document.querySelectorAll(".asset-nav nav a")) {
  const target = new URL(link.href).searchParams.get("render");
  if (target === render) link.setAttribute("aria-current", "page");
}
