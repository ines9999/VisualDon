import { state } from './config.js';
import { FESTIVAL_NEONS } from './config.js';
import { goToFestival } from './scrollcontroller.js';

// ===== INIT OVERLAYS =====
// Navigation robuste vers un festival — fonctionne depuis n'importe quel état
function navigateToFestival(index) {
  const mapContainer = document.getElementById('map-container');
  const isActive = mapContainer && mapContainer.classList.contains('active');

  if (!isActive) {
    // Démarrer le journey puis naviguer
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.click();
      setTimeout(() => {
        state.isAnimating = false; // forcer
        goToFestival(index);
      }, 1800);
    }
  } else {
    // Forcer la navigation même si isAnimating
    state.isAnimating = false;
    goToFestival(index);
  }
}

export function initOverlays() {
  // Boutons header
  document.getElementById('btnAllFestivals').addEventListener('click', openAll);
  document.getElementById('btnCompareFestivals').addEventListener('click', openCompare);

  // Fermeture
  document.getElementById('closeAll').addEventListener('click', closeAll);
  document.getElementById('closeCompare').addEventListener('click', closeCompare);

  // Fermer avec Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAll(); closeCompare(); }
  });

  // Filtres genre
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderGrid();
    });
  });

  // Recherche
  document.getElementById('search-festivals').addEventListener('input', renderGrid);

  // Tri compare
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCompare(btn.dataset.sort);
    });
  });
}

