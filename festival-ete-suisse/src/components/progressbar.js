import { state } from './config.js';
import { FESTIVAL_NEONS } from './config.js';

export function buildNavDots(festivals, onDotClick) {
  const container = document.getElementById('festival-nav-dots');
  if (!container) return;
  container.innerHTML = '';

  festivals.forEach((fest, i) => {
    const dot = document.createElement('button');
    dot.className = 'nav-dot';
    dot.setAttribute('data-index', i);
    dot.setAttribute('title', fest.name);

    // Tooltip
    const tooltip = document.createElement('span');
    tooltip.className = 'nav-dot-tooltip';
    tooltip.textContent = fest.name;
    dot.appendChild(tooltip);

    dot.addEventListener('click', () => onDotClick(i));
    container.appendChild(dot);
  });
}

export function updateProgress(index) {
  // Mettre à jour le dot actif
  const dots = document.querySelectorAll('.nav-dot');
  const neon = FESTIVAL_NEONS[index] || '#e8ff47';

  dots.forEach((dot, i) => {
    dot.classList.remove('active', 'visited');
    if (i === index) {
      dot.classList.add('active');
      dot.style.setProperty('--dot-neon', neon);
    } else if (i < index) {
      dot.classList.add('visited');
      dot.style.setProperty('--dot-neon', FESTIVAL_NEONS[i] || '#e8ff47');
    }
  });

  // Boutons prev/next
  document.getElementById('prevBtn').disabled = index === 0;
  document.getElementById('nextBtn').disabled = index === state.festivals.length - 1;
}