import {
  CATEGORIAS,
  ESTADOS,
  ESTADOS_LISTA,
  calcPresupuesto,
  lineTotal,
  resumenPorEstancia,
  groupByTienda,
  sanitizePhoto,
} from './db.js';

export function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0);
}

/**
 * @param {string} src
 */
export function isLightboxOpen() {
  const box = document.getElementById('lightbox');
  return Boolean(box && !box.hidden);
}

export function openLightbox(src) {
  const box = document.getElementById('lightbox');
  const img = /** @type {HTMLImageElement|null} */ (
    document.getElementById('lightbox-img')
  );
  if (!box || !img || !src) return;
  img.src = src;
  box.hidden = false;
  box.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeLightbox() {
  const box = document.getElementById('lightbox');
  const img = /** @type {HTMLImageElement|null} */ (
    document.getElementById('lightbox-img')
  );
  if (!box) return;
  box.hidden = true;
  box.setAttribute('aria-hidden', 'true');
  if (img) img.removeAttribute('src');
  if (!document.querySelector('.overlay.open')) {
    document.body.style.overflow = '';
  }
}

function ensureLightboxWired() {
  if (ensureLightboxWired._done) return;
  ensureLightboxWired._done = true;
  const box = document.getElementById('lightbox');
  document.getElementById('lightbox-close')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    closeLightbox();
  });
  box?.addEventListener('click', () => closeLightbox());
  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape' || !box || box.hidden) return;
      closeLightbox();
      ev.preventDefault();
      ev.stopImmediatePropagation();
    },
    true
  );
}
/** @type {boolean} */
ensureLightboxWired._done = false;

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureLightboxWired);
  } else {
    ensureLightboxWired();
  }
}

/**
 * @param {object[]} productos
 * @param {{ presupuestoTope?: number|null }} [config]
 */
export function updateBudget(productos, config = {}) {
  const { totalSeleccionado, gastoReal } = calcPresupuesto(productos);
  const elTotal = document.getElementById('budget-total');
  const elReal = document.getElementById('budget-real');
  const elCap = document.getElementById('budget-cap');
  const elRemain = document.getElementById('budget-remain');
  const capCard = document.getElementById('budget-cap-card');
  const remainCard = document.getElementById('budget-remain-card');
  const setTopeBtn = document.getElementById('btn-set-tope');
  const progress = document.getElementById('budget-progress');
  const progressFill = document.getElementById('budget-progress-fill');
  const progressLabel = document.getElementById('budget-progress-label');
  const header = document.querySelector('.header-panel');

  if (elTotal) elTotal.textContent = formatEuro(totalSeleccionado);
  if (elReal) elReal.textContent = formatEuro(gastoReal);

  const tope =
    config.presupuestoTope != null && !Number.isNaN(Number(config.presupuestoTope))
      ? Number(config.presupuestoTope)
      : null;

  const hasCap = tope != null && tope > 0;
  if (capCard) capCard.hidden = !hasCap;
  if (remainCard) remainCard.hidden = !hasCap;
  if (setTopeBtn) setTopeBtn.hidden = hasCap;

  if (elCap) elCap.textContent = hasCap ? formatEuro(tope) : '—';
  if (elRemain) {
    if (hasCap) {
      const remain = tope - totalSeleccionado;
      elRemain.textContent = formatEuro(remain);
      elRemain.classList.toggle('over', remain < 0);
    } else {
      elRemain.textContent = '—';
      elRemain.classList.remove('over');
    }
  }

  if (progress && progressFill && progressLabel) {
    if (hasCap) {
      progress.hidden = false;
      const pct = Math.min(100, Math.round((totalSeleccionado / tope) * 100));
      const over = totalSeleccionado > tope;
      progressFill.style.width = `${Math.min(100, over ? 100 : pct)}%`;
      progressFill.classList.toggle('warn', !over && pct >= 80);
      progressFill.classList.toggle('over', over);
      progressLabel.textContent = over
        ? `Te pasas ${formatEuro(totalSeleccionado - tope)}`
        : `${pct}% del tope (Sel. + Pedido + Comp.)`;
    } else {
      progress.hidden = true;
    }
  }

  header?.classList.toggle('over-budget', hasCap && totalSeleccionado > tope);
}

/**
 * @param {'estancia'|'categoria'|'estado'|'tienda'} type
 * @param {string} current
 * @param {(value: string) => void} onChange
 * @param {string[]} [baseList]
 * @param {string[]} [extraValues]
 */
