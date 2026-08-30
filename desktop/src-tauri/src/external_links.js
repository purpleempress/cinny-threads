(() => {
  const trustedOrigins = new Set([
    'http://localhost:44548',
    'tauri://localhost',
    'http://tauri.localhost',
    'https://tauri.localhost',
  ]);
  const allowedProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:', 'matrix:']);

  if (!trustedOrigins.has(window.location.origin)) return;
  if (window.__CINNY_EXTERNAL_LINK_CAPTURE_INSTALLED__) return;
  window.__CINNY_EXTERNAL_LINK_CAPTURE_INSTALLED__ = true;

  window.addEventListener('click', (event) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const anchor = target?.closest('a[href]');
    if (!anchor?.href) return;

    let url;
    try {
      url = new URL(anchor.href);
    } catch {
      return;
    }

    if (!allowedProtocols.has(url.protocol)) return;
    if (url.origin === window.location.origin) return;

    event.preventDefault();
    window.location.assign(url.href);
  }, true);
})();
