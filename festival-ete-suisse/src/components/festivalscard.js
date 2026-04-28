import { ARTIST_VISUALS, formatDate, formatNumber, state } from './config.js';

export function showPanel(neon) {
  const panel = document.getElementById('festival-panel');
  panel.classList.add('visible');
  document.documentElement.style.setProperty('--festival-neon', neon);
  gsap.to(panel, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' });
}

export function hidePanel() {
  const panel = document.getElementById('festival-panel');
  gsap.to(panel, {
    opacity: 0, x: -20, duration: 0.4, ease: 'power2.in',
    onComplete: () => panel.classList.remove('visible'),
  });
}

export function updatePanelContent(fest, index, neon) {
  document.getElementById('fst-index').textContent = String(index + 1).padStart(2, '0');
  document.getElementById('fst-canton').textContent = fest.canton;
  document.getElementById('fst-genre').textContent = fest.genre;
  document.getElementById('fst-name').textContent = fest.name;
  document.getElementById('fst-city').textContent = fest.city;

  const start = formatDate(fest.date_start);
  const end = formatDate(fest.date_end);
  document.getElementById('fst-dates').textContent =
    fest.duration_days === 1 ? start : `${start} – ${end}`;
  document.getElementById('fst-duration').textContent =
    `${fest.duration_days} jour${fest.duration_days > 1 ? 's' : ''}`;
  document.getElementById('fst-attendance').textContent =
    fest.attendance ? formatNumber(fest.attendance) : 'N/A';

  if (fest.free) {
    document.getElementById('fst-ticket').textContent = 'Gratuit';
  } else if (fest.ticket_price_per_day) {
    document.getElementById('fst-ticket').textContent = `CHF ${fest.ticket_price_per_day}`;
  } else if (fest.ticket_price_note) {
    document.getElementById('fst-ticket').textContent = 'Variable';
  } else {
    document.getElementById('fst-ticket').textContent = 'N/A';
  }

  // Artistes affichés sur la scène 3D uniquement
  document.querySelector('.fst-headliners').style.display = 'none';

  document.getElementById('fst-anecdote-text').textContent = fest.anecdote || '';
  document.getElementById('fst-website').href = fest.website;

  gsap.fromTo('#panel-inner > *',
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out', delay: 0.2 });
}

// ===== PANEL TOGGLE =====
export function initPanelToggle() {
  const btn = document.getElementById('panel-toggle');
  const panel = document.getElementById('festival-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });
}