export function renderChips(type, current, onChange, baseList = [], extraValues = []) {
  const containerId =
    type === 'estancia'
      ? 'filter-estancia'
      : type === 'categoria'
        ? 'filter-categoria'
        : type === 'tienda'
          ? 'filter-tienda'
          : 'filter-estado';
  const container = document.getElementById(containerId);
  if (!container) return;

  const base =
    type === 'estancia' || type === 'tienda'
      ? baseList
      : type === 'categoria'
        ? CATEGORIAS
        : ESTADOS;
  const extras = extraValues.filter((v) => v && !base.includes(v));
  const items = ['Todos', ...base, ...extras];

  container.innerHTML = '';
  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', item === current ? 'true' : 'false');
    const variant =
      type === 'categoria' ? ' cat' : type === 'estado' ? ' estado' : '';
    btn.className = `chip${variant}${item === current ? ' active' : ''}`;
    btn.textContent = item;
    btn.addEventListener('click', () => onChange(item));
    container.appendChild(btn);
  }
}

/**
 * @param {number} filteredCount
 * @param {number} totalCount
 * @param {boolean} hasActiveFilters
 */
export function updateFilterMeta(filteredCount, totalCount, hasActiveFilters) {
  const countEl = document.getElementById('result-count');
  const clearBtn = /** @type {HTMLButtonElement|null} */ (
    document.getElementById('clear-filters')
  );

  if (countEl) {
    if (totalCount === 0) countEl.textContent = '';
    else if (hasActiveFilters)
      countEl.textContent = `${filteredCount} de ${totalCount}`;
    else
      countEl.textContent =
        totalCount === 1 ? '1 artículo' : `${totalCount} artículos`;
  }
  if (clearBtn) clearBtn.hidden = !hasActiveFilters;
}

/**
 * @param {object[]} productos
 * @param {{
 *   estancia: string,
 *   categoria: string,
 *   estado: string,
 *   tienda?: string,
 *   listaCompra?: boolean,
 *   hideComprados?: boolean,
 *   query?: string
 * }} filters
 */
