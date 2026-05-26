/**
 * 推广链接生成模块
 * 
 * 通过浏览器自动化，在淘宝联盟商品详情页生成推广链接（淘口令/短链接）
 * 
 * 流程:
 *   1. 从候选池获取待推广商品
 *   2. 逐个打开商品详情页
 *   3. 点击「立即推广」按钮
 *   4. 选择默认推广位
 *   5. 复制淘口令/推广链接
 *   6. 更新候选池状态
 * 
 * @module linker
 */

import path from 'path';
import fs from 'fs';
import { getPendingProducts, updateProductStatus } from '../collector/pool.js';
import { writeCSV, makePromoUrl, now, logger } from '../../utils/csv.js';

const OUTPUT_DIR = path.resolve('output/推广链接');

/** ==================== 浏览器操作脚本 ==================== */

/**
 * 浏览器控制台脚本：提取商品itemId列表
 * 在选品广场页执行，获取所有待推广的商品链接
 */
export const EXTRACT_ITEM_IDS = `
(() => {
  const links = document.querySelectorAll('a[href*="detail.htm"]');
  const items = new Set();
  links.forEach(a => {
    const m = a.href.match(/itemId=([^&]+)/);
    if (m) items.add(m[1]);
  });
  return JSON.stringify([...items]);
})();
`;

/**
 * 浏览器控制台脚本：点击「立即推广」按钮
 * 在商品详情页执行
 */
export const CLICK_PROMOTE = `
(() => {
  const selectors = [
    'a[class*="promote"]',
    'a[class*="promotion"]',
    '.toPromote',
    '[class*="promote-btn"]',
  ];
  
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) {
      el.click();
      return JSON.stringify({ success: true, selector: sel });
    }
  }
  
  // 文本搜索
  const all = document.querySelectorAll('a, button, span');
  for (const el of all) {
    if ((el.textContent || '').includes('立即推广') && el.offsetParent !== null) {
      el.click();
      return JSON.stringify({ success: true, method: 'textSearch' });
    }
  }
  
  return JSON.stringify({ success: false, error: '未找到立即推广按钮' });
})();
`;

/**
 * 浏览器控制台脚本：获取生成的淘口令
 */
export const GET_TKL = `
(() => {
  const selectors = [
    'textarea[class*="tkl"]',
    'textarea[class*="copy"]',
    'input[class*="tkl"]',
    'textarea',
  ];
  
  let tkl = '';
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.value) {
      tkl = el.value;
      break;
    }
  }
  
  if (!tkl) {
    const all = document.querySelectorAll('.copy-text, [class*="tkl-code"], .promo-result');
    all.forEach(el => {
      const text = (el.textContent || '').trim();
      if (text.includes('\uffe5') || text.includes('\u00a2')) {
        tkl = text;
      }
    });
  }
  
  return JSON.stringify({ tkl: tkl || '', success: !!tkl });
})();
`;

/** ==================== 逻辑代码 ==================== */

/**
 * 获取待推广商品列表
 * @param {number} limit
 * @returns {Array}
 */
export function getPendingLinks(limit = 10) {
  return getPendingProducts(limit);
}

/**
 * 记录单个推广结果
 */
export function recordLinkResult(result) {
  const { timestamp } = now();
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const headers = ['itemId', '商品名称', '推广链接', '淘口令', '推广位ID', '状态', '错误信息', '生成时间'];
  const logFile = path.join(OUTPUT_DIR, `推广记录_${timestamp}.csv`);

  const rows = [{
    itemId: result.itemId,
    商品名称: result.name,
    推广链接: result.promoUrl || makePromoUrl(result.itemId),
    淘口令: result.tkl || '',
    推广位ID: result.adzoneId || '',
    状态: result.success ? '已推广' : '失败',
    错误信息: result.error || '',
    生成时间: result.timestamp || timestamp,
  }];

  writeCSV(logFile, headers, rows);

  if (result.success) {
    updateProductStatus(result.itemId, '已推广', `淘口令: ${result.tkl || '已生成'}`);
  } else {
    updateProductStatus(result.itemId, '推广失败', result.error || '未知错误');
  }

  logger('linker', `记录推广结果: ${result.itemId} ${result.success ? '✅' : '❌'}`);
  return logFile;
}

/**
 * 批量记录推广结果
 */
export function recordBatchResults(results) {
  const { timestamp } = now();
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const headers = ['itemId', '商品名称', '推广链接', '淘口令', '推广位ID', '状态', '错误信息', '生成时间'];
  const logFile = path.join(OUTPUT_DIR, `批量推广记录_${timestamp}.csv`);

  const rows = results.map(r => ({
    itemId: r.itemId,
    商品名称: r.name,
    推广链接: r.promoUrl || makePromoUrl(r.itemId),
    淘口令: r.tkl || '',
    推广位ID: r.adzoneId || '',
    状态: r.success ? '已推广' : '失败',
    错误信息: r.error || '',
    生成时间: timestamp,
  }));

  writeCSV(logFile, headers, rows);

  for (const r of results) {
    if (r.success) {
      updateProductStatus(r.itemId, '已推广', `淘口令: ${r.tkl || ''}`);
    } else {
      updateProductStatus(r.itemId, '推广失败', r.error || '');
    }
  }

  const ok = results.filter(r => r.success).length;
  logger('linker', `批量记录完成: ${ok}/${results.length} 成功`);
  return logFile;
}

/** ==================== 自动化流程 ==================== */

/**
 * 生成单个商品的推广链接
 * 在OpenClaw浏览器环境中调用
 */
export async function generateLink(product) {
  const { itemId, 商品名称: name } = product;
  logger('linker', `开始处理: ${(name || '').slice(0, 20)}... (${itemId})`);

  // 实际执行时通过OpenClaw browser工具操作：
  // 1. navigate到商品详情页
  // 2. 点击立即推广
  // 3. 选择推广位
  // 4. 获取淘口令

  return {
    itemId,
    name,
    promoUrl: makePromoUrl(itemId),
    tkl: '',
    adzoneId: '',
    success: false,
    error: '',
  };
}

/**
 * 批量生成推广链接
 */
export async function batchGenerateLinks(limit = 10) {
  logger('linker', `===== 批量推广: 开始 =====`);

  const pending = getPendingLinks(limit);
  if (pending.length === 0) {
    logger('linker', '⚠️ 候选池没有待推广商品');
    return [];
  }

  logger('linker', `待推广商品: ${pending.length} 个`);
  const results = [];

  for (let i = 0; i < pending.length; i++) {
    logger('linker', `[${i + 1}/${pending.length}]`);
    const result = await generateLink(pending[i]);
    results.push(result);
  }

  recordBatchResults(results);
  const ok = results.filter(r => r.success).length;
  logger('linker', `===== 批量推广: 完成 (${ok}/${results.length}) =====`);
  return results;
}

export default {
  getPendingLinks,
  generateLink,
  batchGenerateLinks,
  recordLinkResult,
  recordBatchResults,
  EXTRACT_ITEM_IDS,
  CLICK_PROMOTE,
  GET_TKL,
};
