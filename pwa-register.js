(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const isSecureContextLike = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  if (!isSecureContextLike) return;

  window.addEventListener('load', () => {
    const register = () => navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Registration failures should not block app usage.
    });

    // Register in idle time so first paint and first interactions stay fast.
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(register, { timeout: 2000 });
    } else {
      setTimeout(register, 1200);
    }
  });
})();
