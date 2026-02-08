// src/boardroom/executiveAI.ts
// AI Executive for Boardroom Meetings

import { Executive, ExecutiveRole, AgendaItem, Meeting, BoardMessage, CompanyState } from './types';

export class ExecutiveAI {
  executive: Executive;
  companyState: CompanyState;
  meetingHistory: BoardMessage[] = [];
  
  constructor(executive: Executive, companyState: CompanyState) {
    this.executive = executive;
    this.companyState = companyState;
  }

  // Generate system prompt based on role and personality
  private getSystemPrompt(): string {
    const rolePrompts: Record<ExecutiveRole, string> = {
      ceo: `你是${this.executive.name}，${this.companyState.name}的CEO。
你的职责是主持董事会会议、协调各部门、做出最终战略决策。
性格: ${this.executive.personality}
关注点: 公司整体估值、市场份额、长期战略`,
      
      cto: `你是${this.executive.name}，${this.companyState.name}的CTO（首席技术官）。
你的职责是技术路线规划、产品研发、技术团队管理。
性格: ${this.executive.personality}
关注点: 产品质量、技术债、研发进度、工程师招聘`,
      
      cmo: `你是${this.executive.name}，${this.companyState.name}的CMO（首席市场官）。
你的职责是市场营销、品牌建设、获客策略。
性格: ${this.executive.personality}
关注点: 获客成本、品牌知名度、市场份额、营销ROI`,
      
      cfo: `你是${this.executive.name}，${this.companyState.name}的CFO（首席财务官）。
你的职责是财务管理、预算控制、现金流监控。
性格: ${this.executive.personality}
关注点: 现金流、利润率、成本控制、财务风险`,
    };

    return `${rolePrompts[this.executive.role]}

当前公司状态:
- 现金: $${(this.companyState.cash / 10000).toFixed(0)}万
- 估值: $${(this.companyState.valuation / 10000).toFixed(0)}万
- 收入: $${(this.companyState.revenue / 10000).toFixed(0)}万/季
- 员工: ${this.companyState.employees}人
- 市场份额: ${this.companyState.marketShare}%
- 士气: ${this.companyState.morale}%

你的优先级: ${this.executive.priorities.join(', ')}

会议规则:
1. 使用Slack风格，简洁直接
2. 可以@其他高管
3. 使用emoji表达情绪
4. 坚持你的立场，但可以妥协
5. 用数据支撑你的观点`;
  }

  // Generate agenda item proposal
  proposeAgenda(): { title: string; description: string; options: string[] } {
    const proposals: Record<ExecutiveRole, () => { title: string; description: string; options: string[] }> = {
      ceo: () => ({
        title: 'Q1战略目标',
        description: '确定本季度主要战略方向',
        options: ['激进扩张', '稳健发展', '防守收缩'],
      }),
      cto: () => ({
        title: '研发团队扩张',
        description: '招聘工程师以支持产品路线图',
        options: ['招聘5人(激进)', '招聘2人(保守)', '不招聘(维持)'],
      }),
      cmo: () => ({
        title: '营销预算分配',
        description: 'Q1市场营销投入',
        options: ['$50万(全力)', '$20万(适度)', '$5万(保守)'],
      }),
      cfo: () => ({
        title: '成本控制措施',
        description: '应对现金流压力',
        options: ['严格管控', '适度控制', '暂不控制'],
      }),
    };

    return proposals[this.executive.role]();
  }

  // Generate debate message
  debate(topic: string, context: string, otherMessages: BoardMessage[]): string {
    const prompt = `${this.getSystemPrompt()}

当前议题: ${topic}
背景: ${context}

会议历史:
${otherMessages.slice(-5).map(m => `${m.authorName} (${m.authorRole}): ${m.content}`).join('\n')}

现在轮到你发言。考虑:
1. 你的角色立场
2. 公司当前状况
3. 其他人的观点
4. 如何说服他人支持你

回复要求:
- 简洁有力
- 可@他人
- 坚持你的优先级
- 可以使用emoji`;

    // Rule-based response generation (MVP version)
    return this.generateDebateResponse(topic, context, otherMessages);
  }

