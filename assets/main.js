/* 睿嶼 — 全站共用互動：Header 滾動、手機選單、進場淡入、Hero 視差 */
(function () {
  // Header 滾動變色
  const hd = document.getElementById('hd');
  if (hd) {
    const onScroll = () => hd.classList.toggle('scrolled', window.scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // 手機漢堡選單
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  if (burger && menu) {
    burger.addEventListener('click', () => menu.classList.toggle('open'));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
  }

  // Hero 視差
  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) heroBg.style.transform = `translateY(${y * 0.28}px) scale(1.06)`;
    }, { passive: true });
  }

  // 進場淡入（IntersectionObserver + 保底：不支援時直接顯示）
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }
})();
