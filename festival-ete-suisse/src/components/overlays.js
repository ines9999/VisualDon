import { state } from './config.js';
import { FESTIVAL_NEONS } from './config.js';
import { goToFestival } from './scrollcontroller.js';

// ===== INIT OVERLAYS =====
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
    const neon = FESTIVAL_NEONS[i % FESTIVAL_NEONS.length];
    const imgPath = `/images/festival-${f.map_order || i + 1}.jpg`;
    const featuredIdx = (state.festivals || []).findIndex(ff => ff.id === f.id);

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
        // Lancer le journey si pas encore commencé
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer.classList.contains('active')) {
          document.getElementById('startBtn').click();
          setTimeout(() => goToFestival(featuredIdx), 1500);
        } else {
          goToFestival(featuredIdx);
        }
      }
    });
  });
}

// ===== TABLE COMPARAISON =====
function renderCompare(sortKey = 'price_asc') {
  const festivals = [...(state.allFestivals || state.festivals)].filter(f => f.featured);

  // Tri
  festivals.sort((a, b) => {
    switch (sortKey) {
      case 'price_asc':
        return (a.ticket_price_per_day || 0) - (b.ticket_price_per_day || 0);
      case 'price_desc':
        return (b.ticket_price_per_day || 0) - (a.ticket_price_per_day || 0);
      case 'genre':
        return (a.genre || '').localeCompare(b.genre || '');
      case 'attendance':
        return (b.attendance || 0) - (a.attendance || 0);
      case 'duration':
        return b.duration_days - a.duration_days;
      case 'free':
        return (b.free ? 1 : 0) - (a.free ? 1 : 0);
      default:
        return 0;
    }
  });

  const maxPrice = Math.max(...festivals.map(f => f.ticket_price_per_day || 0));
  const maxAttendance = Math.max(...festivals.map(f => f.attendance || 0));

  const tbody = document.getElementById('compare-tbody');
  tbody.innerHTML = festivals.map((f, i) => {
    const priceDay = f.free ? 0 : (f.ticket_price_per_day || null);
    const price3 = priceDay !== null ? priceDay * 3 : null;
    const pricePct = maxPrice > 0 && priceDay !== null ? (priceDay / maxPrice) * 100 : 0;
    const attendancePct = maxAttendance > 0 && f.attendance ? (f.attendance / maxAttendance) * 100 : 0;
    const featuredIdx = (state.festivals || []).findIndex(ff => ff.id === f.id);
    const neon = FESTIVAL_NEONS[featuredIdx >= 0 ? featuredIdx : i % FESTIVAL_NEONS.length];

    return `
      <tr data-featured="${featuredIdx}" style="cursor:${featuredIdx >= 0 ? 'pointer' : 'default'}">
        <td>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${neon};margin-right:0.6rem;box-shadow:0 0 6px ${neon}"></span>
          ${f.name}
        </td>
        <td><span class="compare-badge">${f.genre || '—'}</span></td>
        <td>
          ${f.free
            ? '<span class="compare-badge compare-badge-free">✓ Gratuit</span>'
            : '<span style="color:rgba(255,255,255,0.2)">—</span>'}
        </td>
        <td>
          <div class="compare-bar-wrap">
            <div class="compare-bar">
              <div class="compare-bar-fill" style="width:${pricePct}%"></div>
            </div>
            <span class="compare-val">${priceDay !== null ? priceDay + ' CHF' : 'Variable'}</span>
          </div>
        </td>
        <td>
          <span class="compare-val">${price3 !== null ? price3 + ' CHF' : '—'}</span>
        </td>
        <td>
          <div class="compare-bar-wrap">
            <div class="compare-bar">
              <div class="compare-bar-fill" style="width:${attendancePct}%;background:${neon}66"></div>
            </div>
            <span class="compare-val">${f.attendance ? f.attendance.toLocaleString('fr-CH') : 'N/A'}</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Clic sur une ligne → naviguer vers ce festival
  tbody.querySelectorAll('tr').forEach(row => {
    const featuredIdx = parseInt(row.dataset.featured);
    if (featuredIdx >= 0) {
      row.addEventListener('click', () => {
        closeCompare();
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer.classList.contains('active')) {
          document.getElementById('startBtn').click();
          setTimeout(() => goToFestival(featuredIdx), 1500);
        } else {
          goToFestival(featuredIdx);
        }
      });
    }
  });
}