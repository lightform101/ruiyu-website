/* 睿嶼 中文管理後台 — 靜態頁面直接打 PocketBase API（無額外後端） */
(function () {
  'use strict';

  // PocketBase 公開網址（與官網 cms.js 的 CMS_API 相同）
  const PB = 'https://ruiyu-cms.zeabur.app';

  let token = localStorage.getItem('ruiyu_pb_token') || '';
  const state = { settings: null, quiz: null, services: [], articles: [], products: [] };

  // ---------- 小工具 ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const node = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const appendHTML = (parent, html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); parent.appendChild(t.content); };
  const cssUrl = (u) => (u ? `url('${String(u).replace(/'/g, "%27")}')` : '');

  function toast(msg, err) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  async function pb(path, { method = 'GET', body, isForm = false } = {}) {
    const headers = {};
    if (token) headers['Authorization'] = token;
    let payload = body;
    if (body && !isForm) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const r = await fetch(PB + path, { method, headers, body: payload });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data && data.message ? data.message : r.status + ' 錯誤');
    return data;
  }

  async function uploadImage(file) {
    const fd = new FormData(); fd.append('file', file);
    const d = await pb('/api/collections/media/records', { method: 'POST', body: fd, isForm: true });
    return `${PB}/api/files/media/${d.id}/${d.file}`;
  }

  // ---------- 登入 ----------
  async function doLogin(email, password) {
    const d = await pb('/api/collections/_superusers/auth-with-password', { method: 'POST', body: { identity: email, password } });
    token = d.token; localStorage.setItem('ruiyu_pb_token', token);
  }
  function logout() { token = ''; localStorage.removeItem('ruiyu_pb_token'); location.reload(); }

  async function checkAuth() {
    if (!token) return false;
    try { const d = await pb('/api/collections/_superusers/auth-refresh', { method: 'POST' }); token = d.token; localStorage.setItem('ruiyu_pb_token', token); return true; }
    catch { token = ''; localStorage.removeItem('ruiyu_pb_token'); return false; }
  }

  // ---------- 載入資料 ----------
  async function loadAll() {
    const [s, q, sv, ar, pr] = await Promise.all([
      pb('/api/collections/settings/records?perPage=1'),
      pb('/api/collections/flavor_quiz/records?perPage=1'),
      pb('/api/collections/services/records?perPage=200&sort=sort'),
      pb('/api/collections/articles/records?perPage=200&sort=sort'),
      pb('/api/collections/products/records?perPage=200&sort=sort'),
    ]);
    state.settings = s.items[0] || null;
    state.quiz = q.items[0] || null;
    state.services = sv.items;
    state.articles = ar.items;
    state.products = pr.items;
  }

  // ---------- 通用元件 ----------
  function imagePicker(currentUrl) {
    const wrap = node(`
      <div class="img-pick">
        <div class="img-thumb"></div>
        <div class="grow">
          <input type="url" placeholder="圖片網址，或用下方上傳">
          <div class="bar">
            <label class="btn btn-line btn-sm" style="margin:0">上傳圖片<input type="file" accept="image/*" hidden></label>
            <span class="msg" style="margin:0"></span>
          </div>
        </div>
      </div>`);
    const thumb = $('.img-thumb', wrap), url = $('input[type=url]', wrap), file = $('input[type=file]', wrap), msg = $('.msg', wrap);
    const setUrl = (u) => { url.value = u || ''; thumb.style.backgroundImage = cssUrl(u); };
    setUrl(currentUrl);
    url.addEventListener('input', () => thumb.style.backgroundImage = cssUrl(url.value));
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      msg.textContent = '上傳中…'; msg.className = 'msg';
      try { setUrl(await uploadImage(f)); msg.textContent = '已上傳 ✓'; }
      catch (e) { msg.textContent = '上傳失敗：' + e.message; msg.className = 'msg err'; }
    });
    return { wrap, get: () => url.value.trim() };
  }

  // 重複輸入列（回傳 {wrap, get, add}）；render(row, val) 設定值、read(row) 讀值
  function repeater(values, render, read, addLabel) {
    const wrap = node('<div></div>');
    const list = node('<div></div>'); wrap.appendChild(list);
    const addRow = (val) => {
      const row = node('<div class="list-row"></div>');
      render(row, val || {});
      const del = node('<button type="button" class="btn btn-danger btn-sm del">刪</button>');
      del.addEventListener('click', () => row.remove());
      row.appendChild(del);
      list.appendChild(row);
    };
    (values || []).forEach(addRow);
    const addBtn = node(`<button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px">＋ ${addLabel || '新增一列'}</button>`);
    addBtn.addEventListener('click', () => addRow({}));
    wrap.appendChild(addBtn);
    // 只取直接子列，避免巢狀 repeater（如題目→選項）互相抓到對方的 .list-row
    return { wrap, get: () => [...list.children].filter((c) => c.classList && c.classList.contains('list-row')).map(read).filter((x) => x && Object.values(x).some((v) => v !== '' && v != null)) };
  }

  // ---------- 分頁 ----------
  const TABS = [
    { id: 'settings', label: '網站設定', render: renderSettings },
    { id: 'products', label: '商品', render: renderProducts },
    { id: 'services', label: '服務項目', render: renderServices },
    { id: 'articles', label: '文章', render: renderArticles },
    { id: 'quiz', label: '風味測驗', render: renderQuiz },
  ];
  function renderTabs(active) {
    const bar = $('#tabs'); bar.innerHTML = '';
    TABS.forEach((t) => {
      const b = node(`<button class="tab${t.id === active ? ' active' : ''}">${t.label}</button>`);
      b.addEventListener('click', () => show(t.id));
      bar.appendChild(b);
    });
  }
  function show(id) {
    renderTabs(id);
    const view = $('#view'); view.innerHTML = '';
    (TABS.find((t) => t.id === id) || TABS[0]).render(view);
  }

  // ---------- 網站設定 ----------
  function renderSettings(view) {
    const s = state.settings; if (!s) { view.innerHTML = '<div class="empty">找不到設定資料，請先執行 setup 腳本。</div>'; return; }
    const theme = s.theme || {};
    const footer = s.footer || {};
    const THEME_KEYS = [['oat', '底色 燕麥白'], ['paper', '紙感底'], ['card', '卡片底'], ['latte', '主色 拿鐵'], ['latte_d', '主色深'], ['charcoal', '文字 炭灰'], ['ink', '內文'], ['gray', '次要灰'], ['line', '線條']];

    view.appendChild(node('<div class="sec-title">網站設定</div>'));
    view.appendChild(node('<div class="sec-desc">品牌名稱、主題配色、頁尾資訊。改完按最下面「儲存設定」。</div>'));

    const card = node('<div class="card"></div>');
    card.appendChild(node(`
      <div class="row2">
        <div class="field"><label>品牌中文名</label><input type="text" id="brand_zh"></div>
        <div class="field"><label>品牌英文名</label><input type="text" id="brand_en"></div>
      </div>`));
    $('#brand_zh', card).value = s.brand_zh || '';
    $('#brand_en', card).value = s.brand_en || '';

    card.appendChild(node('<div class="mini">主題配色</div>'));
    const cg = node('<div class="color-grid"></div>');
    THEME_KEYS.forEach(([k, label]) => {
      const item = node(`<label class="color-item"><input type="color" data-k="${k}"><span class="cname">${label}</span></label>`);
      $('input', item).value = theme[k] || '#000000';
      cg.appendChild(item);
    });
    card.appendChild(cg);

    card.appendChild(node('<div class="mini">頁尾</div>'));
    appendHTML(card, `
      <div class="field"><label>標語</label><input type="text" id="f_tag"></div>
      <div class="row2">
        <div class="field"><label>聯絡 Email</label><input type="text" id="f_email"></div>
        <div class="field"><label>版權文字</label><input type="text" id="f_copy"></div>
      </div>`);
    $('#f_tag', card).value = footer.tagline || '';
    $('#f_email', card).value = footer.email || '';
    $('#f_copy', card).value = footer.copyright || '';

    card.appendChild(node('<div class="mini">社群連結</div>'));
    const socials = repeater(footer.socials, (row, v) => {
      row.appendChild(node(`<input type="text" placeholder="名稱(如 IG)" style="max-width:120px">`));
      row.appendChild(node(`<input type="url" placeholder="連結網址">`));
      $$('input', row)[0].value = v.label || ''; $$('input', row)[1].value = v.url || '';
    }, (row) => ({ label: $$('input', row)[0].value.trim(), url: $$('input', row)[1].value.trim() }), '社群');
    card.appendChild(socials.wrap);

    view.appendChild(card);
    const saveBtn = node('<button class="btn">儲存設定</button>');
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      try {
        const themeObj = {}; $$('input[type=color]', cg).forEach((i) => themeObj[i.dataset.k] = i.value);
        await pb(`/api/collections/settings/records/${s.id}`, {
          method: 'PATCH', body: {
            brand_zh: $('#brand_zh', card).value.trim(),
            brand_en: $('#brand_en', card).value.trim(),
            theme: themeObj,
            footer: { tagline: $('#f_tag', card).value.trim(), email: $('#f_email', card).value.trim(), copyright: $('#f_copy', card).value.trim(), socials: socials.get() },
            nav: s.nav,
          },
        });
        toast('設定已儲存 ✓'); await loadAll();
      } catch (e) { toast('儲存失敗：' + e.message, true); }
      saveBtn.disabled = false;
    });
    view.appendChild(saveBtn);
  }

  // ---------- 服務項目 ----------
  function serviceCard(sv) {
    sv = sv || {};
    const card = node('<div class="card"></div>');
    card.dataset.id = sv.id || '';
    appendHTML(card, `
      <div class="row2">
        <div class="field"><label>圖示 emoji</label><input type="text" class="f_icon" placeholder="☕" style="max-width:100px"></div>
        <div class="field"><label>排序（數字小的在前）</label><input type="text" class="f_sort" style="max-width:120px"></div>
      </div>
      <div class="row2">
        <div class="field"><label>標題（中文）</label><input type="text" class="f_zh"></div>
        <div class="field"><label>標題（英文）</label><input type="text" class="f_en"></div>
      </div>
      <div class="field"><label>說明</label><textarea class="f_desc"></textarea></div>`);
    $('.f_icon', card).value = sv.icon || ''; $('.f_sort', card).value = sv.sort ?? '';
    $('.f_zh', card).value = sv.title_zh || ''; $('.f_en', card).value = sv.title_en || '';
    $('.f_desc', card).value = sv.description || '';

    card.appendChild(node('<div class="mini">條列重點</div>'));
    const bullets = repeater((sv.bullets || []).map((t) => ({ t })), (row, v) => {
      const inp = node('<input type="text" placeholder="重點一句">'); inp.value = v.t || ''; row.appendChild(inp);
    }, (row) => ({ t: $('input', row).value.trim() }), '重點');
    card.appendChild(bullets.wrap);

    card.appendChild(node('<div class="mini">圖片</div>'));
    const pic = imagePicker(sv.image);
    card.appendChild(pic.wrap);

    const bar = node('<div class="bar" style="margin-top:16px"></div>');
    const save = node('<button class="btn btn-sm">儲存</button>');
    const del = node('<button class="btn btn-danger btn-sm">刪除</button>');
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        const body = {
          icon: $('.f_icon', card).value.trim(), sort: Number($('.f_sort', card).value) || 0,
          title_zh: $('.f_zh', card).value.trim(), title_en: $('.f_en', card).value.trim(),
          description: $('.f_desc', card).value.trim(), bullets: bullets.get().map((b) => b.t), image: pic.get(),
        };
        if (card.dataset.id) await pb(`/api/collections/services/records/${card.dataset.id}`, { method: 'PATCH', body });
        else { const d = await pb('/api/collections/services/records', { method: 'POST', body }); card.dataset.id = d.id; }
        toast('服務已儲存 ✓');
      } catch (e) { toast('失敗：' + e.message, true); }
      save.disabled = false;
    });
    del.addEventListener('click', async () => {
      if (!confirm('確定刪除這個服務？')) return;
      try { if (card.dataset.id) await pb(`/api/collections/services/records/${card.dataset.id}`, { method: 'DELETE' }); card.remove(); toast('已刪除'); }
      catch (e) { toast('刪除失敗：' + e.message, true); }
    });
    bar.appendChild(save); bar.appendChild(del);
    card.appendChild(bar);
    return card;
  }
  function renderServices(view) {
    view.appendChild(node('<div class="sec-title">服務項目</div>'));
    view.appendChild(node('<div class="sec-desc">每個服務一張卡片。各自「儲存」。</div>'));
    const list = node('<div id="svcList"></div>'); view.appendChild(list);
    state.services.forEach((sv) => list.appendChild(serviceCard(sv)));
    const add = node('<button class="btn btn-line">＋ 新增服務</button>');
    add.addEventListener('click', () => { const c = serviceCard({ sort: state.services.length }); list.appendChild(c); c.scrollIntoView({ behavior: 'smooth' }); });
    view.appendChild(add);
  }

  // ---------- 商品 ----------
  function productCard(p) {
    p = p || {};
    const card = node('<div class="card"></div>');
    card.dataset.id = p.id || '';
    appendHTML(card, `
      <div class="row2">
        <div class="field"><label>商品名稱</label><input type="text" class="f_name"></div>
        <div class="field"><label>價格（數字，NT$）</label><input type="text" class="f_price"></div>
      </div>
      <div class="row2">
        <div class="field"><label>分類</label><input type="text" class="f_cat" placeholder="沖煮道具"></div>
        <div class="field"><label>排序</label><input type="text" class="f_sort" style="max-width:120px"></div>
      </div>
      <div class="field"><label>商品說明</label><textarea class="f_desc"></textarea></div>
      <div class="field"><label><input type="checkbox" class="f_active" style="width:auto;vertical-align:middle;margin-right:6px">上架中（打勾才會顯示在商店）</label></div>`);
    $('.f_name', card).value = p.name || ''; $('.f_price', card).value = p.price ?? '';
    $('.f_cat', card).value = p.category || ''; $('.f_sort', card).value = p.sort ?? '';
    $('.f_desc', card).value = p.description || ''; $('.f_active', card).checked = p.active !== false;

    card.appendChild(node('<div class="mini">商品圖片</div>'));
    const pic = imagePicker(p.image); card.appendChild(pic.wrap);

    const bar = node('<div class="bar" style="margin-top:16px"></div>');
    const save = node('<button class="btn btn-sm">儲存</button>');
    const del = node('<button class="btn btn-danger btn-sm">刪除</button>');
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        const body = {
          name: $('.f_name', card).value.trim(), price: Number($('.f_price', card).value) || 0,
          category: $('.f_cat', card).value.trim(), sort: Number($('.f_sort', card).value) || 0,
          description: $('.f_desc', card).value.trim(), active: $('.f_active', card).checked, image: pic.get(),
        };
        if (!body.name) { toast('請填商品名稱', true); save.disabled = false; return; }
        if (card.dataset.id) await pb(`/api/collections/products/records/${card.dataset.id}`, { method: 'PATCH', body });
        else { const d = await pb('/api/collections/products/records', { method: 'POST', body }); card.dataset.id = d.id; }
        toast('商品已儲存 ✓');
      } catch (e) { toast('失敗：' + e.message, true); }
      save.disabled = false;
    });
    del.addEventListener('click', async () => {
      if (!confirm('確定刪除這個商品？')) return;
      try { if (card.dataset.id) await pb(`/api/collections/products/records/${card.dataset.id}`, { method: 'DELETE' }); card.remove(); toast('已刪除'); }
      catch (e) { toast('刪除失敗：' + e.message, true); }
    });
    bar.appendChild(save); bar.appendChild(del); card.appendChild(bar);
    return card;
  }
  function renderProducts(view) {
    view.appendChild(node('<div class="sec-title">商品（選物商店）</div>'));
    view.appendChild(node('<div class="sec-desc">在「選物」商品頁販售的商品。每個商品一張卡片，各自「儲存」。</div>'));
    const list = node('<div></div>'); view.appendChild(list);
    state.products.forEach((p) => list.appendChild(productCard(p)));
    const add = node('<button class="btn btn-line">＋ 新增商品</button>');
    add.addEventListener('click', () => { const c = productCard({ sort: state.products.length, active: true }); list.appendChild(c); c.scrollIntoView({ behavior: 'smooth' }); });
    view.appendChild(add);
  }

  // ---------- 文章 ----------
  function articleCard(a) {
    a = a || {};
    const card = node('<div class="card"></div>');
    card.dataset.id = a.id || '';
    appendHTML(card, `
      <div class="row2">
        <div class="field"><label>分類</label><input type="text" class="f_cat" placeholder="咖啡日常"></div>
        <div class="field"><label>日期文字</label><input type="text" class="f_date" placeholder="2026 · 06"></div>
      </div>
      <div class="field"><label>標題</label><input type="text" class="f_title"></div>
      <div class="field"><label>摘要</label><textarea class="f_ex"></textarea></div>
      <div class="field"><label>連結（可留 # 或文章網址）</label><input type="text" class="f_href" placeholder="#"></div>
      <div class="row2"><div class="field"><label>排序</label><input type="text" class="f_sort" style="max-width:120px"></div><div></div></div>`);
    $('.f_cat', card).value = a.category || ''; $('.f_date', card).value = a.date || '';
    $('.f_title', card).value = a.title || ''; $('.f_ex', card).value = a.excerpt || '';
    $('.f_href', card).value = a.href || '#'; $('.f_sort', card).value = a.sort ?? '';

    card.appendChild(node('<div class="mini">封面圖</div>'));
    const pic = imagePicker(a.cover); card.appendChild(pic.wrap);

    const bar = node('<div class="bar" style="margin-top:16px"></div>');
    const save = node('<button class="btn btn-sm">儲存</button>');
    const del = node('<button class="btn btn-danger btn-sm">刪除</button>');
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        const body = {
          category: $('.f_cat', card).value.trim(), date: $('.f_date', card).value.trim(),
          title: $('.f_title', card).value.trim(), excerpt: $('.f_ex', card).value.trim(),
          href: $('.f_href', card).value.trim() || '#', sort: Number($('.f_sort', card).value) || 0, cover: pic.get(),
        };
        if (card.dataset.id) await pb(`/api/collections/articles/records/${card.dataset.id}`, { method: 'PATCH', body });
        else { const d = await pb('/api/collections/articles/records', { method: 'POST', body }); card.dataset.id = d.id; }
        toast('文章已儲存 ✓');
      } catch (e) { toast('失敗：' + e.message, true); }
      save.disabled = false;
    });
    del.addEventListener('click', async () => {
      if (!confirm('確定刪除這篇文章？')) return;
      try { if (card.dataset.id) await pb(`/api/collections/articles/records/${card.dataset.id}`, { method: 'DELETE' }); card.remove(); toast('已刪除'); }
      catch (e) { toast('刪除失敗：' + e.message, true); }
    });
    bar.appendChild(save); bar.appendChild(del); card.appendChild(bar);
    return card;
  }
  function renderArticles(view) {
    view.appendChild(node('<div class="sec-title">文章（生活美學）</div>'));
    view.appendChild(node('<div class="sec-desc">每篇文章一張卡片。各自「儲存」。</div>'));
    const list = node('<div></div>'); view.appendChild(list);
    state.articles.forEach((a) => list.appendChild(articleCard(a)));
    const add = node('<button class="btn btn-line">＋ 新增文章</button>');
    add.addEventListener('click', () => { const c = articleCard({ sort: state.articles.length }); list.appendChild(c); c.scrollIntoView({ behavior: 'smooth' }); });
    view.appendChild(add);
  }

  // ---------- 風味測驗 ----------
  function renderQuiz(view) {
    const q = state.quiz; if (!q) { view.innerHTML = '<div class="empty">找不到測驗資料。</div>'; return; }
    const order = q.order && q.order.length ? q.order : ['bright', 'soft', 'deep', 'sweet'];
    view.appendChild(node('<div class="sec-title">風味測驗</div>'));
    view.appendChild(node('<div class="sec-desc">題目、選項（每個選項對應一種風味），以及四種結果。</div>'));

    const card = node('<div class="card"></div>');
    appendHTML(card, `
      <div class="field"><label>小標</label><input type="text" id="q_kicker"></div>
      <div class="field"><label>大標</label><input type="text" id="q_title"></div>`);
    $('#q_kicker', card).value = q.kicker || ''; $('#q_title', card).value = q.title || '';

    const optTag = (sel) => order.map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${k}</option>`).join('');
    card.appendChild(node('<div class="mini">題目</div>'));
    const qWrap = node('<div></div>');
    const questions = (q.questions || []);
    const qRepeat = repeater(questions, (row, qitem) => {
      row.style.flexDirection = 'column';
      const box = node('<div class="q-block" style="width:100%"></div>');
      const qi = node('<input type="text" placeholder="問題">'); qi.value = qitemQ(qitem); qi.classList.add('q-question');
      box.appendChild(node('<div class="qn">問題</div>')); box.appendChild(qi);
      box.appendChild(node('<div class="qn" style="margin-top:10px">選項（文字 → 對應風味）</div>'));
      const opts = repeater((qitem.opts || []), (orow, o) => {
        const ti = node('<input type="text" placeholder="選項文字">'); ti.value = o.t || '';
        const se = node(`<select style="max-width:130px">${optTag(o.s)}</select>`);
        orow.appendChild(ti); orow.appendChild(se);
      }, (orow) => ({ t: $('input', orow).value.trim(), s: $('select', orow).value }), '選項');
      box.appendChild(opts.wrap);
      box._opts = opts;
      row.appendChild(box);
    }, (row) => {
      const box = $('.q-block', row);
      return { q: $('.q-question', box).value.trim(), opts: box._opts.get() };
    }, '題目');
    qWrap.appendChild(qRepeat.wrap);
    card.appendChild(qWrap);

    card.appendChild(node('<div class="mini">四種結果</div>'));
    const results = q.results || {};
    const resInputs = {};
    order.forEach((k) => {
      const r = results[k] || {};
      const box = node(`<div class="q-block"><div class="qn">結果代碼：${k}</div></div>`);
      const emoji = node('<input type="text" placeholder="emoji" style="max-width:90px">'); emoji.value = r.emoji || '';
      const title = node('<input type="text" placeholder="風味名稱" style="margin-top:6px">'); title.value = r.title || '';
      const note = node('<input type="text" placeholder="一句話" style="margin-top:6px">'); note.value = r.note || '';
      const desc = node('<textarea placeholder="描述" style="margin-top:6px"></textarea>'); desc.value = r.desc || '';
      box.appendChild(emoji); box.appendChild(title); box.appendChild(note); box.appendChild(desc);
      card.appendChild(box);
      resInputs[k] = { emoji, title, note, desc };
    });

    view.appendChild(card);
    const save = node('<button class="btn">儲存測驗</button>');
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        const resultsObj = {};
        order.forEach((k) => { const i = resInputs[k]; resultsObj[k] = { emoji: i.emoji.value.trim(), title: i.title.value.trim(), note: i.note.value.trim(), desc: i.desc.value.trim() }; });
        await pb(`/api/collections/flavor_quiz/records/${q.id}`, {
          method: 'PATCH', body: { kicker: $('#q_kicker', card).value.trim(), title: $('#q_title', card).value.trim(), questions: qRepeat.get(), order, results: resultsObj },
        });
        toast('測驗已儲存 ✓'); await loadAll();
      } catch (e) { toast('儲存失敗：' + e.message, true); }
      save.disabled = false;
    });
    view.appendChild(save);
  }
  function qitemQ(qitem) { return qitem && qitem.q ? qitem.q : ''; }

  // ---------- 啟動 ----------
  async function startApp() {
    $('#login').style.display = 'none';
    $('#app').style.display = 'block';
    try { await loadAll(); show('settings'); }
    catch (e) { $('#view').innerHTML = '<div class="empty">載入失敗：' + e.message + '</div>'; }
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#loginMsg'); msg.textContent = '';
    const btn = $('#loginForm button'); btn.disabled = true;
    try { await doLogin($('#email').value.trim(), $('#password').value); await startApp(); }
    catch (err) { msg.textContent = '登入失敗：' + err.message; }
    btn.disabled = false;
  });
  $('#logout').addEventListener('click', logout);

  (async function init() {
    if (await checkAuth()) startApp();
  })();
})();
