import { state, formatNumber } from './config.js';

export function showOutro() {
  const mapContainer = document.getElementById('map-container');
  const outro = document.getElementById('outro');
  const panel = document.getElementById('festival-panel');
  const nav = document.getElementById('festival-nav');

  // Cacher panel et nav
  if (panel) gsap.to(panel, { opacity: 0, x: -20, duration: 0.4, ease: 'power2.in',
    onComplete: () => panel.classList.remove('visible') });
  if (nav) nav.style.display = 'none';

  // La carte est déjà visible (zoom arrière fait dans goToFinalOverview)
  // Afficher l'outro par-dessus
  outro.classList.add('visible');
  gsap.fromTo(outro, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.inOut' });
  gsap.fromTo('.outro-stat', { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out', delay: 0.4 });
  gsap.fromTo('.outro-conclusion', { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 1.2 });
}

export function updateOutroStats() {
  const total = state.festivals.reduce((acc, f) => acc + (f.attendance || 0), 0);
  const days = state.festivals.reduce((acc, f) => acc + f.duration_days, 0);
  const cantons = [...new Set(state.festivals.map(f => f.canton))].length;
  document.getElementById('o-festivals').textContent = state.festivals.length;
  document.getElementById('o-attendees').textContent = formatNumber(total) + '+';
  document.getElementById('o-cantons').textContent = cantons;
  document.getElementById('o-days').textContent = days;

  const allCount = (state.allFestivals || state.festivals).length;
  const conclusionEl = document.getElementById('outro-conclusion');
  if (conclusionEl) {
    conclusionEl.innerHTML =
      "<p class=\"outro-text\">Ces 12 festivals ne sont qu'un aperçu.</p>" +
      "<p class=\"outro-text-sub\">La Suisse compte plus de <strong>" + allCount + "</strong> festivals — des grands rendez-vous populaires aux événements confidentiels nichés dans les Alpes, chaque été réinvente la carte musicale de la Confédération.</p>" +
      "<p class=\"outro-text-sub neon-text\">L'été suisse ne fait que commencer.</p>";
  }
}