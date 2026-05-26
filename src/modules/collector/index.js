/**
 * 选品采集模块
 * 通过浏览器自动化在淘宝联盟选品广场按规则采集商品数据
 * 
 * @module collector
 * 
 * 流程:
 *   1. 打开选品广场
 *   2. 设置排序方式
 *   3. 读取当前页商品列表
 *   4. 清洗数据（过滤虚拟商品/低分商品）
 *   5. 写入候选商品池CSV
 */

import fs from 'fs';
import path from 'path';
import { writeCSV, makePromoUrl, now, logger } from '../utils/csv.js';

const OUTPUT_DIR = path.resolve('output/商品库');

/**
 * 商品分类关键词映射
 * 根据商品名称自动判断分类
 */
const CATEGORY_KEYWORDS = {
  '女鞋': ['女鞋', '玛丽珍', '凉鞋', '单鞋', '老爹鞋', '松糕鞋', '德训鞋', '高跟鞋', '平底鞋'],
  '男装': ['男装', '五分裤', '短裤', '速干', '冰丝', '男裤', 'T恤', 'polo'],
  '家居': ['枕头', '枕', '凉席', '家纺', '床品', '被', '垫'],
  '家居装饰': ['贴纸', '门贴', '贴画', '装饰', '墙贴'],
  '家居护理': ['颜色恢复剂', '固色', '清洗', '清洁'],
  '日用百货': ['纸巾', '抽纸', '纸', '收纳', '垃圾袋'],
  '美妆个护': ['染发', '精华', '气垫', '防晒', 'BB霜', '面膜', '口红', '彩妆', '护肤'],
  '保健品': ['益生菌', '软骨素', '氨糖', '灵芝', '胶原', '蛋白肽', '保健', '维生素', '钙片'],
  '保健食品': ['骆驼奶粉', '驼乳', '驼奶', '奶粉', '蛋白粉', '燕窝'],
  '母婴用品': ['纸尿裤', '尿不湿', '拉拉裤', '婴儿', '宝宝', '婴童', '儿童', '洗发沐浴'],
  '宠物用品': ['猫粮', '狗粮', '宠物', '猫', '狗'],
  '运动户外': ['防晒衣', '钓鱼', '鱼饵', '户外', '运动', '健身'],
  '珠宝首饰': ['黄金', '金章', '金', '首饰', '手链', '项链', '戒指', '玉石'],
  '手机配件': ['保护套', '手机壳', '钢化膜', '充电', '数据线'],
  '食品': ['零食', '燕窝粥', '食品', '饮料', '美食', '茶'],
  '通信': ['电话卡', '流量卡', '米粉卡', '大王卡', '上网卡'],
  '虚拟服务': ['写作', '文章', '仿写', '代写', '服务'],
  '家纺': ['凉席', '床品', '四件套', '被套', '枕套'],
};

/**
 * 根据商品名称自动判断分类
 * @param {string} name - 商品名称
 * @returns {string} 分类名称
 */
function autoCategorize(name) {
  if (!name) return '其他';
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (name.includes(kw)) return category;
    }
  }
  return '其他';
}

/**
 * 从页面文本中提取商品数据
 * 可在浏览器控制台执行
 */
const EXTRACT_SCRIPT = `
(() => {
  const cards = document.querySelectorAll('[class*="union-good-card"], [class*="good-card"]');
  const results = [];
  const seen = new Set();
  
  document.querySelectorAll('[class*="union-good-card-block-hover"], [class*="good-item"], [class*="product-item"]').forEach(card => {
    const text = card.textContent;
    const link = card.querySelector('a[href*="detail.htm"]');
    if (!link) return;
    
    const href = link.getAttribute('href') || '';
    const m = href.match(/itemId=([^&]+)/);
    if (!m || seen.has(m[1])) return;
    seen.add(m[1]);
    
    const itemId = m[1];
    const priceMatch = text.match(/到手价￥([\\d.]+)/);
    const rateMatch = text.match(/佣金率\\s*([\\d.]+%)/);
    const commMatch = text.match(/佣金\\s*￥([\\d.]+)/);
    
    let name = '';
    const nameLinks = card.querySelectorAll('a[href*="detail.htm"]');
    for (const a of nameLinks) {
      const t = (a.textContent || '').trim();
      if (t && !t.startsWith('主图') && !t.startsWith('商品标') && t.length > 5) {
        name = t;
        break;
      }
    }
    if (!name) name = text.substring(0, 50);
    
    results.push({
      itemId,
      name: name.substring(0, 80),
      price: priceMatch ? parseFloat(priceMatch[1]) : 0,
      rate: rateMatch ? rateMatch[1] : '0%',
      commission: commMatch ? parseFloat(commMatch[1]) : 0,
      rawText: text.substring(0, 200)
    });
  });
  
  return JSON.stringify(results, null, 2);
})();
`;

