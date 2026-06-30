(function () {
  const STORAGE_KEY = 'laxtha_cart';

  function readCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed)
        ? parsed.filter((item) => item && item.id && Number(item.qty) > 0)
        : [];
    } catch (error) {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    dispatchChange();
  }

  function clampQty(qty) {
    const value = Number.parseInt(qty, 10);
    if (!Number.isFinite(value)) {
      return 1;
    }
    return Math.min(Math.max(value, 1), 99);
  }

  function get() {
    return readCart();
  }

  function add(id, qty = 1) {
    const items = readCart();
    const index = items.findIndex((item) => item.id === id);

    if (index >= 0) {
      items[index].qty = clampQty(items[index].qty + clampQty(qty));
    } else {
      items.push({ id, qty: clampQty(qty) });
    }

    writeCart(items);
  }

  function remove(id) {
    writeCart(readCart().filter((item) => item.id !== id));
  }

  function update(id, qty) {
    const value = Number.parseInt(qty, 10);
    if (!Number.isFinite(value) || value <= 0) {
      remove(id);
      return;
    }

    writeCart(readCart().map((item) => (
      item.id === id ? { ...item, qty: clampQty(value) } : item
    )));
  }

  function clear() {
    writeCart([]);
  }

  function count() {
    return readCart().reduce((sum, item) => sum + item.qty, 0);
  }

  function productMap(products) {
    return new Map((products || window.LaxthaData?.products || []).map((product) => [product.id, product]));
  }

  function subtotal(products) {
    const map = productMap(products);
    return readCart().reduce((sum, item) => {
      const product = map.get(item.id);
      return product ? sum + product.price * item.qty : sum;
    }, 0);
  }

  function dispatchChange() {
    const detail = { count: count(), items: readCart() };
    updateBadges(detail.count);
    window.dispatchEvent(new CustomEvent('laxtha:cart-change', { detail }));
  }

  function updateBadges(value = count()) {
    document.querySelectorAll('.cart-button__badge, .cart-btn__badge, [data-cart-count]').forEach((badge) => {
      badge.textContent = String(value);
      badge.hidden = value <= 0 && badge.hasAttribute('data-hide-empty');
    });
  }

  function escapeHtml(value) {
    return window.LaxthaUI?.escapeHtml
      ? window.LaxthaUI.escapeHtml(value)
      : String(value ?? '');
  }

  function renderCartPage() {
    const root = document.querySelector('[data-cart-page]');
    if (!root || !window.LaxthaData) {
      updateBadges();
      return;
    }

    window.LaxthaData.loadProducts().then(() => {
      const list = root.querySelector('[data-cart-items]');
      const empty = root.querySelector('[data-cart-empty]');
      const summary = root.querySelector('[data-cart-summary]');
      const total = root.querySelector('[data-cart-total]');
      const orderButton = root.querySelector('[data-cart-order]');
      const products = productMap(window.LaxthaData.products);
      const validItems = get()
        .map((item) => ({ ...item, product: products.get(item.id) }))
        .filter((item) => item.product);

      list.replaceChildren();
      empty.hidden = validItems.length > 0;
      summary.hidden = validItems.length === 0;
      orderButton.disabled = validItems.length === 0;

      list.innerHTML = validItems.map((item) => `
        <article class="cart-line reveal">
          <a class="cart-line__image" href="product.html?id=${encodeURIComponent(item.id)}">
            <img src="${escapeHtml(item.product.img)}" alt="${escapeHtml(item.product.name)}">
          </a>
          <div class="cart-line__body">
            <p class="shop-kicker">${escapeHtml(item.product.brand)} · ${escapeHtml(window.LaxthaData.categoryLabel(item.product.cat))}</p>
            <h3><a href="product.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.product.name)}</a></h3>
            <p>${escapeHtml(item.product.spec)}</p>
          </div>
          <div class="qty-control" aria-label="${escapeHtml(item.product.name)} 수량">
            <button type="button" data-cart-decrease="${escapeHtml(item.id)}" aria-label="수량 줄이기">−</button>
            <input type="number" min="1" max="99" value="${item.qty}" data-cart-qty="${escapeHtml(item.id)}" aria-label="수량">
            <button type="button" data-cart-increase="${escapeHtml(item.id)}" aria-label="수량 늘리기">+</button>
          </div>
          <strong class="cart-line__price">${window.LaxthaData.formatPrice(item.product.price * item.qty)}</strong>
          <button class="text-button" type="button" data-cart-remove="${escapeHtml(item.id)}">삭제</button>
        </article>
      `).join('');

      total.textContent = window.LaxthaData.formatPrice(subtotal(window.LaxthaData.products));
      updateBadges();
      window.LaxthaUI?.initReveal(root);
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const addButton = target?.closest('[data-add-to-cart]');
    const decrease = target?.closest('[data-cart-decrease]');
    const increase = target?.closest('[data-cart-increase]');
    const removeButton = target?.closest('[data-cart-remove]');
    const orderButton = target?.closest('[data-cart-order]');

    if (addButton) {
      add(addButton.dataset.addToCart, 1);
      addButton.textContent = '담았습니다';
      window.setTimeout(() => {
        addButton.textContent = '장바구니';
      }, 1200);
    }

    if (decrease) {
      const item = get().find((cartItem) => cartItem.id === decrease.dataset.cartDecrease);
      update(decrease.dataset.cartDecrease, (item?.qty || 1) - 1);
      renderCartPage();
    }

    if (increase) {
      const item = get().find((cartItem) => cartItem.id === increase.dataset.cartIncrease);
      update(increase.dataset.cartIncrease, (item?.qty || 1) + 1);
      renderCartPage();
    }

    if (removeButton) {
      remove(removeButton.dataset.cartRemove);
      renderCartPage();
    }

    if (orderButton && count() > 0) {
      window.location.href = 'checkout.html';
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const input = target?.closest('[data-cart-qty]');
    if (!input) {
      return;
    }
    update(input.dataset.cartQty, input.value);
    renderCartPage();
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateBadges();
    renderCartPage();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      updateBadges();
      renderCartPage();
    }
  });

  window.LaxthaCart = {
    add,
    remove,
    update,
    clear,
    get,
    count,
    subtotal,
    updateBadges
  };
})();
