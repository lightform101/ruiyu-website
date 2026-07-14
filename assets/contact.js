/* 睿嶼 — 聯絡表單送出（POST → 後端 /api/contact）*/
(function () {
  // ── 設定 ──────────────────────────────────────────────
  // 填入「睿嶼 Contact API」的公開網址（部署在 Zeabur 的獨立後端）。
  // 部署後把下面這行改成該服務網址，例如：
  //   const API_BASE = 'https://ruiyu-api.zeabur.app';
  // 本機測試後端時可用 'http://localhost:3000'。
  const API_BASE = '';
  const ENDPOINT = API_BASE + '/api/contact';

  const form = document.getElementById('contactForm');
  if (!form) return;
  const msg = document.getElementById('formMsg');
  const btn = form.querySelector('button[type="submit"]');

  const show = (text, type) => {
    msg.innerHTML = text;
    msg.className = 'form-msg show ' + type;
  };

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    // 前端基本驗證
    if (!name || !email || !message) {
      return show('請填寫姓名、Email 與訊息內容，我們才能好好回覆你 ☺', 'err');
    }
    if (!isEmail(email)) {
      return show('Email 格式好像不太對，再確認一下 ☺', 'err');
    }

    const payload = {
      name,
      phone: form.phone.value.trim(),
      email,
      topic: form.topic.value,
      message,
    };

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '送出中…';
    show('正在送出你的訊息…', 'ok');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        show('謝謝你，<b>' + name + '</b>！訊息已送出，我們會盡快與你聯繫。', 'ok');
        form.reset();
      } else {
        show(data.message || '送出時發生問題，請稍後再試，或直接來信 hello.ruiyustudio@gmail.com', 'err');
      }
    } catch (err) {
      show('目前無法連線到伺服器，請稍後再試，或直接來信 hello.ruiyustudio@gmail.com', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
})();