export function filterProductos(productos, filters) {
  let filtered = productos.filter((p) => !p.deletedAt);
  if (filters.listaCompra) {
    filtered = filtered.filter((p) => ESTADOS_LISTA.includes(p.estado));
    if (filters.hideComprados) {
      filtered = filtered.filter((p) => p.estado !== 'Comprado');
    }
  }
  if (filters.estancia && filters.estancia !== 'Todos') {
    filtered = filtered.filter((p) => p.estancia === filters.estancia);
  }
  if (filters.categoria && filters.categoria !== 'Todos') {
    filtered = filtered.filter((p) => p.categoria === filters.categoria);
  }
  if (filters.tienda && filters.tienda !== 'Todos') {
    filtered = filtered.filter(
      (p) => (p.tienda || '').trim() === filters.tienda
    );
  }
  if (filters.estado && filters.estado !== 'Todos') {
    filtered = filtered.filter((p) => p.estado === filters.estado);
  }
  const q = (filters.query || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((p) => {
      const hay = [
        p.nombre,
        p.tienda,
        p.notas,
        p.enlace,
        p.medidas,
        p.estancia,
        p.categoria,
        p.estado,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return filtered;
}

/**
 * @param {object[]} productos
 * @param {'fecha'|'precio-asc'|'precio-desc'|'nombre'} sort
 */
export function sortProductos(productos, sort) {
  const list = [...productos];
  if (sort === 'precio-asc') {
    list.sort((a, b) => lineTotal(a) - lineTotal(b));
  } else if (sort === 'precio-desc') {
    list.sort((a, b) => lineTotal(b) - lineTotal(a));
  } else if (sort === 'nombre') {
    list.sort((a, b) =>
      String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
    );
  } else {
    list.sort(
      (a, b) =>
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
    );
  }
  return list;
}

const ESTADO_SHORT = {
  Candidato: 'Cand.',
  Seleccionado: 'Sel.',
  Pedido: 'Ped.',
  Comprado: 'Comp.',
};

function safePhotoSrc(value) {
  return sanitizePhoto(value);
}

/**
 * @param {object[]} productos
 * @param {object} filters
 * @param {string} sort
 * @param {object} handlers
 */
export function renderGrid(productos, filters, sort, handlers) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  let filtered = filterProductos(productos, filters);
  filtered = sortProductos(filtered, sort);

  const hasFilters =
    (filters.estancia && filters.estancia !== 'Todos') ||
    (filters.categoria && filters.categoria !== 'Todos') ||
    (filters.tienda && filters.tienda !== 'Todos') ||
    (filters.estado && filters.estado !== 'Todos') ||
    filters.listaCompra ||
    Boolean((filters.query || '').trim());

  updateFilterMeta(filtered.length, productos.filter((p) => !p.deletedAt).length, Boolean(hasFilters));
  grid.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    if (hasFilters) {
      empty.innerHTML = `
        <h2>Nada con estos filtros</h2>
        <p>Prueba otra combinación o limpia los filtros.</p>
        <button type="button" class="btn btn-secondary" id="empty-clear">Limpiar filtros</button>
      `;
      empty.querySelector('#empty-clear')?.addEventListener('click', () => {
        handlers.onClearFilters?.();
      });
    } else {
      empty.innerHTML = `
        <h2>Sin muebles aún</h2>
        <p>Pulsa el botón + abajo a la derecha para añadir el primero.</p>
      `;
    }
    grid.appendChild(empty);
    return;
  }

  if (filters.listaCompra) {
    renderListaCompra(grid, filtered, handlers);
    return;
  }

  filtered.forEach((p, index) => {
    const card = document.createElement('article');
    card.className = `card estado-${p.estado}`;
    card.style.animationDelay = `${Math.min(index, 12) * 0.03}s`;
    card.dataset.id = p.id;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');

    const qty = Math.max(1, Number(p.cantidad) || 1);
    const total = lineTotal(p);
    const priceLabel =
      qty > 1 ? `${formatEuro(p.precio)} ×${qty}` : formatEuro(p.precio);

    card.setAttribute(
      'aria-label',
      `${p.nombre || 'Sin nombre'}, ${formatEuro(total)}, ${p.estado}`
    );

    const src = safePhotoSrc(p.fotoMueble);
    const photoHtml = src
      ? `<img class="zoomable" src="${escapeAttr(src)}" alt="" loading="lazy">`
      : `<div class="placeholder">Sin foto</div>`;

    const pills = ESTADOS.map((e) => {
      const active = e === p.estado ? ' active' : '';
      return `<button type="button" class="estado-pill${active}" data-estado="${e}" aria-pressed="${e === p.estado}">${ESTADO_SHORT[e] || e}</button>`;
    }).join('');

    card.innerHTML = `
      <div class="card-photo">
        ${photoHtml}
        <span class="badge ${p.estado}">${p.estado}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(p.nombre || 'Sin nombre')}</div>
        <div class="card-estancia">${escapeHtml(p.estancia || '')}</div>
        <div class="card-meta">
          <span class="card-price">${priceLabel}</span>
          <span class="card-store">${escapeHtml(p.tienda || '')}</span>
        </div>
        ${qty > 1 ? `<div class="card-qty-total">Total ${formatEuro(total)}</div>` : ''}
        <div class="estado-pills" role="group" aria-label="Cambiar estado">${pills}</div>
      </div>
    `;

    const open = () => handlers.onOpen(p.id);

    card.addEventListener('click', (ev) => {
      if (
        /** @type {HTMLElement} */ (ev.target).closest(
          '.estado-pills, input, button, .zoomable'
        )
      )
        return;
      open();
    });
    card.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        if (
          /** @type {HTMLElement} */ (ev.target).closest(
            '.estado-pills, input, button, .zoomable'
          )
        )
          return;
        ev.preventDefault();
        open();
      }
    });

    card.querySelectorAll('.estado-pill').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const estado = /** @type {HTMLElement} */ (btn).dataset.estado;
        if (!estado || estado === p.estado) return;
        handlers.onEstado(p.id, estado);
      });
    });

    const zoomImg = card.querySelector('.zoomable');
    zoomImg?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const s =
        /** @type {HTMLImageElement} */ (zoomImg).currentSrc ||
        zoomImg.getAttribute('src');
      if (s) openLightbox(s);
    });

    grid.appendChild(card);
  });
}

/**
 * @param {HTMLElement} grid
 * @param {object[]} productos
 * @param {object} handlers
 */
