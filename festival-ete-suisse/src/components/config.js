// ===== CONFIG & CONSTANTES GLOBALES =====

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export const FESTIVAL_NEONS = [
  '#ff9500', '#ff6eb4', '#00ffc8', '#ff6b35', '#ffd700',
  '#a78bfa', '#00e5ff', '#ff4d6d', '#e8ff47', '#4dffb4',
  '#ff3cac', '#39ff14',
];

export const ARTIST_VISUALS = {
  'Kendji Girac':     { skin: '#c8845a', hair: '#2c1a0e', hairStyle: 'curly',  top: '#e63946', accessory: 'guitar' },
  'M. Pokora':        { skin: '#d4956a', hair: '#1a1a1a', hairStyle: 'short',  top: '#1d3557' },
  'Mika':             { skin: '#f0c090', hair: '#4a3000', hairStyle: 'curly',  top: '#f72585' },
  'Niska':            { skin: '#6b3a2a', hair: '#1a1a1a', hairStyle: 'dreads', top: '#000000' },
  'Lost Frequencies': { skin: '#e8b89a', hair: '#3d2b1f', hairStyle: 'short',  top: '#023e8a', accessory: 'headphones' },
  'Jean-Louis Aubert':{ skin: '#d4956a', hair: '#888888', hairStyle: 'medium', top: '#6c584c', accessory: 'guitar' },
  'Feu! Chatterton':  { skin: '#f0d0a8', hair: '#2c1a0e', hairStyle: 'long',   top: '#3a0ca3' },
  'The Hives':        { skin: '#f0c090', hair: '#1a1a1a', hairStyle: 'short',  top: '#000000', accessory: 'mic' },
  'Vanessa Paradis':  { skin: '#f5deb3', hair: '#2c1a0e', hairStyle: 'long',   top: '#e63946' },
  'Gaël Faye':        { skin: '#5c3317', hair: '#1a1a1a', hairStyle: 'short',  top: '#2d6a4f' },
  'Arodes':           { skin: '#d4956a', hair: '#1a1a1a', hairStyle: 'short',  top: '#7209b7' },
  'Fedele':           { skin: '#e8b89a', hair: '#3d2b1f', hairStyle: 'short',  top: '#4361ee' },
  'Shimza':           { skin: '#3d1c02', hair: '#1a1a1a', hairStyle: 'shaved', top: '#e63946' },
  'Sting':            { skin: '#d4a070', hair: '#f0f0d0', hairStyle: 'short',  top: '#1b4332', accessory: 'guitar' },
  'Nick Cave':        { skin: '#f0d0a8', hair: '#1a1a1a', hairStyle: 'slick',  top: '#1a1a1a' },
  'RAYE':             { skin: '#c8845a', hair: '#5c3a1e', hairStyle: 'bun',    top: '#ff006e' },
  'Moby':             { skin: '#f5e6d0', hair: '#f5e6d0', hairStyle: 'bald',   top: '#457b9d' },
  'John Legend':      { skin: '#7a4520', hair: '#1a1a1a', hairStyle: 'short',  top: '#1a1a1a' },
  'Wiz Khalifa':      { skin: '#5c3317', hair: '#1a1a1a', hairStyle: 'dreads', top: '#ffd60a' },
  'Don Toliver':      { skin: '#8B4513', hair: '#2a1a0a', hairStyle: 'dreads', top: '#370617' },
  'Sido':             { skin: '#d4956a', hair: '#1a1a1a', hairStyle: 'short',  top: '#6d6875' },
  'Gunna':            { skin: '#6b3a2a', hair: '#1a1a1a', hairStyle: 'dreads', top: '#03071e' },
  'Ken Carson':       { skin: '#c8845a', hair: '#909090', hairStyle: 'long_bw', top: '#10002b' },
  'Lorde':            { skin: '#f5e6d0', hair: '#1a1a1a', hairStyle: 'long',   top: '#1a1a1a' },
  'Sean Paul':        { skin: '#7a4520', hair: '#1a1a1a', hairStyle: 'dreads', top: '#f77f00' },
  'Teddy Swims':      { skin: '#c8845a', hair: '#1a1a1a', hairStyle: 'beard',  top: '#264653' },
  'Kraftklub':        { skin: '#f0c090', hair: '#2c1a0e', hairStyle: 'short',  top: '#d62828' },
  'Nina Chuba':       { skin: '#f5deb3', hair: '#f0d060', hairStyle: 'long',   top: '#7b2d8b' },
  'Julien Doré':      { skin: '#f0c090', hair: '#1a1a1a', hairStyle: 'medium', top: '#2b2d42' },
  'Christophe Maé':   { skin: '#d4956a', hair: '#8B4513', hairStyle: 'curly',  top: '#e76f51' },
  'GIMS':             { skin: '#3d1c02', hair: '#1a1a1a', hairStyle: 'short',  top: '#1a1a1a' },
  'Louane':           { skin: '#f5deb3', hair: '#c8a06a', hairStyle: 'long',   top: '#f4acb7' },
  'Vitaa':            { skin: '#c8845a', hair: '#1a1a1a', hairStyle: 'long',   top: '#6a0572' },
  'Twenty One Pilots':{ skin: '#d4956a', hair: '#1a1a1a', hairStyle: 'short',  top: '#1a1a1a' },
  'The Cure':         { skin: '#f5e6d0', hair: '#1a1a1a', hairStyle: 'wild',   top: '#1a1a1a' },
  'Gorillaz':         { skin: '#a8d8a8', hair: '#1a1a2e', hairStyle: 'short',  top: '#16213e' },
  'Katy Perry':       { skin: '#f5deb3', hair: '#1a6bff', hairStyle: 'long',   top: '#ff006e' },
  'Lenny Kravitz':    { skin: '#5c3317', hair: '#1a1a1a', hairStyle: 'dreads', top: '#1a1a1a', accessory: 'guitar' },
  'Nicky Jam':        { skin: '#c8845a', hair: '#1a1a1a', hairStyle: 'short',  top: '#e63946' },
  'Amy Macdonald':    { skin: '#f5deb3', hair: '#8B4513', hairStyle: 'long',   top: '#2d6a4f' },
  'Mark Forster':     { skin: '#f0c090', hair: '#1a1a1a', hairStyle: 'cap',    top: '#3a86ff' },
  'David Guetta':     { skin: '#d4956a', hair: '#888888', hairStyle: 'short',  top: '#03045e', accessory: 'headphones' },
  'Afrojack':         { skin: '#6b3a2a', hair: '#1a1a1a', hairStyle: 'tall',   top: '#1a1a1a' },
  'Synapson':         { skin: '#f0c090', hair: '#2c1a0e', hairStyle: 'short',  top: '#2b9348' },
  'Helmut Fritz':     { skin: '#f5e6d0', hair: '#f0f0d0', hairStyle: 'short',  top: '#e63946' },
  'PLK':              { skin: '#5c3317', hair: '#1a1a1a', hairStyle: 'short',  top: '#370617' },
};

export function getPointRadius(attendance) {
  if (!attendance) return 6;
  if (attendance >= 500000) return 16;
  if (attendance >= 200000) return 13;
  if (attendance >= 100000) return 10;
  if (attendance >= 50000)  return 8;
  return 6;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
}

export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return n.toString();
}

// State global partagé
export const state = {
  festivals: [],
  currentIndex: -1,
  isAnimating: false,
  mapReady: false,
  festivalOverlayVisible: false,
  awaitingFinalScroll: false,
  map: null,
};