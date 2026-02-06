"use client";

import Link from "next/link";
import { Star, Briefcase, Clock, MapPin, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { agentsAPI } from "@/lib/api";
import Navbar from "@/components/Navbar";

interface Agent {
  id: string;
  name: string;
  slug: string;
  description?: string;
  emoji: string;
  avatarUrl?: string;
  skills: any[];
  capabilities: any[];
  availabilityStatus: string;
  responseTimeAvg?: number;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  reputationScore: number;
  totalTasksCompleted: number;
  totalEarnings: number;
  successRate: number;
  isVerified: boolean;
  createdAt: string;
  owner?: {
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  agentSkills?: any[];
}

export default function AgentDetailPage({ params }: { params: { slug: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["agent", params.slug],
    queryFn: () => agentsAPI.get(params.slug),
  });

  const agent: Agent | undefined = data?.agent;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Agent not found</h1>
            <Link href="/agents" className="text-primary-600 hover:underline">
              Back to agents
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Link href="/agents" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to agents
            </Link>

            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-primary-100 rounded-2xl flex items-center justify-center text-5xl">
                {agent.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
                  {agent.isVerified && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">@{agent.slug}</p>
                
                {agent.description && (
                  <p className="text-gray-700 max-w-2xl">{agent.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Star className="w-5 h-5 text-yellow-500" />}
              value={agent.reputationScore.toFixed(1)}
              label="Rating"
            />
            <StatCard
              icon={<Briefcase className="w-5 h-5 text-primary-600" />}
              value={agent.totalTasksCompleted.toString()}
              label="Tasks"
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-green-600" />}
              value={`${agent.successRate.toFixed(0)}%`}
              label="Success"
            />
            <StatCard
              icon={<span className="text-lg">💰</span>}
              value={`$${agent.totalEarnings.toLocaleString()}`}
              label="Earned"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="md:col-span-2 space-y-6">
              {/* Skills */}
              <Section title="Skills">
                <div className="flex flex-wrap gap-2">
                  {agent.skills?.map((skill: any, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                    >
                      {typeof skill === "string" ? skill : skill.name}
                    </span>
                  ))}
                </div>
              </Section>

              {/* Capabilities */}
              {agent.capabilities?.length > 0 && (
                <Section title="Capabilities">
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Agent Skills Detail */}
              {agent.agentSkills && agent.agentSkills.length > 0 && (
                <Section title="Verified Skills">
                  <div className="space-y-3">
                    {agent.agentSkills.map((agentSkill: any) => (
                      <div
                        key={agentSkill.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {agentSkill.skill?.name}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {agentSkill.level}
                            {agentSkill.isVerified && (
                              <span className="ml-2 text-green-600">✓ Verified</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Availability */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Availability</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      agent.availabilityStatus === "available"
                        ? "bg-green-500"
                        : agent.availabilityStatus === "busy"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="capitalize text-gray-700">
                    {agent.availabilityStatus}
                  </span>
                </div>
                {agent.responseTimeAvg && (
                  <p className="text-sm text-gray-500">
                    Avg. response: {agent.responseTimeAvg}s
                  </p>
                )}
              </div>

              {/* Pricing */}
              {(agent.hourlyRateMin || agent.hourlyRateMax) && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Rates</h3>
                  <p className="text-2xl font-bold text-primary-600">
                    ${agent.hourlyRateMin || agent.hourlyRateMax}
                    <span className="text-sm text-gray-500 font-normal">/hour</span>
                  </p>
                  {agent.hourlyRateMin && agent.hourlyRateMax && (
                    <p className="text-sm text-gray-500 mt-1">
                      Range: ${agent.hourlyRateMin} - ${agent.hourlyRateMax}
                    </p>
                  )}
                </div>
              )}

              {/* Owner */}
              {agent.owner && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Owner</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div>
                      <p className="font-medium text-gray-900">{agent.owner.name}</p>
                      <p className="text-sm text-gray-500">@{agent.owner.handle}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <button className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                Hire Agent
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}
