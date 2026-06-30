/* LAXTHA data layer — 깔끔한 IA: 측정분야 3 + 브랜드 3 (실제 제품 분포 기준) */
(function () {
  'use strict';

  const CATEGORIES = [
    { code: 'EEG', label: '뇌파 · EEG', desc: '건식전극, 캡, 무선 EEG로 뇌파 측정 환경을 구성합니다.' },
    { code: 'ECG', label: '심전도 · 맥파 · ECG', desc: '심전도, 맥파, HRV 분석을 위한 센서와 측정 장치.' },
    { code: 'EMG', label: '근전도 · EMG', desc: '표면 근전도 측정과 동작 분석을 위한 센서·전극.' },
    { code: 'ACC', label: '소모품 · 부품', desc: '전극 페이스트, 일회용·집게전극, 커넥터 등 측정 부자재.' }
  ];

  const BRANDS = [
    { code: 'neuroNicle', label: 'neuroNicle', desc: '뇌파(EEG) 측정기와 전극' },
    { code: 'ubpulse', label: 'ubpulse', desc: '맥파·심전도(PPG/ECG) 센서' },
    { code: 'iobid', label: 'iobid', desc: '심전도·근전도 측정 장치와 부품' }
  ];

  const fallback = Array.isArray(window.LAXTHA_PRODUCTS) ? window.LAXTHA_PRODUCTS : [];
  let catalog = { categories: CATEGORIES, brands: BRANDS, products: fallback };
  let loadingPromise = null;

  function normalize(payload) {
    const products = Array.isArray(payload?.products) ? payload.products
      : Array.isArray(payload) ? payload : fallback;
    return { categories: CATEGORIES, brands: BRANDS, products };
  }

  async function loadProducts() {
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch('/api/products', { headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error('api'); return r.json(); })
      .then((payload) => { catalog = normalize(payload); return catalog; })
      .catch(() => { catalog = { categories: CATEGORIES, brands: BRANDS, products: fallback }; return catalog; });
    return loadingPromise;
  }

  function formatPrice(price) { return `${Number(price || 0).toLocaleString('ko-KR')}원`; }
  function byId(id) { return catalog.products.find((p) => p.id === id) || null; }
  function byCat(cat) { return (!cat || cat === 'ALL') ? catalog.products.slice() : catalog.products.filter((p) => p.cat === cat); }
  function byBrand(brand) { return (!brand || brand === 'ALL') ? catalog.products.slice() : catalog.products.filter((p) => p.brand === brand); }

  function search(query, products = catalog.products) {
    const k = String(query || '').trim().toLowerCase();
    if (!k) return products.slice();
    return products.filter((p) =>
      [p.id, p.name, p.brand, p.cat, p.spec, ...(p.tags || [])].join(' ').toLowerCase().includes(k)
    );
  }

  function categoryByCode(code) { return CATEGORIES.find((c) => c.code === code) || null; }
  function categoryLabel(code) { return categoryByCode(code)?.label || code || '전체 제품'; }
  function categoryCount(code) { return byCat(code).length; }
  function brandByCode(code) { return BRANDS.find((b) => b.code === code) || null; }
  function brandLabel(code) { return brandByCode(code)?.label || code; }
  function brandCount(code) { return byBrand(code).length; }

  window.LaxthaData = {
    loadProducts, formatPrice, byId, byCat, byBrand, search,
    categoryByCode, categoryLabel, categoryCount, brandByCode, brandLabel, brandCount,
    get products() { return catalog.products; },
    get categories() { return CATEGORIES; },
    get brands() { return BRANDS; }
  };
})();
