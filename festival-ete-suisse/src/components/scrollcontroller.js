import { FESTIVAL_NEONS, state } from './config.js';
import { revealUpTo, droneFlyTo, flyToOverview, revealSecondaryFestivals, revealAllFestivalMarkers } from './map.js';
import { updateProgress, buildNavDots } from './progressbar.js';
import { showPanel, hidePanel, updatePanelContent } from './festivalscard.js';
import { showFestivalOverlay, hideFestivalOverlay } from './charts.js';
import { showOutro } from './outro.js';

export function goToFestival(index) {
  if (state.isAnimating || !state.mapReady) return;
  state.isAnimating = true;

  const fest = state.festivals[index];
  const neon = FESTIVAL_NEONS[index] || '#e8ff47';

  const arrive = () => {
    state.currentIndex = index;
    revealUpTo(index);
    updateProgress(index);
    updatePanelContent(fest, index, neon);
    showPanel(neon);
    showFestivalOverlay(fest, index, neon);
    state.isAnimating = false;
  };

  if (state.festivalOverlayVisible) {
    hideFestivalOverlay(() => {
      hidePanel();
      droneFlyTo(fest, arrive);
    });
  } else {
    hidePanel();
    droneFlyTo(fest, arrive);
  }
}

export function goToOverview() {
  if (state.isAnimating || !state.mapReady) return;
  state.isAnimating = true;

  const doOverview = () => {
    hidePanel();
    state.currentIndex = -1;
    flyToOverview();
    setTimeout(() => { state.isAnimating = false; }, 1800);
  };

  if (state.festivalOverlayVisible) hideFestivalOverlay(doOverview);
  else doOverview();
}

export function goToFinalOverview() {
  if (state.isAnimating || !state.mapReady) return;
  state.isAnimating = true;

  const doFinal = () => {
    hidePanel();
    state.currentIndex = state.festivals.length;

    // Cacher le trail (traitillés)
    try {
      if (state.map.getLayer('festivals-trail')) {
        state.map.setPaintProperty('festivals-trail', 'line-opacity', 0);
      }
    } catch(e) {}

    // Révéler tous les points secondaires
    if (state.allFestivals) revealSecondaryFestivals(state.allFestivals);
    revealAllFestivalMarkers();

    // Zoom arrière sur toute la Suisse
    state.map.flyTo({
      center: [8.2, 46.8],
      zoom: 6.5,
      pitch: 30,
      bearing: 0,
      duration: 2400,
      essential: true
    });

    // Débloquer — attendre un scroll pour aller à la conclusion
    setTimeout(() => {
      state.isAnimating = false;
      state.awaitingFinalScroll = true;
    }, 2800);
  };

  if (state.festivalOverlayVisible) hideFestivalOverlay(doFinal);
  else doFinal();
}

export function initEvents(startJourney) {
  document.getElementById('startBtn').addEventListener('click', startJourney);

  // Scroll sur l'intro = démarrer le voyage
  // Afficher la barre de nav après démarrage du voyage
  function showNavBar() {
    setTimeout(() => {
      buildNavDots(state.festivals, (i) => goToFestival(i));
      const nav = document.getElementById('festival-nav');
      if (nav) nav.style.display = 'flex';
    }, 900);
  }

  let introScrolled = false;
  document.getElementById('intro').addEventListener('wheel', (e) => {
    if (introScrolled || e.deltaY <= 0) return;
    introScrolled = true;
    startJourney();
    showNavBar();
  }, { passive: true });

  // Touch swipe vers le haut sur mobile
  let touchStartY = 0;
  document.getElementById('intro').addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  document.getElementById('intro').addEventListener('touchend', (e) => {
    if (introScrolled) return;
    const diff = touchStartY - e.changedTouches[0].clientY;
    if (diff > 40) { introScrolled = true; startJourney(); showNavBar(); }
  }, { passive: true });

  // Clic sur le bouton
  document.getElementById('startBtn').addEventListener('click', () => {
    showNavBar();
  }, { once: true });

  document.getElementById('prevBtn').addEventListener('click', () => {
    if (state.currentIndex > 0) goToFestival(state.currentIndex - 1);
    else if (state.currentIndex === 0) goToOverview();
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (state.currentIndex < state.festivals.length - 1) goToFestival(state.currentIndex + 1);
    else goToFinalOverview();
  });
  document.getElementById('restartBtn').addEventListener('click', () => location.reload());

  // Scroll — se déclenche immédiatement au premier wheel, bloqué pendant l'animation
  let scrollLock = false;

  window.addEventListener('wheel', (e) => {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer.classList.contains('active')) return;

    // Priorité absolue — scroll final vers la conclusion
    if (state.awaitingFinalScroll && e.deltaY > 0) {
      state.awaitingFinalScroll = false;
      showOutro();
      return;
    }

    if (state.isAnimating || scrollLock) return;

    scrollLock = true;
    setTimeout(() => { scrollLock = false; }, 800);

    if (e.deltaY > 0) {
      if (state.currentIndex === -1) goToFestival(0);
      else if (state.currentIndex < state.festivals.length - 1) goToFestival(state.currentIndex + 1);
      else goToFinalOverview();
    } else if (e.deltaY < 0) {
      if (state.currentIndex > 0) goToFestival(state.currentIndex - 1);
      else if (state.currentIndex === 0) goToOverview();
    }
  }, { passive: true });

  let navTouchStartY = 0;
  window.addEventListener('touchstart', (e) => { navTouchStartY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    const delta = navTouchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 50) return;
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer.classList.contains('active')) return;
    if (delta > 0) {
      if (state.currentIndex === -1) goToFestival(0);
      else if (state.currentIndex < state.festivals.length - 1) goToFestival(state.currentIndex + 1);
      else goToFinalOverview();
    } else {
      if (state.currentIndex > 0) goToFestival(state.currentIndex - 1);
      else if (state.currentIndex === 0) goToOverview();
    }
  }, { passive: true });
}