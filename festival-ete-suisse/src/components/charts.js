import { FESTIVAL_NEONS, ARTIST_VISUALS, state, formatDate } from './config.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ===== STATE =====
const isDayMode = false;
let threeScene = null;
let threeCamera = null;
let threeRenderer = null;
let composer = null;
let threeAnimFrame = null;
let crowdMeshes = [];
let lightBeams = [];
let beatTime = 0;
let currentNeon = '#e8ff47';

// Artist hover state
let artistItems = [];
let hoverSpot = null;
let hoverMouseHandler = null;
let hoverRaycaster = null;
let hoverActiveIdx = -1;

// ===== OVERLAY HTML =====
export function buildFestivalOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'festival-overlay';
  overlay.innerHTML = `
    <canvas id="three-canvas"></canvas>
    <div class="overlay-info" id="overlay-info"></div>
  `;
  document.getElementById('map-container').appendChild(overlay);
}

function applyDayNight() { return; }

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1,3),16)/255,
    parseInt(hex.slice(3,5),16)/255,
    parseInt(hex.slice(5,7),16)/255,
  ];
}

function hexToColor(hex) {
  const [r,g,b] = hexToRgb(hex);
  return new THREE.Color(r,g,b);
}

function getGenreColors(fest, neon) {
  const genre = (fest.genre||'').toLowerCase();
  if (genre.includes('électro')||genre.includes('techno')||genre.includes('house'))
    return ['#00ffc8','#ff3cac','#a78bfa','#00e5ff',neon];
  if (genre.includes('hip')||genre.includes('rap')||genre.includes('urban'))
    return ['#ff6b35','#ffd700','#ff3cac','#ffffff',neon];
  if (genre.includes('jazz'))
    return ['#ffd700','#ff9500','#f5deb3','#ffffff',neon];
  if (genre.includes('rock'))
    return ['#e63946','#ff9500','#ffffff','#a78bfa',neon];
  return [neon,'#ffffff','#ff6eb4','#00ffc8','#ffd700'];
}

// ===== FOULE 3D =====
function createCrowdPerson(scale, x, z) {
  const group = new THREE.Group();
  // Couleurs légèrement variées pour la foule — bloom naturel
  const crowdColors = [0x0a0a14, 0x080812, 0x0c0a16, 0x080a10, 0x0a0810];
  const mat = new THREE.MeshStandardMaterial({
    color: crowdColors[Math.floor(Math.random() * crowdColors.length)],
    emissive: new THREE.Color(0x050508),
    emissiveIntensity: 0.3,
    roughness: 0.9,
    metalness: 0.1,
  });

  const legGeo = new THREE.CylinderGeometry(0.07*scale,0.07*scale,0.7*scale,6);
  [-0.12,0.12].forEach(xOff => {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(xOff*scale, 0.35*scale, 0);
    group.add(leg);
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42*scale,0.55*scale,0.18*scale), mat);
  body.position.set(0, 1.1*scale, 0);
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19*scale,8,8), mat);
  head.position.set(0, 1.75*scale, 0);
  group.add(head);

  const armGeo = new THREE.CylinderGeometry(0.065*scale,0.055*scale,0.6*scale,6);
  const armGroupL = new THREE.Group();
  armGroupL.position.set(-0.28*scale, 1.42*scale, 0);
  const armLMesh = new THREE.Mesh(armGeo, mat);
  armLMesh.position.set(-0.3*scale, 0, 0);
  armGroupL.add(armLMesh);
  group.add(armGroupL);

  const armGroupR = new THREE.Group();
  armGroupR.position.set(0.28*scale, 1.42*scale, 0);
  const armRMesh = new THREE.Mesh(armGeo.clone(), mat);
  armRMesh.position.set(0.3*scale, 0, 0);
  armGroupR.add(armRMesh);
  group.add(armGroupR);

  group.position.set(x, 0, z);
  group.rotation.y = (Math.random()-0.5)*0.4;

  return { group, armGroupL, armGroupR, body,
    phase: Math.random()*Math.PI*2, speed: 0.7+Math.random()*0.7,
    baseY: 0, row: 0, scale };
}

