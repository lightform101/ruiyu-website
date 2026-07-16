/* 睿嶼 — 購物車（前端，localStorage）。結帳（線上付款）為階段 B，目前先顯示提示。 */
(function () {
  'use strict';
  const KEY = 'ruiyu_cart';
  let items = [];      // [{ key, name, price, image, qty }]
  let productMap = {}; // key -> product
  let els = null;

  const load = () => { try { items = JSON.parse(localStorage.getItem(KEY)) || []; } catch { items = []; } };
  const save = () => localStorage.setItem(KEY, JSON.stringify(items));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cssUrl = (u) => (u ? `url('${String(u).replace(/'/g, "%27")}')` : '');
  const money = (n) => 'NT$ ' + Number(n || 0).toLocaleString();
  const totalQty = () => items.reduce((s, i) => s + i.qty, 0);
  const totalSum = () => items.reduce((s, i) => s + i.qty * Number(i.price || 0), 0);

  function build() {
    const fab = document.createElement('button');
    fab.className = 'cart-fab';
    fab.innerHTML = '🛒 購物車 <span class="count">0</span>';
    const mask = document.createElement('div'); mask.className = 'cart-mask';
    const drawer = document.createElement('div'); drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-hd"><h3>購物車</h3><button class="x" aria-label="關閉">×</button></div>
      <div class="cart-items"></div>
      <div class="cart-ft">
        <div class="sum"><span>小計</span><b class="sum-val">NT$ 0</b></div>
        <button class="btn checkout">前往結帳</button>
        <div class="cart-note"></div>
      </div>`;
    document.body.appendChild(fab); document.body.appendChild(mask); document.body.appendChild(drawer);
    els = { fab, mask, drawer, list: drawer.querySelector('.cart-items'), sum: drawer.querySelector('.sum-val'),
      count: fab.querySelector('.count'), note: drawer.querySelector('.cart-note'), checkout: drawer.querySelector('.checkout') };

    fab.addEventListener('click', open);
    mask.addEventListener('click', close);
    drawer.querySelector('.x').addEventListener('click', close);
    els.checkout.addEventListener('click', doCheckout);
  }

  function open() { els.mask.classList.add('open'); els.drawer.classList.add('open'); }
  function close() { els.mask.classList.remove('open'); els.drawer.classList.remove('open'); }

  function render() {
    if (!els) return;
    els.count.textContent = totalQty();
    els.fab.classList.toggle('show', items.length > 0);
    els.sum.textContent = money(totalSum());
    if (!items.length) {
      els.list.innerHTML = '<div class="cart-empty">購物車是空的<br>去逛逛選物吧 ☕</div>';
      els.checkout.disabled = true; els.note.textContent = '';
      return;
    }
    els.checkout.disabled = false;
    els.list.innerHTML = items.map((i) => `
      <div class="cart-item" data-key="${esc(i.key)}">
        <div class="ci-img" style="background-image:${cssUrl(i.image)}"></div>
        <div class="ci-main">
          <div class="ci-name">${esc(i.name)}</div>
          <div class="ci-price">${money(i.price)}</div>
          <div class="ci-ctrl">
            <button class="qbtn minus">−</button>
            <span class="ci-qty">${i.qty}</span>
            <button class="qbtn plus">＋</button>
            <button class="ci-del">移除</button>
          </div>
        </div>
      </div>`).join('');
    els.list.querySelectorAll('.cart-item').forEach((row) => {
      const key = row.dataset.key;
      row.querySelector('.plus').addEventListener('click', () => setQty(key, qtyOf(key) + 1));
      row.querySelector('.minus').addEventListener('click', () => setQty(key, qtyOf(key) - 1));
      row.querySelector('.ci-del').addEventListener('click', () => setQty(key, 0));
    });
  }

  const qtyOf = (key) => { const it = items.find((i) => i.key === key); return it ? it.qty : 0; };
  function setQty(key, qty) {
    const it = items.find((i) => i.key === key); if (!it) return;
    if (qty <= 0) items = items.filter((i) => i.key !== key); else it.qty = qty;
    save(); render();
  }

  function addByKey(key) {
    const p = productMap[key]; if (!p) return;
    const existing = items.find((i) => i.key === key);
    if (existing) existing.qty++;
    else items.push({ key, name: p.name, price: Number(p.price || 0), image: p.image, qty: 1 });
    save(); render(); open();
  }

  function doCheckout() {
    // 階段 B（線上付款）尚未開通
    els.note.innerHTML = '線上付款即將開通 🙏<br>目前想訂購，請來信 <a href="mailto:hello.ruiyustudio@gmail.com">hello.ruiyustudio@gmail.com</a>，並附上上方商品與數量。';
  }

  window.RuiyuCart = {
    init(products) {
      productMap = {};
      (products || []).forEach((p) => { productMap[p.id || p.name] = p; });
      load();
      if (!els) build();
      render();
    },
    addByKey,
  };
})();
