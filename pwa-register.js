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
        const registration = await navigator.serviceWorker.register('./service-worker.js', {
          updateViaCache: 'none'
        });
        await registration.update();

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
      } catch (_) {
        // Registration failures should not block app usage.
      }
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(register, { timeout: 1500 });
    } else {
      setTimeout(register, 800);
    }
  });
})();
