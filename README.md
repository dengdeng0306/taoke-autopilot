# 淘客自动化运营系统 (Taoke Autopilot)

> 淘宝联盟自动化运营的一站式解决方案  
> 一人公司 · 零服务器成本 · 渐进式落地

---

## 📋 项目概览

将淘宝联盟运营全链路自动化：**选品 → 分析 → 推广链接生成 → 数据追踪 → 风险监控 → 报表输出**

### 技术栈
- **运行环境**：Node.js (v24)
- **核心工具**：OpenClaw 浏览器自动化 + Cron 定时调度
- **数据存储**：CSV（可Excel打开）+ JSON（程序读写）
- **输出格式**：CSV / HTML 报表 / 飞书消息推送

### 目录结构
```
taoke-autopilot/
├── config/           # 配置文件（选品规则、告警阈值等）
├── src/
│   ├── modules/      # 各功能模块
│   │   ├── collector/    # 选品采集
│   │   ├── linker/       # 推广链接生成
│   │   ├── tracker/      # 收益追踪
│   │   ├── reporter/     # 报表生成
│   │   └── monitor/      # 风险监控
│   ├── utils/        # 通用工具
│   └── main.js       # 入口
├── output/           # 输出数据（gitignore）
│   ├── 商品库/        # 候选池
│   ├── 日报/          # 每日报表
│   └── 报表/          # 月度汇总
├── scripts/          # 独立运行脚本
├── docs/             # 文档
├── tests/            # 测试
├── package.json
└── README.md
```

---

## 🗺️ 路线图 (Roadmap)

| 阶段 | 里程碑 | 交付物 | 预计时间 |
|------|--------|--------|---------|
| **P0** 项目初始化 | 仓库搭建 + 基础架构 | 目录结构、配置模板、README | ✅ 当前 |
| **P1** 选品采集 | 自动化商品数据采集 | `collector/` 模块 + 商品池文件 | 1天 |
| **P2** 推广链接 | 批量生成推广链接 | `linker/` 模块 | 2天 |
| **P3** 数据看板 | 日报 + 收益追踪 | `reporter/` + `tracker/` | 2天 |
| **P4** 风险监控 | 告警体系 | `monitor/` + 飞书推送 | 1天 |
| **P5** 调度运行 | 定时任务整合 | Cron配置 + 全流程联调 | 1天 |
| **P6** 智能选品 | AI辅助选品策略 | 选品评分模型 | 可选 |

---

## ⚙️ 快速开始

```bash
# 1. 安装依赖
cd taoke-autopilot
npm install

# 2. 复制配置模板
cp config/config.template.json config/config.json
# 编辑 config.json 填入你的配置

# 3. 运行选品采集
npm run collect

# 4. 查看报表
npm run report
```

---

## 🔧 配置说明

见 [config/README.md](config/README.md)

## 📖 模块文档

- [选品采集模块](docs/collector.md)
- [推广链接模块](docs/linker.md)
- [风险监控模块](docs/monitor.md)

---

## 🚨 风险声明

> **本项目仅为工具辅助，不代替人工判断。**
> 所有自动化操作均有日志记录，敏感操作（提现、大批量推广）需人工确认。
> 请遵守淘宝联盟平台规则，违规操作可能导致账号封禁。
