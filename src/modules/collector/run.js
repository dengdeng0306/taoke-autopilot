/**
 * 选品采集 - 快捷运行脚本
 * 用于OpenClaw浏览器自动化环境
 * 
 * 用法：
 *   1. 先打开淘宝联盟选品广场
 *   2. 设置排序方式
 *   3. 在浏览器控制台执行 collector/index.js 中的 EXTRACT_SCRIPT
 *   4. 将结果传给此脚本
 */

import { processPageData } from './index.js';

// 从浏览器中提取的JSON数据（示例格式）
// 实际使用时替换为浏览器提取的真实JSON
const sampleJsonData = process.argv[2];

if (!sampleJsonData) {
  console.log('用法: node src/modules/collector/run.js <JSON数据>');
  console.log('');
  console.log('步骤:');
  console.log('  1. 在浏览器控制台执行 EXTRACT_SCRIPT (见 collector/index.js)');
  console.log('  2. 复制输出的JSON字符串');
  console.log('  3. node run.js "<粘贴JSON>"');
  process.exit(1);
}

// 默认过滤规则
const filters = {
  excludeVirtual: true,   // 过滤虚拟商品
  minCommission: 0.5,     // 佣金至少¥0.5
  minRate: 0,             // 不限佣金率
};

const result = processPageData(sampleJsonData, '佣金率降序', filters);
console.log(`\n✅ 完成! 已保存 ${result.length} 个商品到候选池`);