function renderListaCompra(grid, productos, handlers) {
  const groups = groupByTienda(productos);
  const wrap = document.createElement('div');
  wrap.className = 'lista-compra';

  for (const group of groups) {
    const section = document.createElement('section');
    section.className = 'lista-group';
    const sum = group.items.reduce((acc, p) => acc + lineTotal(p), 0);
    const done = group.items.filter((p) => p.estado === 'Comprado').length;
    const total = group.items.length;
    section.innerHTML = `
      <div class="lista-group-head">
        <div>
          <h3>${escapeHtml(group.tienda)}</h3>
          <span class="lista-progress">${done}/${total} comprados</span>
        </div>
        <span>${formatEuro(sum)}</span>
      </div>
    `;
    const ul = document.createElement('ul');
    ul.className = 'lista-items';
    for (const p of group.items) {
      const li = document.createElement('li');
      li.className = `lista-item${p.estado === 'Comprado' ? ' done' : ''}`;
      const estadoTag =
        p.estado === 'Pedido'
          ? ` · ${escapeHtml(p.estado)}`
          : '';
      li.innerHTML = `
        <button type="button" class="lista-check" aria-label="Marcar comprado" data-id="${escapeAttr(p.id)}">
          ${p.estado === 'Comprado' ? '✓' : ''}
        </button>
        <button type="button" class="lista-main" data-open="${escapeAttr(p.id)}">
          <span class="lista-name">${escapeHtml(p.nombre || 'Sin nombre')}</span>
          <span class="lista-meta">${formatEuro(lineTotal(p))} · ${escapeHtml(p.estancia || '')}${estadoTag}</span>
        </button>
      `;
      ul.appendChild(li);
    }
    section.appendChild(ul);
    wrap.appendChild(section);
  }

  wrap.querySelectorAll('.lista-check').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = /** @type {HTMLElement} */ (btn).dataset.id;
      if (!id) return;
      const p = productos.find((x) => x.id === id);
      if (!p) return;
      const next = p.estado === 'Comprado' ? 'Seleccionado' : 'Comprado';
      handlers.onEstado(id, next);
    });
  });
  wrap.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = /** @type {HTMLElement} */ (btn).dataset.open;
      if (id) handlers.onOpen(id);
    });
  });

  grid.appendChild(wrap);
}

/**
 * @param {object[]} productos
 * @param {(estancia: string) => void} [onSelect]
 */
export function renderResumenEstancias(productos, onSelect) {
  const el = document.getElementById('resumen-list');
  if (!el) return;
  const rows = resumenPorEstancia(productos);
  if (!rows.length) {
    el.innerHTML = `<p class="muted">Aún no hay productos.</p>`;
    return;
  }
  el.innerHTML = rows
    .map(
      (r) => `
      <button type="button" class="resumen-row" data-estancia="${escapeAttr(r.estancia)}">
        <div class="resumen-name">${escapeHtml(r.estancia)}</div>
        <div class="resumen-stats">
          <span>${r.items} ítem${r.items === 1 ? '' : 's'}</span>
          <span>Sel. ${formatEuro(r.seleccionado)}</span>
          <span>Comp. ${formatEuro(r.comprado)}</span>
        </div>
      </button>`
    )
    .join('');

  el.querySelectorAll('.resumen-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const estancia = /** @type {HTMLElement} */ (btn).dataset.estancia;
      if (estancia) onSelect?.(estancia);
    });
  });
}

/**
 * @param {string} text
 */
