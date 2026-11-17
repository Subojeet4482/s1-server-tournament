// Small UI niceties for the redesigned panel (no logic): greeting by time of day.
(function () {
  const set = () => {
    const el = document.getElementById('dash-date');
    if (!el) return;
    const h = new Date().getHours();
    const g = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
    el.textContent = g + ' · ' + new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  };
  set();
  setInterval(set, 60000);
})();
