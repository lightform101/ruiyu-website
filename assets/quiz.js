/* 睿嶼 — 專屬風味測驗（由 cms.js 在渲染完 quiz 區塊後呼叫 window.initQuiz）
   題目與結果來自 window.RUIYU.flavor_quiz（可在後台編輯）。 */
window.initQuiz = function initQuiz() {
  const quiz = document.getElementById('quiz');
  if (!quiz) return;

  const data = (window.RUIYU && window.RUIYU.flavor_quiz) || {};
  const QUESTIONS = data.questions || [];
  const RESULTS = data.results || {};
  const ORDER = data.order || Object.keys(RESULTS);
  if (!QUESTIONS.length || !ORDER.length) return;

  const stepsEl = document.getElementById('qsteps');
  const barFill = document.getElementById('qbarFill');
  const qcount  = document.getElementById('qcount');
  const resultEl = document.getElementById('qresult');

  let step = 0;
  const scores = {};
  ORDER.forEach((k) => { scores[k] = 0; });

  function renderStep() {
    const item = QUESTIONS[step];
    stepsEl.innerHTML =
      '<div class="qstep active"><h4>' + item.q + '</h4><div class="opts">' +
      item.opts.map((o) => '<button class="opt" data-s="' + o.s + '">' + o.t + '</button>').join('') +
      '</div></div>';
    qcount.textContent = '第 ' + (step + 1) + ' 題 / 共 ' + QUESTIONS.length + ' 題';
    barFill.style.width = (step / QUESTIONS.length * 100) + '%';
    stepsEl.querySelectorAll('.opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (scores[btn.dataset.s] != null) scores[btn.dataset.s]++;
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
    let best = ORDER[0], max = -1;
    for (const k of ORDER) { if (scores[k] > max) { max = scores[k]; best = k; } }
    const r = RESULTS[best] || {};
    document.getElementById('rBadge').textContent = r.emoji || '☕';
    document.getElementById('rTitle').textContent = r.title || '';
    document.getElementById('rNote').textContent = r.note || '';
    document.getElementById('rDesc').textContent = r.desc || '';
    resultEl.classList.add('show');
  }

  document.getElementById('retry').addEventListener('click', () => {
    step = 0;
    ORDER.forEach((k) => { scores[k] = 0; });
    resultEl.classList.remove('show');
    renderStep();
  });

  renderStep();
};