  private generateDebateResponse(topic: string, context: string, messages: BoardMessage[]): string {
    const roleResponses: Record<ExecutiveRole, string[]> = {
      ceo: [
        '我们需要平衡短期压力和长期发展。',
        '数据显示我们应该更激进。',
        '我倾向于稳健，但愿意听取大家意见。',
        '@CFO 现金流能支撑吗？',
      ],
      cto: [
        '技术债务不能再积累了。',
        '我们需要更多工程师才能按时交付。',
        '@CFO 能不能批准这笔招聘预算？',
        '不投资技术，产品竞争力会下降。',
      ],
      cmo: [
        '市场窗口期有限，必须抓住！',
        '@CEO 我支持扩张策略。',
        '营销投入ROI历史数据是1:5。',
        '不加大投入，会被BetaSoft甩开。',
      ],
      cfo: [
        '现金流只够6个月了，要谨慎。',
        '我理解扩张需要，但风险太大。',
        '@CEO 我建议分阶段投入。',
        '财务健康是公司的生命线。',
      ],
    };

    const responses = roleResponses[this.executive.role];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Generate vote
  vote(item: AgendaItem, otherVotes: { [role: string]: string }): { option: string; reasoning: string } {
    const voteLogic: Record<ExecutiveRole, () => { option: string; reasoning: string }> = {
      ceo: () => {
        // CEO tends to choose middle option or based on consensus
        const middleIndex = Math.floor(item.options.length / 2);
        return {
          option: item.options[middleIndex],
          reasoning: '平衡风险和机会',
        };
      },
      cto: () => ({
        option: item.options[0], // Most aggressive
        reasoning: '技术投资不能省',
      }),
      cmo: () => ({
        option: item.options[0], // Most aggressive
        reasoning: '市场机会稍纵即逝',
      }),
      cfo: () => ({
        option: item.options[item.options.length - 1], // Most conservative
        reasoning: '现金流安全第一',
      }),
    };

    return voteLogic[this.executive.role]();
  }

  // React to execution result
  reactToResult(decision: string, success: boolean, impact: any): string {
    if (success) {
      return `✅ ${decision}执行成功！结果符合预期。`;
    } else {
      return `⚠️ ${decision}执行遇到问题，需要调整策略。`;
    }
  }

  // Get avatar emoji
  getAvatar(): string {
    const avatars: Record<ExecutiveRole, string> = {
      ceo: '👔',
      cto: '👨‍💻',
      cmo: '📢',
      cfo: '💼',
    };
    return avatars[this.executive.role];
  }
}

// Create executives for a company
export function createExecutives(companyId: string, companyName: string, personality: string): Executive[] {
  return [
    {
      id: `${companyId}-ceo`,
      name: `${companyName}-CEO`,
      role: 'ceo',
      companyId,
      personality,
      priorities: ['valuation', 'marketShare', 'strategy'],
      avatar: '👔',
    },
    {
      id: `${companyId}-cto`,
      name: `${companyName}-CTO`,
      role: 'cto',
      companyId,
      personality: personality === 'aggressive' ? 'innovative' : personality,
      priorities: ['productQuality', 'techDebt', 'hiring'],
      avatar: '👨‍💻',
    },
    {
      id: `${companyId}-cmo`,
      name: `${companyName}-CMO`,
      role: 'cmo',
      companyId,
      personality: personality === 'conservative' ? 'aggressive' : personality,
      priorities: ['cac', 'brand', 'marketShare'],
      avatar: '📢',
    },
    {
      id: `${companyId}-cfo`,
      name: `${companyName}-CFO`,
      role: 'cfo',
      companyId,
      personality: 'conservative',
      priorities: ['cashflow', 'profit', 'risk'],
      avatar: '💼',
    },
  ];
}