// ===== ARTISTE — SILHOUETTE 2D SUR PLAN =====
function createArtist3D(name, _neon, scale) {
  const v = ARTIST_VISUALS[name] || { skin:'#1a1a1a', hair:'#333333', hairStyle:'short', top:'#222233' };

  const W = 256, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  // Couleurs atténuées pour éviter le bloom
  const skinR = parseInt(v.skin.slice(1,3),16);
  const skinG = parseInt(v.skin.slice(3,5),16);
  const skinB = parseInt(v.skin.slice(5,7),16);
  const skinColor = `rgb(${Math.floor(skinR*0.65)},${Math.floor(skinG*0.6)},${Math.floor(skinB*0.55)})`;

  const topR = parseInt(v.top.slice(1,3),16);
  const topG = parseInt(v.top.slice(3,5),16);
  const topB = parseInt(v.top.slice(5,7),16);
  const topColor = `rgb(${Math.floor(topR*0.6)},${Math.floor(topG*0.6)},${Math.floor(topB*0.6)})`;

  const LEGS_COLOR = '#1a1a2e';

  // Jambes
  ctx.fillStyle = LEGS_COLOR;
  ctx.beginPath(); ctx.roundRect(cx-24, H*0.56, 20, H*0.38, 5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx+4,  H*0.56, 20, H*0.38, 5); ctx.fill();

  // Chaussures
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(cx-14, H*0.955, 16, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+14, H*0.955, 16, 6, 0, 0, Math.PI*2); ctx.fill();

  // Torse
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(cx-32, H*0.56); ctx.lineTo(cx-27, H*0.32);
  ctx.lineTo(cx+27, H*0.32); ctx.lineTo(cx+32, H*0.56);
  ctx.closePath(); ctx.fill();

  // Bras — droits, légèrement écartés du corps
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.roundRect(cx-38, H*0.32, 13, H*0.25, 7); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx+25, H*0.32, 13, H*0.25, 7); ctx.fill();

  // Cou court
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.roundRect(cx-9, H*0.268, 18, H*0.048, 3); ctx.fill();

  // Tête (dessinée AVANT les cheveux qui peuvent déborder)
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.ellipse(cx, H*0.20, 26, 30, 0, 0, Math.PI*2); ctx.fill();

  ctx.lineWidth = 6;
  ctx.shadowBlur = 0;

  const hairR = parseInt(v.hair.slice(1,3),16);
  const hairG = parseInt(v.hair.slice(3,5),16);
  const hairB = parseInt(v.hair.slice(5,7),16);
  const hairCol = `rgb(${Math.floor(hairR*0.55)},${Math.floor(hairG*0.55)},${Math.floor(hairB*0.55)})`;
  ctx.fillStyle = hairCol;
  ctx.strokeStyle = hairCol;
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  const hy = H*0.20;

  switch(v.hairStyle) {
    case 'afro':
      ctx.beginPath(); ctx.arc(cx, hy, 42, 0, Math.PI*2); ctx.fill(); break;

    case 'curly':
      // Base couvrant tout le haut de la tête
      ctx.beginPath(); ctx.arc(cx, hy-8, 27, Math.PI, 0); ctx.fill();
      // Boucles autour
      for(let i=0;i<8;i++){
        const a = -Math.PI + i/7*Math.PI;
        ctx.beginPath(); ctx.arc(cx+Math.cos(a)*24, hy+Math.sin(a)*14-4, 13, 0, Math.PI*2); ctx.fill();
      }
      // Frange sur le front
      for(let i=0;i<4;i++){
        ctx.beginPath(); ctx.arc(cx-12+i*8, hy+18, 9, 0, Math.PI*2); ctx.fill();
      }
      break;

    case 'dreads':
      ctx.beginPath(); ctx.arc(cx, hy-10, 28, Math.PI, 0); ctx.fill();
      for(let i=0;i<7;i++){
        ctx.beginPath(); ctx.roundRect(cx-27+i*9-3, hy+8, 7, 38+i*2, 4); ctx.fill();
      } break;

    case 'long':
      // Dessus de la tête
      ctx.beginPath(); ctx.arc(cx, hy-8, 28, Math.PI, 0); ctx.fill();
      // Côtés seulement — laisser le centre libre pour le visage/cou
      ctx.beginPath(); ctx.roundRect(cx-30, hy-5, 16, 70, 8); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx+14, hy-5, 16, 70, 8); ctx.fill();
      // Frange légère
      ctx.beginPath(); ctx.roundRect(cx-18, hy+14, 36, 14, 5); ctx.fill();
      break;

    case 'bun':
      ctx.beginPath(); ctx.arc(cx, hy-8, 28, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, hy-42, 13, 0, Math.PI*2); ctx.fill();
      // Chignon texture
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(cx, hy-42, 9, 0, Math.PI*2); ctx.stroke(); break;

    case 'wild':
      for(let i=0;i<12;i++){
        const a=-Math.PI*0.9+i/12*Math.PI*1.8;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*26, hy+Math.sin(a)*18);
        ctx.lineTo(cx+Math.cos(a)*50+((i%3)-1)*5, hy+Math.sin(a)*38);
        ctx.stroke();
      }
      ctx.fillStyle=hairCol;
      ctx.beginPath(); ctx.arc(cx, hy, 22, Math.PI, 0); ctx.fill(); break;

    case 'bald':
      // Reflet crâne
      ctx.fillStyle='rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.ellipse(cx-5, hy-12, 10, 7, -0.5, 0, Math.PI*2); ctx.fill(); break;

    case 'medium':
      ctx.beginPath(); ctx.arc(cx, hy-8, 28, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx-26, hy-5, 52, 30, 8); ctx.fill(); break;

    case 'shaved':
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, hy-8, 27, Math.PI, 0); ctx.fill();
      // Texture rasée
      ctx.fillStyle='rgba(0,0,0,0.15)';
      for(let i=0;i<5;i++){
        ctx.beginPath(); ctx.ellipse(cx-10+i*5, hy-14, 2, 1, 0, 0, Math.PI*2); ctx.fill();
      } break;

    case 'slick':
      ctx.beginPath(); ctx.arc(cx, hy-8, 28, Math.PI, 0); ctx.fill();
      // Raie sur le côté
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.roundRect(cx-2, hy-36, 3, 18, 2); ctx.fill(); break;

    case 'beard':
      // Cheveux courts
      ctx.beginPath(); ctx.arc(cx, hy-8, 28, Math.PI, 0); ctx.fill();
      // Barbe
      ctx.fillStyle = hairCol;
      ctx.beginPath(); ctx.ellipse(cx, hy+18, 18, 14, 0, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx-14, hy+10, 7, 12, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx+14, hy+10, 7, 12, 0.3, 0, Math.PI*2); ctx.fill(); break;

    case 'cap':
      // Casquette
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.ellipse(cx, hy-22, 30, 10, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx-30, hy-22, 60, 14, [8,8,0,0]); ctx.fill();
      // Visière
      ctx.beginPath(); ctx.ellipse(cx+5, hy-8, 34, 8, 0.1, Math.PI*0.6, Math.PI*1.4); ctx.fill(); break;

    case 'tall':
      // Cheveux très hauts (Afrojack style)
      ctx.beginPath(); ctx.arc(cx, hy, 28, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx-20, hy-55, 40, 50, 8); ctx.fill(); break;

    case 'long_bw':
      // Ken Carson — cheveux mi-longs noir et blanc
      ctx.fillStyle = '#888888';
      ctx.strokeStyle = '#888888';
      ctx.beginPath(); ctx.arc(cx, hy-8, 28, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx-30, hy-5, 16, 65, 8); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx+14, hy-5, 16, 65, 8); ctx.fill();
      // Mèches noires
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.roundRect(cx-22, hy-5, 7, 60, 4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx+16, hy-5, 7, 60, 4); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx-5, hy+12, 10, 14, 3); ctx.fill();
      break;

    default: // short
      ctx.beginPath(); ctx.arc(cx, hy-8, 28, Math.PI, 0); ctx.fill(); break;
  }

  // ── VISAGE — toujours dessiné EN DERNIER pour être au-dessus des cheveux ──
  // Repeindre la tête par-dessus les cheveux qui auraient débordé
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.ellipse(cx, H*0.20, 25, 29, 0, 0, Math.PI*2); ctx.fill();

  // Yeux
  ctx.fillStyle = 'rgba(15,8,3,0.9)';
  ctx.beginPath(); ctx.ellipse(cx-9, H*0.19, 4, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+9, H*0.19, 4, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(cx-7, H*0.186, 1.5, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+11, H*0.186, 1.5, 2, 0, 0, Math.PI*2); ctx.fill();

  // Sourcils
  ctx.strokeStyle = `rgb(${Math.floor(hairR*0.5)},${Math.floor(hairG*0.5)},${Math.floor(hairB*0.5)})`;
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx-14, H*0.175); ctx.lineTo(cx-4, H*0.171); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+4,  H*0.171); ctx.lineTo(cx+14, H*0.175); ctx.stroke();

  // Bouche neutre
  ctx.strokeStyle = 'rgba(60,20,10,0.55)';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 6, H*0.222);
  ctx.bezierCurveTo(cx - 2, H*0.224, cx + 2, H*0.224, cx + 6, H*0.222);
  ctx.stroke();

  // ── ACCESSOIRE ──
  const acc = v.accessory || null;
  if (acc === 'guitar') {
    ctx.save();
    ctx.translate(cx + 10, H * 0.48);
    ctx.rotate(-0.18);

    // Manche — long et fin
    ctx.fillStyle = '#7a3b10';
    ctx.beginPath(); ctx.roundRect(-4, -115, 8, 90, 3); ctx.fill();
    // Tête du manche avec mécaniques
    ctx.fillStyle = '#5c2d0a';
    ctx.beginPath(); ctx.roundRect(-6, -130, 12, 18, 3); ctx.fill();
    for(let t=0;t<3;t++){
      ctx.fillStyle = '#aaa';
      ctx.beginPath(); ctx.arc(-8, -127+t*6, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -127+t*6, 3, 0, Math.PI*2); ctx.fill();
    }

    // Corps guitare — forme Stratocaster reconnaissable
    ctx.fillStyle = '#b5451b';
    // Corne supérieure
    ctx.beginPath();
    ctx.moveTo(-22, -38);
    ctx.bezierCurveTo(-28, -50, -24, -60, -14, -55);
    ctx.bezierCurveTo(-6, -50, -4, -40, -4, -30);
    // Corne inférieure (plus courte)
    ctx.bezierCurveTo(-4, -20, -26, -18, -28, -10);
    ctx.bezierCurveTo(-30, 0, -28, 10, -22, 18);
    // Bas du corps
    ctx.bezierCurveTo(-16, 38, 16, 42, 22, 28);
    ctx.bezierCurveTo(28, 14, 26, -10, 20, -24);
    ctx.bezierCurveTo(16, -34, 14, -42, 8, -50);
    ctx.bezierCurveTo(4, -58, 10, -68, 6, -72);
    ctx.bezierCurveTo(0, -78, -8, -68, -10, -60);
    ctx.bezierCurveTo(-14, -50, -18, -44, -22, -38);
    ctx.closePath(); ctx.fill();

    // Pickguard blanc
    ctx.fillStyle = 'rgba(240,240,240,0.4)';
    ctx.beginPath();
    ctx.moveTo(-18, -28); ctx.lineTo(-6, -52); ctx.lineTo(4, -48);
    ctx.lineTo(4, 10); ctx.lineTo(-10, 22); ctx.lineTo(-18, 14);
    ctx.closePath(); ctx.fill();

    // Micros (pickups)
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.roundRect(-8, -40, 16, 8, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-8, -26, 16, 8, 2); ctx.fill();

    // Cordes
    ctx.strokeStyle = 'rgba(210,190,150,0.7)'; ctx.lineWidth = 1;
    for(let s=-2;s<=2;s++){
      ctx.beginPath(); ctx.moveTo(s*2, -110); ctx.lineTo(s*2.5, 30); ctx.stroke();
    }

    // Chevalet
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.roundRect(-10, 20, 20, 6, 2); ctx.fill();

    ctx.restore();

  } else if (acc === 'mic') {
    // Micro tenu à la main
    const mx2 = cx + 30, my2 = H * 0.42;
    // Pied/tige
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx2, my2 + 12); ctx.lineTo(mx2, my2 + 55); ctx.stroke();
    // Base
    ctx.strokeStyle = '#444'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx2 - 10, my2 + 55); ctx.lineTo(mx2 + 10, my2 + 55); ctx.stroke();
    // Capsule (boule métallique)
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.arc(mx2, my2, 11, 0, Math.PI*2); ctx.fill();
    // Grille micro
    ctx.strokeStyle = '#777'; ctx.lineWidth = 1;
    for(let g=-8;g<=8;g+=4){
      ctx.beginPath(); ctx.moveTo(mx2+g, my2-10); ctx.lineTo(mx2+g, my2+10); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(mx2, my2, 9, 0, Math.PI*2); ctx.stroke();
    // Anneau
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.roundRect(mx2-12, my2+9, 24, 5, 2); ctx.fill();

  } else if (acc === 'headphones') {
    // Casque DJ sur les oreilles
    const hhy = H * 0.20;
    // Arc du casque
    ctx.strokeStyle = '#222'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, hhy - 8, 34, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    // Coussinet gauche
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(cx - 34, hhy - 6, 9, 13, 0.15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.ellipse(cx - 34, hhy - 6, 6, 10, 0.15, 0, Math.PI*2); ctx.fill();
    // Coussinet droit
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(cx + 34, hhy - 6, 9, 13, -0.15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.ellipse(cx + 34, hhy - 6, 6, 10, -0.15, 0, Math.PI*2); ctx.fill();
  }

  // Bouche neutre (ligne droite légèrement courbée)

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, alphaTest: 0.01,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale * 2.2, scale * 4.4, 1);

  const group = new THREE.Group();
  group.add(sprite);

  return { group, armGroupL: null, armGroupR: null, torso: null, headMesh: null, sprite, mat };
}

