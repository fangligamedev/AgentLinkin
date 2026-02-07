// src/game/gameEngine.ts
// Core game logic engine

import { Company, Candidate, RandomEvent, MarketResult, GameEvent } from '../types';
import { MarketCalculator } from '../utils/calculator';
import { generateRandomEvent } from '../utils/events';

export class GameEngine {
  companies: Company[];
  candidates: Candidate[];
  randomEvent: RandomEvent | null = null;
  round: number = 1;
  maxRounds: number = 3;

  constructor(companies: Company[], candidates: Candidate[]) {
    this.companies = companies;
    this.candidates = candidates;
  }

  init() {
    this.randomEvent = generateRandomEvent();
    return this.randomEvent;
  }

  // Round 1: Hiring Phase
  executeHiringPhase(decisions: { companyId: string; candidateId: string }[]) {
    const results: { company: Company; hired: Candidate | null }[] = [];

    for (const decision of decisions) {
      const company = this.companies.find((c) => c.id === decision.companyId);
      const candidate = this.candidates.find((c) => c.id === decision.candidateId);

      if (company && candidate && !candidate.hiredBy) {
        // Check if company can afford
        if (company.cash >= candidate.salary * 0.1) {
          // Hire the candidate
          candidate.hiredBy = company.id;
          company.cash -= candidate.salary * 0.1; // Signing bonus
          company.employees.push({
            id: candidate.id,
            name: candidate.name,
            skill: candidate.skill,
            salary: candidate.salary,
            role: 'dev',
          });

          // Add to history
          company.history.push({
            round: this.round,
            type: 'hiring',
            description: `Hired ${candidate.name}`,
            decision: `Salary: $${candidate.salary}`,
          });

          results.push({ company, hired: candidate });
        } else {
          results.push({ company, hired: null });
        }
      }
    }

    return results;
  }

  // Round 2: Product Phase
  executeProductPhase(decisions: { companyId: string; direction: string }[]) {
    const results: { company: Company; direction: string }[] = [];

    for (const decision of decisions) {
      const company = this.companies.find((c) => c.id === decision.companyId);
      if (company) {
        company.product.direction = decision.direction as any;

        // Update product based on direction
        switch (decision.direction) {
          case 'features':
            company.product.features += 2;
            company.product.quality += 5;
            break;
          case 'performance':
            company.product.quality += 15;
            company.product.features += 1;
            break;
          case 'innovation':
            company.product.features += 3;
            company.product.quality += 10;
            break;
        }

        // Apply random event bonus
        if (this.randomEvent?.bonus.type === 'product') {
          company.product.quality += this.randomEvent.bonus.value;
        }

        // Add to history
        company.history.push({
          round: this.round,
          type: 'product',
          description: `Product direction: ${decision.direction}`,
          decision: decision.direction,
        });

        results.push({ company, direction: decision.direction });
      }
    }

    return results;
  }

  // Round 3: Market Phase
  executeMarketPhase(decisions: { companyId: string; price: number; budget: number }[]) {
    // Update company decisions
    for (const decision of decisions) {
      const company = this.companies.find((c) => c.id === decision.companyId);
      if (company) {
        company.price = decision.price;
        company.marketingBudget = decision.budget;
        company.cash -= decision.budget;
      }
    }

    // Calculate market results
    const results = MarketCalculator.calculateMarketResults(this.companies);

    // Update companies
    for (const result of results) {
      const company = this.companies.find((c) => c.id === result.companyId);
      if (company) {
        company.marketShare = result.newShare;
        company.cash += result.revenue;

        // Add to history
        company.history.push({
          round: this.round,
          type: 'market',
          description: `Market share: ${result.newShare.toFixed(1)}%`,
          decision: `Price: $${company.price}, Budget: $${company.marketingBudget}`,
          result: `Revenue: $${result.revenue.toLocaleString()}`,
        });
      }
    }

    return results;
  }

  // Calculate final scores
  calculateFinalScores() {
    return this.companies.map((company) => {
      const marketScore = company.marketShare * 40; // 40% weight
      const cashScore = (company.cash / 1000000) * 30; // 30% weight
      const teamScore = company.employees.reduce((sum, e) => sum + e.skill, 0) * 2; // 20% weight
      const decisionScore = company.history.length * 5; // 10% weight

      const totalScore = marketScore + cashScore + teamScore + decisionScore;

      return {
        company,
        scores: {
          market: marketScore,
          cash: cashScore,
          team: teamScore,
          decision: decisionScore,
          total: totalScore,
        },
      };
    });
  }

  nextRound() {
    if (this.round < this.maxRounds) {
      this.round++;
    }
    return this.round;
  }
}
