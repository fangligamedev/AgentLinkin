// src/data/initialData.ts
// Initial game data

import { Company, Candidate, CEOAgentConfig } from '../types';

// Initial candidates from AgentLink
export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'cand-alice',
    name: 'Alice Chen',
    skill: 9,
    salary: 120000,
    trait: '资深后端架构师',
    hiredBy: null,
  },
  {
    id: 'cand-bob',
    name: 'Bob Smith',
    skill: 8,
    salary: 100000,
    trait: '全栈开发工程师',
    hiredBy: null,
  },
  {
    id: 'cand-carol',
    name: 'Carol Wu',
    skill: 10,
    salary: 150000,
    trait: 'AI算法专家',
    hiredBy: null,
  },
  {
    id: 'cand-david',
    name: 'David Lee',
    skill: 6,
    salary: 80000,
    trait: '中级前端开发',
    hiredBy: null,
  },
  {
    id: 'cand-eve',
    name: 'Eve Zhang',
    skill: 5,
    salary: 60000,
    trait: '有潜力的新人',
    hiredBy: null,
  },
];

// Default company configs (for 3-player test)
export const DEFAULT_COMPANY_CONFIGS: CEOAgentConfig[] = [
  {
    name: '阿法',
    companyName: 'AlphaTech',
    personality: 'aggressive',
  },
  {
    name: '贝塔',
    companyName: 'BetaSoft',
    personality: 'conservative',
  },
  {
    name: '伽马',
    companyName: 'GammaInc',
    personality: 'innovative',
  },
];

// Generate initial companies from configs
export function generateCompanies(configs: CEOAgentConfig[]): Company[] {
  return configs.map((config, index) => ({
    id: `company-${index}`,
    name: config.companyName,
    ceoName: config.name,
    personality: config.personality,
    cash: 1000000, // $1M initial
    employees: [
      {
        id: `emp-${index}-1`,
        name: `初始员工A`,
        skill: 5,
        salary: 80000,
        role: 'dev',
      },
      {
        id: `emp-${index}-2`,
        name: `初始员工B`,
        skill: 4,
        salary: 70000,
        role: 'sales',
      },
    ],
    product: {
      version: '1.0',
      features: 3,
      quality: 60,
    },
    marketShare: 5,
    price: 100,
    marketingBudget: 0,
    history: [],
  }));
}

// Generate more candidates dynamically for larger games
export function generateMoreCandidates(count: number): Candidate[] {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Blake', 'Cameron'];
  const lastNames = ['Wang', 'Liu', 'Chen', 'Zhang', 'Li', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou'];
  const traits = ['前端专家', '后端开发', '全栈工程师', 'DevOps', '产品经理', 'UI设计师', '数据分析师', '安全专家'];
  
  const candidates: Candidate[] = [];
  
  for (let i = 0; i < count; i++) {
    const skill = Math.floor(Math.random() * 6) + 4; // 4-9
    const salary = 50000 + skill * 10000 + Math.floor(Math.random() * 20000);
    
    candidates.push({
      id: `cand-extra-${i}`,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      skill,
      salary,
      trait: traits[i % traits.length],
      hiredBy: null,
    });
  }
  
  return candidates;
}

// Generate more company configs dynamically
export function generateMoreCompanyConfigs(count: number): CEOAgentConfig[] {
  const personalities: ('aggressive' | 'conservative' | 'innovative')[] = [
    'aggressive', 'conservative', 'innovative'
  ];
  
  const companyPrefixes = ['Tech', 'Soft', 'Data', 'Cloud', 'AI', 'Net', 'Cyber', 'Digi'];
  const companySuffixes = ['Corp', 'Inc', 'Labs', 'Systems', 'Solutions', 'Works', 'Studio', 'Hub'];
  
  const configs: CEOAgentConfig[] = [];
  
  for (let i = 0; i < count; i++) {
    const personality = personalities[i % personalities.length];
    const prefix = companyPrefixes[i % companyPrefixes.length];
    const suffix = companySuffixes[i % companySuffixes.length];
    
    configs.push({
      name: `CEO-${String.fromCharCode(65 + i)}`,
      companyName: `${prefix}${suffix}`,
      personality,
    });
  }
  
  return configs;
}