// ===== DECORS =====
function getFestivalDecorId(fest) {
  const city = (fest.city||'').toLowerCase();
  const name = (fest.name||'').toLowerCase();
  if (name.includes('caribana')) return 'caribana';
  if (name.includes('lake parade')) return 'geneva';
  if (name.includes('fête de la musique')||name.includes('fete de la musique')) return 'geneva';
  if (city.includes('genève')||city.includes('geneve')) return 'geneva';
  if (name.includes('montreux')) return 'montreux';
  if (name.includes('paléo')||name.includes('paleo')) return 'paleo';
  if (name.includes('street parade')) return 'streetparade';
  if (name.includes('frauenfeld')) return 'frauenfeld';
  if (name.includes('gurten')) return 'gurten';
  if (city.includes('sion')) return 'sion';
  if (name.includes('festineuch')||city.includes('neuchâtel')||city.includes('neuchatel')) return 'festineuch';
  if (name.includes('lakelive')||city.includes('biel')||city.includes('bienne')) return 'lakelive';
  if (name.includes('venoge')||city.includes('penthaz')) return 'venoge';
  return 'default';
}


function addPalmTree(scene, x, z, h=6) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.28, h, 8),
    new THREE.MeshPhysicalMaterial({color:0x8b6914, roughness:0.95})
  );
  trunk.position.set(x, h/2, z);
  trunk.rotation.z = (Math.random()-0.5)*0.25;
  scene.add(trunk);
  for(let fi=0;fi<7;fi++){
    const angle = fi/7*Math.PI*2;
    const leaf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3.5, 4),
      new THREE.MeshPhysicalMaterial({color:0x2d6e2d, roughness:0.9})
    );
    leaf.position.set(x+Math.cos(angle)*1.6, h+0.6, z+Math.sin(angle)*0.6);
    leaf.rotation.z = Math.cos(angle)*0.75;
    leaf.rotation.x = Math.sin(angle)*0.4;
    scene.add(leaf);
  }
  const coconut = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshPhysicalMaterial({color:0x5c3d1a, roughness:0.9})
  );
  coconut.position.set(x, h+0.2, z);
  scene.add(coconut);
}

function addLake(scene, color=0x0a2a4a, zPos=-14) {
  const lake = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 30),
    new THREE.MeshPhysicalMaterial({color, roughness:0.0, metalness:0.1, transmission:0.55})
  );
  lake.rotation.x = -Math.PI/2;
  lake.position.set(0, 0.02, zPos);
  scene.add(lake);
}

function addMountains(scene, peaks, color=0x334455) {
  peaks.forEach(([xp,h]) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(h/2, h, 5),
      new THREE.MeshPhysicalMaterial({color, roughness:0.9})
    );
    m.position.set(xp, h/2, -42);
    scene.add(m);
    // Neige
    const snow = new THREE.Mesh(
      new THREE.ConeGeometry(h/6, h/4, 5),
      new THREE.MeshPhysicalMaterial({color:0xeeeeff, roughness:0.8})
    );
    snow.position.set(xp, h-h/8, -42);
    scene.add(snow);
  });
}

function addSwissFlag(scene, x, z, h=8) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, h, 6),
    new THREE.MeshPhysicalMaterial({color:0x888888, roughness:0.5, metalness:0.8})
  );
  pole.position.set(x, h/2, z);
  scene.add(pole);
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.6, 0.06),
    new THREE.MeshBasicMaterial({color:0xcc0000, side:THREE.DoubleSide})
  );
  flag.position.set(x+1.4, h-1.3, z);
  scene.add(flag);
  const cv = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 1.56, 0.08),
    new THREE.MeshBasicMaterial({color:0xffffff})
  );
  cv.position.set(x+1.4, h-1.3, z+0.05);
  scene.add(cv);
  const ch2 = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.52, 0.08),
    new THREE.MeshBasicMaterial({color:0xffffff})
  );
  ch2.position.set(x+1.4, h-1.3, z+0.05);
  scene.add(ch2);
}

