import { state } from './config.js';
import { goToFestival } from './scrollcontroller.js';

export function startJourney() {
  const intro = document.getElementById('intro');
  const mapContainer = document.getElementById('map-container');
  gsap.to(intro, {
    opacity: 0, duration: 0.8, ease: 'power2.inOut',
    onComplete: () => {
      intro.style.display = 'none';
      mapContainer.classList.add('active');
      gsap.fromTo(mapContainer, { opacity: 0 }, { opacity: 1, duration: 0.6 });
      if (state.mapReady) setTimeout(() => goToFestival(0), 400);
      else state.map.on('load', () => setTimeout(() => goToFestival(0), 400));
    },
  });
}