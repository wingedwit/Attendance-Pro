(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const isSecureContextLike = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  if (!isSecureContextLike) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Registration failures should not block app usage.
    });
  });
})();
