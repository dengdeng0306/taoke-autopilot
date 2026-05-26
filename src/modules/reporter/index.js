/**
 * 报表生成模块
 * 将候选池数据生成日报/周报/月报 CSV+HTML
 * 
 * @module reporter
 */

import path from 'path';
import fs from 'fs';
import { writeCSV, writeJSON, now, logger } from '../../utils/csv.js';

const DAILY_DIR = path.resolve('output/日报');
const REPORT_DIR = path.resolve('output/报表');

/**
 * 生成当日日报
 * @param {Object} data - 日报数据
 * @param {Array} data.topByRate - 佣金率TOP
 * @param {Array} data.topByCommi - 佣金金额TOP
 * @param {Object} data.stats - 统计信息
 */
export function generateDailyReport(data) {
  const { date, timestamp } = now();
  
  // ===== CSV日报 =====
  const headers = ['排序方式', '序号', '商品名称', '到手价(元)', '佣金率', '佣金(元)', '商品分类', '推广链接'];
  
  const byRate = (data.topByRate || []).map((p, i) => ({
    排序方式: '按佣金率降序',
    序号: i + 1,
    商品名称: p.name,
    '到手价(元)': p.price,
    佣金率: p.rate,
    '佣金(元)': p.commission,
    商品分类: p.category || '其他',
    推广链接: p.promoUrl || '',
  }));

  const byCommi = (data.topByCommi || []).map((p, i) => ({
    排序方式: '按佣金金额降序',
    序号: i + 1,
    商品名称: p.name,
    '到手价(元)': p.price,
    佣金率: p.rate,
    '佣金(元)': p.commission,
    商品分类: p.category || '其他',
    推广链接: p.promoUrl || '',
  }));

  const allRows = [...byRate, ...byCommi];
  const csvFile = path.join(DAILY_DIR, `日报_${timestamp}.csv`);
  writeCSV(csvFile, headers, allRows);
  logger('reporter', `日报CSV: ${csvFile} (${allRows.length}条)`);

  // ===== HTML日报 =====
  const htmlFile = path.join(DAILY_DIR, `日报_${timestamp}.html`);
  const html = buildDailyHTML(data, date);
  
  // 作为验证，直接写HTML内容
  const dir = path.dirname(htmlFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(htmlFile, html, 'utf8');
  logger('reporter', `日报HTML: ${htmlFile}`);

  // ===== 统计摘要JSON =====
  const statsFile = path.join(DAILY_DIR, `统计_${timestamp}.json`);
  writeJSON(statsFile, {
    生成时间: timestamp,
    ...data.stats,
    topByRate: byRate.slice(0, 5),
    topByCommi: byCommi.slice(0, 5),
  });

  return { csvFile, htmlFile };
}

function buildDailyHTML(data, date) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const makeTable = (title, items) => {
    const rows = items.map((p, i) => {
      const url = p.promoUrl || '';
      return `<tr><td class="num">${i + 1}</td><td>${esc(p.name)}</td><td class="price">¥${(p.price || 0).toFixed(2)}</td><td class="rate">${p.rate || '0%'}</td><td class="comm">¥${(p.commission || 0).toFixed(2)}</td><td>${esc(p.category || '其他')}</td><td><a href="${url}" target="_blank">查看</a></td></tr>`;
    }).join('\n');
    return `<h3>${title}</h3><table><tr><th>序号</th><th>商品名称</th><th>到手价</th><th>佣金率</th><th>佣金金额</th><th>分类</th><th>链接</th></tr>${rows}</table>`;
  };

  const stats = data.stats || {};
  
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>淘客日报 - ${date}</title>
<style>
body{font-family:微软雅黑,sans-serif;margin:30px;background:#f8f9fa}
h2{color:#333;border-bottom:3px solid #4472C4;padding-bottom:10px}
h3{color:#4472C4;margin-top:20px}
.stats{display:flex;gap:15px;margin:20px 0}
.stat-card{background:#fff;border-radius:8px;padding:15px 20px;box-shadow:0 1px 3px rgba(0,0,0,.1);flex:1}
.stat-card .num{font-size:28px;font-weight:bold;color:#4472C4}
.stat-card .label{font-size:13px;color:#888;margin-top:5px}
table{border-collapse:collapse;width:100%;margin:15px 0 30px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.1)}
th{background:#4472C4;color:#fff;padding:10px 8px;font-size:14px;text-align:left}
td{border:1px solid #ddd;padding:8px;font-size:13px}
tr:nth-child(even){background:#f9f9f9}
.num{text-align:center;width:40px}
.price,.comm{text-align:right}
.rate{text-align:center}
a{color:#1a73e8;text-decoration:none}
</style></head>
<body>
<h2>📊 淘客日报 - ${date}</h2>
<div class="stats">
  <div class="stat-card"><div class="num">${stats.rateCount || 0}</div><div class="label">佣金率TOP商品</div></div>
  <div class="stat-card"><div class="num">${stats.commiCount || 0}</div><div class="label">佣金金额TOP商品</div></div>
  <div class="stat-card"><div class="num">¥${(stats.maxCommi || 0).toFixed(2)}</div><div class="label">最高单笔佣金</div></div>
  <div class="stat-card"><div class="num">${stats.newToday || '—'}</div><div class="label">今日新增</div></div>
</div>
${makeTable('佣金率 TOP 20', data.topByRate || [])}
${makeTable('佣金金额 TOP 20', data.topByCommi || [])}
<p style="color:#999;font-size:12px">自动生成于 ${new Date().toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'})}</p>
</body></html>`;
}

export default { generateDailyReport };
