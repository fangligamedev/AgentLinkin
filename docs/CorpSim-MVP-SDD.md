# CorpSim MVP: 系统设计文档 (SDD)
## System Design Document

**版本**: MVP v0.1  
**日期**: 2026-02-07  
**架构**: 简化单机版 (适合快速原型验证)

---

## 🏗️ 系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Human Observer                         │
│                    (游戏力 - 观看+评判)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      CorpSim MVP App                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Slack UI    │  │ Game Engine  │  │  AI Controller   │  │
│  │  (Frontend)  │  │  (Backend)   │  │   (3 Agents)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌─────────┐   ┌─────────┐   ┌──────────┐
        │ SQLite  │   │ AgentLink│   │  Static  │
        │  DB     │   │   API    │   │ Config   │
        └─────────┘   └──────────┘   └──────────┘
```

### 技术选型 (MVP简化版)

| 组件 | 技术 | 原因 |
|------|------|------|
| **前端** | Next.js 14 + Tailwind | 复用AgentLink代码 |
| **后端** | Node.js (单文件) | 快速开发 |
| **数据库** | SQLite (内存模式) | 无需配置 |
| **AI** | 本地Prompt工程 | 无需外部API |
| **部署** | 本地运行 | 快速迭代 |

---

## 📁 文件结构

```
corpsim-mvp/
├── README.md                    # 运行说明
├── package.json
├── src/
│   ├── server.js               # 简易Express服务器
│   ├── game/
│   │   ├── engine.js           # 游戏核心逻辑
│   │   ├── state.js            # 游戏状态管理
│   │   └── calculator.js       # 市场计算
│   ├── ai/
│   │   ├── agent.js            # Agent基类
│   │   ├── ceo-alpha.js        # AlphaTech CEO
│   │   ├── ceo-beta.js         # BetaSoft CEO
│   │   └── ceo-gamma.js        # GammaInc CEO
│   └── data/
│       ├── candidates.js       # 5个候选人
│       ├── companies.js        # 3家公司初始状态
│       └── events.js           # 随机事件
└── frontend/
    └── (复用AgentLink的Slack UI组件)
```

---

## 🎮 核心模块设计

### 1. Game Engine (游戏引擎)

```javascript
// src/game/engine.js
class GameEngine {
  constructor() {
    this.round = 1;           // 当前回合
    this.maxRounds = 3;       // 总回合数
    this.companies = [];      // 3家公司
    this.candidates = [];     // 5个候选人
    this.market = {};         // 市场状态
    this.event = null;        // 当前随机事件
  }

  // 初始化游戏
  init() {
    this.loadCompanies();
    this.loadCandidates();
    this.generateEvent();
  }

  // 推进回合
  nextRound() {
    if (this.round >= this.maxRounds) {
      return this.endGame();
    }
    this.round++;
    this.executeRoundLogic();
  }

  // 回合逻辑
  executeRoundLogic() {
    switch(this.round) {
      case 1: this.executeHiringPhase(); break;
      case 2: this.executeProductPhase(); break;
      case 3: this.executeMarketPhase(); break;
    }
  }

  // 招聘阶段
  executeHiringPhase() {
    // 3个CEO同时决策
    for (const company of this.companies) {
      const decision = company.ceo.makeHiringDecision(this.candidates);
      company.executeHiring(decision);
    }
    // 更新候选人状态
    this.updateCandidateStatus();
  }

  // 产品阶段
  executeProductPhase() {
    for (const company of this.companies) {
      const decision = company.ceo.makeProductDecision(this.event);
      company.executeProduct(decision);
    }
  }

  // 市场阶段
  executeMarketPhase() {
    const results = this.calculateMarketResults();
    this.distributeMarketShare(results);
    this.calculateRevenue();
  }

  // 结束游戏
  endGame() {
    return this.calculateFinalScores();
  }
}
```

### 2. AI Agent (CEO控制器)

```javascript
// src/ai/agent.js
class CEOAgent {
  constructor(name, company, personality) {
    this.name = name;
    this.company = company;
    this.personality = personality; // 'aggressive' | 'conservative' | 'innovative'
    this.memory = []; // 对话历史
  }

  // 生成系统提示词
  getSystemPrompt() {
    return `
你是 ${this.name}，${this.company} 的CEO。
性格: ${this.getPersonalityDescription()}
当前状态: 现金$${this.company.cash}万，员工${this.company.employees.length}人

你的决策风格:
${this.getDecisionStyle()}

请以第一人称回复，使用Slack风格（简洁、直接、可带emoji）。
    `;
  }

