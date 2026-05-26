/**
 * 收益追踪模块
 * 
 * 从淘宝联盟结算中心提取收益数据
 * 生成收益看板：今日预估/本月累计/趋势分析
 * 
 * @module tracker
 */

import path from 'path';
import fs from 'fs';
import { writeCSV, writeJSON, now, logger } from '../../utils/csv.js';

const OUTPUT_DIR = path.resolve('output/收益数据');

/** ==================== 提取脚本（浏览器控制台执行） ==================== */

/**
 * 从结算中心提取收益数据
 * 需要在淘宝联盟后台「效果报表」页面执行
 */
export const EXTRACT_EARNINGS = `
(() => {
  const result = {
    today: {},
    month: {},
    items: [],
  };

  // 尝试提取今日数据
  const todayEl = document.querySelector('[class*="today"], [class*="estimate"]');
  if (todayEl) {
    const text = todayEl.textContent.trim();
    const m = text.match(/([\\d,.]+)/);
    if (m) result.today.预估收入 = parseFloat(m[1].replace(/,/g, ''));
  }

  // 提取表格中的明细数据
  const rows = document.querySelectorAll('table tbody tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 5) {
      result.items.push({
        商品: cells[0]?.textContent?.trim()?.slice(0, 30) || '',
        订单数: cells[1]?.textContent?.trim() || '0',
        佣金率: cells[2]?.textContent?.trim() || '',
        预估收入: cells[3]?.textContent?.trim() || '0',
        结算收入: cells[4]?.textContent?.trim() || '0',
      });
    }
  });

  return JSON.stringify(result);
})();
`;

/** ==================== 数据处理 ==================== */

/**
 * 解析并记录收益数据
 * @param {Object} data - 从页面提取的收益原始数据
 */
export function recordEarnings(data) {
  const { date, timestamp } = now();
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 写入收益明细CSV
  const detailHeaders = ['商品', '订单数', '佣金率', '预估收入(元)', '结算收入(元)', '采集时间'];
  const detailFile = path.join(OUTPUT_DIR, `收益明细_${timestamp}.csv`);

  const detailRows = (data.items || []).map(item => ({
    商品: item['商品'] || item.name || '',
    订单数: item['订单数'] || item.orders || '0',
    佣金率: item['佣金率'] || item.rate || '',
    '预估收入(元)': item['预估收入'] || item.estimated || '0',
    '结算收入(元)': item['结算收入'] || item.settled || '0',
    采集时间: timestamp,
  }));

  writeCSV(detailFile, detailHeaders, detailRows);
  logger('tracker', `收益明细: ${detailFile} (${detailRows.length}条)`);

  // 写入汇总JSON
  const summary = {
    采集时间: timestamp,
    日期: date,
    今日预估: data.today,
    本月累计: data.month,
    明细条数: detailRows.length,
    明细文件: detailFile,
  };

  const summaryFile = path.join(OUTPUT_DIR, `收益汇总_${timestamp}.json`);
  writeJSON(summaryFile, summary);
  logger('tracker', `收益汇总: ${summaryFile}`);

  return summary;
}

/**
 * 合并多天收益数据生成趋势
 * 读取 output/收益数据/ 下所有汇总文件
 */
export function mergeTrend() {
  const files = [];
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.readdirSync(OUTPUT_DIR).forEach(f => {
      if (f.startsWith('收益汇总_') && f.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf8'));
          files.push(data);
        } catch (e) { /* skip */ }
      }
    });
  }

  // 按时间排序
  files.sort((a, b) => a.采集时间.localeCompare(b.采集时间));

  // 生成趋势CSV
  const { timestamp } = now();
  const csvFile = path.join(OUTPUT_DIR, `收益趋势_${timestamp}.csv`);

  const headers = ['日期', '今日预估', '本月累计', '明细条数'];
  const rows = files.map(f => ({
    日期: f.日期 || '',
    今日预估: f.今日预估?.预估收入 || '',
    本月累计: f.本月累计?.预估收入 || '',
    明细条数: f.明细条数 || 0,
  }));

  writeCSV(csvFile, headers, rows);
  logger('tracker', `收益趋势: ${csvFile} (${rows.length}天)`);

  return { csvFile, days: rows.length };
}

export default {
  recordEarnings,
  mergeTrend,
  EXTRACT_EARNINGS,
};
