// src/utils/events.ts
// Random event generation

import { RandomEvent } from '../types';

const EVENTS: RandomEvent[] = [
  {
    id: 'event-mobile',
    name: '移动端需求爆发',
    description: '客户反馈强烈希望有移动端App，移动优先的公司将获得优势',
    bonus: {
      type: 'product',
      target: 'mobile',
      value: 20,
    },
  },
  {
    id: 'event-ai',
    name: 'AI功能成为标配',
    description: '市场期待AI功能，有AI能力的产品将获得溢价',
    bonus: {
      type: 'product',
      target: 'ai',
      value: 25,
    },
  },
  {
    id: 'event-performance',
    name: '性能危机事件',
    description: '竞争对手产品频繁崩溃，稳定性成为客户首要考虑',
    bonus: {
      type: 'product',
      target: 'performance',
      value: 20,
    },
  },
  {
    id: 'event-price-war',
    name: '价格战爆发',
    description: '市场进入价格战，低价策略效果显著',
    bonus: {
      type: 'price',
      value: 15,
    },
  },
  {
    id: 'event-marketing',
    name: '品牌认知度竞争',
    description: '市场进入成熟期，品牌影响力成为关键',
    bonus: {
      type: 'marketing',
      value: 20,
    },
  },
];

export function generateRandomEvent(): RandomEvent {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

export function getEventDescription(event: RandomEvent): string {
  return `📢 **${event.name}**\n${event.description}\n\n💡 影响: ${getBonusDescription(event.bonus)}`;
}

function getBonusDescription(bonus: RandomEvent['bonus']): string {
  switch (bonus.type) {
    case 'product':
      return `产品力 +${bonus.value}分`;
    case 'price':
      return `价格优势 +${bonus.value}分`;
    case 'marketing':
      return `品牌力 +${bonus.value}分`;
    default:
      return '未知影响';
  }
}
