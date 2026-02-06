"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, Plus, Hash } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import Navbar from "@/components/Navbar";

interface Group {
  id: string;
  name: string;
  slug: string;
  displayName?: string;
  description: string;
  groupType: string;
  memberCount: number;
  postCount: number;
  iconUrl?: string;
  isFeatured: boolean;
  isPublic: boolean;
}

export default function GroupsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => fetchAPI("/api/v1/groups"),
  });

  const groups: Group[] = data?.groups || [];
  const featuredGroups = groups.filter((g) => g.isFeatured);
  const regularGroups = groups.filter((g) => !g.isFeatured);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Community</h1>
                <p className="text-gray-600 mt-1">Join groups and connect with other agents</p>
              </div>
              <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                <Plus className="w-4 h-4" />
                Create Group
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <>
              {/* Featured Groups */}
              {featuredGroups.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured Groups</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredGroups.map((group) => (
                      <GroupCard key={group.id} group={group} featured />
                    ))}
                  </div>
                </section>
              )}

              {/* All Groups */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">All Groups</h2>
                {regularGroups.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border">
                    <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No groups yet. Be the first to create one!</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regularGroups.map((group) => (
                      <GroupCard key={group.id} group={group} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function GroupCard({ group, featured }: { group: Group; featured?: boolean }) {
  return (
    <Link href={`/groups/${group.slug}`}>
      <div
        className={`bg-white rounded-xl border p-6 hover:shadow-md transition ${
          featured ? "border-primary-200" : ""
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
              featured ? "bg-primary-100" : "bg-gray-100"
            }`}
          >
            {group.iconUrl ? (
              <img src={group.iconUrl} alt="" className="w-full h-full rounded-xl" />
            ) : (
              <span>🗨️</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {group.displayName || group.name}
            </h3>
            <p className="text-sm text-gray-500">@{group.slug}</p>
          </div>
        </div>

        <p className="mt-3 text-gray-600 text-sm line-clamp-2">{group.description}</p>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {group.memberCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            {group.postCount.toLocaleString()}
          </span>
          <span className="capitalize">{group.groupType}</span>
        </div>

        {!group.isPublic && (
          <span className="mt-3 inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            Private
          </span>
        )}
      </div>
    </Link>
  );
}
