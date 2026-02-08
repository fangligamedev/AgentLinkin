# CorpSim Skill

> OpenClaw Skill for Company Simulation Game

## Description

CorpSim (Company Simulator) is a business strategy game where AI agents compete as CEOs in a simulated market. This skill provides one-command installation and management of the CorpSim game server.

## Requirements

- Node.js 18+
- npm or yarn
- Git

## Installation

```bash
# Via OpenClaw skill installer
openclaw skill install corpsim

# Or manual install
git clone https://github.com/fangligamedev/AgentLinkin.git ~/.openclaw/skills/corpsim
cd ~/.openclaw/skills/corpsim/corpsim-mvp
npm install
```

## Usage

### Start the game server
```bash
openclaw corpsim start
# or
cd ~/.openclaw/skills/corpsim/corpsim-mvp && npm run dev
```

### Open in browser
```
http://localhost:3003
```

### Configure your agent
Edit `~/.openclaw/skills/corpsim/corpsim-mvp/src/data/initialData.ts`:

```typescript
export const DEFAULT_COMPANY_CONFIGS = [
  {
    name: 'YourAgentName',      // Your agent name
    companyName: 'YourCorp',     // Your company name
    personality: 'innovative'    // aggressive | conservative | innovative
  }
];
```

### Add more companies
```typescript
// For N players, add N configs
export const DEFAULT_COMPANY_CONFIGS = [
  { name: 'Agent1', companyName: 'Corp1', personality: 'aggressive' },
  { name: 'Agent2', companyName: 'Corp2', personality: 'conservative' },
  { name: 'Agent3', companyName: 'Corp3', personality: 'innovative' },
  // Add more...
];
```

## Game Rules

### Round 1: Hiring
- Each CEO selects 1-2 engineers from 5 candidates
- Different personalities make different choices:
  - **Aggressive**: High salary for top talent
  - **Conservative**: Best value for money
  - **Innovative**: Potential over experience

### Round 2: Product
- Choose product direction:
  - **Features**: More functionality
  - **Performance**: Better stability
  - **Innovation**: Disruptive features

### Round 3: Market
- Set price ($50-$300/month)
- Set marketing budget ($0-$500K)
- Compete for market share

### Scoring
```
Market Score = Product×0.4 + Brand×0.3 + Price×0.2 + Channel×0.1
Final Score = Market×0.4 + Cash×0.3 + Team×0.2 + Decision×0.1
```

## API Endpoints

When running locally:

```
GET  /          - Game UI
GET  /api/state - Current game state
POST /api/reset - Reset game
```

## Customization

### Change port
Edit `package.json`:
```json
"scripts": {
  "dev": "next dev -p 3004"  // Change port
}
```

### Add custom events
Edit `src/utils/events.ts`:
```typescript
const EVENTS: RandomEvent[] = [
  {
    id: 'your-event',
    name: 'Your Event Name',
    description: 'What happens',
    bonus: { type: 'product', value: 20 }
  }
];
```

### Modify AI behavior
Edit `src/ai/ceoAgent.ts`:
```typescript
makeHiringDecision(candidates) {
  // Your custom logic
}
```

## Troubleshooting

### Port already in use
```bash
# Find and kill process
lsof -ti:3003 | xargs kill -9
# Or change port in package.json
```

### npm install fails
```bash
# Use yarn instead
yarn install

# Or clear cache
npm cache clean --force
npm install
```

## Links

- **GitHub**: https://github.com/fangligamedev/AgentLinkin
- **Branch**: feature/corp-simulator-slg
- **Online Demo**: https://nat-bits-applicant-rapidly.trycloudflare.com

## License

MIT

## Author

AgentLink Dev Team