/**
 * 清洗数据：过滤低质商品
 * @param {Array} products - 原始商品列表
 * @param {Object} filters - 过滤规则
 * @returns {Array} 清洗后的商品列表
 */
function cleanProducts(products, filters = {}) {
  const { excludeVirtual = true, minCommission = 0, minRate = 0 } = filters;
  
  return products.filter(p => {
    // 过滤佣金为0或极低的
    if (p.commission <= 0) return false;
    
    // 过滤虚拟商品（1分钱/壁纸等）
    if (excludeVirtual) {
      const name = (p.name || '').toLowerCase();
      if (name.includes('壁纸') || name.includes('头像') || 
          (p.price < 1 && p.commission < 0.1)) return false;
    }
    
    // 过滤佣金率低于阈值
    const rateVal = parseFloat(p.rate) || 0;
    if (rateVal < minRate) return false;
    
    // 过滤佣金金额低于阈值
    if (p.commission < minCommission) return false;
    
    return true;
  });
}

/**
 * 执行一次选品采集
 * @param {Object} options - 采集选项
 * @param {string} options.sortKey - 排序键
 * @param {string} options.sortLabel - 排序标签
 * @param {number} options.maxItems - 最大采集数
 * @param {Object} options.filters - 过滤规则
 * @returns {Promise<Array>} 采集结果
 * 
 * @description 此函数在OpenClaw浏览器自动化环境中调用
 */
export async function collectProducts(sortKey = 'max_tk_rate:des', sortLabel = '佣金率降序', maxItems = 30) {
  logger('collector', `开始采集: ${sortLabel}`);
  
  // 注：实际执行时通过OpenClaw browser工具操作
  // 返回的数据格式
  return [];
}

/**
 * 将采集结果写入候选池
 * @param {Array} products - 清洗后的商品
 * @param {string} sortLabel - 排序方式标签
 */
export function saveToPool(products, sortLabel) {
  const { date, timestamp } = now();
  const enriched = products.map((p, i) => ({
    序号: i + 1,
    商品名称: p.name,
    到手价_元: p.price,
    佣金率: p.rate,
    佣金_元: p.commission,
    商品分类: autoCategorize(p.name),
    排序方式: sortLabel,
    采集日期: date,
    itemId: p.itemId,
    推广链接: makePromoUrl(p.itemId),
  }));

  // 写入今日采集明细
  const detailFile = path.join(OUTPUT_DIR, `采集明细_${timestamp}_${sortLabel === '佣金率降序' ? 'rate' : 'commi'}.csv`);
  const headers = ['序号', '商品名称', '到手价_元', '佣金率', '佣金_元', '商品分类', '排序方式', '采集日期', 'itemId', '推广链接'];
  writeCSV(detailFile, headers, enriched);
  logger('collector', `写入明细: ${detailFile} (${enriched.length}条)`);

  // 写入候选池（追加模式）
  const poolFile = path.join(OUTPUT_DIR, '候选池.csv');
  const poolHeaders = ['序号', '商品名称', '到手价_元', '佣金率', '佣金_元', '商品分类', '排序方式', '采集日期', 'itemId', '推广链接', '状态'];
  
  const poolExists = fs.existsSync(poolFile);
  const poolRows = enriched.map(r => ({
    ...r,
    状态: '待推广',
  }));

  if (!poolExists) {
    writeCSV(poolFile, [...poolHeaders, '状态'], poolRows);
  } else {
    // 追加（需要手动处理，简化：写入另一个文件）
    const appendFile = path.join(OUTPUT_DIR, `候选池_追加_${timestamp}.csv`);
    writeCSV(appendFile, [...poolHeaders, '状态'], poolRows);
    logger('collector', `候选池已存在，新增写入: ${appendFile}`);
  }

  return enriched;
}

/**
 * 合并候选池（去重）
 */
export function dedupPool() {
  logger('collector', '开始合并候选池...');
  // TODO: 读取所有候选池文件，按itemId去重，写入新文件
}

/**
 * 快捷运行：读取页面数据后保存
 * @param {string} jsonData - 浏览器中提取的JSON字符串
 * @param {string} sortLabel - 排序方式
 * @param {Object} filters - 过滤规则
 */
export function processPageData(jsonData, sortLabel = '佣金率降序', filters = {}) {
  const raw = JSON.parse(jsonData);
  const cleaned = cleanProducts(raw, filters);
  logger('collector', `原始${raw.length}条 → 清洗后${cleaned.length}条 (排序: ${sortLabel})`);
  return saveToPool(cleaned, sortLabel);
}

// ===== 导出 =====
export { autoCategorize, cleanProducts, EXTRACT_SCRIPT };

export default {
  collectProducts,
  saveToPool,
  processPageData,
  cleanProducts,
  autoCategorize,
  EXTRACT_SCRIPT,
};
