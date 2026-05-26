/**
 * 候选池管理
 * 合并、去重、查询候选池数据
 * 
 * @module collector/pool
 */

import fs from 'fs';
import path from 'path';
import { writeCSV, writeJSON, readJSON, now, makePromoUrl, logger } from '../../utils/csv.js';
import { autoCategorize } from './index.js';

const POOL_DIR = path.resolve('output/商品库');

/**
 * 候选池文件路径
 */
function poolFilePath() {
  return path.join(POOL_DIR, '候选池.csv');
}

/**
 * 将采集结果合并到候选池
 * @param {Array} products - 清洗后的商品列表
 * @param {string} sortLabel - 排序方式标签
 * @returns {Object} 合并结果
 */
export function mergeToPool(products, sortLabel = '') {
  const { date, timestamp } = now();
  const poolFile = poolFilePath();

  // 构建新行
  const newRows = products.map((p, i) => ({
    itemId: p.itemId,
    商品名称: p.name,
    到手价_元: p.price,
    佣金率: p.rate,
    佣金_元: p.commission,
    商品分类: autoCategorize(p.name),
    排序方式: sortLabel,
    采集日期: date,
    推广链接: makePromoUrl(p.itemId),
    状态: '待推广',
    备注: '',
  }));

  // 读取已有候选池
  let existingRows = [];
  if (fs.existsSync(poolFile)) {
    const content = fs.readFileSync(poolFile, 'utf8').replace(/^\ufeff/, '');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length > 1) {
      const headers = lines[0].split(',');
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        if (vals.length >= headers.length) {
          const row = {};
          headers.forEach((h, idx) => {
            row[h.trim()] = vals[idx]?.trim() || '';
          });
          existingRows.push(row);
        }
      }
    }
  }

  // 去重：按 itemId
  const seen = new Set(existingRows.map(r => r.itemId));
  let added = 0;
  let skipped = 0;

  for (const row of newRows) {
    if (seen.has(row.itemId)) {
      skipped++;
      continue;
    }
    seen.add(row.itemId);
    existingRows.push(row);
    added++;
  }

  // 写回
  const headers = ['itemId', '商品名称', '到手价_元', '佣金率', '佣金_元', '商品分类', '排序方式', '采集日期', '推广链接', '状态', '备注'];
  writeCSV(poolFile, headers, existingRows);

  logger('pool', `合并完成: +${added}新增, ${skipped}去重跳过, 池中共${existingRows.length}条`);

  return {
    total: existingRows.length,
    added,
    skipped,
    file: poolFile,
  };
}

/**
 * 简单的CSV行解析（处理引号包裹的字段）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * 查询候选池 - 获取状态为"待推广"的商品
 * @param {number} limit - 限制条数
 * @returns {Array} 待推广商品列表
 */
export function getPendingProducts(limit = 20) {
  const poolFile = poolFilePath();
  if (!fs.existsSync(poolFile)) return [];

  const content = fs.readFileSync(poolFile, 'utf8').replace(/^\ufeff/, '');
  const lines = content.split('\n').filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const pending = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() || ''; });

    if (row['状态'] === '待推广') {
      pending.push(row);
      if (pending.length >= limit) break;
    }
  }

  return pending;
}

/**
 * 更新商品状态
 * @param {string} itemId - 商品ID
 * @param {string} newStatus - 新状态
 * @param {string} note - 备注
 */
export function updateProductStatus(itemId, newStatus, note = '') {
  const poolFile = poolFilePath();
  if (!fs.existsSync(poolFile)) return false;

  const content = fs.readFileSync(poolFile, 'utf8').replace(/^\ufeff/, '');
  const lines = content.split('\n').filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim());

  let found = false;
  const updatedLines = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < headers.length) {
      updatedLines.push(lines[i]);
      continue;
    }
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() || ''; });

    if (row['itemId'] === itemId && !found) {
      row['状态'] = newStatus;
      if (note) row['备注'] = note;

      // 重建行
      const newVals = headers.map(h => {
        const v = row[h] || '';
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      });
      updatedLines.push(newVals.join(','));
      found = true;
    } else {
      updatedLines.push(lines[i]);
    }
  }

  if (found) {
    const bom = '\ufeff';
    fs.writeFileSync(poolFile, bom + updatedLines.join('\n'), 'utf8');
    logger('pool', `已更新 ${itemId} 状态为 ${newStatus}`);
  }

  return found;
}

export default {
  mergeToPool,
  getPendingProducts,
  updateProductStatus,
};
