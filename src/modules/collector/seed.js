/**
 * 演示脚本：将之前从淘宝联盟采集的Top 20数据导入候选池
 * 用实际采集的数据验证 pool.js 的合并去重功能
 */

import { mergeToPool } from './pool.js';
import { cleanProducts } from './index.js';
import { logger } from '../../utils/csv.js';

// ========== 按佣金率降序 Top 20（去掉了虚拟商品） ==========
const byRateData = [
  { itemId: 'dbNGqY5i0C3A0bYOO5SDo8Het3-MPogMYWQSA0PXXRkGuRn', name: '工作流公众号今日头条知乎百家号全平台文章写作仿写去AI味过朱雀', price: 131.90, rate: '45.00%', commission: 59.36 },
  { itemId: 'ZBAGM6AHRCPd2AaJJyCwwnHVt6-D37gKmR5tPozpa6axF64', name: '适用于悦客青羽保护套新国标防尘防摔保护壳送金属挂链青羽', price: 2.99, rate: '45.00%', commission: 1.35 },
  { itemId: 'p9dxymbu2C6M7bg558Igedsptm-eQDVb40xuzXdODWXOuza', name: '大朵浪漫玫瑰花贴纸卧室卫生间餐厅墙面装饰自贴画高级真防水P186', price: 3.50, rate: '36.00%', commission: 1.26 },
  { itemId: 'VJkG46XhQCwvyMVGG2c72XtvtV-GKkgaz5PUbgYrWJmpSnp', name: '米粉卡手机电话卡5元低月租套餐大流量卡大王卡6元日租卡上网卡', price: 17.88, rate: '36.00%', commission: 6.44 },
  { itemId: 'mJ3k0mVcjCJDeAzRRbFAqZIot3-oK9eo470UeRdy2bOOU4', name: '亚朵同款记忆棉枕头护颈椎助睡眠专用成人学生宿舍单人酒店同款枕', price: 179.00, rate: '31.50%', commission: 56.39 },
  { itemId: '2ajVzA8T6CgNBMrWWwIYa3iDtD-eQDVb40xuz0xrM9JRc93', name: 'Lady Shoes外贸原单女鞋新款平底方头纯色断面时尚浅口玛丽珍单鞋', price: 122.00, rate: '31.50%', commission: 38.43 },
  { itemId: 'bxeGPmqtvCorBw388XtxNjfQt6-bXRYD43NcvxQ757AKFZX', name: 'Lady Shoes外贸原单女鞋时尚圆头纯色网面粗跟一字扣玛丽珍单鞋', price: 39.20, rate: '31.50%', commission: 12.35 },
  { itemId: 'p9dxymjh2C6M7bg558Ige5Hptm-PO3gqYeBIOo5J8Bm6s2b', name: 'Lady Shoes外贸出口女鞋偏小新款时尚百搭圆头纯色平底一字扣单鞋', price: 52.80, rate: '31.50%', commission: 16.63 },
  { itemId: 'Gp8Gx6kfbCYvO0KQQjIvvqhQtJ-rXpAjKPdcbdy2WRwgfkz', name: 'Lady Shoes外贸原单女鞋新款时尚百搭圆头纯色系带平底单鞋德训鞋', price: 112.00, rate: '31.50%', commission: 35.28 },
  { itemId: '2ajVzAQt6CgNBMrWWwIYaVtDtD-pBwpo47JcgOdWVvKjTj8', name: '自粘防水整张门贴纸木门厕所门翻新创意玻璃衣柜卧室厨房宿舍贴画', price: 20.80, rate: '31.50%', commission: 6.55 },
  { itemId: '8gKDq7ph5C9zXRoJJrfKggUbt8-Vr2j5Y9oSkxweQxwxUg2', name: '真丝颜色恢复剂黑色衣服固色增艳桑蚕丝掉色泛白修复香云纱还原液', price: 59.00, rate: '31.50%', commission: 18.59 },
  { itemId: '8gKDq7yc5C9zXRoJJrfKq3Fbt8-nJ3wo4PquxeQvebRWSBN', name: '外贸原单女鞋新款时尚圆头铆钉一字扣铆钉亮珠沙滩罗马平底凉鞋', price: 64.70, rate: '31.50%', commission: 20.38 },
  { itemId: 'qB980mntXC4ZWJnRR9h3gdCWt0-8809n2vRc5oyknWp8Uqr', name: 'Lady Shoes外贸原单女鞋新款时尚方头细绳纯色细高跟系带时装凉鞋', price: 52.80, rate: '31.50%', commission: 16.63 },
  { itemId: 'yYKqkwYuAC2RnZjddbU5zDTvtA-wo85Jen2IMjX6bD4Zf9', name: '眠绵豆儿童枕可水洗记忆棉枕透气亲肤护颈枕白天随心动夜晚安心睡', price: 158.00, rate: '31.50%', commission: 49.77 },
  { itemId: 'WQeGn6rFXC20N9KjjGUrrvFQta-djoXJ4BWt0DZg306yiP0', name: '上达黑金鲢鳙钓鱼专用添加剂湖库黑坑野钓鲢鳙鱼饵窝料酒米开口剂', price: 17.00, rate: '31.50%', commission: 5.36 },
  { itemId: '0ZB9zpVs5C8B675XX9C5qQc2t6-nJ3wo4PquxRa2oBPNuZ', name: '漫花30包纸巾抽纸餐巾纸面纸家用实惠装整箱卫生纸面巾纸婴儿纸抽', price: 10.00, rate: '28.81%', commission: 2.88 },
  { itemId: 'p9dxymec2C6M7bg558IgZ4Sptm-k39VYj0PtRqKv7DWYu5p', name: 'Lady Shoes外贸原单女鞋新款时尚圆头纯色一字扣坡跟百搭单鞋皮鞋', price: 61.30, rate: '27.00%', commission: 16.55 },
  { itemId: 'zYK0ReoUBCaW9dNAAoHdvqCdt4-PO3gqYeBIOoNnqZj8tW', name: '速干冰丝五分裤夏季男士加大码宽松薄款透气跑步运动健身休闲短裤', price: 39.00, rate: '27.00%', commission: 10.53 },
  { itemId: 'JW7G96xIQCqNZPOMMjTNO2Fvta-7nq9OgW6TOqd2bn9NIVe', name: '厚底内增高老爹鞋女2026夏季新款网鞋小个子百搭运动休闲松糕女鞋', price: 122.00, rate: '27.00%', commission: 32.94 },
  { itemId: '8gKDq77f5C9zXRoJJrfKqmsbt8-Q02g5YpVcbK3XV8x2CKn', name: '南京同仁堂一梳黑染发膏纯天然植物易梳彩染发剂自己染2025流行色', price: 38.80, rate: '9.90%', commission: 3.84 },
];

