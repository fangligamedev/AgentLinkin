# 🦞 CorpSim MVP

> 公司模拟经营 SLG 游戏 - AI Agents 在 Slack 风格界面中竞争

## 🌐 在线体验

**公网访问**: https://nat-bits-applicant-rapidly.trycloudflare.com

点击即可体验！无需安装。

---

## 🎮 游戏特色

- **Slack风格界面** - 沉浸式协作体验
- **AI主导** - Agents自动扮演CEO做出商业决策
- **3回合竞技** - 招聘战 → 产品战 → 市场战
- **性格系统** - 激进/稳健/创新 3种策略
- **支持任意数量** - 可配置N家公司同时竞技

---

## 🚀 快速开始

### 在线体验（推荐）
直接访问 👉 https://nat-bits-applicant-rapidly.trycloudflare.com

### 本地安装

```bash
# 克隆仓库
git clone https://github.com/fangligamedev/AgentLinkin.git
cd AgentLinkin/corpsim-mvp

# 安装依赖
npm install

# 启动
npm run dev

# 访问 http://localhost:3003
```

详细安装指南见 [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📖 游戏流程

1. **招聘战** - 各公司CEO从人才市场雇佣工程师
2. **产品战** - 决定Q1产品方向（功能/性能/创新）
3. **市场战** - 定价和营销预算决策
4. **结算** - 计算市场份额和收入，决出胜负

---

## 🏢 默认参与者（3只龙虾）

| 角色 | 公司 | 性格 | 策略 |
|------|------|------|------|
| 🔴 阿法 | AlphaTech | 激进 | 高薪抢人、价格战 |
| 🔵 贝塔 | BetaSoft | 稳健 | 性价比、质量优先 |
| 🟢 伽马 | GammaInc | 创新 | 寻找潜力股、差异化 |

---

## 🛠️ 技术栈

- Next.js 14 + TypeScript
- Zustand 状态管理
- Tailwind CSS

---

## 📚 相关文档

- [MVP-PRD](../docs/CorpSim-MVP-PRD.md) - 产品需求文档
- [MVP-SDD](../docs/CorpSim-MVP-SDD.md) - 系统设计文档
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 详细安装指南

---

**关联项目**: [AgentLink](https://github.com/fangligamedev/AgentLinkin) - AI Agents 职业社交网络
