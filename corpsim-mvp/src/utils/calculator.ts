// src/utils/calculator.ts
// Market calculation utilities

import { Company, MarketResult } from '../types';

export class MarketCalculator {
  // Calculate product score for a company
  static calculateProductScore(company: Company): number {
    const techPower = company.employees.reduce((sum, e) => sum + e.skill, 0);
    const featureBonus = company.product.features * 10;
    const qualityBonus = company.product.quality * 0.5;
    
    return Math.min(100, techPower + featureBonus + qualityBonus);
  }

  // Calculate brand score
  static calculateBrandScore(company: Company): number {
    return Math.min(100, company.marketingBudget / 10000);
  }

  // Calculate price score (lower price = higher score)
  static calculatePriceScore(price: number): number {
    return Math.max(0, (300 - price) / 300 * 100);
  }

  // Calculate channel score
  static calculateChannelScore(company: Company): number {
    const salesPeople = company.employees.filter((e) => e.role === 'sales').length;
    return Math.min(100, salesPeople * 5 + 20); // Base 20 for online channel
  }

  // Calculate complete market score for a company
  static calculateMarketScore(company: Company): {
    total: number;
    breakdown: {
      productScore: number;
      brandScore: number;
      priceScore: number;
      channelScore: number;
    };
  } {
    const productScore = this.calculateProductScore(company);
    const brandScore = this.calculateBrandScore(company);
    const priceScore = this.calculatePriceScore(company.price);
    const channelScore = this.calculateChannelScore(company);

    const total = 
      productScore * 0.4 + 
      brandScore * 0.3 + 
      priceScore * 0.2 + 
      channelScore * 0.1;

    return {
      total,
      breakdown: {
        productScore,
        brandScore,
        priceScore,
        channelScore,
      },
    };
  }

  // Calculate market results for all companies
  static calculateMarketResults(companies: Company[]): MarketResult[] {
    // Calculate scores for all companies
    const scores = companies.map((company) => ({
      company,
      ...this.calculateMarketScore(company),
    }));

    // Total score
    const totalScore = scores.reduce((sum, s) => sum + s.total, 0);

    // Calculate market share (85% is up for grabs, 15% is legacy market)
    const availableMarket = 85;
    
    return scores.map((s) => {
      const sharePercent = totalScore > 0 ? (s.total / totalScore) : 0;
      const newShare = sharePercent * availableMarket;
      
      // Calculate revenue based on market share and price
      // Assume 1000 potential customers, each paying monthly
      const customers = Math.floor(newShare * 10); // 10 customers per 1% share
      const revenue = customers * s.company.price * 12; // Annual revenue

      return {
        companyId: s.company.id,
        score: s.total,
        breakdown: s.breakdown,
        newShare,
        revenue,
      };
    });
  }

  // Generate AI decision for hiring (rule-based for MVP)
  static generateHiringDecision(
    company: Company,
    candidates: any[],
    personality: string
  ): string {
    const availableCandidates = candidates.filter((c) => !c.hiredBy);
    if (availableCandidates.length === 0) return '';

    switch (personality) {
      case 'aggressive':
        // Pick highest skill, willing to pay more
        return availableCandidates.reduce((best, c) => 
          c.skill > best.skill ? c : best
        ).id;
      
      case 'conservative':
        // Pick best value (skill/salary ratio)
        return availableCandidates.reduce((best, c) => 
          c.skill / c.salary > best.skill / best.salary ? c : best
        ).id;
      
      case 'innovative':
        // Pick candidate with 'AI' or 'innovation' in trait, or highest skill
        const innovative = availableCandidates.find((c) => 
          c.trait.toLowerCase().includes('ai') || 
          c.trait.toLowerCase().includes('innovation')
        );
        return innovative?.id || availableCandidates[0].id;
      
      default:
        return availableCandidates[0].id;
    }
  }

  // Generate AI decision for product direction
  static generateProductDecision(
    company: Company,
    randomEvent: any,
    personality: string
  ): string {
    // Check if random event hints at a direction
    if (randomEvent?.bonus?.type === 'product') {
      if (randomEvent.name.includes('mobile')) return 'innovation';
      if (randomEvent.name.includes('performance')) return 'performance';
    }

    switch (personality) {
      case 'aggressive':
        return 'features'; // Add more features to compete
      case 'conservative':
        return 'performance'; // Focus on stability
      case 'innovative':
        return 'innovation'; // Try new things
      default:
        return 'features';
    }
  }

  // Generate AI decision for market
  static generateMarketDecision(
    company: Company,
    competitors: Company[],
    personality: string
  ): { price: number; budget: number } {
    const avgCompetitorPrice = competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
      : 100;

    switch (personality) {
      case 'aggressive':
        // Price war: lower price, high marketing
        return {
          price: Math.max(50, avgCompetitorPrice * 0.8),
          budget: Math.min(500000, company.cash * 0.5),
        };
      
      case 'conservative':
        // Value pricing: medium price, low marketing
        return {
          price: Math.max(100, avgCompetitorPrice * 1.1),
          budget: Math.min(200000, company.cash * 0.2),
        };
      
      case 'innovative':
        // Premium pricing: high price, medium marketing
        return {
          price: Math.max(150, avgCompetitorPrice * 1.2),
          budget: Math.min(300000, company.cash * 0.3),
        };
      
      default:
        return { price: 100, budget: 100000 };
    }
  }
}
