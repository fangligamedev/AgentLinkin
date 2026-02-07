// src/app/page.tsx
// Main game page for CorpSim MVP

'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '../game/gameStore';
import { GameEngine } from '../game/gameEngine';
import { CEOAgent, createAgents } from '../ai/ceoAgent';
import {
  INITIAL_CANDIDATES,
  DEFAULT_COMPANY_CONFIGS,
  generateCompanies,
} from '../data/initialData';
import { generateRandomEvent, getEventDescription } from '../utils/events';

export default function CorpSimMVP() {
  const [agents, setAgents] = useState<CEOAgent[]>([]);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    phase,
    round,
    companies,
    candidates,
    randomEvent,
    messages,
    gameOver,
    initGame,
    addMessage,
    setPhase,
    nextRound,
    endGame,
  } = useGameStore();

  // Initialize game
  useEffect(() => {
    const comps = generateCompanies(DEFAULT_COMPANY_CONFIGS);
    initGame(comps, INITIAL_CANDIDATES);
    setEngine(new GameEngine(comps, INITIAL_CANDIDATES));
    setAgents(createAgents(comps));
  }, []);

  // Process AI decisions for current round
  const processRound = async () => {
    if (!engine || isProcessing) return;
    setIsProcessing(true);

    switch (phase) {
      case 'hiring':
        await processHiringRound();
        break;
      case 'product':
        await processProductRound();
        break;
      case 'market':
        await processMarketRound();
        break;
    }

    setIsProcessing(false);
  };

  const processHiringRound = async () => {
    // Generate random event
    const event = generateRandomEvent();
    useGameStore.getState().setRandomEvent(event);

    // Each agent makes decision
    for (const agent of agents) {
      const decision = agent.makeHiringDecision(candidates);
      if (decision.candidateId) {
        // Add message
        addMessage(
          agent.generateMessage(
            'hiring',
            `@channel 我决定雇佣 ${
              candidates.find((c) => c.id === decision.candidateId)?.name
            }！${decision.reasoning}`
          )
        );

        // Execute hiring
        useGameStore.getState().hireCandidate(agent.company.id, decision.candidateId);
      }
    }

    setPhase('product');
    nextRound();
  };

  const processProductRound = async () => {
    for (const agent of agents) {
      const decision = agent.makeProductDecision(randomEvent);

      addMessage(
        agent.generateMessage(
          'general',
          `@channel Q1产品方向：${decision.direction}。${decision.reasoning}`
        )
      );

      useGameStore.getState().setProductDirection(agent.company.id, decision.direction);
    }

    setPhase('market');
    nextRound();
  };

  const processMarketRound = async () => {
    const decisions: { companyId: string; price: number; budget: number }[] = [];

    for (const agent of agents) {
      const decision = agent.makeMarketDecision(
        companies.filter((c) => c.id !== agent.company.id)
      );

      decisions.push({
        companyId: agent.company.id,
        price: decision.price,
        budget: decision.budget,
      });

      addMessage(
        agent.generateMessage(
          'general',
          `@channel 市场策略：定价$${decision.price}/月，营销预算$${decision.budget}。${decision.reasoning}`
        )
      );
    }

    // Execute market phase
    const results = engine!.executeMarketPhase(decisions);
    useGameStore.getState().setMarketResults(results);

    // Add results messages
    for (const result of results) {
      const company = companies.find((c) => c.id === result.companyId);
      addMessage({
        companyId: result.companyId,
        channel: 'general',
        author: 'System',
        avatar: '📊',
        content: `${company?.name} Q1结果：市场份额 ${result.newShare.toFixed(
          1
        )}%，收入 $${result.revenue.toLocaleString()}`,
      });
    }

    endGame();
  };

  // Get messages for current company (simplified: show all)
  const currentMessages = messages;

  if (companies.length === 0) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦞</span>
            <h1 className="text-xl font-bold">CorpSim MVP</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-400">回合:</span>{' '}
              <span className="font-mono text-lg">{round}/3</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">阶段:</span>{' '}
              <span className="font-semibold capitalize">{phase}</span>
            </div>
            {randomEvent && phase !== 'hiring' && (
              <div className="text-sm bg-yellow-900 px-3 py-1 rounded">
                📢 {randomEvent.name}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 min-h-screen p-4 border-r border-gray-700">
          <h2 className="text-xs font-semibold text-gray-400 uppercase mb-3">Companies</h2>
          <div className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className="p-3 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>
                    {company.personality === 'aggressive'
                      ? '🔴'
                      : company.personality === 'conservative'
                      ? '🔵'
                      : '🟢'}
                  </span>
                  <span className="font-medium">{company.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  💰 ${(company.cash / 10000).toFixed(0)}万 | 👥 {company.employees.length}人 | 📈{' '}
                  {company.marketShare.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xs font-semibold text-gray-400 uppercase mt-6 mb-3">Candidates</h2>
          <div className="space-y-1">
            {candidates.map((cand) => (
              <div
                key={cand.id}
                className={`text-xs p-2 rounded ${
                  cand.hiredBy
                    ? 'bg-green-900 text-green-200'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {cand.name} {cand.skill}分 ${cand.salary / 1000}k
                {cand.hiredBy && ' ✓'}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-h-screen bg-gray-900">
          {/* Channel Header */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold">#general</h2>
            <p className="text-sm text-gray-400">Company announcements and discussions</p>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {currentMessages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                点击"开始回合"启动游戏
              </div>
            )}

            {currentMessages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className="text-2xl">{msg.avatar}</div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{msg.author}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-200 mt-1">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-700">
            {!gameOver ? (
              <button
                onClick={processRound}
                disabled={isProcessing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
              >
                {isProcessing
                  ? 'Processing...'
                  : phase === 'hiring'
                  ? '▶️ 开始招聘回合'
                  : phase === 'product'
                  ? '▶️ 开始产品回合'
                  : phase === 'market'
                  ? '▶️ 开始市场回合'
                  : 'Next Round'}
              </button>
            ) : (
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4">🏆 游戏结束</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {companies
                    .sort((a, b) => b.marketShare - a.marketShare)
                    .map((company, idx) => (
                      <div key={company.id} className="bg-gray-800 p-3 rounded">
                        <div className="text-2xl mb-1">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </div>
                        <div className="font-semibold">{company.name}</div>
                        <div className="text-sm text-gray-400">
                          份额: {company.marketShare.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-400">
                          现金: ${(company.cash / 10000).toFixed(0)}万
                        </div>
                      </div>
                    ))}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  🔄 重新开始
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
