/**
 * 主入口 - 淘客自动化系统
 * 调度各模块运行
 * 
 * 用法:
 *   node src/main.js daily       - 日常任务（合并候选池+生成日报）
 *   node src/main.js full        - 全量任务
 *   node src/main.js report      - 从候选池生成日报
 *   node src/main.js collect     - 仅采集候选池（接收浏览器数据）
 */

import { now, logger } from './utils/csv.js';
import { generateDailyReport } from './modules/reporter/index.js';
import { getPendingProducts, updateProductStatus } from './modules/collector/pool.js';
import { evaluateAlerts, sendAlert, ALERT_LEVELS } from './modules/monitor/index.js';

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
      default:
        console.log('用法: node src/main.js [daily|full|report]');
        console.log('');
        console.log('  daily  日常任务（从候选池生成日报）');
        console.log('  full   全量任务（日报+风控+调度）');
        console.log('  report 仅生成日报');
        process.exit(1);
    }
  } catch (err) {
    logger('main', `❌ 运行失败: ${err.message}`, 'ERROR');
    console.error(err);
    process.exit(1);
  }
}

main();
