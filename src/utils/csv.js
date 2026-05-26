/**
 * 通用工具函数
 * @module utils/csv
 */

import fs from 'fs';
import path from 'path';

/**
 * 将数组写入CSV文件（带BOM，Excel可直接打开中文）
 * @param {string} filePath - 输出路径
 * @param {string[]} headers - 列名数组
 * @param {Array<Object>} rows - 数据行
 * @returns {string} 写入的文件路径
 */
export function writeCSV(filePath, headers, rows) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const esc = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const bom = '\ufeff';
  const headerLine = headers.join(',');
  const dataLines = rows.map(r => headers.map(h => esc(r[h])).join(','));
  const content = bom + [headerLine, ...dataLines].join('\n');

  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/**
 * 将数组写入JSON
 */
export function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

/**
 * 读取JSON
 */
export function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * 生成标准化的itemId推广链接
 * @param {string} itemId
 * @returns {string}
 */
export function makePromoUrl(itemId) {
  return `https://pub.alimama.com/portal/v2/pages/promo/goods/detail.htm?itemId=${itemId}`;
}

/**
 * 获取当前时间戳
 */
export function now() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    timestamp: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`,
  };
}

/**
 * 日志输出
 */
export function logger(tag, message, level = 'INFO') {
  const { timestamp } = now();
  console.log(`[${timestamp}] [${level}] [${tag}] ${message}`);
}

export default { writeCSV, writeJSON, readJSON, makePromoUrl, now, logger };
