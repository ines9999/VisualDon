import { MAPBOX_TOKEN, FESTIVAL_NEONS, getPointRadius, state } from './config.js';

export function initMap() {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  state.map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [8.2, 46.8],
    zoom: 6.5,
    minZoom: 5.5,
    maxZoom: 16,
    pitch: 50,
    bearing: -10,
    antialias: true,
    maxBounds: [[4.5, 45.2], [11.5, 48.5]],
    interactive: false,
  });

  state.map.on('load', () => {
    state.mapReady = true;

    // Relief 3D
    state.map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512, maxzoom: 14,
    });
    state.map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.8 });

    // Masque pays voisins
    state.map.addSource('world-mask', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    state.map.addLayer({ id: 'outside-switzerland', type: 'fill', source: 'world-mask',
      paint: { 'fill-color': '#080808', 'fill-opacity': 1 } });

    // Contour Suisse
    state.map.addSource('swiss-border', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    state.map.addLayer({ id: 'swiss-border-line', type: 'line', source: 'swiss-border',
      paint: { 'line-color': '#ffffff', 'line-opacity': 0.2, 'line-width': 1.5 } });

    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(r => r.json())
      .then(data => {
        const ch = data.features.find(f => f.properties.ISO_A2 === 'CH');
        if (!ch) return;
        const maskCoords = [
          [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]],
          ...(ch.geometry.type === 'MultiPolygon' ? ch.geometry.coordinates.map(p => p[0]) : ch.geometry.coordinates),
        ];
        state.map.getSource('world-mask').setData({ type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: maskCoords } }] });
        state.map.getSource('swiss-border').setData({ type: 'FeatureCollection', features: [ch] });
      })
      .catch(() => {
        const fallback = [
          [[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]],
          [[6.02,47.07],[6.16,46.38],[6.73,46.14],[7.05,45.93],[7.57,45.98],[8.08,45.99],
           [8.45,46.24],[8.95,45.83],[9.18,46.24],[9.56,46.30],[10.07,46.57],[10.45,46.87],
           [10.42,47.06],[9.89,47.55],[9.60,47.68],[9.00,47.69],[8.56,47.81],[8.23,47.95],
           [7.67,47.59],[7.19,47.50],[6.74,47.43],[6.56,47.07],[6.02,47.07]],
        ];
        state.map.getSource('world-mask').setData({ type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: fallback } }] });
      });

    // Points secondaires — tous les festivals non-featured (informatifs seulement)
  state.map.addSource('festivals-secondary', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  state.map.addLayer({
    id: 'festivals-secondary-dots',
    type: 'circle',
    source: 'festivals-secondary',
    paint: {
      'circle-radius': 6,
      'circle-color': '#ffffff',
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.4,
    },
  });

  // Trail néon jaune
    state.map.addSource('festival-trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    state.map.addLayer({ id: 'trail-glow', type: 'line', source: 'festival-trail',
      paint: { 'line-color': '#e8ff47', 'line-opacity': 0.2, 'line-width': 8, 'line-blur': 6 } });
    state.map.addLayer({ id: 'trail-line', type: 'line', source: 'festival-trail',
      paint: { 'line-color': '#e8ff47', 'line-opacity': 0.85, 'line-width': 1.5, 'line-dasharray': [2, 4] } });

    // Points festivals
    state.map.addSource('festivals', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    state.map.addLayer({ id: 'festivals-halo', type: 'circle', source: 'festivals',
      paint: { 'circle-radius': ['get','haloRadius'], 'circle-color': ['get','neon'], 'circle-opacity': 0.15, 'circle-blur': 1 } });
    state.map.addLayer({ id: 'festivals-points', type: 'circle', source: 'festivals',
      paint: { 'circle-radius': ['get','radius'], 'circle-color': ['get','neon'], 'circle-opacity': 1,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff', 'circle-stroke-opacity': 0.3 } });

    // Pulse halo
    let pulseOpacity = 0.15, pulseDir = 1;
    setInterval(() => {
      pulseOpacity += pulseDir * 0.012;
      if (pulseOpacity >= 0.35) pulseDir = -1;
      if (pulseOpacity <= 0.08) pulseDir = 1;
      if (state.map.getLayer('festivals-halo'))
        state.map.setPaintProperty('festivals-halo', 'circle-opacity', pulseOpacity);
    }, 50);
  });
}

export function revealSecondaryFestivals(allFestivals) {
  const secondary = allFestivals.filter(f => !f.featured);
  const features = secondary.map(f => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [f.coordinates.lng, f.coordinates.lat] },
    properties: { name: f.name, city: f.city },
  }));
  if (state.map.getSource('festivals-secondary')) {
    state.map.getSource('festivals-secondary').setData({ type: 'FeatureCollection', features });
  }
}

export function revealUpTo(index) {
  const features = state.festivals.slice(0, index + 1).map((fest, i) => {
    const r = getPointRadius(fest.attendance);
    return { type: 'Feature',
      geometry: { type: 'Point', coordinates: [fest.coordinates.lng, fest.coordinates.lat] },
      properties: { index: i, name: fest.name, neon: FESTIVAL_NEONS[i] || '#e8ff47', radius: r, haloRadius: r + 10 } };
  });
  state.map.getSource('festivals').setData({ type: 'FeatureCollection', features });
  if (index >= 1) {
    const coords = state.festivals.slice(0, index + 1).map(f => [f.coordinates.lng, f.coordinates.lat]);
    state.map.getSource('festival-trail').setData({ type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }] });
  } else {
    state.map.getSource('festival-trail').setData({ type: 'FeatureCollection', features: [] });
  }
}

export function droneFlyTo(toFest, onArrival) {
  const dist = state.currentIndex >= 0
    ? Math.sqrt(Math.pow(toFest.coordinates.lng - state.festivals[state.currentIndex].coordinates.lng, 2) +
        Math.pow(toFest.coordinates.lat - state.festivals[state.currentIndex].coordinates.lat, 2))
    : 0;
  const duration = Math.max(1800, Math.min(3500, dist * 500 + 1200));
  state.map.flyTo({
    center: [toFest.coordinates.lng, toFest.coordinates.lat],
    zoom: 13, pitch: 55, bearing: -10 + (Math.random() * 20 - 10),
    duration, essential: true,
    easing: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
  });
  setTimeout(onArrival, duration);
}

export function flyToOverview() {
  state.map.flyTo({ center: [8.2, 46.8], zoom: 6.5, pitch: 50, bearing: -10, duration: 1800, essential: true });
}

// Révéler tous les marqueurs des 12 festivals featured dans l'outro
export function revealAllFestivalMarkers() {
  if (!state.map || !state.festivals) return;
  // Tous les marqueurs sont déjà visibles via revealUpTo
  // On s'assure juste que le trail et tous les points sont affichés
  try {
    if (state.map.getSource('festivals-trail')) {
      const coords = state.festivals.map(f => [f.coordinates.lng, f.coordinates.lat]);
      state.map.getSource('festivals-trail').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords }
      });
    }
  } catch(e) {}
}