export function linkifyText(text) {
  const escaped = escapeHtml(text || '');
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

/**
 * @param {object[]} productos
 * @param {object} config
 * @param {{ tienda?: string|null }} [opts]
 */
export function buildShareText(productos, config, opts = {}) {
  const tiendaFilter = (opts.tienda || '').trim();
  let scope = productos.filter((p) => !p.deletedAt);
  if (tiendaFilter) {
    scope = scope.filter((p) => (p.tienda || '').trim() === tiendaFilter);
  }
  const { totalSeleccionado, gastoReal } = calcPresupuesto(scope);
  const lista = scope.filter((p) => ESTADOS_LISTA.includes(p.estado));
  const lines = [
    tiendaFilter
      ? `Amueblar — ${tiendaFilter}`
      : 'Amueblar — resumen mudanza',
    `Selección (Sel.+Pedido+Comp.): ${formatEuro(totalSeleccionado)}`,
    `Comprado: ${formatEuro(gastoReal)}`,
  ];
  if (!tiendaFilter && config?.presupuestoTope != null) {
    lines.push(`Tope: ${formatEuro(config.presupuestoTope)}`);
  }
  lines.push('', 'Lista:');
  if (!lista.length) {
    lines.push('(vacía)');
  } else {
    for (const p of lista) {
      const qty = Math.max(1, Number(p.cantidad) || 1);
      lines.push(
        `• [${p.estado}] ${p.nombre || 'Sin nombre'} — ${formatEuro(lineTotal(p))}${qty > 1 ? ` (${qty}×)` : ''}${
          !tiendaFilter && p.tienda ? ` · ${p.tienda}` : ''
        }`
      );
    }
  }
  return lines.join('\n');
}

/**
 * @param {{ stats: object, samples: {action:string,name:string}[] }} plan
 */
/**
 * @param {{
 *   stats: object,
 *   samples: {action:string,name:string}[],
 *   softCandidates?: number
 * }} plan
 */
export function renderMergePreview(plan) {
  const el = document.getElementById('merge-preview');
  if (!el) return;
  const s = plan.stats;
  el.innerHTML = `
    <div class="merge-stats">
      <span>+${s.added} nuevos</span>
      <span>~${s.updated} actualiz.</span>
      <span>−${s.deleted || 0} borrados</span>
      <span>=${s.kept} iguales</span>
      ${s.softLinked ? `<span>🔗 ${s.softLinked} unidos</span>` : ''}
      ${s.restored ? `<span>↩ ${s.restored} rest.</span>` : ''}
    </div>
    ${
      plan.samples?.length
        ? `<ul class="merge-samples">${plan.samples
            .map(
              (x) =>
                `<li><strong>${escapeHtml(x.action)}</strong> ${escapeHtml(x.name)}</li>`
            )
            .join('')}</ul>`
        : ''
    }
  `;

  const softLabel = document.getElementById('soft-match-label');
  const softCount = document.getElementById('soft-match-count');
  const softCandidates = plan.softCandidates || 0;
  if (softLabel) softLabel.hidden = softCandidates === 0;
  if (softCount) softCount.textContent = String(softCandidates);
}

/**
 * @param {string} message
 * @param {{ actionLabel?: string, onAction?: () => void, duration?: number }} [opts]
 */
export function showToast(message, opts = {}) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(showToast._timer);
  toast.className = 'toast show';
  toast.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  if (opts.actionLabel && opts.onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = opts.actionLabel;
    btn.addEventListener('click', () => {
      toast.classList.remove('show');
      opts.onAction?.();
    });
    toast.appendChild(btn);
  }
  showToast._timer = setTimeout(
    () => toast.classList.remove('show'),
    opts.duration ?? (opts.actionLabel ? 5600 : 2400)
  );
}

/** @type {ReturnType<typeof setTimeout>|undefined} */
showToast._timer = undefined;

/** @type {HTMLElement|null} */
let lastFocus = null;

/**
 * @param {string} id
 * @param {boolean} open
 * @param {{ focusSelector?: string }} [opts]
 */
export function setOverlayOpen(id, open, opts = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const sheet = el.querySelector('.sheet');

  if (open) {
    lastFocus = /** @type {HTMLElement|null} */ (document.activeElement);
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const focusTarget = opts.focusSelector
        ? /** @type {HTMLElement|null} */ (el.querySelector(opts.focusSelector))
        : /** @type {HTMLElement|null} */ (sheet);
      focusTarget?.focus?.();
    });
  } else {
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.overlay.open')) {
      document.body.style.overflow = '';
    }
    lastFocus?.focus?.();
    lastFocus = null;
  }
}

/**
 * @param {HTMLSelectElement} select
 * @param {string[]} options
 * @param {string} [selected]
 */
export function fillSelect(select, options, selected) {
  select.innerHTML = options
    .map(
      (o) =>
        `<option value="${escapeAttr(o)}" ${o === selected ? 'selected' : ''}>${escapeHtml(o)}</option>`
    )
    .join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

/**
 * @param {File} file
 * @param {{ maxSide?: number, quality?: number }} [opts]
 */
export function fileToDataUrl(file, opts = {}) {
  const maxSide = opts.maxSide ?? 1280;
  const quality = opts.quality ?? 0.82;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(/** @type {string} */ (reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(/** @type {string} */ (reader.result));
      img.src = /** @type {string} */ (reader.result);
    };
    reader.readAsDataURL(file);
  });
}