function addFestivalDecor(decorId, neon, scene) {
  switch(decorId) {
    // ── CARIBANA — Lac Léman, palmiers ──
    case 'caribana': {
      addLake(scene, 0x1a4878, -28);
      [-22,-12,0,12,22].forEach(x => addPalmTree(scene, x, -14, 5+Math.random()*2));
      // Bateau à voile
      const hull=new THREE.Mesh(new THREE.BoxGeometry(4,0.8,1.5),new THREE.MeshPhysicalMaterial({color:0xeeeedd,roughness:0.6}));
      hull.position.set(18,0.4,-16); scene.add(hull);
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,5,6),new THREE.MeshPhysicalMaterial({color:0x8b6914}));
      mast.position.set(18,3,-16); scene.add(mast);
      const sail=new THREE.Mesh(new THREE.ConeGeometry(1.8,4,4),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85,side:THREE.DoubleSide}));
      sail.position.set(18,3.5,-16); sail.rotation.z=0.2; scene.add(sail);
      break;
    }

    // ── FÊTE DE LA MUSIQUE / LAKE PARADE — Genève, jet d'eau, drapeau suisse ──
    case 'geneva': {
      addLake(scene, 0x0a2a4a, -26);

      // Jet d'eau de Genève — colonne centrale haute
      for(let i=0;i<6;i++){
        const jet=new THREE.Mesh(
          new THREE.CylinderGeometry(0.04+i*0.03, 0.2+i*0.04, 8+i*2, 8, 1, true),
          new THREE.MeshBasicMaterial({color:0xaaddff,transparent:true,opacity:0.35-i*0.04,side:THREE.DoubleSide})
        );
        jet.position.set(8, 4+i*2, -16); scene.add(jet);
      }
      // Lumière bleue sous le jet
      const jetLight=new THREE.PointLight(0x88ccff, 2, 15);
      jetLight.position.set(8,1,-16); scene.add(jetLight);
      // Rive avec bâtiments genevois
      [[-20,6],[-12,8],[0,5],[12,7],[20,6]].forEach(([xp,h])=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(3.5,h,2.5),new THREE.MeshPhysicalMaterial({color:0xc8b89a,roughness:0.7}));
        b.position.set(xp,h/2,-22); scene.add(b);
        const roof=new THREE.Mesh(new THREE.CylinderGeometry(0,2,2,4),new THREE.MeshPhysicalMaterial({color:0x556677,roughness:0.8}));
        roof.position.set(xp,h+1,-22); scene.add(roof);
      });
      addMountains(scene,[[-30,12],[-15,18],[0,14],[15,16],[30,13]],0x445566);
      break;
    }

    // ── MONTREUX JAZZ — Château Chillon, Alpes, lac ──
    case 'montreux': {
      addLake(scene, 0x0a2840, -28);
      // Château Chillon détaillé
      const cMat=new THREE.MeshPhysicalMaterial({color:0xc0a878,roughness:0.7,metalness:0.1});
      const castleBase=new THREE.Mesh(new THREE.BoxGeometry(10,5,5),cMat); castleBase.position.set(-16,2.5,-18); scene.add(castleBase);
      [[-20,5],[-16,7],[-12,4]].forEach(([xp,h])=>{
        const t=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,h,8),cMat.clone()); t.position.set(xp,h/2,-17); scene.add(t);
        const cone=new THREE.Mesh(new THREE.ConeGeometry(1.4,2.5,8),new THREE.MeshPhysicalMaterial({color:0x6a1010,roughness:0.8}));
        cone.position.set(xp,h+1.2,-17); scene.add(cone);
      });
      // Créneaux
      for(let ci=-2;ci<=2;ci++){
        const cr=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.8,0.4),cMat.clone());
        cr.position.set(-16+ci*1.8,5.4,-16.8); scene.add(cr);
      }
      // Reflet rouge Montreux Jazz dans le lac
      const jazzLight=new THREE.PointLight(0xff2200,1.5,20); jazzLight.position.set(0,1,-18); scene.add(jazzLight);
      addMountains(scene,[[-30,14],[-15,20],[0,16],[15,18],[30,14]],0x334455);
      break;
    }

    // ── PALÉO NYON — Grande prairie, arbres, château de Nyon ──
    case 'paleo': {
      // Herbe verte
      const grass=new THREE.Mesh(new THREE.PlaneGeometry(100,60),new THREE.MeshPhysicalMaterial({color:0x1a3a18,roughness:0.95}));
      grass.rotation.x=-Math.PI/2; grass.position.set(0,0.01,-10); scene.add(grass);
      // Arbres variés
      [[-28,-20],[-20,-22],[-12,-19],[12,-21],[20,-20],[28,-22]].forEach(([xp,zp])=>{
        const h=3+Math.random()*2;
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.25,h,8),new THREE.MeshPhysicalMaterial({color:0x5c3317,roughness:0.95}));
        trunk.position.set(xp,h/2,zp); scene.add(trunk);
        const top=new THREE.Mesh(new THREE.SphereGeometry(1.4,8,8),new THREE.MeshPhysicalMaterial({color:0x1f4a1a,roughness:0.9}));
        top.position.set(xp,h+0.8,zp); scene.add(top);
      });
      // Château de Nyon en fond
      const nyonMat=new THREE.MeshPhysicalMaterial({color:0xd4c4a0,roughness:0.7});
      const nCastle=new THREE.Mesh(new THREE.BoxGeometry(6,5,3),nyonMat); nCastle.position.set(16,2.5,-22); scene.add(nCastle);
      [14,18].forEach(xp=>{
        const nt=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,4,8),nyonMat.clone()); nt.position.set(xp,4,-21); scene.add(nt);
        const nc=new THREE.Mesh(new THREE.ConeGeometry(1.1,2,8),new THREE.MeshPhysicalMaterial({color:0x8b0000,roughness:0.8}));
        nc.position.set(xp,6,-21); scene.add(nc);
      });
      addLake(scene, 0x1a3a5a, -38);
      break;
    }

    // ── STREET PARADE ZURICH — Skyline Zurich, lac, Love Mobile ──
    case 'streetparade': {
      addLake(scene, 0x0a1f3a, -30);
      // Skyline Zurich
      const bColors=[0x0d0d1a,0x0a0a14,0x111122,0x0e0e1c,0x0c0c18];
      [[-28,9],[-20,13],[-12,10],[-5,15],[3,12],[10,16],[18,11],[26,10]].forEach(([xp,h],i)=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(4,h,2.5),new THREE.MeshPhysicalMaterial({color:bColors[i%5],roughness:0.6,metalness:0.3}));
        b.position.set(xp,h/2,-24); scene.add(b);
        for(let wi=0;wi<Math.floor(h/2);wi++){
          const w=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.1),new THREE.MeshBasicMaterial({color:Math.random()>0.35?0xffee88:0x111122}));
          w.position.set(xp+(Math.random()-0.5)*3,wi*2+1,-22.5); scene.add(w);
        }
      });
      // Grossmünster (cathédrale Zurich) — deux tours
      const gMat=new THREE.MeshPhysicalMaterial({color:0x888877,roughness:0.7});
      [-3,3].forEach(xp=>{
        const gt=new THREE.Mesh(new THREE.CylinderGeometry(1,1,12,8),gMat.clone()); gt.position.set(-18+xp,6,-26); scene.add(gt);
        const gc=new THREE.Mesh(new THREE.ConeGeometry(1.2,4,8),new THREE.MeshPhysicalMaterial({color:0x556644,roughness:0.8}));
        gc.position.set(-18+xp,13,-26); scene.add(gc);
      });
      // Love Mobile — float coloré
      const lm=new THREE.Mesh(new THREE.BoxGeometry(5,2,2.5),new THREE.MeshPhysicalMaterial({color:0xff00aa,roughness:0.3,metalness:0.4}));
      lm.position.set(10,1,-10); scene.add(lm);
      const lmTop=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,10),new THREE.MeshBasicMaterial({color:0xff66cc}));
      lmTop.position.set(10,2.8,-10); scene.add(lmTop);
      // Confettis
      for(let i=0;i<200;i++){
        const cCol=FESTIVAL_NEONS[Math.floor(Math.random()*FESTIVAL_NEONS.length)];
        const c=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.02),new THREE.MeshBasicMaterial({color:hexToColor(cCol)}));
        c.position.set((Math.random()-0.5)*40,Math.random()*15,(Math.random()-0.5)*20+5);
        c.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
        c.name='confetti_'+i; scene.add(c);
      }
      break;
    }

    // ── FRAUENFELD — Hip-hop, écrans LED, graffitis ──
    case 'frauenfeld': {
      [-14,14].forEach(xp=>{
        const wall=new THREE.Mesh(new THREE.BoxGeometry(0.4,10,14),new THREE.MeshPhysicalMaterial({color:0x1a1a1a,roughness:0.95}));
        wall.position.set(xp,5,-15); scene.add(wall);
        for(let gi=0;gi<8;gi++){
          const gCol=FESTIVAL_NEONS[Math.floor(Math.random()*FESTIVAL_NEONS.length)];
          const g=new THREE.Mesh(new THREE.BoxGeometry(0.05,1.5+Math.random()*2,2+Math.random()*2),new THREE.MeshBasicMaterial({color:hexToColor(gCol),transparent:true,opacity:0.7}));
          g.position.set(xp+(xp>0?-0.3:0.3),2+Math.random()*6,-12+Math.random()*6); scene.add(g);
        }
      }); break;
    }

    // ── GURTEN BERNE — Colline verdoyante, ours (symbole de Berne) ──
    case 'gurten': {
      const hill=new THREE.Mesh(new THREE.SphereGeometry(22,16,16,0,Math.PI*2,0,Math.PI/2),
        new THREE.MeshPhysicalMaterial({color:0x1e4010,roughness:0.9}));
      hill.position.set(0,-10,-30); scene.add(hill);
      // Arbres sur la colline
      [[-18,-24],[-8,-26],[5,-25],[15,-24],[22,-22]].forEach(([xp,zp])=>{
        const h=2+Math.random();
        const t=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,h,6),new THREE.MeshPhysicalMaterial({color:0x5c3317,roughness:0.95}));
        t.position.set(xp,h/2,zp); scene.add(t);
        const tc=new THREE.Mesh(new THREE.ConeGeometry(0.9,2,7),new THREE.MeshPhysicalMaterial({color:0x1a4010,roughness:0.9}));
        tc.position.set(xp,h+0.8,zp); scene.add(tc);
      });
      // Ours de Berne stylisé (silhouette)
      const bearMat=new THREE.MeshPhysicalMaterial({color:0x8b4513,roughness:0.8});
      const bearBody=new THREE.Mesh(new THREE.SphereGeometry(1.2,8,8),bearMat); bearBody.position.set(-20,1.2,-20); scene.add(bearBody);
      const bearHead=new THREE.Mesh(new THREE.SphereGeometry(0.8,8,8),bearMat.clone()); bearHead.position.set(-20,2.8,-20); scene.add(bearHead);
      [[-21.2,2.2],[-18.8,2.2]].forEach(([xp,yp])=>{
        const ear=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,6),bearMat.clone()); ear.position.set(xp,yp,-20); scene.add(ear);
      });
      const bearL=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,1.5,6),bearMat.clone()); bearL.position.set(-21.5,0,-20); scene.add(bearL);
      const bearR=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,1.5,6),bearMat.clone()); bearR.position.set(-18.5,0,-20); scene.add(bearR);
      break;
    }

    // ── SION SOUS LES ÉTOILES — Château Tourbillon, vignes, Alpes ──
    case 'sion': {
      // Vignes en rangées
      for(let row=0;row<4;row++){
        for(let col=0;col<8;col++){
          const vp=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.8,0.06),new THREE.MeshPhysicalMaterial({color:0x5c3317,roughness:0.9}));
          vp.position.set(-14+col*4,0.4,-20-row*2); scene.add(vp);
          const vt=new THREE.Mesh(new THREE.BoxGeometry(4,0.06,0.06),new THREE.MeshPhysicalMaterial({color:0x8b6914,roughness:0.9}));
          vt.position.set(-14+col*4,0.8,-20-row*2); scene.add(vt);
        }
      }
      // Château de Tourbillon sur colline
      const hillS=new THREE.Mesh(new THREE.ConeGeometry(6,5,8),new THREE.MeshPhysicalMaterial({color:0x7a7060,roughness:0.9}));
      hillS.position.set(16,2.5,-34); scene.add(hillS);
      const vMat=new THREE.MeshPhysicalMaterial({color:0xd4c4a0,roughness:0.7});
      const tourbillon=new THREE.Mesh(new THREE.BoxGeometry(4,4,3),vMat); tourbillon.position.set(16,7.5,-34); scene.add(tourbillon);
      [14,18].forEach(xp=>{
        const tt=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,3.5,8),vMat.clone()); tt.position.set(xp,11,-33); scene.add(tt);
        const tc=new THREE.Mesh(new THREE.ConeGeometry(0.9,2,8),new THREE.MeshPhysicalMaterial({color:0x6a1010,roughness:0.8}));
        tc.position.set(xp,13,-33); scene.add(tc);
      });
      addMountains(scene,[[-30,16],[-18,22],[-5,18],[8,20],[22,17],[32,14]],0x445566);
      break;
    }

    // ── FESTINEUCH — Lac Neuchâtel, château ──
    case 'festineuch': {
      addLake(scene, 0x0e2a45, -28);
      // Château de Neuchâtel
      const nMat=new THREE.MeshPhysicalMaterial({color:0xd4c4a0,roughness:0.7});
      const nCastle=new THREE.Mesh(new THREE.BoxGeometry(7,5,3.5),nMat); nCastle.position.set(-14,2.5,-30); scene.add(nCastle);
      [[-17,5],[-11,4]].forEach(([xp,h])=>{
        const t=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,h,8),nMat.clone()); t.position.set(xp,h/2,-29); scene.add(t);
        const c=new THREE.Mesh(new THREE.ConeGeometry(1.1,2,8),new THREE.MeshPhysicalMaterial({color:0x556655,roughness:0.8}));
        c.position.set(xp,h+1,-29); scene.add(c);
      });
      addMountains(scene,[[-28,10],[-12,14],[5,11],[20,13]],0x334455);
      break;
    }

    // ── LAKELIVE BIENNE — Lac de Bienne, bilingue ──
    case 'lakelive': {
      addLake(scene, 0x0a2035, -28);
      // Île Saint-Pierre (symbole du lac de Bienne)
      const isle=new THREE.Mesh(new THREE.CylinderGeometry(5,6,0.5,12),new THREE.MeshPhysicalMaterial({color:0x2a4a1a,roughness:0.9}));
      isle.position.set(12,0.3,-32); scene.add(isle);
      [9,13,11].forEach((xp,i)=>{
        const t=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,1.5+i*0.5,6),new THREE.MeshPhysicalMaterial({color:0x5c3317,roughness:0.95}));
        t.position.set(xp,1,-31+i); scene.add(t);
        const tc=new THREE.Mesh(new THREE.SphereGeometry(0.8,6,6),new THREE.MeshPhysicalMaterial({color:0x1f4010,roughness:0.9}));
        tc.position.set(xp,2.5+i*0.3,-31+i); scene.add(tc);
      });
      addMountains(scene,[[-28,10],[-14,13],[0,11],[16,12]],0x334455);
      break;
    }

    // ── VENOGE — Rivière, forêt, nature ──
    case 'venoge': {
      // Rivière Venoge
      const river=new THREE.Mesh(new THREE.PlaneGeometry(8,40),new THREE.MeshPhysicalMaterial({color:0x1a3a5a,roughness:0.0,metalness:0.1,transmission:0.6}));
      river.rotation.x=-Math.PI/2; river.position.set(-10,0.05,-20); scene.add(river);
      // Forêt dense
      [[-28,-18],[-22,-22],[-16,-20],[-8,-24],[0,-22],[8,-20],[16,-24],[24,-20],[30,-18]].forEach(([xp,zp])=>{
        const h=3+Math.random()*2;
        const t=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.22,h,6),new THREE.MeshPhysicalMaterial({color:0x5c3317,roughness:0.95}));
        t.position.set(xp,h/2,zp); scene.add(t);
        const tc=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.5,7),new THREE.MeshPhysicalMaterial({color:0x1a4010,roughness:0.9}));
        tc.position.set(xp,h+1,zp); scene.add(tc);
      });
      // Prairie verte
      const meadow=new THREE.Mesh(new THREE.PlaneGeometry(80,40),new THREE.MeshPhysicalMaterial({color:0x1e4018,roughness:0.95}));
      meadow.rotation.x=-Math.PI/2; meadow.position.set(0,0.01,-15); scene.add(meadow);
      break;
    }

    // ── DEFAULT — montagnes génériques ──
    default: {
      addMountains(scene,[[-25,8],[-10,10],[10,9],[25,8]],0x334455);
      break;
    }
  }
}

