// src/boardroom/meetingEngine.ts
// Meeting Flow Engine

import { Meeting, MeetingPhase, AgendaItem, BoardMessage, Decision, Vote, ExecutionResult } from './types';
import { ExecutiveAI } from './executiveAI';

export class MeetingEngine {
  meeting: Meeting;
  aiExecutives: Map<string, ExecutiveAI> = new Map();
  private phaseTimer: NodeJS.Timeout | null = null;
  private onMessage: (message: BoardMessage) => void;
  private onPhaseChange: (phase: MeetingPhase) => void;

  constructor(
    meeting: Meeting,
    aiExecutives: ExecutiveAI[],
    onMessage: (message: BoardMessage) => void,
    onPhaseChange: (phase: MeetingPhase) => void
  ) {
    this.meeting = meeting;
    aiExecutives.forEach(ai => this.aiExecutives.set(ai.executive.id, ai));
    this.onMessage = onMessage;
    this.onPhaseChange = onPhaseChange;
  }

  // Start the meeting
  start() {
    this.addSystemMessage('📅 董事会会议开始');
    this.transitionTo('agenda');
  }

  // Transition to next phase
  private transitionTo(phase: MeetingPhase) {
    this.meeting.phase = phase;
    this.meeting.phaseStartedAt = Date.now();
    this.onPhaseChange(phase);

    switch (phase) {
      case 'agenda':
        this.runAgendaPhase();
        break;
      case 'debate':
        this.runDebatePhase();
        break;
      case 'voting':
        this.runVotingPhase();
        break;
      case 'executing':
        this.runExecutingPhase();
        break;
      case 'feedback':
        this.runFeedbackPhase();
        break;
    }
  }

  // Phase 1: Agenda Setting
  private async runAgendaPhase() {
    this.addSystemMessage('📋 议题提出阶段');

    // Each executive proposes one agenda item
    for (const exec of this.meeting.executives) {
      const ai = this.aiExecutives.get(exec.id);
      if (ai) {
        const proposal = ai.proposeAgenda();
        const agendaItem: AgendaItem = {
          id: `agenda-${this.meeting.agenda.length}`,
          title: proposal.title,
          description: proposal.description,
          proposedBy: exec.id,
          options: proposal.options,
          impact: {},
        };
        this.meeting.agenda.push(agendaItem);

        this.addMessage({
          id: `msg-${Date.now()}-${exec.id}`,
          meetingId: this.meeting.id,
          authorId: exec.id,
          authorName: exec.name,
          authorRole: exec.role,
          authorAvatar: exec.avatar,
          content: `我建议讨论：**${proposal.title}**\n${proposal.description}\n选项: ${proposal.options.join(' / ')}`,
          timestamp: Date.now(),
          type: 'statement',
          mentions: [],
        });

        await this.delay(1000);
      }
    }

    this.addSystemMessage(`✅ 共${this.meeting.agenda.length}个议题，进入辩论阶段`);
    await this.delay(2000);
    this.transitionTo('debate');
  }

  // Phase 2: Debate
  private async runDebatePhase() {
    this.addSystemMessage('💬 部门辩论阶段');

    // Debate each agenda item
    for (let i = 0; i < this.meeting.agenda.length; i++) {
      this.meeting.currentItemIndex = i;
      const item = this.meeting.agenda[i];

      this.addSystemMessage(`📌 当前议题 [${i + 1}/${this.meeting.agenda.length}]: ${item.title}`);

      // Each executive debates
      for (const exec of this.meeting.executives) {
        const ai = this.aiExecutives.get(exec.id);
        if (ai) {
          const content = ai.debate(
            item.title,
            item.description,
            this.meeting.messages
          );

          this.addMessage({
            id: `msg-${Date.now()}-${exec.id}`,
            meetingId: this.meeting.id,
            authorId: exec.id,
            authorName: exec.name,
            authorRole: exec.role,
            authorAvatar: exec.avatar,
            content,
            timestamp: Date.now(),
            type: 'statement',
            mentions: [],
          });

          await this.delay(1500);
        }
      }

      // Add some back-and-forth replies
      await this.generateReplies(item);
    }

    this.addSystemMessage('✅ 辩论结束，进入投票阶段');
    await this.delay(2000);
    this.transitionTo('voting');
  }

  // Generate replies between executives
  private async generateReplies(item: AgendaItem) {
    // Simple reply logic: each exec replies to one previous message
    for (const exec of this.meeting.executives) {
      if (Math.random() > 0.5) { // 50% chance to reply
        const targetExec = this.meeting.executives.find(e => e.id !== exec.id);
        if (targetExec) {
          this.addMessage({
            id: `msg-${Date.now()}-${exec.id}-reply`,
            meetingId: this.meeting.id,
            authorId: exec.id,
            authorName: exec.name,
            authorRole: exec.role,
            authorAvatar: exec.avatar,
            content: `@${targetExec.name} 我同意你的观点，但需要补充...`,
            timestamp: Date.now(),
            type: 'reply',
            mentions: [targetExec.name],
          });
          await this.delay(1000);
        }
      }
    }
  }