// ===== OPEN / CLOSE =====
function openAll() {
  renderGrid();
  document.getElementById('overlay-all').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeAll() {
  document.getElementById('overlay-all').style.display = 'none';
  document.body.style.overflow = '';
}

function openCompare() {
  renderCompare('price_asc');
  document.getElementById('overlay-compare').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeCompare() {
  document.getElementById('overlay-compare').style.display = 'none';
  document.body.style.overflow = '';
}

// ===== GRILLE TOUS LES FESTIVALS =====
function renderGrid() {
  const all = state.allFestivals || state.festivals;
  const search = document.getElementById('search-festivals').value.toLowerCase();
  const genre = document.querySelector('.chip.active')?.dataset.genre || 'tous';

  const filtered = all.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search) ||
      f.city.toLowerCase().includes(search);
    const matchGenre = genre === 'tous'
      ? true
      : genre === 'gratuit'
        ? f.free
        : (f.genre || '').toLowerCase().includes(genre);
    return matchSearch && matchGenre;
  });

  const grid = document.getElementById('festivals-grid');
  grid.innerHTML = filtered.map((f, i) => {
    const featuredIdx = (state.festivals || []).findIndex(ff => ff.id === f.id);
    // Couleur = même néon que sur la carte si festival featured, sinon gris
    const neon = featuredIdx >= 0 ? FESTIVAL_NEONS[featuredIdx] : '#ffffff';
    const imgPath = `/images/festival-${f.map_order || i + 1}.jpg`;

    return `
      <div class="festival-card" data-id="${f.id}" data-featured="${featuredIdx}">
        <div class="festival-card-img-wrap">
          <img
            class="festival-card-img"
            src="${imgPath}"
            alt="${f.name}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          />
          <div class="festival-card-placeholder" style="display:none; background:linear-gradient(135deg,${neon}22,#080808);">
            <span style="color:${neon};font-size:1.8rem;font-family:'Bebas Neue',sans-serif;">
              ${f.city}
            </span>
          </div>
        </div>
        <div class="festival-card-body">
          <div class="festival-card-name">${f.name}</div>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center">
            <span class="festival-card-badge">${f.genre || '—'}</span>
            ${f.free ? `<span class="festival-card-badge" style="border-color:${neon};color:${neon}">Gratuit</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Clic sur une carte → naviguer vers ce festival si featured
  grid.querySelectorAll('.festival-card').forEach(card => {
    card.addEventListener('click', () => {
      const featuredIdx = parseInt(card.dataset.featured);
      if (featuredIdx >= 0) {
        closeAll();
        navigateToFestival(featuredIdx);
      }
    });
  });
}

// ===== TABLE COMPARAISON =====
function renderCompare(sortKey = 'price_asc') {
  const allFests = [...(state.allFestivals || state.festivals)].filter(f => f.featured);
  const container = document.getElementById('compare-tbody');
  const maxAtt = Math.max(...allFests.map(f => f.attendance || 0));

  function priceSymbol(f) {
    if (f.free) return 'GRATUIT';
    if (f.ticket_price_per_day === null || f.ticket_price_per_day === undefined) return 'VARIABLE';
    const p = f.ticket_price_per_day;
    if (p < 50) return '$';
    if (p < 100) return '$$';
    if (p < 150) return '$$$';
    return '$$$$';
  }

  function sortFestivals(key) {
    return [...allFests].sort((a, b) => {
      switch (key) {
        case 'price_asc': {
          const pa = a.free ? 0 : (a.ticket_price_per_day ?? 9999);
          const pb = b.free ? 0 : (b.ticket_price_per_day ?? 9999);
          return pa - pb;
        }
        case 'price_desc': {
          const pa2 = a.free ? 0 : (a.ticket_price_per_day ?? -1);
          const pb2 = b.free ? 0 : (b.ticket_price_per_day ?? -1);
          return pb2 - pa2;
        }
        case 'attendance': return (b.attendance||0) - (a.attendance||0);
        case 'duration': return b.duration_days - a.duration_days;
        case 'free': return (b.free?1:0) - (a.free?1:0);
        default: return 0;
      }
    });
  }

  // ── BUILD ONCE ──
  if (container.dataset.rendered !== '1') {
    container.innerHTML = '';
    container.dataset.rendered = '1';
    container.style.cssText = 'position:relative;width:100%;overflow:visible;z-index:1;';

    const grid = document.createElement('div');
    grid.id = 'compare-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:4px 0 12px;overflow:visible;position:relative;z-index:1;';
    container.appendChild(grid);

    const legend = document.createElement('div');
    legend.style.cssText = `display:flex;gap:1.5rem;flex-wrap:wrap;padding:0.6rem 0 0;
      font-family:'Space Mono',monospace;font-size:8px;
      color:rgba(240,236,228,0.3);letter-spacing:0.09em;
      border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;`;
    legend.innerHTML = `<span>POINTS = FRÉQUENTATION &nbsp;·&nbsp; J = DURÉE</span>
      <span>$ &lt;50 CHF &nbsp;·&nbsp; $$ &lt;100 &nbsp;·&nbsp; $$$ &lt;150 &nbsp;·&nbsp; $$$$ 150+</span>
      <span style="color:rgba(240,236,228,0.15)">CLIQUER POUR ACCÉDER</span>`;
    container.appendChild(legend);

    allFests.forEach((f) => {
      const featuredIdx = (state.festivals||[]).findIndex(ff => ff.id === f.id);
      const neon = featuredIdx >= 0 ? FESTIVAL_NEONS[featuredIdx] : '#ffffff';
      const att = f.attendance || 0;
      const attPct = maxAtt > 0 ? att / maxAtt : 0.1;
      const totalDots = Math.max(3, Math.round(attPct * 30));

      const card = document.createElement('div');
      card.dataset.festId = f.id;
      card.style.cssText = `display:flex;flex-direction:column;cursor:pointer;
        border:1px solid ${neon}33;border-radius:3px;
        background:#020205;transition:border-color 0.2s,box-shadow 0.2s;`;
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = neon+'aa';
        card.style.boxShadow = `0 0 12px ${neon}22`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = neon+'33';
        card.style.boxShadow = 'none';
      });
      card.addEventListener('click', () => {
        if (featuredIdx >= 0) { closeCompare(); navigateToFestival(featuredIdx); }
      });

      const ns = 'http://www.w3.org/2000/svg';
      const W = 160, H = 160;
      const stageBotY = 85, stageTopY = 18, floorY = 88;

      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', H);

      const bg = document.createElementNS(ns, 'rect');
      bg.setAttribute('width', W); bg.setAttribute('height', H); bg.setAttribute('fill', '#020205');
      svg.appendChild(bg);

      // Mur fond
      const bw = document.createElementNS(ns, 'rect');
      bw.setAttribute('x',20); bw.setAttribute('y',stageTopY);
      bw.setAttribute('width',W-40); bw.setAttribute('height',52);
      bw.setAttribute('fill','#0a0a1e'); bw.setAttribute('stroke',neon+'40'); bw.setAttribute('stroke-width','0.5');
      svg.appendChild(bw);

      // Écran LED
      const sc = document.createElementNS(ns, 'rect');
      sc.setAttribute('x',32); sc.setAttribute('y',stageTopY+5);
      sc.setAttribute('width',W-64); sc.setAttribute('height',33);
      sc.setAttribute('fill',neon+'18'); sc.setAttribute('stroke',neon); sc.setAttribute('stroke-width','1');
      svg.appendChild(sc);
      [0,11,22].forEach(dy => {
        const l = document.createElementNS(ns,'line');
        l.setAttribute('x1',32); l.setAttribute('x2',W-32);
        l.setAttribute('y1',stageTopY+5+dy); l.setAttribute('y2',stageTopY+5+dy);
        l.setAttribute('stroke',neon+'28'); l.setAttribute('stroke-width','0.5');
        svg.appendChild(l);
      });

      // Pylônes
      [20,W-20].forEach(cx => {
        const col = document.createElementNS(ns,'rect');
        col.setAttribute('x',cx-5); col.setAttribute('y',stageTopY);
        col.setAttribute('width',10); col.setAttribute('height',66);
        col.setAttribute('fill','#0d0d20'); col.setAttribute('stroke',neon+'50'); col.setAttribute('stroke-width','0.5');
        svg.appendChild(col);
      });

      // Truss
      const tr = document.createElementNS(ns,'rect');
      tr.setAttribute('x',14); tr.setAttribute('y',stageTopY);
      tr.setAttribute('width',W-28); tr.setAttribute('height',4);
      tr.setAttribute('fill','#1a1a30'); tr.setAttribute('stroke',neon+'80'); tr.setAttribute('stroke-width','0.8');
      svg.appendChild(tr);

      // Projecteurs
      [28,50,80,110,132].forEach(px => {
        const b = document.createElementNS(ns,'circle');
        b.setAttribute('cx',px); b.setAttribute('cy',stageTopY+4);
        b.setAttribute('r','2.5'); b.setAttribute('fill',neon);
        svg.appendChild(b);
      });

      // Faisceaux
      [[28,15],[80,80],[132,145]].forEach(([bx,tx]) => {
        const beam = document.createElementNS(ns,'polygon');
        beam.setAttribute('points',`${bx},${stageTopY+6} ${tx-10},${stageBotY} ${tx+10},${stageBotY}`);
        beam.setAttribute('fill',neon+'0e');
        svg.appendChild(beam);
      });

      // Haut-parleurs
      [20,W-20].forEach(spx => {
        const sp = document.createElementNS(ns,'rect');
        sp.setAttribute('x',spx-5); sp.setAttribute('y',stageBotY-20);
        sp.setAttribute('width',10); sp.setAttribute('height',20);
        sp.setAttribute('fill','#0d0d1e'); sp.setAttribute('stroke',neon+'50'); sp.setAttribute('stroke-width','0.5');
        svg.appendChild(sp);
        const mem = document.createElementNS(ns,'circle');
        mem.setAttribute('cx',spx); mem.setAttribute('cy',stageBotY-10);
        mem.setAttribute('r','2.8'); mem.setAttribute('fill','none');
        mem.setAttribute('stroke',neon+'55'); mem.setAttribute('stroke-width','0.6');
        svg.appendChild(mem);
      });

      // Bord scène
      const edge = document.createElementNS(ns,'line');
      edge.setAttribute('x1',14); edge.setAttribute('y1',stageBotY);
      edge.setAttribute('x2',W-14); edge.setAttribute('y2',stageBotY);
      edge.setAttribute('stroke',neon); edge.setAttribute('stroke-width','1.5');
      svg.appendChild(edge);

      // Sol
      const hall = document.createElementNS(ns,'rect');
      hall.setAttribute('x',0); hall.setAttribute('y',floorY);
      hall.setAttribute('width',W); hall.setAttribute('height',H-floorY);
      hall.setAttribute('fill','#010108');
      svg.appendChild(hall);

      // Foule — points proportionnels
      const DOT_R = 2.5, DOT_SPACE = 9;
      const CROWD_X0 = 10, CROWD_X1 = W-10;
      const CROWD_Y0 = floorY+7, CROWD_Y1 = H-5;
      const cols = Math.floor((CROWD_X1-CROWD_X0)/DOT_SPACE);
      for (let d = 0; d < totalDots; d++) {
        const col = d % cols;
        const row = Math.floor(d / cols);
        const px = CROWD_X0 + col*DOT_SPACE + (row%2===0 ? 0 : DOT_SPACE/2);
        const py = CROWD_Y0 + row*(DOT_SPACE-1);
        if (py > CROWD_Y1) break;
        const dot = document.createElementNS(ns,'circle');
        dot.setAttribute('cx', Math.min(px, CROWD_X1));
        dot.setAttribute('cy', py);
        dot.setAttribute('r', DOT_R);
        dot.setAttribute('fill', row%2===0 ? 'rgba(240,236,228,0.85)' : 'rgba(160,158,150,0.6)');
        svg.appendChild(dot);
      }

      card.appendChild(svg);

      // Info
      const info = document.createElement('div');
      info.style.cssText = `padding:7px 8px;background:#04040f;border-top:1px solid ${neon}22;`;
      const nameEl = document.createElement('div');
      nameEl.style.cssText = `font-size:9px;font-family:'Space Mono',monospace;color:#f0ece4;
        letter-spacing:0.07em;text-transform:uppercase;font-weight:bold;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      nameEl.textContent = f.name;
      info.appendChild(nameEl);
      const metaEl = document.createElement('div');
      metaEl.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:4px;';
      const priceEl = document.createElement('span');
      priceEl.style.cssText = `font-size:13px;font-family:'Space Mono',monospace;
        color:${f.free?'#44ffaa':neon};letter-spacing:0.05em;font-weight:bold;`;
      priceEl.textContent = priceSymbol(f);
      metaEl.appendChild(priceEl);
      const att2 = f.attendance||0;
      const attStr = att2>=1e6?(att2/1e6).toFixed(1)+'M':att2>=1000?Math.round(att2/1000)+'K':(att2||'—');
      const durEl = document.createElement('span');
      durEl.style.cssText = "font-size:8px;font-family:'Space Mono',monospace;color:rgba(240,236,228,0.4);";
      durEl.textContent = f.duration_days+'J · '+attStr;
      metaEl.appendChild(durEl);
      info.appendChild(metaEl);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  // ── SMOOTH FLIP ANIMATION ──
  const grid = document.getElementById('compare-grid');
  if (!grid) return;

  // Skip on first open
  if (!grid.dataset.sorted) {
    grid.dataset.sorted = '1';
    return;
  }

  const sorted = sortFestivals(sortKey);
  const allCards = Array.from(grid.children);

  // 1. Snapshot positions AVANT réordonnement (coordonnées page)
  const before = new Map();
  allCards.forEach(card => {
    const r = card.getBoundingClientRect();
    before.set(card.dataset.festId, { x: r.left, y: r.top });
  });

  // 2. Réordonner le DOM instantanément
  sorted.forEach(f => {
    const c = allCards.find(cd => cd.dataset.festId == f.id);
    if (c) grid.appendChild(c);
  });

  // 3. Snapshot positions APRÈS réordonnement
  const after = new Map();
  Array.from(grid.children).forEach(card => {
    const r = card.getBoundingClientRect();
    after.set(card.dataset.festId, { x: r.left, y: r.top });
  });

  // 4. Animer chaque carte du delta — FLIP pur, 60fps garanti
  gsap.killTweensOf(allCards);
  Array.from(grid.children).forEach((card, i) => {
    const id = card.dataset.festId;
    const b = before.get(id);
    const a = after.get(id);
    if (!b || !a) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    // Placer la carte à sa position de départ (via transform)
    gsap.set(card, { x: dx, y: dy });

    // Animer vers 0 avec stagger léger
    gsap.to(card, {
      x: 0,
      y: 0,
      duration: 0.55,
      delay: i * 0.015,
      ease: 'power2.inOut',
      clearProps: 'transform'
    });
  });
}