// 睿嶼 CMS — 在 PocketBase 建立資料模型並灌入內容（一次性）
//
// 用法（在本資料夾）：
//   npm install
//   PB_URL=https://ruiyu-cms.zeabur.app PB_EMAIL=你的信箱 PB_PASSWORD=你的密碼 node setup.mjs
//
// 重跑清空重建（會刪掉現有內容 collections！慎用）：加 RESET=1
import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const PB_EMAIL = process.env.PB_EMAIL;
const PB_PASSWORD = process.env.PB_PASSWORD;
const CONTENT_PATH = process.env.CONTENT_PATH || fileURLToPath(new URL('../content/content.json', import.meta.url));
const RESET = process.env.RESET === '1';

if (!PB_EMAIL || !PB_PASSWORD) {
  console.error('請提供 PB_EMAIL 與 PB_PASSWORD 環境變數（你的 PocketBase 管理員帳密）');
  process.exit(1);
}

const content = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

const PUBLIC = { listRule: '', viewRule: '' }; // 公開讀取（前台網站用）；寫入仍限管理員

async function main() {
  await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD);
  console.log('✓ 已登入超級管理員 @', PB_URL);

  if (RESET) await resetCollections();

  const pagesCol = await ensureCollection('pages', [
    { name: 'slug', type: 'text', required: true },
    { name: 'title', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'sort', type: 'number' },
  ], PUBLIC);

  await ensureCollection('blocks', [
    { name: 'page', type: 'relation', required: true, collectionId: pagesCol.id, maxSelect: 1, cascadeDelete: true },
    { name: 'sort', type: 'number' },
    { name: 'type', type: 'text', required: true },
    { name: 'data', type: 'json', maxSize: 200000 },
  ], PUBLIC);

  await ensureCollection('settings', [
    { name: 'brand_zh', type: 'text' },
    { name: 'brand_en', type: 'text' },
    { name: 'theme', type: 'json', maxSize: 20000 },
    { name: 'nav', type: 'json', maxSize: 20000 },
    { name: 'footer', type: 'json', maxSize: 20000 },
  ], PUBLIC);

  await ensureCollection('services', [
    { name: 'sort', type: 'number' },
    { name: 'icon', type: 'text' },
    { name: 'title_zh', type: 'text' },
    { name: 'title_en', type: 'text' },
    { name: 'image', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'bullets', type: 'json', maxSize: 20000 },
  ], PUBLIC);

  await ensureCollection('articles', [
    { name: 'sort', type: 'number' },
    { name: 'category', type: 'text' },
    { name: 'title', type: 'text' },
    { name: 'excerpt', type: 'text' },
    { name: 'cover', type: 'text' },
    { name: 'date', type: 'text' },
    { name: 'href', type: 'text' },
  ], PUBLIC);

  await ensureCollection('flavor_quiz', [
    { name: 'kicker', type: 'text' },
    { name: 'title', type: 'text' },
    { name: 'questions', type: 'json', maxSize: 200000 },
    { name: 'order', type: 'json', maxSize: 20000 },
    { name: 'results', type: 'json', maxSize: 200000 },
  ], PUBLIC);

  // 圖片上傳用（後台上傳圖片存這裡，前台用其公開網址）
  await ensureCollection('media', [
    { name: 'file', type: 'file', maxSelect: 1, maxSize: 5242880 },
    { name: 'alt', type: 'text' },
  ], PUBLIC);

  console.log('✓ collections 就緒');

  await seedIfEmpty();
  console.log('\n全部完成 🎉  後台：' + PB_URL + '/_/');
}

async function ensureCollection(name, fields, rules = {}) {
  try {
    const col = await pb.collections.getOne(name);
    console.log(`  · ${name} 已存在`);
    return col;
  } catch {
    const col = await pb.collections.create({ name, type: 'base', fields, ...rules });
    console.log(`  ＋ 建立 ${name}`);
    return col;
  }
}

async function resetCollections() {
  for (const name of ['blocks', 'pages', 'settings', 'services', 'articles', 'flavor_quiz', 'media']) {
    try { await pb.collections.delete(name); console.log(`  － 刪除舊 ${name}`); } catch {}
  }
}

// 只在該 collection 目前是空的才灌入，避免蓋掉你後台已編輯的內容
async function count(col) {
  const r = await pb.collection(col).getList(1, 1);
  return r.totalItems;
}

async function seedIfEmpty() {
  if (await count('settings') === 0) {
    const s = content.settings;
    await pb.collection('settings').create({ brand_zh: s.brand_zh, brand_en: s.brand_en, theme: s.theme, nav: s.nav, footer: s.footer });
    console.log('  ＋ 灌入 settings');
  } else console.log('  · settings 已有資料，略過');

  if (await count('flavor_quiz') === 0) {
    const q = content.flavor_quiz;
    await pb.collection('flavor_quiz').create({ kicker: q.kicker, title: q.title, questions: q.questions, order: q.order, results: q.results });
    console.log('  ＋ 灌入 flavor_quiz');
  } else console.log('  · flavor_quiz 已有資料，略過');

  if (await count('services') === 0) {
    let i = 0;
    for (const sv of content.services) await pb.collection('services').create({ sort: i++, ...sv });
    console.log('  ＋ 灌入 services（' + content.services.length + '）');
  } else console.log('  · services 已有資料，略過');

  if (await count('articles') === 0) {
    let i = 0;
    for (const a of content.articles) await pb.collection('articles').create({ sort: i++, ...a });
    console.log('  ＋ 灌入 articles（' + content.articles.length + '）');
  } else console.log('  · articles 已有資料，略過');

  if (await count('pages') === 0) {
    for (const [slug, page] of Object.entries(content.pages)) {
      const rec = await pb.collection('pages').create({ slug, title: page.title, description: page.description, sort: 0 });
      let b = 0;
      for (const block of page.blocks) {
        const { type, ...data } = block;
        await pb.collection('blocks').create({ page: rec.id, sort: b++, type, data });
      }
    }
    console.log('  ＋ 灌入 pages + blocks');
  } else console.log('  · pages 已有資料，略過');
}

main().catch((e) => {
  console.error('✗ 失敗：', e?.response?.data || e?.message || e);
  process.exit(1);
});
