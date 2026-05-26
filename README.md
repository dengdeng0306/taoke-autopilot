# 淘客自动化运营系统 (Taoke Autopilot)

> 淘宝联盟自动化运营的一站式解决方案  
> 一人公司 · 零服务器成本 · 渐进式落地

---

## 📋 项目概览

将淘宝联盟运营全链路自动化：**选品 → 分析 → 推广链接生成 → 数据追踪 → 风险监控 → 报表输出**

### 技术栈
- **运行环境**：Node.js (v24+)
- **核心工具**：OpenClaw 浏览器自动化 + Cron 定时调度
- **数据存储**：CSV（可直接Excel打开）+ JSON（程序读写）
- **输出格式**：CSV / HTML 日报 / 飞书消息推送

### 目录结构
```
taoke-autopilot/
├── config/              # 配置文件
├── src/
│   ├── main.js              # 主入口
│   ├── modules/
│   │   ├── collector/   # P1 选品采集
│   │   │   ├── index.js     # 提取脚本 + 自动分类
│   │   │   ├── pool.js      # 候选池管理
│   │   │   └── seed.js      # 演示数据
│   │   ├── linker/      # P2 推广链接生成
│   │   │   └── index.js     # 淘口令/链接生成
│   │   ├── tracker/     # P3 收益追踪
│   │   │   └── index.js     # 结算数据 + 趋势分析
│   │   ├── reporter/    # P1 报表生成
│   │   │   └── index.js     # 日报HTML/CSV
│   │   └── monitor/     # P4 风险监控
│   │       └── index.js     # 告警框架
│   └── utils/
│       └── csv.js           # 通用工具
├── output/               # 输出数据（gitignore）
│   ├── 商品库/              # 候选池
│   ├── 日报/                # 每日报表
│   ├── 收益数据/             # 收益明细+趋势
│   └── 推广链接/             # 推广记录
├── docs/
│   └── roadmap.md            # 详细路线图
├── package.json
└── README.md
```

---

## 🚀 快速使用

```bash
# 查看全系统状态
npm run status

# 生成日报（从候选池生成双榜报表）
npm run report

# 日常任务
npm run daily

# 收益趋势分析
npm run trend
```

## 📖 可用命令

| 命令 | 说明 | 例子 |
|------|------|------|
| `npm run status` | 查看项目全状态 | `npm run status` |
| `npm run report` | 从候选池生成日报 | `npm run report` |
| `npm run daily` | 日常任务 | `npm run daily` |
| `npm run full` | 全量任务 | `npm run full` |
| `npm run link` | 批量推广链接 | `npm run link` |
| `npm run track` | 收益追踪 | `npm run track` |
| `npm run trend` | 收益趋势分析 | `npm run trend` |

---

## 🗺️ 开发路线图

| 阶段 | 里程碑 | 状态 |
|------|--------|:----:|
| **P0** 项目初始化 | 仓库搭建 + 基础架构 | ✅ |
| **P1** 选品采集 | 自动化商品数据采集 | ✅ |
| **P2** 推广链接 | 批量生成淘口令/链接 | ✅ 代码完成 |
| **P3** 收益追踪 | 结算数据+趋势分析 | ✅ 代码完成 |
| **P4** 风险监控 | 告警体系 | ⏳ |
| **P5** 全自动调度 | Cron定时+OpenClaw调度 | ⏳ |
| **P6** 智能选品 | AI辅助选品(可选) | 📋 待定 |

---

## 🚨 风险声明

> **本项目仅为工具辅助，不代替人工判断。**
> 所有自动化操作均有日志记录，敏感操作（提现、大批量推广）需人工确认。
> 请遵守淘宝联盟平台规则，违规操作可能导致账号封禁。
