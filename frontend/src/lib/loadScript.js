// Loads a classic (non-module) script once and resolves when ready. Used for
// the map's geojson data files, which assign to window.* like the HTML build.
const loaded = {};

export function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("failed to load " + src));
    document.head.appendChild(el);
  });
  return loaded[src];
}
