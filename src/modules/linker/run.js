/**
 * 推广链接生成 - 独立运行脚本
 * 
 * 通过OpenClaw浏览器环境执行批量推广
 * 
 * 用法:
 *   node src/modules/linker/run.js [limit]
 */

import { batchGenerateLinks } from './index.js';

const limit = parseInt(process.argv[2]) || 5;

console.log(`\n📎 开始批量生成推广链接 (${limit}个)`);
console.log('');

batchGenerateLinks(limit).then(results => {
  const ok = results.filter(r => r.success).length;
  console.log(`\n✅ 完成: ${ok}/${results.length}`);
  process.exit(0);
}).catch(err => {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});
