/* ============================================================
   睿嶼 — 內容渲染引擎（CMS engine）
   讀取內容資料 → 套用主題色 → 渲染 Header / 區塊 / Footer
   資料來源：目前用打包在站內的 content/content.json（模擬 Directus 回傳）。
   之後接 Directus 時，把 CMS_API 設成 Directus 網址即可（見 loadContent）。
   ============================================================ */
(function () {
  'use strict';

  // 之後接 Directus：填入 Directus 公開網址（例如 'https://ruiyu-cms.zeabur.app'）。
  // 留空 = 使用站內打包的 content/content.json。
  const CMS_API = '';

  // ---------- 小工具 ----------
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
  const cssUrl = (u) => "url('" + String(u || '').replace(/'/g, "%27") + "')";
  const BTN = { primary: 'btn', ghost: 'btn btn-ghost', line: 'btn btn-line', ink: 'btn btn-ink' };
  const btnClass = (style) => BTN[style] || 'btn';
  const buttons = (arr) => (arr || [])
    .map((b) => `<a href="${esc(b.href)}" class="${btnClass(b.style)}">${esc(b.label)}</a>`).join('');

  // ---------- 區塊渲染器 ----------
  const BLOCKS = {
    hero(b) {
      return `
      <section class="hero">
        <div class="hero-bg" id="heroBg" style="background-image:${cssUrl(b.bg_image)}"></div>
        <div class="hero-inner reveal">
          <span class="eyebrow">${esc(b.eyebrow)}</span>
          <h1 class="serif">${nl2br(b.heading)}</h1>
          <p>${nl2br(b.body)}</p>
          <div class="hero-actions">${buttons(b.buttons)}</div>
        </div>
        <div class="scroll-hint"><span></span>SCROLL</div>
      </section>`;
    },

    banner(b) {
      return `
      <section class="banner">
        <div class="banner-bg" style="background-image:${cssUrl(b.bg_image)}"></div>
        <div class="wrap">
          <span class="eyebrow">${esc(b.eyebrow)}</span>
          <h1 class="serif">${nl2br(b.heading)}</h1>
          ${b.subtext ? `<p>${nl2br(b.subtext)}</p>` : ''}
        </div>
      </section>`;
    },

    about_split(b) {
      const bg = b.bg === 'paper' ? ' style="background:var(--paper)"' : '';
      const paras = (b.paragraphs || []).map((p) => `<p>${nl2br(p)}</p>`).join('');
      const quote = b.quote ? `<p class="quote">${nl2br(b.quote)}</p>` : '';
      const btn = b.button ? `<a href="${esc(b.button.href)}" class="${btnClass(b.button.style)}">${esc(b.button.label)}</a>` : '';
      const tag = b.tag_text ? `<div class="tag"><span class="serif">${nl2br(b.tag_text)}</span></div>` : '';
      return `
      <section${bg}>
        <div class="wrap about-grid">
          <div class="about-art reveal">
            <img src="${esc(b.image)}" alt="${esc(b.eyebrow)}">
            ${tag}
          </div>
          <div class="about-body reveal">
            <span class="eyebrow">${esc(b.eyebrow)}</span>
            <h2 class="serif">${nl2br(b.heading)}</h2>
            ${paras}${quote}${btn}
          </div>
        </div>
      </section>`;
    },

    values(b) {
      const items = (b.items || []).map((it) => `
        <div class="value reveal">
          <div class="ic">${esc(it.icon)}</div>
          <h3 class="serif">${esc(it.title)}</h3>
          <p>${nl2br(it.text)}</p>
        </div>`).join('');
      return `
      <section>
        <div class="wrap">
          <div class="sec-head reveal">
            <span class="eyebrow">${esc(b.eyebrow)}</span>
            <h2 class="serif">${nl2br(b.heading)}</h2>
          </div>
          <div class="values">${items}</div>
        </div>
      </section>`;
    },

    intro_grid(b) {
      const cards = (b.cards || []).map((c) => `
        <a class="intro-card reveal" href="${esc(c.href)}">
          <div class="ph" style="background-image:${cssUrl(c.image)}"></div>
          <div class="cbody">
            <h3 class="serif">${esc(c.title)}</h3>
            <p>${nl2br(c.text)}</p>
            <span class="more">${esc(c.more)}</span>
          </div>
        </a>`).join('');
      return `
      <section>
        <div class="wrap">
          <div class="sec-head reveal">
            <span class="eyebrow">${esc(b.eyebrow)}</span>
            <h2 class="serif">${nl2br(b.heading)}</h2>
          </div>
          <div class="intro-grid">${cards}</div>
        </div>
      </section>`;
    },

    soul_lead(b) {
      return `
      <section>
        <div class="wrap">
          <p class="soul-lead reveal">${nl2br(b.text)}</p>
        </div>
      </section>`;
    },

    quiz() {
      const q = (window.RUIYU && window.RUIYU.flavor_quiz) || {};
      return `
      <section>
        <div class="wrap">
          <div class="quiz reveal" id="quiz">
            <div class="quiz-top">
              <div class="k">${esc(q.kicker)}</div>
              <h3 class="serif">${esc(q.title)}</h3>
            </div>
            <div class="qbar"><i id="qbarFill"></i></div>
            <div class="qcount" id="qcount"></div>
            <div id="qsteps"></div>
            <div class="qresult" id="qresult">
              <div class="badge" id="rBadge">☕</div>
              <div class="rk">Your Flavor</div>
              <h3 class="serif" id="rTitle"></h3>
              <div class="note serif" id="rNote"></div>
              <p id="rDesc"></p>
              <a href="contact.html" class="btn btn-ink">預約這杯風味 →</a>
              <div><button class="retry" id="retry">重新測驗一次</button></div>
            </div>
          </div>
        </div>
      </section>`;
    },

    services_detail() {
      const list = (window.RUIYU && window.RUIYU.services) || [];
      const rows = list.map((s) => `
        <div class="svc-row reveal">
          <div class="svc-img" style="background-image:${cssUrl(s.image)}"></div>
          <div class="svc-text">
            <div class="ic">${esc(s.icon)}</div>
            <h3 class="serif">${esc(s.title_zh)}${s.title_en ? ' ' + esc(s.title_en) : ''}</h3>
            <p>${nl2br(s.description)}</p>
            <ul>${(s.bullets || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>`).join('');
      return `<section><div class="wrap">${rows}</div></section>`;
    },

    journal_list() {
      const list = (window.RUIYU && window.RUIYU.articles) || [];
      const posts = list.map((a) => `
        <a class="post reveal" href="${esc(a.href || '#')}">
          <div class="ph" style="background-image:${cssUrl(a.cover)}"></div>
          <span class="cat">${esc(a.category)}</span>
          <h3 class="serif">${esc(a.title)}</h3>
          <p>${nl2br(a.excerpt)}</p>
          <div class="date">${esc(a.date)}</div>
        </a>`).join('');
      return `<section><div class="wrap"><div class="posts">${posts}</div></div></section>`;
    },

    cta(b) {
      const eyebrow = b.eyebrow ? `<span class="eyebrow" style="justify-content:center;display:inline-flex">${esc(b.eyebrow)}</span>` : '';
      const btns = (b.buttons && b.buttons.length)
        ? `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${buttons(b.buttons)}</div>` : '';
      return `
      <section class="cta">
        <div class="wrap reveal">
          ${eyebrow}
          <h2 class="serif">${nl2br(b.heading)}</h2>
          ${b.text ? `<p>${nl2br(b.text)}</p>` : ''}
          ${btns}
        </div>
      </section>`;
    },

    contact(b) {
      const info = (b.info || []).map((r) => {
        const val = r.href ? `<a href="${esc(r.href)}">${esc(r.value)}</a>` : `<span>${esc(r.value)}</span>`;
        return `<div class="row"><span class="ic">${esc(r.icon)}</span><div class="t"><small>${esc(r.label)}</small>${val}</div></div>`;
      }).join('');
      const opts = (b.topics || []).map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
      return `
      <section class="contact-sec">
        <div class="wrap">
          <div class="contact-grid">
            <div class="contact-info reveal">
              <h3 class="serif">${nl2br(b.info_heading)}</h3>
              ${info}
            </div>
            <form class="reveal" id="contactForm" novalidate>
              <div class="f2">
                <div class="field">
                  <label for="name">姓名 Name</label>
                  <input type="text" id="name" name="name" placeholder="您的稱呼" maxlength="60" required>
                </div>
                <div class="field">
                  <label for="phone">聯絡電話 Phone</label>
                  <input type="tel" id="phone" name="phone" placeholder="09xx-xxx-xxx" maxlength="40">
                </div>
              </div>
              <div class="field">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" placeholder="your@email.com" maxlength="120" required>
              </div>
              <div class="field">
                <label for="topic">詢問類別 Topic</label>
                <select id="topic" name="topic">${opts}</select>
              </div>
              <div class="field">
                <label for="message">訊息內容 Message</label>
                <textarea id="message" name="message" placeholder="想與睿嶼分享的想法…" maxlength="3000" required></textarea>
              </div>
              <div class="form-msg" id="formMsg"></div>
              <div>
                <button type="submit" class="btn btn-ink">送出訊息 →</button>
                <p class="form-note">${esc(b.form_note)}</p>
              </div>
            </form>
          </div>
        </div>
      </section>`;
    }
  };

  // ---------- Header / Footer ----------
  function renderHeader(s, activeSlug) {
    const items = (s.nav || []).map((n) =>
      `<a href="${esc(n.href)}"${n.slug === activeSlug ? ' class="active"' : ''}>${esc(n.label)}</a>`).join('');
    return `
      <header id="hd">
        <div class="nav">
          <a href="index.html" class="brand">${esc(s.brand_zh)}<small>${esc(s.brand_en)}</small></a>
          <nav class="menu" id="menu">${items}</nav>
          <button class="burger" id="burger" aria-label="選單"><span></span><span></span><span></span></button>
        </div>
      </header>`;
  }

  function renderFooter(s) {
    const f = s.footer || {};
    const links = (s.nav || []).map((n) => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join('');
    const social = (f.socials || []).map((so) =>
      `<a href="${esc(so.url)}" aria-label="${esc(so.label)}" title="${esc(so.label)}">${esc(so.label)}</a>`).join('');
    return `
      <footer>
        <div class="wrap">
          <div class="foot-grid">
            <div class="foot-brand">
              <span class="serif">${esc(s.brand_zh)} ${esc(s.brand_en)}</span>
              <p>${esc(f.tagline)}</p>
            </div>
            <div class="foot-col">
              <h4>快速連結</h4>
              ${links}
            </div>
            <div class="foot-col">
              <h4>聯絡 · 社群</h4>
              <a href="mailto:${esc(f.email)}">${esc(f.email)}</a>
              <div class="foot-social">${social}</div>
            </div>
          </div>
          <div class="foot-bottom">${esc(f.copyright)}</div>
        </div>
      </footer>`;
  }

  // ---------- 主題色 ----------
  function applyTheme(theme) {
    if (!theme) return;
    const map = {
      oat: '--oat', paper: '--paper', card: '--card', latte: '--latte',
      latte_d: '--latte-d', charcoal: '--charcoal', ink: '--ink', gray: '--gray', line: '--line'
    };
    const vars = Object.keys(map)
      .filter((k) => theme[k])
      .map((k) => `${map[k]}:${theme[k]}`).join(';');
    if (!vars) return;
    const st = document.createElement('style');
    st.id = 'cms-theme';
    st.textContent = `:root{${vars}}`;
    document.head.appendChild(st);
  }

  // ---------- 進場 / Header / 選單 / 視差 ----------
  function initInteractions() {
    const hd = document.getElementById('hd');
    if (hd) {
      const onScroll = () => hd.classList.toggle('scrolled', window.scrollY > 40);
      addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    const burger = document.getElementById('burger');
    const menu = document.getElementById('menu');
    if (burger && menu) {
      burger.addEventListener('click', () => menu.classList.toggle('open'));
      menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.classList.remove('open')));
    }
    const heroBg = document.getElementById('heroBg');
    if (heroBg) {
      addEventListener('scroll', () => {
        const y = window.scrollY;
        if (y < innerHeight) heroBg.style.transform = `translateY(${y * 0.28}px) scale(1.06)`;
      }, { passive: true });
    }
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.14 });
      reveals.forEach((el) => io.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add('in'));
    }
  }

  // ---------- 載入資料 ----------
  async function loadContent() {
    // 之後接 Directus：若 CMS_API 有設，改用 Directus 適配器（fetchFromDirectus），失敗則退回打包 JSON。
    // 目前 CMS_API 為空，直接用站內 content.json。
    return fetch('content/content.json', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('content.json ' + r.status);
      return r.json();
    });
  }

  // ---------- 主流程 ----------
  async function boot() {
    const app = document.getElementById('app');
    const slug = (app && app.dataset.page) || 'home';
    let data;
    try {
      data = await loadContent();
    } catch (e) {
      console.error('[CMS] 內容載入失敗:', e);
      if (app) app.innerHTML = '<section><div class="wrap"><p style="text-align:center;color:var(--gray)">內容載入失敗，請稍後重新整理。</p></div></section>';
      return;
    }
    window.RUIYU = data;
    const s = data.settings || {};
    const page = (data.pages || {})[slug] || { blocks: [] };

    // SEO：標題與描述
    if (page.title) document.title = page.title;
    if (page.description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = page.description;
    }

    applyTheme(s.theme);

    const headerEl = document.getElementById('header');
    const footerEl = document.getElementById('footer');
    if (headerEl) headerEl.innerHTML = renderHeader(s, slug);
    if (footerEl) footerEl.innerHTML = renderFooter(s);

    const blocks = page.blocks || [];
    if (app) {
      app.innerHTML = blocks.map((b) => {
        const fn = BLOCKS[b.type];
        if (!fn) { console.warn('[CMS] 未知區塊類型:', b.type); return ''; }
        return fn(b, data);
      }).join('');
    }

    initInteractions();

    // 依區塊掛載對應模組
    if (blocks.some((b) => b.type === 'quiz') && typeof window.initQuiz === 'function') window.initQuiz();
    if (blocks.some((b) => b.type === 'contact') && typeof window.initContact === 'function') window.initContact();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