  // 招聘决策
  async makeHiringDecision(candidates) {
    const prompt = `
${this.getSystemPrompt()}

候选人列表:
${candidates.map(c => `- ${c.name}: ${c.skill}分, $${c.salary}万, ${c.trait}`).join('\n')}

你需要招聘1-2人。考虑:
1. 技术需求
2. 薪资预算
3. 与性格匹配

回复格式:
决策: [候选人姓名]
理由: [一句话]
    `;

    // 使用本地LLM或模拟响应
    return this.generateResponse(prompt);
  }

  // 产品决策
  async makeProductDecision(event) {
    const prompt = `
${this.getSystemPrompt()}

随机事件: ${event?.description || '无'}

可选产品方向:
1. 功能增强 - 快速上线，中等竞争力
2. 性能优化 - 质量高，品牌加分
3. 新模块 - 高风险高回报

选择你的产品方向。
    `;

    return this.generateResponse(prompt);
  }

  // 市场决策
  async makeMarketDecision(competitors) {
    const prompt = `
${this.getSystemPrompt()}

竞品定价:
${competitors.map(c => `- ${c.name}: $${c.price}/月`).join('\n')}

决定你的:
1. 定价 ($50-$300/月)
2. 营销预算 ($0-$50万)
3. 主要卖点
    `;

    return this.generateResponse(prompt);
  }

  // 生成回复 (简化版: 基于规则的响应)
  generateResponse(prompt) {
    // MVP版本: 使用预设模板 + 随机性
    return this.ruleBasedResponse(prompt);
  }
}

// 具体CEO实现
class CEOAlpha extends CEOAgent {
  constructor(company) {
    super('阿法', company, 'aggressive');
  }

  getDecisionStyle() {
    return `
- 激进扩张，敢于冒险
- 愿意高薪抢人才
- 喜欢价格战抢占市场
- 口头禅: "All-in!" "速度第一!"
    `;
  }
}

class CEOBeta extends CEOAgent {
  constructor(company) {
    super('贝塔', company, 'conservative');
  }

  getDecisionStyle() {
    return `
- 稳健保守，注重风险
- 选择性价比高的方案
- 强调产品质量和稳定性
- 口头禅: "稳妥第一" "现金流为王"
    `;
  }
}

class CEOGamma extends CEOAgent {
  constructor(company) {
    super('伽马', company, 'innovative');
  }

  getDecisionStyle() {
    return `
- 创新驱动，追求差异化
- 愿意尝试新技术
- 寻找市场空白点
- 口头禅: "颠覆式创新" "不一样才有出路"
    `;
  }
}
```

### 3. Market Calculator (市场计算)

```javascript
// src/game/calculator.js
class MarketCalculator {
  // 计算市场得分
  static calculateMarketScore(company) {
    const productScore = this.calculateProductScore(company);
    const brandScore = this.calculateBrandScore(company);
    const priceScore = this.calculatePriceScore(company.price);
    const channelScore = this.calculateChannelScore(company);

    return {
      total: productScore * 0.4 + brandScore * 0.3 + priceScore * 0.2 + channelScore * 0.1,
      breakdown: { productScore, brandScore, priceScore, channelScore }
    };
  }

  // 产品力 = 技术力 + 功能完整性
  static calculateProductScore(company) {
    const techPower = company.employees.reduce((sum, e) => sum + e.skill, 0);
    const featureBonus = company.product.features * 10;
    return Math.min(100, techPower + featureBonus);
  }

  // 品牌力 = 营销投入 / 10
  static calculateBrandScore(company) {
    return Math.min(100, company.marketingBudget / 10000);
  }

  // 价格分 = (300 - 定价) / 300 * 100 (越低定价分越高)
  static calculatePriceScore(price) {
    return Math.max(0, (300 - price) / 300 * 100);
  }

  // 渠道力 = 销售人数 * 5
  static calculateChannelScore(company) {
    const salesPeople = company.employees.filter(e => e.role === 'sales').length;
    return Math.min(100, salesPeople * 5);
  }

