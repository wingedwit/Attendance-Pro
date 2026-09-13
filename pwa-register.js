(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const isSecureContextLike = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  if (!isSecureContextLike) return;

  let refreshPending = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshPending) return;
    refreshPending = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('./service-worker.js');
        await registration.update();
      } catch (_) {
        // Registration failures should not block app usage.
      }
    };

    // Register in idle time so first paint and first interactions stay fast.
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(register, { timeout: 2000 });
    } else {
      setTimeout(register, 1200);
    }
  });
})();