// ===== ACTIVATE ARTIST ON HOVER =====
function _activateArtist(idx, nCol) {
  artistItems.forEach((item, i) => {
    const isActive = i === idx;

    if (item.mat) {
      gsap.to(item.mat, { opacity: isActive ? 1.0 : 0.15, duration: 0.18, overwrite: true });
    }

    gsap.to(item.backdropMat, { opacity: isActive ? 0.1 : 0.82, duration: 0.18 });

    gsap.to(item.halo.material, { opacity: isActive ? 0.85 : 0.0, duration: 0.15 });
    gsap.to(item.halo.scale, { x: isActive?1.8:0.4, y: isActive?1.8:0.4, z: isActive?1.8:0.4, duration: 0.2 });

    gsap.to(item.group.scale, { x: isActive?1.15:0.95, y: isActive?1.15:0.95, z: isActive?1.15:0.95, duration: 0.18 });
    gsap.to(item.group.position, { z: isActive ? item.az+0.5 : item.az, duration: 0.18 });

    if (item.nameSprite) gsap.to(item.nameSprite.material, { opacity: isActive ? 1.0 : 0.0, duration: 0.18 });
  });
}

// ===== INIT SCENE =====
export function initThreeScene(neon, genreColors, headliners, fest) {
  const canvas = document.getElementById('three-canvas');
  const W = canvas.clientWidth || window.innerWidth;
  const H = canvas.clientHeight || window.innerHeight;
  currentNeon = neon;

  threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  threeRenderer.setSize(W, H);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  threeRenderer.shadowMap.enabled = true;
  threeRenderer.shadowMap.type = THREE.PCFShadowMap;
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 0.65;
  threeRenderer.outputColorSpace = THREE.SRGBColorSpace;

  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0x020205);
  threeScene.fog = new THREE.FogExp2(0x020205, 0.008);

  threeCamera = new THREE.PerspectiveCamera(60, W/H, 0.1, 200);
  threeCamera.position.set(0, 4, 22);
  threeCamera.lookAt(0, 5, 0);

  const [nr,ng,nb] = hexToRgb(neon);
  const nCol = new THREE.Color(nr,ng,nb);

  const ambLight = new THREE.AmbientLight(0x0a0a1a, 0.2);
  ambLight.name = 'ambientLight'; threeScene.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0x112244, 0.04);
  dirLight.name = 'dirLight';
  dirLight.position.set(5,20,10); dirLight.castShadow=true;
  dirLight.shadow.mapSize.width=2048; dirLight.shadow.mapSize.height=2048;
  dirLight.shadow.bias=-0.001; threeScene.add(dirLight);

  const fillLight = new THREE.PointLight(nCol, 1.2, 40);
  fillLight.position.set(0,8,-5); threeScene.add(fillLight);

  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x050510, roughness: 0.15, metalness: 0.8, reflectivity: 1.0,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100,80), floorMat);
  floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; threeScene.add(floor);

  addFestivalDecor(getFestivalDecorId(fest), neon, threeScene);

  const stageMat = new THREE.MeshPhysicalMaterial({color:0x0d0d1e,roughness:0.1,metalness:0.6,reflectivity:1.0});
  const stage = new THREE.Mesh(new THREE.BoxGeometry(28,1.2,10), stageMat);
  stage.position.set(0,0.6,-8); stage.receiveShadow=true; stage.castShadow=true; threeScene.add(stage);

  const edge = new THREE.Mesh(new THREE.BoxGeometry(28,0.08,0.2), new THREE.MeshBasicMaterial({color:nCol}));
  edge.position.set(0,1.25,-3.2); threeScene.add(edge);

  const edgeLight = new THREE.PointLight(nCol,3,8);
  edgeLight.position.set(0,1,-3); threeScene.add(edgeLight);

  const trussMat = new THREE.MeshPhysicalMaterial({color:0x888899,roughness:0.2,metalness:0.9});
  [-12,12].forEach(xp=>{
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,14,8),trussMat);
    col.position.set(xp,7,-8); col.castShadow=true; threeScene.add(col);
    for(let yi=0;yi<5;yi++){
      const d=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,6),trussMat.clone());
      d.position.set(xp+(yi%2===0?0.4:-0.4),2+yi*2.5,-8);
      d.rotation.z=(yi%2===0?0.5:-0.5); threeScene.add(d);
    }
  });
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,26,8),trussMat);
  bar.rotation.z=Math.PI/2; bar.position.set(0,14,-8); threeScene.add(bar);
  const bar2=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,26,8),trussMat);
  bar2.rotation.z=Math.PI/2; bar2.position.set(0,10,-8); threeScene.add(bar2);

  const screenCol = new THREE.Color(nr*0.2,ng*0.2,nb*0.2);
  const screenMat = new THREE.MeshPhysicalMaterial({
    color:screenCol, emissive:new THREE.Color(nr*0.3,ng*0.3,nb*0.3),
    emissiveIntensity:0.5, roughness:0.1, metalness:0.5,
  });
  const screen=new THREE.Mesh(new THREE.BoxGeometry(14,6,0.3),screenMat);
  screen.position.set(0,8,-13); screen.name='screen'; threeScene.add(screen);
  [-10,10].forEach(xp=>{
    const ss=new THREE.Mesh(new THREE.BoxGeometry(5,4,0.3),screenMat.clone());
    ss.position.set(xp,7,-12); ss.rotation.y=xp>0?-0.3:0.3; threeScene.add(ss);
  });

  const stageLight=new THREE.SpotLight(nCol,2.5,45,Math.PI/5,0.5,1);
  stageLight.position.set(0,14,-8); stageLight.target.position.set(0,0,-5);
  stageLight.castShadow=true; stageLight.shadow.mapSize.width=1024; stageLight.shadow.mapSize.height=1024;
  threeScene.add(stageLight); threeScene.add(stageLight.target);

  // ── FOULE 3D ──
  crowdMeshes = [];
  for(let row=0;row<9;row++){
    for(let col=0;col<20;col++){
      const x=(col-10)*1.35+(Math.random()-0.5)*0.5;
      const z=4+row*1.5+(Math.random()-0.5)*0.4;
      const scale=Math.max(0.6,1-row*0.035)+Math.random()*0.08;
      const p=createCrowdPerson(scale,x,z);
      p.row=row; threeScene.add(p.group); crowdMeshes.push(p);
      // Lumières de téléphone dans les premiers rangs
      if (row < 3 && Math.random() > 0.75) {
        const phoneLight = new THREE.PointLight(0xaaccff, 0.15, 2.5);
        phoneLight.position.set(x, 1.8*scale, z);
        threeScene.add(phoneLight);
      }
    }
  }

  // ── TÊTES D'AFFICHE ──
  if (headliners && headliners.length > 0) {
    artistItems = [];
    hoverActiveIdx = -1;

    const maxA = Math.min(headliners.length, 5);
    const spacing = Math.min(7.0, 28 / maxA);
    const startX = -(maxA - 1) * spacing / 2;
    const az = -4.5;

    // Label TÊTES D'AFFICHE
    const lc = document.createElement('canvas');
    lc.width=1024; lc.height=96;
    const lctx=lc.getContext('2d');
    lctx.fillStyle='#000000'; lctx.fillRect(0,0,1024,96);
    lctx.strokeStyle='#ffffff'; lctx.lineWidth=3; lctx.strokeRect(3,3,1018,90);
    lctx.fillStyle='#ffffff'; lctx.font='bold 50px Arial';
    lctx.textAlign='center'; lctx.textBaseline='middle';
    lctx.fillText("TÊTES D'AFFICHE",512,48);
    const labelSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(lc),transparent:false,depthWrite:false}));
    labelSprite.scale.set(22,2.0,1);
    labelSprite.position.set(0,12,-7.5);
    threeScene.add(labelSprite);

    hoverSpot = null;
    hoverRaycaster = new THREE.Raycaster();

    headliners.slice(0, maxA).forEach((h, i) => {
      const ax = startX + i * spacing;
      const SCALE = 1.1;

      const backdropMat = new THREE.MeshBasicMaterial({
        color:0x000000, transparent:true, opacity:0.0,
        side:THREE.DoubleSide, depthWrite:false, colorWrite:false,
      });
      const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 7.5), backdropMat);
      backdrop.position.set(ax, 4.0, az + 0.3);
      threeScene.add(backdrop);
      const darkBackMat = backdropMat;

      const artist = createArtist3D(h.name, neon, SCALE);
      artist.group.position.set(ax, 1.25 + SCALE*2.2, az); // feet on stage
      artist.group.traverse(c => { c.userData.artistIdx = i; });
      threeScene.add(artist.group);

      const halo = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24),
        new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.0, depthWrite:false}));
      halo.rotation.x=-Math.PI/2; halo.position.set(ax,1.22,az);
      halo.name='artist_halo_'+i; threeScene.add(halo);

      const floorLight = null;

      // Nom de l'artiste — caché au repos, visible au hover
      const c2d = document.createElement('canvas');
      c2d.width = 512; c2d.height = 100;
      const ctx = c2d.getContext('2d');
      ctx.clearRect(0, 0, 512, 100);
      // Taille de police adaptative selon la longueur du nom
      const nameUp = h.name.toUpperCase();
      let fontSize = 54;
      ctx.font = `bold ${fontSize}px monospace`;
      while (ctx.measureText(nameUp).width > 490 && fontSize > 22) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px monospace`;
      }
      ctx.fillStyle = 'rgba(180,180,180,0.85)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(nameUp, 256, 50);
      const tex = new THREE.CanvasTexture(c2d);
      const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.0, depthWrite: false,
      }));
      nameSprite.scale.set(5.5, 1.1, 1);
      nameSprite.position.set(ax, 1.25 + SCALE*4.4 + 1.0, az + 1.5);
      nameSprite.name = 'artist_label_' + i;
      threeScene.add(nameSprite);

      artistItems.push({ group:artist.group, mat:artist.mat, backdropMat:darkBackMat, backdropPlane:backdrop, halo, nameSprite, ax, az, floorLight });
    });

    _activateArtist(0, nCol);

    if (hoverMouseHandler) window.removeEventListener('mousemove', hoverMouseHandler);

    hoverMouseHandler = (e) => {
      if (!threeCamera || !threeScene || artistItems.length === 0) return;
      const canvas = document.getElementById('three-canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      hoverRaycaster.setFromCamera(mouse, threeCamera);

      const backdrops = [];
      artistItems.forEach((item, i) => {
        if (item.backdropPlane) {
          item.backdropPlane.userData.artistIdx = i;
          backdrops.push(item.backdropPlane);
        }
      });

      const bodyMeshes = [];
      artistItems.forEach(item => {
        item.group.traverse(child => { if (child.isMesh) bodyMeshes.push(child); });
      });

      let found = -1;
      const bHits = hoverRaycaster.intersectObjects(backdrops);
      if (bHits.length > 0) {
        found = bHits[0].object.userData.artistIdx;
      } else {
        const mHits = hoverRaycaster.intersectObjects(bodyMeshes);
        if (mHits.length > 0) found = mHits[0].object.userData.artistIdx ?? -1;
      }

      if (found !== -1 && found !== hoverActiveIdx) {
        hoverActiveIdx = found;
        _activateArtist(found, nCol);
      } else if (found === -1 && hoverActiveIdx !== -1) {
        hoverActiveIdx = -1;
        artistItems.forEach((item) => {
          if (item.mat) gsap.to(item.mat, { opacity: 0.7, duration: 0.15, overwrite: true });
          gsap.to(item.group.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.15 });
          gsap.to(item.group.position, { z: item.az, duration: 0.15 });
          gsap.to(item.halo.material, { opacity: 0.0, duration: 0.15 });
          if (item.nameSprite) gsap.to(item.nameSprite.material, { opacity: 0.0, duration: 0.15 });
        });
      }
    };
    window.addEventListener('mousemove', hoverMouseHandler);

    const canvasEl = document.getElementById('three-canvas');
    if (canvasEl) {
      canvasEl.addEventListener('mouseleave', () => {
        hoverActiveIdx = -1;
        artistItems.forEach((item) => {
          if (item.mat) gsap.to(item.mat, { opacity: 0.7, duration: 0.2, overwrite: true });
          gsap.to(item.group.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.2 });
          gsap.to(item.group.position, { z: item.az, duration: 0.2 });
          gsap.to(item.halo.material, { opacity: 0.0, duration: 0.2 });
          if (item.nameSprite) gsap.to(item.nameSprite.material, { opacity: 0.0, duration: 0.15 });
        });
      });
    }
  }

  // ── FAISCEAUX LASER ──
  lightBeams=[];
  for(let i=0;i<12;i++){
    const col=genreColors[i%genreColors.length];
    const [lr,lg,lb]=hexToRgb(col);
    const c=new THREE.Color(lr,lg,lb);
    const bx=-13+i*2.4;
    const beam=new THREE.Mesh(
      new THREE.CylinderGeometry(0.02,0.35,22,8,1,true),
      new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.14,side:THREE.DoubleSide,depthWrite:false}));
    beam.position.set(bx,14-11,-8);
    const baseRot=(i%2===0?1:-1)*(0.2+Math.random()*0.3);
    beam.rotation.z=baseRot; threeScene.add(beam);
    const pt=new THREE.PointLight(c,1.5,15);
    pt.position.set(bx,0.5,2+Math.random()*4); threeScene.add(pt);
    lightBeams.push({beam,pointLight:pt,phase:Math.random()*Math.PI*2,speed:0.2+Math.random()*0.3,swingAmp:0.15+Math.random()*0.2,baseRot});
  }

  // ── PARTICULES ──
  const partCount=250;
  const partGeo=new THREE.BufferGeometry();
  const positions=new Float32Array(partCount*3);
  const partColors=new Float32Array(partCount*3);
  for(let i=0;i<partCount;i++){
    positions[i*3]=(Math.random()-0.5)*50;
    positions[i*3+1]=Math.random()*18;
    positions[i*3+2]=(Math.random()-0.5)*35+5;
    const c=hexToRgb(genreColors[i%genreColors.length]);
    partColors[i*3]=c[0]; partColors[i*3+1]=c[1]; partColors[i*3+2]=c[2];
  }
  partGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  partGeo.setAttribute('color',new THREE.BufferAttribute(partColors,3));
  const particles=new THREE.Points(partGeo,new THREE.PointsMaterial({size:0.12,vertexColors:true,transparent:true,opacity:0.8,sizeAttenuation:true}));
  particles.name='particles'; threeScene.add(particles);

  // ── BRUME ──
  for(let i=0;i<6;i++){
    const fm=new THREE.Mesh(new THREE.SphereGeometry(2.5+Math.random()*2,8,8),
      new THREE.MeshBasicMaterial({color:0x9999bb,transparent:true,opacity:0.03+Math.random()*0.02,depthWrite:false}));
    fm.position.set((Math.random()-0.5)*22,1+Math.random()*3,-5+Math.random()*10);
    fm.name='fog_'+i; threeScene.add(fm);
  }

  // ── BLOOM — réduit pour éviter le néon sur les sprites ──
  composer=new EffectComposer(threeRenderer);
  composer.addPass(new RenderPass(threeScene,threeCamera));
  const bloomPass=new UnrealBloomPass(new THREE.Vector2(W,H), 0.45, 0.4, 0.5);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  window.addEventListener('resize',onThreeResize);
}

function onThreeResize() {
  if(!threeRenderer||!threeCamera) return;
  const canvas=document.getElementById('three-canvas');
  if(!canvas) return;
  const W=canvas.clientWidth,H=canvas.clientHeight;
  threeCamera.aspect=W/H; threeCamera.updateProjectionMatrix();
  threeRenderer.setSize(W,H);
  if(composer) composer.setSize(W,H);
}

// ===== ANIMATION =====
export function startThreeAnimation(neon) {
  beatTime=0;
  const [nr,ng,nb]=hexToRgb(neon);

  function animate() {
    threeAnimFrame=requestAnimationFrame(animate);
    beatTime+=0.016;
    const beat=Math.abs(Math.sin(beatTime*Math.PI*1.4));
    const fastBeat=Math.abs(Math.sin(beatTime*Math.PI*2.8));

    crowdMeshes.forEach(p=>{
      if(!p.group) return;
      const bounce=Math.sin(beatTime*p.speed*2+p.phase)*0.09*(1+beat*0.35);
      p.group.position.y=p.baseY+bounce;
      if(p.armGroupL) p.armGroupL.rotation.z=-0.3-Math.sin(beatTime*p.speed+p.phase)*0.4;
      if(p.armGroupR) p.armGroupR.rotation.z=0.3+Math.sin(beatTime*p.speed+p.phase)*0.4;
    });

    lightBeams.forEach(lb=>{
      lb.beam.rotation.z=lb.baseRot+Math.sin(beatTime*lb.speed+lb.phase)*lb.swingAmp;
      lb.beam.material.opacity=0.08+fastBeat*0.14;
      lb.pointLight.intensity=0.8+beat*2.0;
    });

    const particles=threeScene.getObjectByName('particles');
    if(particles){
      const pos=particles.geometry.attributes.position.array;
      for(let i=0;i<pos.length;i+=3){pos[i+1]+=0.025+Math.random()*0.02;if(pos[i+1]>18)pos[i+1]=0;}
      particles.geometry.attributes.position.needsUpdate=true;
    }

    for(let i=0;i<6;i++){
      const fog=threeScene.getObjectByName('fog_'+i);
      if(fog){fog.position.x+=Math.sin(beatTime*0.2+i)*0.01;fog.material.opacity=(0.03+Math.sin(beatTime*0.3+i)*0.01)*(1+beat*0.15);}
    }

    for(let i=0;i<150;i++){
      const c=threeScene.getObjectByName('confetti_'+i);
      if(c){c.position.y-=0.04;if(c.position.y<0)c.position.y=15;c.rotation.z+=0.05;}
    }

    threeCamera.position.y=4+Math.sin(beatTime*0.3)*0.15+beat*0.07;
    threeCamera.position.x=Math.sin(beatTime*0.15)*0.4;

    if(composer) composer.render();
    else threeRenderer.render(threeScene,threeCamera);
  }
  animate();
}

// ===== DESTROY =====
export function destroyThreeScene() {
  if(threeAnimFrame){cancelAnimationFrame(threeAnimFrame);threeAnimFrame=null;}
  if(hoverMouseHandler){window.removeEventListener('mousemove',hoverMouseHandler);hoverMouseHandler=null;}
  if(composer){composer.dispose();composer=null;}
  if(threeRenderer){threeRenderer.dispose();threeRenderer=null;}
  threeScene=null;threeCamera=null;crowdMeshes=[];lightBeams=[];
  artistItems=[];hoverSpot=null;hoverRaycaster=null;hoverActiveIdx=-1;
  window.removeEventListener('resize',onThreeResize);
}

// ===== SHOW / HIDE =====
export function showFestivalOverlay(fest, index, neon) {
  const overlay=document.getElementById('festival-overlay');
  overlay.style.setProperty('--neon',neon);
  destroyThreeScene();
  const genreColors=getGenreColors(fest,neon);
  initThreeScene(neon,genreColors,fest.headliners||[],fest);
  startThreeAnimation(neon);
  document.getElementById('overlay-info').innerHTML=`
    <div class="overlay-badge" style="border-color:${neon}; color:${neon}">
      ${fest.city.toUpperCase()} &nbsp;·&nbsp; ${formatDate(fest.date_start)}
    </div>
  `;
  gsap.fromTo(overlay,{opacity:0},{opacity:1,duration:0.9,ease:'power2.inOut'});
  state.festivalOverlayVisible=true;
}

export function hideFestivalOverlay(cb) {
  const overlay=document.getElementById('festival-overlay');
  gsap.to(overlay,{
    opacity:0,duration:0.5,ease:'power2.in',
    onComplete:()=>{
      destroyThreeScene();
      state.festivalOverlayVisible=false;
      if(cb) cb();
    },
  });
}