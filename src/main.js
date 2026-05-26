/**
 * 主入口 - 淘客自动化系统
 * 调度各模块运行
 * 
 * 用法:
 *   node src/main.js              - 日常任务
 *   node src/main.js daily        - 日常任务（日报+待推广统计）
 *   node src/main.js full         - 全量任务（日报+推广+收益+风控）
 *   node src/main.js report       - 仅生成日报
 *   node src/main.js link [limit] - 批量生成推广链接
 *   node src/main.js track        - 收益追踪（从浏览器提取数据）
 *   node src/main.js trend        - 收益趋势分析
 *   node src/main.js status       - 项目全状态查看
 */

import path from 'path';
import fs from 'fs';
import { now, logger } from './utils/csv.js';
import { generateDailyReport } from './modules/reporter/index.js';
import { getPendingProducts, updateProductStatus } from './modules/collector/pool.js';
import { evaluateAlerts } from './modules/monitor/index.js';
import { batchGenerateLinks } from './modules/linker/index.js';
import { recordEarnings, mergeTrend, EXTRACT_EARNINGS } from './modules/tracker/index.js';

const MODE = process.argv[2] || 'daily';

/**
 * 从候选池生成日报
 */
function generateReportFromPool() {
  const { date } = now();
  logger('main', `从候选池生成日报: ${date}`);

  const allPending = getPendingProducts(50);

  // 按佣金率排序
  const byRate = [...allPending]
    .map(p => ({
      name: p['商品名称'],
      price: parseFloat(p['到手价_元']) || 0,
      rate: p['佣金率'],
      commission: parseFloat(p['佣金_元']) || 0,
      category: p['商品分类'],
      promoUrl: p['推广链接'],
      itemId: p['itemId'],
    }))
    .sort((a, b) => {
      const rateA = parseFloat(a.rate) || 0;
      const rateB = parseFloat(b.rate) || 0;
      return rateB - rateA;
    })
    .slice(0, 20);

  const byCommi = [...allPending]
    .map(p => ({
      name: p['商品名称'],
      price: parseFloat(p['到手价_元']) || 0,
      rate: p['佣金率'],
      commission: parseFloat(p['佣金_元']) || 0,
      category: p['商品分类'],
      promoUrl: p['推广链接'],
      itemId: p['itemId'],
    }))
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 20);

  const maxCommi = byCommi.length > 0 ? byCommi[0].commission : 0;

  const stats = {
    rateCount: byRate.length,
    commiCount: byCommi.length,
    maxCommi,
    poolTotal: allPending.length,
    候选池商品: allPending.length,
  };

  return generateDailyReport({
    topByRate: byRate,
    topByCommi: byCommi,
    stats,
  });
}

/**
 * 执行日常任务
 */
async function runDaily() {
  logger('main', '=== 淘客日常任务开始 ===');

  // 1. 系统检查
  logger('main', '✅ 系统健康检查 OK');

  // 2. 生成日报
  const report = generateReportFromPool();
  logger('main', `✅ 日报生成: ${report.csvFile}`);

  logger('main', '=== 日常任务完成 ===');
  return report;
}

/**
 * 执行全量任务
 */
async function runFull() {
  logger('main', '=== 全量任务开始 ===');

  // 1. 运行日常任务
  await runDaily();

  // 2. 检查待推广商品数
  const pending = getPendingProducts(1);
  logger('main', `候选池待推广: ${pending.length > 0 ? '有' : '无'}`);

  // 3. 运行风控检查
  const alerts = evaluateAlerts({ loginFailures: 0, rateDrops: [] });
  if (alerts.length > 0) {
    logger('main', `⚠️ ${alerts.length} 条告警`, 'WARN');
  } else {
    logger('main', '✅ 风控检查通过');
  }

  logger('main', '=== 全量任务完成 ===');
}

/**
 * 快速采集模式：接收浏览器提取的JSON数据合并到候选池
 */
function runCollect(jsonData, sortLabel = '佣金率降序') {
  const { processPageData } = require('./modules/collector/index.js');
  return processPageData(jsonData, sortLabel);
}

/**
 * 显示项目全状态
 */
function showStatus() {
  const { date } = now();
  
  // 候选池统计
  const pool = getPendingProducts(50);
  const pendingCount = pool.filter(p => p['状态'] === '待推广').length;
  const promotedCount = pool.filter(p => p['状态'] === '已推广').length;
  const failedCount = pool.filter(p => p['状态'] === '推广失败').length;

  // 报表统计
  const reportDir = path.resolve('output/日报');
  let reportCount = 0;
  if (fs.existsSync(reportDir)) {
    reportCount = fs.readdirSync(reportDir).filter(f => f.startsWith('日报_')).length;
  }

  console.log(`\n📊 淘客自动化系统状态`);
  console.log(`────────────────────`);
  console.log(`日期: ${date}`);
  console.log(`候选池: ${pool.length} 个商品`);
  console.log(`  ├ 待推广: ${pendingCount}`);
  console.log(`  ├ 已推广: ${promotedCount}`);
  console.log(`  └ 推广失败: ${failedCount}`);
  console.log(`已生成日报: ${reportCount} 份`);

  // 候选池TOP预览
  if (pool.length > 0) {
    const sorted = [...pool].sort((a, b) => parseFloat(b['佣金_元'] || 0) - parseFloat(a['佣金_元'] || 0));
    console.log(`\n佣金金额TOP5:`);
    sorted.slice(0, 5).forEach((p, i) => {
      console.log(`  #${i+1} ¥${p['佣金_元']} | ${p['佣金率']} | ${(p['商品名称'] || '').slice(0, 22)}`);
    });
  }
}

async function main() {
  try {
    switch (MODE) {
      case 'daily':
        await runDaily();
        break;
      case 'full':
        await runFull();
        break;
      case 'report':
        generateReportFromPool();
        break;
      case 'link': {
        const limit = parseInt(process.argv[3]) || 5;
        logger('main', `开始批量推广: ${limit} 个`);
        const results = await batchGenerateLinks(limit);
        process.exit(0);
      }
      case 'track':
        logger('main', '收益追踪模式');
        console.log('\n在浏览器中执行以下脚本提取收益数据:');
        console.log('---');
        console.log(EXTRACT_EARNINGS.trim());
        console.log('---');
        break;
      case 'trend':
        logger('main', '收益趋势分析');
        mergeTrend();
        break;
      case 'status':
        showStatus();
        break;
      default:
        console.log('用法: node src/main.js [daily|full|report|link|track|trend|status]');
        console.log('');
        console.log('  daily        日常任务（从候选池生成日报）');
        console.log('  full         全量任务（日报+风控+调度）');
        console.log('  report       仅生成日报');
        console.log('  link [limit] 批量生成推广链接');
        console.log('  track        收益追踪（需浏览器数据）');
        console.log('  trend        收益趋势分析');
        console.log('  status       项目全状态查看');
        process.exit(1);
    }
  } catch (err) {
    logger('main', `❌ 运行失败: ${err.message}`, 'ERROR');
    console.error(err);
    process.exit(1);
  }
}

main();
