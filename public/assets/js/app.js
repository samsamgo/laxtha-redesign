/* LAXTHA — single-page app (hand-crafted) */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = () => window.LaxthaData;
  const won = (n) => Number(n).toLocaleString('ko-KR');

  const state = { cat: 'ALL', brand: 'ALL', q: '', sort: 'recommended' };

  /* ---------------- catalog ---------------- */
  function card(p) {
    const label = D().categoryLabel(p.cat);
    return `
      <article class="pcard" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(p.name)} 상세 보기">
        <div class="pcard__media">
          <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" />
          <button class="pcard__add" type="button" data-add="${esc(p.id)}" aria-label="${esc(p.name)} 장바구니 담기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <p class="chip pcard__meta" data-sig="${esc(p.cat)}"><span class="dot"></span>${esc(p.brand)} · ${esc(label)}</p>
        <h3 class="pcard__name">${esc(p.name)}</h3>
        <p class="pcard__spec">${esc(p.spec || '')}</p>
        <p class="pcard__price">${won(p.price)}<span>원</span></p>
      </article>`;
  }

  function catalogTitle() {
    if (state.q) return `"${state.q}" 검색`;
    if (state.brand !== 'ALL') return state.brand;
    if (state.cat !== 'ALL') return D().categoryLabel(state.cat);
    return '전체 제품';
  }

  function renderCatalog() {
    const grid = $('[data-catalog-grid]');
    if (!grid) return;
    let list = D().products.slice();
    if (state.cat !== 'ALL') list = list.filter((p) => p.cat === state.cat);
    if (state.brand !== 'ALL') list = list.filter((p) => p.brand === state.brand);
    if (state.q) list = D().search(state.q, list);
    if (state.sort === 'low') list.sort((a, b) => a.price - b.price);
    else if (state.sort === 'high') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => (b.tags || []).length - (a.tags || []).length);

    $('[data-catalog-title]').textContent = catalogTitle();
    $('[data-catalog-count]').textContent = `${list.length}개`;
    grid.innerHTML = list.map(card).join('');
    $('[data-catalog-empty]').hidden = list.length > 0;
    $$('[data-cat-chip]').forEach((c) => c.classList.toggle('is-active', c.dataset.catChip === state.cat));
    $$('[data-brand-chip]').forEach((c) => c.classList.toggle('is-active', c.dataset.brandChip === state.brand));
  }

  function scrollToCatalog() {
    const el = document.getElementById('catalog');
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function initCatalogControls() {
    $$('[data-cat-chip]').forEach((c) => c.addEventListener('click', () => { state.cat = c.dataset.catChip; renderCatalog(); }));
    $$('[data-brand-chip]').forEach((c) => c.addEventListener('click', () => { state.brand = c.dataset.brandChip; renderCatalog(); }));
    const search = $('[data-catalog-search]');
    search?.addEventListener('input', () => { state.q = search.value.trim(); renderCatalog(); });
    $('[data-catalog-sort]')?.addEventListener('change', (e) => { state.sort = e.target.value; renderCatalog(); });
    $('[data-catalog-reset]')?.addEventListener('click', () => { state.cat = 'ALL'; state.brand = 'ALL'; state.q = ''; if (search) search.value = ''; renderCatalog(); });
    $('[data-search-open]')?.addEventListener('click', () => { scrollToCatalog(); setTimeout(() => search?.focus(), 400); });
  }

  /* ---------------- showcase ---------------- */
  const WAVE_UNIT = {
    eeg: 'c12,-20 38,-20 50,0 c12,20 38,20 50,0',
    ecg: 'h28 l5,-22 l5,32 l5,-22 l5,12 h52',
    emg: 'l10,-14 l10,18 l10,-22 l10,16 l10,-10 l10,20 l10,-18 l10,14 l10,-16 l10,12',
    acc: 'h36 l4,-8 l4,8 h36 l4,8 l4,-8 h12'
  };
  const SIG = { EEG: 'var(--sig-eeg)', ECG: 'var(--sig-ecg)', EMG: 'var(--sig-emg)', ACC: 'var(--muted)' };
  const makeWave = (t) => `M0 32 ${Array(12).fill(WAVE_UNIT[t] || WAVE_UNIT.eeg).join(' ')}`;

  function initShowcase() {
    const sc = $('[data-showcase]');
    if (!sc) return;
    const img = $('[data-showcase-img]', sc);
    const chip = $('[data-showcase-chip]', sc);
    const link = $('[data-showcase-link]', sc);
    const waveBox = $('[data-showcase-wave]', sc);
    const rows = $$('.showcase__row', sc);
    waveBox.innerHTML = '<svg viewBox="0 0 1200 64" preserveAspectRatio="none"><path d="' + makeWave('eeg') + '"/></svg>';
    const wavePath = $('path', waveBox);
    let active = null;

    function preview(row) {
      if (row.dataset.cat === active) return;
      active = row.dataset.cat;
      rows.forEach((r) => r.classList.toggle('is-active', r === row));
      const sig = row.dataset.sig;
      if (!reduce) { img.classList.add('swap'); setTimeout(() => { img.src = row.dataset.img; img.classList.remove('swap'); }, 200); }
      else img.src = row.dataset.img;
      chip.setAttribute('data-sig', sig);
      chip.innerHTML = '<span class="dot"></span>' + esc(row.dataset.en) + '<small>' + esc(row.dataset.ko) + '</small>';
      sc.querySelector('.showcase__preview').style.setProperty('--wave', SIG[sig] || 'var(--accent)');
      wavePath.setAttribute('d', makeWave(row.dataset.wave));
      link.dataset.cat = row.dataset.cat;
    }
    function go(cat) { state.cat = cat; state.brand = 'ALL'; state.q = ''; const s = $('[data-catalog-search]'); if (s) s.value = ''; renderCatalog(); scrollToCatalog(); }

    rows.forEach((row) => {
      row.addEventListener('mouseenter', () => preview(row));
      row.querySelector('button').addEventListener('click', () => go(row.dataset.cat));
    });
    link.addEventListener('click', () => go(link.dataset.cat || rows[0].dataset.cat));
    preview(rows[0]);
  }

  function fillCounts() {
    $$('[data-cat-count]').forEach((el) => { el.textContent = D().byCat(el.dataset.catCount).length; });
  }

  /* ---------------- cart drawer ---------------- */
  const drawer = () => $('[data-cart-drawer]');
  function openDrawer() { const d = drawer(); d.hidden = false; requestAnimationFrame(() => d.classList.add('open')); document.body.style.overflow = 'hidden'; renderCart(); }
  function closeDrawer() { const d = drawer(); d.classList.remove('open'); document.body.style.overflow = ''; setTimeout(() => { d.hidden = true; }, 260); }

  function renderCart() {
    const items = window.LaxthaCart.get().map((it) => ({ ...it, p: D().byId(it.id) })).filter((x) => x.p);
    const body = $('[data-cart-items]');
    const empty = $('[data-cart-empty]');
    const foot = $('[data-cart-foot]');
    body.innerHTML = items.map((it) => `
      <div class="cart-line" data-id="${esc(it.id)}">
        <div class="cart-line__thumb"><img src="${esc(it.p.img)}" alt="${esc(it.p.name)}"></div>
        <div>
          <div class="cart-line__name">${esc(it.p.name)}</div>
          <div class="cart-line__meta">${esc(it.p.brand)} · ${esc(D().categoryLabel(it.p.cat))}</div>
          <div class="cart-line__ctrl">
            <div class="qtybox"><button type="button" data-dec="${esc(it.id)}" aria-label="감소">−</button><span>${it.qty}</span><button type="button" data-inc="${esc(it.id)}" aria-label="증가">+</button></div>
            <button class="cart-line__rm" type="button" data-rm="${esc(it.id)}">삭제</button>
          </div>
        </div>
        <div class="cart-line__price">${won(it.p.price * it.qty)}원</div>
      </div>`).join('');
    empty.hidden = items.length > 0;
    foot.hidden = items.length === 0;
    $('[data-cart-total]').textContent = `${won(window.LaxthaCart.subtotal(D().products))}원`;
  }

  function initCart() {
    $('[data-cart-open]')?.addEventListener('click', openDrawer);
    $$('[data-drawer-close]').forEach((b) => b.addEventListener('click', closeDrawer));
    drawer().addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-inc]')) { const id = t.closest('[data-inc]').dataset.inc; const i = window.LaxthaCart.get().find((x) => x.id === id); window.LaxthaCart.update(id, (i?.qty || 1) + 1); renderCart(); }
      else if (t.closest('[data-dec]')) { const id = t.closest('[data-dec]').dataset.dec; const i = window.LaxthaCart.get().find((x) => x.id === id); window.LaxthaCart.update(id, (i?.qty || 1) - 1); renderCart(); }
      else if (t.closest('[data-rm]')) { window.LaxthaCart.remove(t.closest('[data-rm]').dataset.rm); renderCart(); }
    });
    window.addEventListener('laxtha:cart-change', () => { if (!drawer().hidden) renderCart(); });
  }

  /* ---------------- quick view ---------------- */
  function openQuickview(id) {
    const p = D().byId(id); if (!p) return;
    const label = D().categoryLabel(p.cat);
    $('[data-quickview-body]').innerHTML = `
      <div class="qv">
        <div class="qv__media"><img src="${esc(p.img)}" alt="${esc(p.name)}"></div>
        <div>
          <div class="qv__chips"><span class="chip" data-sig="${esc(p.cat)}"><span class="dot"></span>${esc(label)}</span><span class="tagpill">${esc(p.brand)}</span></div>
          <h2 class="qv__name">${esc(p.name)}</h2>
          <p class="qv__spec">${esc(p.spec || '')}</p>
          <p class="qv__price">${won(p.price)}<span>원</span></p>
          <div class="qv__buy">
            <button class="btn btn--ink" type="button" data-qv-add="${esc(p.id)}">장바구니 담기</button>
            <button class="btn btn--accent" type="button" data-qv-buy="${esc(p.id)}">바로 구매</button>
          </div>
          <p class="pay-note">연구·교육기관 납품 견적은 고객센터(042-931-4590)로 문의해 주세요.</p>
        </div>
      </div>`;
    openModal('[data-quickview]');
  }

  /* ---------------- modal helpers ---------------- */
  function openModal(sel) { const m = $(sel); m.hidden = false; requestAnimationFrame(() => m.classList.add('open')); document.body.style.overflow = 'hidden'; }
  function closeModal(m) { m.classList.remove('open'); document.body.style.overflow = ''; setTimeout(() => { m.hidden = true; }, 260); }
  function initModals() {
    $$('.modal').forEach((m) => {
      $$('[data-modal-close]', m).forEach((b) => b.addEventListener('click', () => closeModal(m)));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $$('.modal.open, .drawer.open').forEach((x) => x.classList.contains('drawer') ? closeDrawer() : closeModal(x)); } });
  }

  /* ---------------- checkout ---------------- */
  function renderSummary() {
    const items = window.LaxthaCart.get().map((it) => ({ ...it, p: D().byId(it.id) })).filter((x) => x.p);
    $('[data-checkout-summary]').innerHTML = items.map((it) => `
      <div class="summary-line">
        <div class="summary-line__thumb"><img src="${esc(it.p.img)}" alt="${esc(it.p.name)}"></div>
        <div><strong>${esc(it.p.name)}</strong><div class="q">${it.qty}개</div></div>
        <div class="p">${won(it.p.price * it.qty)}원</div>
      </div>`).join('');
    $('[data-checkout-total]').textContent = `${won(window.LaxthaCart.subtotal(D().products))}원`;
  }

  function pay(order, customer) {
    const code = window.LAXTHA_PORTONE_IMP_CODE;
    const placeholder = !window.IMP || !code || code === 'imp00000000';
    if (placeholder) return Promise.resolve({ imp_uid: 'mock_' + Date.now() });
    return new Promise((res, rej) => {
      window.IMP.init(code);
      window.IMP.request_pay({ pg: 'kcp', pay_method: 'card', merchant_uid: order.merchant_uid, name: 'LAXTHA 주문', amount: order.amount, buyer_name: customer.name, buyer_tel: customer.tel, buyer_email: customer.email, buyer_addr: customer.addr }, (rsp) => rsp.success ? res(rsp) : rej(new Error(rsp.error_msg || '결제가 취소되었습니다.')));
    });
  }

  async function postJson(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || '요청 처리에 실패했습니다.');
    return j;
  }

  function initCheckout() {
    $('[data-checkout-open]')?.addEventListener('click', () => {
      if (window.LaxthaCart.count() === 0) return;
      $('[data-checkout-view]').hidden = false;
      $('[data-checkout-done]').hidden = true;
      renderSummary();
      closeDrawer();
      setTimeout(() => openModal('[data-checkout-modal]'), 220);
    });
    const form = $('[data-checkout-form]');
    const alert = $('[data-checkout-alert]');
    const btn = $('[data-pay-button]');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      alert.hidden = true;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.disabled = true; btn.textContent = '결제 진행 중…';
      try {
        const fd = new FormData(form);
        const customer = { name: fd.get('name'), tel: fd.get('tel'), email: fd.get('email'), addr: fd.get('addr'), memo: fd.get('memo') };
        const order = await postJson('/api/orders', { items: window.LaxthaCart.get(), customer });
        const rsp = await pay(order, customer);
        await postJson('/api/payment/complete', { imp_uid: rsp.imp_uid, merchant_uid: order.merchant_uid });
        window.LaxthaCart.clear();
        $('[data-done-info]').innerHTML = `
          <div class="info-row"><span>주문번호</span><strong>${esc(order.orderId)}</strong></div>
          <div class="info-row"><span>결제금액</span><strong>${won(order.amount)}원</strong></div>
          <div class="info-row"><span>수령인</span><strong>${esc(customer.name)}</strong></div>`;
        $('[data-checkout-view]').hidden = true;
        $('[data-checkout-done]').hidden = false;
      } catch (err) {
        alert.textContent = err.message || '결제 처리 중 오류가 발생했습니다.';
        alert.hidden = false;
      } finally {
        btn.disabled = false; btn.textContent = '결제하기';
      }
    });
  }

  /* ---------------- global clicks (cards, add, jumps) ---------------- */
  function initGlobal() {
    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { window.LaxthaCart.add(add.dataset.add, 1); add.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' }); return; }
      const qvAdd = e.target.closest('[data-qv-add]'); if (qvAdd) { window.LaxthaCart.add(qvAdd.dataset.qvAdd, 1); closeModal($('[data-quickview]')); openDrawer(); return; }
      const qvBuy = e.target.closest('[data-qv-buy]'); if (qvBuy) { window.LaxthaCart.add(qvBuy.dataset.qvBuy, 1); closeModal($('[data-quickview]')); $('[data-checkout-open]')?.click(); return; }
      const cardEl = e.target.closest('.pcard'); if (cardEl && !e.target.closest('[data-add]')) { openQuickview(cardEl.dataset.id); return; }
      const jc = e.target.closest('[data-jump-cat]'); if (jc) { state.cat = jc.dataset.jumpCat; state.brand = 'ALL'; renderCatalog(); closeSheet(); return; }
      const jb = e.target.closest('[data-jump-brand]'); if (jb) { state.brand = jb.dataset.jumpBrand; state.cat = 'ALL'; renderCatalog(); closeSheet(); return; }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('pcard')) { e.preventDefault(); openQuickview(e.target.dataset.id); }
    });
  }

  /* ---------------- mobile sheet ---------------- */
  function closeSheet() { const s = $('[data-menu]'); s?.classList.remove('open'); document.body.style.overflow = ''; }
  function initSheet() {
    const s = $('[data-menu]'); if (!s) return;
    $('[data-menu-open]')?.addEventListener('click', () => { s.classList.add('open'); document.body.style.overflow = 'hidden'; });
    $('[data-menu-close]')?.addEventListener('click', closeSheet);
    s.addEventListener('click', (e) => { if (e.target === s) closeSheet(); if (e.target.tagName === 'A') closeSheet(); });
  }

  /* ---------------- motion ---------------- */
  let obs;
  function observe() {
    const items = $$('[data-reveal]:not(.in)');
    if (reduce) { items.forEach((el) => el.classList.add('in')); return; }
    obs = obs || new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); obs.unobserve(x.target); } }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i * 60, 240)}ms`; obs.observe(el); });
  }
  function initMagnetic() {
    if (reduce) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.4}px)`; });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  function init() {
    window.LaxthaCart?.updateBadges?.();
    initCart(); initModals(); initCheckout(); initGlobal(); initSheet(); initMagnetic();
    observe();
    const hero = $('[data-hero]'); if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('in')));
    if (D()) D().loadProducts().then(() => { renderCatalog(); fillCounts(); initCatalogControls(); initShowcase(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