  // Phase 3: Voting
  private async runVotingPhase() {
    this.addSystemMessage('🗳️ 投票决策阶段');

    for (const item of this.meeting.agenda) {
      this.addSystemMessage(`📊 投票: ${item.title}`);

      const votes: { [key: string]: string } = {};

      for (const exec of this.meeting.executives) {
        const ai = this.aiExecutives.get(exec.id);
        if (ai) {
          const vote = ai.vote(item, votes);
          votes[exec.role] = vote.option;

          this.addMessage({
            id: `msg-${Date.now()}-${exec.id}-vote`,
            meetingId: this.meeting.id,
            authorId: exec.id,
            authorName: exec.name,
            authorRole: exec.role,
            authorAvatar: exec.avatar,
            content: `我投 **${vote.option}**。${vote.reasoning}`,
            timestamp: Date.now(),
            type: 'vote',
            mentions: [],
          });

          await this.delay(1000);
        }
      }

      // Count votes
      const voteCounts: { [key: string]: number } = {};
      Object.values(votes).forEach(v => {
        voteCounts[v] = (voteCounts[v] || 0) + 1;
      });

      const winner = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];
      const passed = winner[1] >= 2; // Majority (2 out of 4)

      const decision: Decision = {
        itemId: item.id,
        title: item.title,
        chosenOption: winner[0],
        votes,
        passed,
        executed: false,
      };

      this.meeting.decisions.push(decision);

      this.addSystemMessage(
        passed
          ? `✅ 决议通过: ${winner[0]} (${winner[1]}票)`
          : `❌ 决议未通过: ${winner[0]} (${winner[1]}票)`
      );

      await this.delay(1500);
    }

    this.addSystemMessage('✅ 所有议题投票完成，进入执行阶段');
    await this.delay(2000);
    this.transitionTo('executing');
  }

  // Phase 4: Executing
  private async runExecutingPhase() {
    this.addSystemMessage('⚙️ 执行阶段');

    for (const decision of this.meeting.decisions) {
      if (!decision.passed) continue;

      this.addSystemMessage(`执行: ${decision.title} → ${decision.chosenOption}`);

      // Simulate execution result
      const result = this.simulateExecution(decision);
      decision.executed = true;
      decision.result = result;

      await this.delay(1500);
    }

    this.addSystemMessage('✅ 所有决策执行完毕');
    await this.delay(2000);
    this.transitionTo('feedback');
  }

  // Simulate execution result
  private simulateExecution(decision: Decision): ExecutionResult {
    // Simple simulation: 80% success rate
    const success = Math.random() > 0.2;

    return {
      success,
      actualImpact: {
        cash: success ? -100000 : -50000,
        valuation: success ? 500000 : 100000,
        marketShare: success ? 2 : 0.5,
        morale: success ? 5 : -5,
      },
      unexpectedEvents: success
        ? ['执行效果超预期']
        : ['执行遇到阻力', '成本超预算10%'],
    };
  }

  // Phase 5: Feedback
  private async runFeedbackPhase() {
    this.addSystemMessage('📊 结果反馈阶段');

    for (const decision of this.meeting.decisions) {
      if (!decision.executed || !decision.result) continue;

      const exec = this.meeting.executives.find(e => e.role === 'ceo');
      if (exec) {
        this.addMessage({
          id: `msg-${Date.now()}-feedback`,
          meetingId: this.meeting.id,
          authorId: exec.id,
          authorName: exec.name,
          authorRole: exec.role,
          authorAvatar: exec.avatar,
          content: decision.result.success
            ? `✅ ${decision.title}执行成功！估值+${decision.result.actualImpact.valuation / 10000}万`
            : `⚠️ ${decision.title}执行遇到问题，需要下季度调整。`,
          timestamp: Date.now(),
          type: 'statement',
          mentions: [],
        });
      }
    }

    this.addSystemMessage('📅 董事会会议结束');
    this.meeting.endedAt = Date.now();
  }

  // Add message to meeting
  private addMessage(message: BoardMessage) {
    this.meeting.messages.push(message);
    this.onMessage(message);
  }

  // Add system message
  private addSystemMessage(content: string) {
    this.addMessage({
      id: `system-${Date.now()}`,
      meetingId: this.meeting.id,
      authorId: 'system',
      authorName: 'System',
      authorRole: 'ceo',
      authorAvatar: '🤖',
      content,
      timestamp: Date.now(),
      type: 'system',
      mentions: [],
    });
  }

  // Utility delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
