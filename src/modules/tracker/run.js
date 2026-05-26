/**
 * 收益追踪 - 独立运行脚本
 * 
 * 用法:
 *   node src/modules/tracker/run.js           - 显示提取脚本
 *   node src/modules/tracker/run.js --import   - 从临时文件导入
 */

import { recordEarnings, mergeTrend, EXTRACT_EARNINGS } from './index.js';

const mode = process.argv[2] || '';

if (mode === '--import') {
  // 从临时JSON文件导入（浏览器提取的数据）
  const dataFile = 'output/tracker_import.json';
  const fs = await import('fs');
  if (fs.existsSync(dataFile)) {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    recordEarnings(data);
    console.log('✅ 收益数据已导入');
  } else {
    console.log('⚠️ 没有找到导入文件:', dataFile);
  }
} else if (mode === '--trend') {
  mergeTrend();
} else {
  console.log('\n📈 收益追踪工具\n');
  console.log('使用说明:');
  console.log('  1. 打开淘宝联盟后台 → 效果报表');
  console.log('  2. 将以下脚本粘贴到浏览器控制台执行:');
  console.log('');  
  console.log('  ' + EXTRACT_EARNINGS.trim().replace(/\n/g, '\n  '));
  console.log('');
  console.log('  3. 将结果保存到 output/tracker_import.json');
  console.log('  4. 运行: node src/modules/tracker/run.js --import');
}

process.exit(0);
