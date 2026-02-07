// src/ai/ceoAgent.ts
// AI CEO Agent controller

import { Company, Candidate, Personality } from '../types';
import { MarketCalculator } from '../utils/calculator';

export class CEOAgent {
  name: string;
  company: Company;
  personality: Personality;

  constructor(name: string, company: Company, personality: Personality) {
    this.name = name;
    this.company = company;
    this.personality = personality;
  }

  // Generate Slack-style message
  generateMessage(channel: string, content: string): {
    companyId: string;
    channel: any;
    author: string;
    avatar: string;
    content: string;
  } {
    return {
      companyId: this.company.id,
      channel: channel as any,
      author: `${this.name} (${this.company.ceoName})`,
      avatar: this.getAvatar(),
      content,
    };
  }

  getAvatar(): string {
    switch (this.personality) {
      case 'aggressive':
        return '🔴';
      case 'conservative':
        return '🔵';
      case 'innovative':
        return '🟢';
      default:
        return '🤖';
    }
  }

  // Round 1: Make hiring decision
  makeHiringDecision(candidates: Candidate[]): { candidateId: string; reasoning: string } {
    const available = candidates.filter((c) => !c.hiredBy);
    if (available.length === 0) {
      return { candidateId: '', reasoning: 'No candidates available' };
    }

    let chosen: Candidate;
    let reasoning: string;

    switch (this.personality) {
      case 'aggressive':
        // Pick highest skill, willing to pay
        chosen = available.reduce((best, c) => (c.skill > best.skill ? c : best));
        reasoning = `${chosen.name}是顶级人才，值得高薪！`;
        break;

      case 'conservative':
        // Pick best value
        chosen = available.reduce((best, c) =>
          c.skill / c.salary > best.skill / best.salary ? c : best
        );
        reasoning = `${chosen.name}性价比最高，稳健选择。`;
        break;

      case 'innovative':
        // Look for innovative traits or high skill
        const innovative = available.find(
          (c) =>
            c.trait.includes('AI') ||
            c.trait.includes('创新') ||
            c.trait.includes('专家')
        );
        chosen = innovative || available.reduce((best, c) => (c.skill > best.skill ? c : best));
        reasoning = `${chosen.name}有创新潜力，符合公司方向。`;
        break;

      default:
        chosen = available[0];
        reasoning = `选择${chosen.name}。`;
    }

    return { candidateId: chosen.id, reasoning };
  }

  // Round 2: Make product decision
  makeProductDecision(randomEvent: any): { direction: string; reasoning: string } {
    let direction: string;
    let reasoning: string;

    // Check event influence
    if (randomEvent?.name?.includes('移动')) {
      direction = 'innovation';
      reasoning = '市场需要移动端，我们要创新！';
    } else if (randomEvent?.name?.includes('性能')) {
      direction = 'performance';
      reasoning = '稳定性是关键，专注性能优化。';
    } else {
      switch (this.personality) {
        case 'aggressive':
          direction = 'features';
          reasoning = '功能越多越好，快速迭代抢占市场！';
          break;
        case 'conservative':
          direction = 'performance';
          reasoning = '先把现有功能做稳定，质量第一。';
          break;
        case 'innovative':
          direction = 'innovation';
          reasoning = '要做就做不一样的，颠覆式创新！';
          break;
        default:
          direction = 'features';
          reasoning = '继续增加功能。';
      }
    }

    return { direction, reasoning };
  }

  // Round 3: Make market decision
  makeMarketDecision(competitors: Company[]): { price: number; budget: number; reasoning: string } {
    let price: number;
    let budget: number;
    let reasoning: string;

    const avgPrice =
      competitors.length > 0
        ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
        : 100;

    switch (this.personality) {
      case 'aggressive':
        price = Math.max(50, Math.floor(avgPrice * 0.8));
        budget = Math.min(500000, Math.floor(this.company.cash * 0.5));
        reasoning = `价格战！定价$${price}，投入$${budget}营销，抢占市场！`;
        break;

      case 'conservative':
        price = Math.max(100, Math.floor(avgPrice * 1.1));
        budget = Math.min(200000, Math.floor(this.company.cash * 0.2));
        reasoning = `价值定价$${price}，稳健营销投入$${budget}。`;
        break;

      case 'innovative':
        price = Math.max(150, Math.floor(avgPrice * 1.2));
        budget = Math.min(300000, Math.floor(this.company.cash * 0.3));
        reasoning = ` premium定价$${price}，品牌投入$${budget}。`;
        break;

      default:
        price = 100;
        budget = 100000;
        reasoning = '标准策略。';
    }

    return { price, budget, reasoning };
  }
}

// Factory function to create agents from companies
export function createAgents(companies: Company[]): CEOAgent[] {
  return companies.map(
    (company) => new CEOAgent(company.ceoName, company, company.personality)
  );
}