  // 分配市场份额
  static distributeMarketShare(companies) {
    const scores = companies.map(c => ({
      company: c,
      score: this.calculateMarketScore(c).total
    }));

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

    return scores.map(s => ({
      company: s.company,
      share: (s.score / totalScore) * 100,
      score: s.score
    }));
  }
}
```

---

## 💾 数据模型

### Company (公司)

```javascript
{
  id: 'alpha-tech',
  name: 'AlphaTech',
  ceo: CEOAlpha,
  cash: 1000000,           // 现金 (万)
  employees: [             // 员工列表
    { name: '初始员工1', skill: 5, salary: 80000, role: 'dev' }
  ],
  product: {
    version: '1.0',
    features: 3,           // 功能数
    quality: 60            // 质量分
  },
  marketShare: 5,          // 市场份额 %
  price: 100,              // 定价 ($/月)
  marketingBudget: 0,      // 营销预算
  history: []              // 决策历史
}
```

### Candidate (候选人)

```javascript
{
  id: 'alice-001',
  name: 'Alice',
  skill: 9,                // 技能分 1-10
  salary: 120000,          // 年薪
  trait: '资深后端',        // 特点
  hiredBy: null            // 被哪家公司雇佣
}
```

### Event (随机事件)

```javascript
{
  id: 'event-001',
  name: '移动端需求爆发',
  description: '客户反馈强烈希望有移动端App',
  effect: {
    type: 'product_bonus',
    target: 'mobile',
    bonus: 20                // +20%市场得分
  }
}
```

---

## 🖥️ Slack UI 设计

### 界面布局 (简化版)

```
┌─────────────────────────────────────────────────────┐
│  🦞 CorpSim MVP                    [回合: 1/3]       │
├──────────┬──────────────────────────────────────────┤
│          │  #general (AlphaTech)  📌 置顶           │
│ 🏢 公司   │  ───────────────────────────────────────│
│ ├ 🔴 Alpha│  🤖 CEO-Alpha: @channel 开始招聘！      │
│ ├ 🔵 Beta │  🤖 HR-Alpha: 发现5个候选人             │
│ └ 🟢 Gamma│  🤖 CEO-Alpha: 我要Alice，$15万！      │
│          │  🤖 CFO-Alpha: 等等，预算够吗？          │
│          │                                           │
│ 📊 统计   │  [候选人列表]                             │
│ ├ 💰 现金 │  ┌─────────────────────────────────────┐│
│ ├ 👥 员工 │  │ Alice | 9分 | $12万 | [雇佣]        ││
│ └ 📈 份额 │  │ Bob   | 8分 | $10万 | [雇佣]        ││
│          │  │ Carol | 10分| $15万 | [雇佣]        ││
│ 🎲 事件   │  └─────────────────────────────────────┘│
│ (移动端)  │                                           │
│          │  [下一步] 按钮                            │
│          │                                           │
└──────────┴──────────────────────────────────────────┘
```

### 组件清单

| 组件 | 文件 | 功能 |
|------|------|------|
| **Sidebar** | `components/Sidebar.tsx` | 公司切换、统计展示 |
| **ChatView** | `components/ChatView.tsx` | Slack风格消息流 |
| **MessageBubble** | `components/MessageBubble.tsx` | 消息气泡 |
| **CandidateCard** | `components/CandidateCard.tsx` | 候选人卡片 |
| **ActionPanel** | `components/ActionPanel.tsx` | 操作按钮区 |
| **ScoreBoard** | `components/ScoreBoard.tsx` | 实时排行榜 |

---

## 🚀 部署方案

### 本地开发 (推荐用于MVP)

```bash
# 1. 克隆分支
git clone -b feature/corp-simulator-slg https://github.com/fangligamedev/AgentLinkin.git
cd AgentLinkin/corpsim-mvp

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问
# 前端: http://localhost:3000
# 后端: http://localhost:3001
```

### 快速启动脚本

```bash
# start-mvp.sh
#!/bin/bash
echo "🦞 启动 CorpSim MVP..."

# 启动后端
cd backend && npm start &
BACKEND_PID=$!

# 启动前端
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "✅ 服务已启动:"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止"

wait
```

---

## 📊 游戏数据流

```
初始化
  ↓
加载3家公司 + 5个候选人 + 1个随机事件
  ↓
Round 1: 招聘战
  ├─ CEO-Alpha 决策
  ├─ CEO-Beta 决策
  ├─ CEO-Gamma 决策
  └─ 更新雇佣状态
  ↓
Round 2: 产品战
  ├─ 展示随机事件
  ├─ 3个CEO选择产品方向
  └─ 更新产品状态
  ↓
Round 3: 市场战
  ├─ 3个CEO决定定价和预算
  ├─ 计算市场得分
  ├─ 分配市场份额
  └─ 计算收入
  ↓
结算
  ├─ 计算最终分数
  ├─ 排名
  └─ 生成评价
  ↓
弦子评判
```

---

## ⏱️ 时间预估

| 模块 | 预估时间 | 优先级 |
|------|----------|--------|
| 基础框架 | 2小时 | P0 |
| Game Engine | 3小时 | P0 |
| 3个CEO Agent | 3小时 | P0 |
| Slack UI | 4小时 | P0 |
| 市场计算 | 2小时 | P0 |
| 联调测试 | 2小时 | P1 |
| **总计** | **16小时** | - |

---

## ✅ 验收清单

开发完成后检查:

- [ ] 3家公司能正常初始化
- [ ] 5个候选人展示正常
- [ ] Round 1: CEO能做出招聘决策
- [ ] Round 2: CEO能选择产品方向
- [ ] Round 3: 市场计算结果合理
- [ ] Slack界面显示正常
- [ ] 最终排名计算正确
- [ ] 无报错崩溃

---

**MVP目标**: 16小时内完成可运行的原型，供3只AI Agents + 弦子评测。
