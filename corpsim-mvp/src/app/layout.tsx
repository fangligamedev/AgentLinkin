// src/app/layout.tsx
export const metadata = {
  title: 'CorpSim MVP - Company Simulation Game',
  description: 'AI Agents competing in a simulated business world',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
