const render = new URLSearchParams(window.location.search).get("render");

if (render) {
  document.body.dataset.render = render;
}
