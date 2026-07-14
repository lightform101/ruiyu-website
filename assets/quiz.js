/* 睿嶼 — 專屬風味測驗（品牌靈魂頁） */
(function () {
  const quiz = document.getElementById('quiz');
  if (!quiz) return;

  const QUESTIONS = [
    { q: '週末的早晨，你更傾向如何度過？', opts: [
      { t: '窩在窗邊，看陽光慢慢移動', s: 'soft' },
      { t: '到市場走走，尋找新鮮的靈感', s: 'bright' },
      { t: '翻一本書，什麼都不做也好', s: 'deep' },
      { t: '約朋友，聊到下午茶時分', s: 'sweet' },
    ] },
    { q: '哪一種氣味，最能讓你安定下來？', opts: [
      { t: '剛烘好的堅果與可可', s: 'deep' },
      { t: '雨後的青草與柑橘', s: 'bright' },
      { t: '溫熱的奶香與焦糖', s: 'sweet' },
      { t: '木質與微微的花香', s: 'soft' },
    ] },
    { q: '此刻的心情，比較接近哪一種？', opts: [
      { t: '想被溫柔地包覆著', s: 'sweet' },
      { t: '清醒、想開始些什麼', s: 'bright' },
      { t: '平靜，想留白一會兒', s: 'soft' },
      { t: '內斂，想沉澱思緒', s: 'deep' },
    ] },
    { q: '如果生活是一種節奏，你想要的是？', opts: [
      { t: '緩慢而綿長，像一段長曝', s: 'soft' },
      { t: '明亮而輕盈，像清晨的風', s: 'bright' },
      { t: '醇厚而深沉，像午後的靜', s: 'deep' },
      { t: '甜潤而圓滿，像溫暖的擁抱', s: 'sweet' },
    ] },
  ];

  const RESULTS = {
    bright: { emoji: '🍊', title: '明亮日曬 · 淺焙耶加雪菲', note: '像清晨第一道光的酸甜。', desc: '柑橘與花香在杯中舒展，明亮而輕盈。適合此刻想重新開始、渴望被喚醒的你 ── 一杯替生活按下 refresh 的風味。' },
    soft:   { emoji: '🌿', title: '溫潤留白 · 水洗藝伎', note: '像午後窗邊的一段留白。', desc: '細緻的花香與絲滑口感，安靜而優雅。獻給喜歡放慢、懂得欣賞留白的你 ── 讓時間，慢慢地流過。' },
    deep:   { emoji: '🌰', title: '沉靜醇厚 · 中深焙曼特寧', note: '像一段可以獨處的深夜。', desc: '堅果、可可與低酸的厚實，沉穩而內斂。陪伴喜歡沉澱思緒的你 ── 在濃郁裡，找到自己的重量。' },
    sweet:  { emoji: '🍮', title: '甜潤圓滿 · 焦糖拿鐵', note: '像一個溫暖的擁抱。', desc: '奶香與焦糖交融的圓潤甜感，溫柔而療癒。給想被溫柔包覆的你 ── 一杯把整天都變柔軟的風味。' },
  };

  const stepsEl = document.getElementById('qsteps');
  const barFill = document.getElementById('qbarFill');
  const qcount  = document.getElementById('qcount');
  const resultEl = document.getElementById('qresult');
  const ORDER = ['bright', 'soft', 'deep', 'sweet'];

  let step = 0;
  const scores = { bright: 0, soft: 0, deep: 0, sweet: 0 };

  function renderStep() {
    const item = QUESTIONS[step];
    stepsEl.innerHTML =
      '<div class="qstep active"><h4>' + item.q + '</h4><div class="opts">' +
      item.opts.map(o => '<button class="opt" data-s="' + o.s + '">' + o.t + '</button>').join('') +
      '</div></div>';
    qcount.textContent = '第 ' + (step + 1) + ' 題 / 共 ' + QUESTIONS.length + ' 題';
    barFill.style.width = (step / QUESTIONS.length * 100) + '%';
    stepsEl.querySelectorAll('.opt').forEach(btn => {
      btn.addEventListener('click', () => {
        scores[btn.dataset.s]++;
        step++;
        if (step < QUESTIONS.length) renderStep();
        else showResult();
      });
    });
  }

  function showResult() {
    barFill.style.width = '100%';
    qcount.textContent = '測驗完成 ✓';
    stepsEl.innerHTML = '';
    let best = 'soft', max = -1;
    for (const k of ORDER) { if (scores[k] > max) { max = scores[k]; best = k; } }
    const r = RESULTS[best];
    document.getElementById('rBadge').textContent = r.emoji;
    document.getElementById('rTitle').textContent = r.title;
    document.getElementById('rNote').textContent = r.note;
    document.getElementById('rDesc').textContent = r.desc;
    resultEl.classList.add('show');
  }

  document.getElementById('retry').addEventListener('click', () => {
    step = 0;
    for (const k in scores) scores[k] = 0;
    resultEl.classList.remove('show');
    renderStep();
  });

  renderStep();
})();
