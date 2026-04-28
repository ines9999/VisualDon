import { state, formatNumber } from './components/config.js';
import { initMap, revealSecondaryFestivals } from './components/map.js';
import { buildFestivalOverlay } from './components/charts.js';
import { initEvents, goToFestival } from './components/scrollcontroller.js';
import { startJourney } from './components/intro.js';
import { updateOutroStats } from './components/outro.js';
import { initPanelToggle } from './components/festivalscard.js';
import { initOverlays } from './components/overlays.js';

// ===== LOAD DATA =====
async function loadData() {
  const res = await fetch('/data/festivals.json');
  const raw = await res.json();
  const all = raw.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
  // Seuls les 12 festivals featured participent au storytelling
  state.festivals = all.filter(f => f.featured);
  state.allFestivals = all;
  document.getElementById('progress-total').textContent = state.festivals.length;
  init();
}

// ===== INIT =====
function init() {
  initMap();
  buildFestivalOverlay();
  initEvents(startJourney);
  updateOutroStats();
  initOverlays();
  initPanelToggle();
  // Les points secondaires sont affichés uniquement dans l'outro
}

loadData();