// ========== 按佣金金额降序 Top 20 ==========
const byCommiData = [
  { itemId: 'p9rq0raF2C6M7bbQWwFgZdHptm-rXpAjKPdcbRbNZz4nTkz', name: '老庙山鬼花钱黄金足金工艺金金章送礼送朋友生日礼物', price: 6707.00, rate: '1.35%', commission: 90.54 },
  { itemId: 'dbM2AMGh0C3A0bbM8ztDoatet3-5nMQRZqKTW875VWz4FoD', name: '老庙山鬼花钱黄金足金工艺金金章送礼送朋友生日礼物（另一款）', price: 5640.00, rate: '1.35%', commission: 76.14 },
  { itemId: 'VJ8O08aHQCwvyMMaZbI72NuvtV-NO2gPYBdIn49JWOkYIpg', name: '戴可思儿童洗发沐浴露二合一宝宝洗护沐浴乳婴童专用洗发水温和', price: 35.60, rate: '13.51%', commission: 4.81 },
  { itemId: '44npbrpU9CNv7nnxJqHQwvFNtg-rXpAjKPdc2mGp3rWruJx', name: '【618预售】网易严选猫粮囤货装鲜肉全价幼猫成猫官方旗舰店正品', price: 184.00, rate: '3.53%', commission: 6.50 },
  { itemId: 'jyj37jgidCJm3PPrXRUKJRsJte-bXRYD43NcvXrKJwJYHZB', name: '傲盾益生菌粉成人男女肠道B420益生菌冻干粉肠胃儿童益生元冻干粉', price: 179.90, rate: '3.00%', commission: 5.40 },
  { itemId: 'RM7KP7YIXCjrRPPMpdCX4wuMt6-xnb7jpZkT6N57PqmMCq', name: '合生元益生菌粉儿童肠道B420益生菌冻干粉肠胃成人益生元冻干粉', price: 179.90, rate: '3.00%', commission: 5.40 },
  { itemId: '6KQA7vvU6CGxeAA3Xbf4rgFot3-qkeNznqQhnaa478q7ho9', name: 'bbgneo/元气觉醒纸尿夜用拉拉裤婴儿大吸量尿不湿宝宝整夜安睡裤', price: 61.00, rate: '9.00%', commission: 5.49 },
  { itemId: 'PrKy7KvtOC6vX55JkyFDvjfPt6-267gk9Poi6KPgg8YqC3B', name: '燕之屋小燕浓牛奶黑米燕窝粥200g*6碗 2箱装专属YZ', price: 99.00, rate: '4.50%', commission: 4.46 },
  { itemId: 'Y9y7dpJfjCXQjddp5Gs7azC2t6-7nq9OgW6TO8vbgw0pIVx', name: 'PVFFLIEGCG黑松露胶原四肽饮', price: 69.90, rate: '4.50%', commission: 3.15 },
  { itemId: 'qB3PJ3pHXC4ZWJJDybs3gqFWt0-J50gzYPqtQadpKoDbCVk', name: '韩后钻光淡斑淡纹修护次抛精华液美白补水保湿敏感肌可用', price: 36.53, rate: '8.10%', commission: 2.96 },
];

logger('seed', `按佣金率降序 ${byRateData.length}条, 按佣金金额降序 ${byCommiData.length}条`);

// 合并到候选池
const result1 = mergeToPool(byRateData, '佣金率降序');
console.log(`\n✅ 第一轮合并：共${result1.total}条（新增${result1.added}，去重跳过${result1.skipped}）`);

// 测去重：重复导入一部分
const dupData = byRateData.slice(0, 5);
const result2 = mergeToPool(dupData, '佣金率降序');
console.log(`✅ 第二轮合并（重复导入5条）：共${result2.total}条（新增${result2.added}，去重跳过${result2.skipped}）`);

// 再导入佣金金额的数据
const result3 = mergeToPool(byCommiData, '佣金金额降序');
console.log(`✅ 第三轮合并（佣金金额降序）：共${result3.total}条（新增${result3.added}，去重跳过${result3.skipped}）`);

console.log('\n📊 候选池已创建：output/商品库/候选池.csv');
console.log('💡 现在可以运行以下命令查看：');
console.log('   node -e "import { getPendingProducts } from \'./src/modules/collector/pool.js\'; console.log(getPendingProducts(5))"');
