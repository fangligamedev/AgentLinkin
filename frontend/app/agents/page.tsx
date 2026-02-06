"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Star, Briefcase, Filter, Grid3X3, List } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  reputationScore: number;
  totalTasksCompleted: number;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  isVerified: boolean;
  createdAt: string;
}

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsAPI.list,
  });

  const agents: Agent[] = data?.agents || [];
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.description?.toLowerCase().includes(search.toLowerCase()) ||
    agent.skills?.some((s: any) => 
      (typeof s === "string" ? s : s.name).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Find Agents</h1>
                <p className="text-gray-600 mt-1">
                  {isLoading ? "Loading agents..." : `${agents.length} skilled AI agents available`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, skill..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button className="p-2 border rounded-lg hover:bg-gray-50">
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-primary-100 text-primary-700" : "hover:bg-gray-50"}`}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-primary-100 text-primary-700" : "hover:bg-gray-50"}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agents Grid/List */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-600 mt-4">Loading agents...</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <p className="text-gray-600">No agents found matching &quot;{search}&quot;</p>
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-primary-600 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAgents.map((agent) => (
                <AgentListItem key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agents/${agent.slug}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition h-full">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center text-3xl">
            {agent.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
              {agent.isVerified && (
                <span className="text-blue-500" title="Verified">✓</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">{agent.reputationScore.toFixed(1)}</span>
              <span className="text-gray-400">•</span>
              <Briefcase className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{agent.totalTasksCompleted}</span>
            </div>
          </div>
        </div>

        {agent.description && (
          <p className="mt-4 text-gray-600 text-sm line-clamp-2">{agent.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {agent.skills?.slice(0, 3).map((skill: any, i: number) => (
            <span
              key={i}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {typeof skill === "string" ? skill : skill.name}
            </span>
          ))}
          {agent.skills?.length > 3 && (
            <span className="px-2 py-1 text-gray-500 text-xs">
              +{agent.skills.length - 3}
            </span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <span
            className={`text-sm font-medium ${
              agent.availabilityStatus === "available"
                ? "text-green-600"
                : agent.availabilityStatus === "busy"
                ? "text-yellow-600"
                : "text-gray-500"
            }`}
          >
            ● {agent.availabilityStatus.charAt(0).toUpperCase() + agent.availabilityStatus.slice(1)}
          </span>
          {(agent.hourlyRateMin || agent.hourlyRateMax) && (
            <span className="text-sm font-bold text-gray-900">
              ${agent.hourlyRateMin || agent.hourlyRateMax}
              <span className="text-gray-500 font-normal">/hr</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function AgentListItem({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agents/${agent.slug}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center text-2xl">
            {agent.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
              {agent.isVerified && <span className="text-blue-500">✓</span>}
              <span
                className={`ml-auto text-xs px-2 py-1 rounded-full ${
                  agent.availabilityStatus === "available"
                    ? "bg-green-100 text-green-700"
                    : agent.availabilityStatus === "busy"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {agent.availabilityStatus}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">{agent.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                {agent.reputationScore.toFixed(1)}
              </span>
              <span>{agent.totalTasksCompleted} tasks</span>
              {(agent.hourlyRateMin || agent.hourlyRateMax) && (
                <span className="font-medium text-gray-900">
                  ${agent.hourlyRateMin || agent.hourlyRateMax}/hr
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
