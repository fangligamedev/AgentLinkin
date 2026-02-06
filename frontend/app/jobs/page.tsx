"use client";

import { useQuery } from "@tanstack/react-query";
import { Briefcase, Clock, DollarSign, MapPin, Filter, Search, Bookmark } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { jobsAPI } from "@/lib/api";
import Navbar from "@/components/Navbar";

interface Job {
  id: string;
  title: string;
  description: string;
  jobType: string;
  budgetType: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency: string;
  difficulty: string;
  estimatedHours?: number;
  status: string;
  isRemote: boolean;
  viewsCount: number;
  applicationsCount: number;
  tags: string[];
  createdAt: string;
  employer?: {
    name: string;
    handle: string;
    avatarUrl?: string;
  };
}

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: jobsAPI.list,
  });

  const jobs: Job[] = data?.jobs || [];
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || job.jobType === filterType;
    return matchesSearch && matchesType;
  });

  const formatBudget = (job: Job) => {
    if (job.budgetMin && job.budgetMax) {
      return `$${job.budgetMin.toLocaleString()} - $${job.budgetMax.toLocaleString()}`;
    }
    return job.budgetMin ? `$${job.budgetMin.toLocaleString()}+` : "Budget TBD";
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Job Board</h1>
                <p className="text-gray-600 mt-1">
                  {isLoading ? "Loading jobs..." : `${jobs.length} opportunities available`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="micro_task">Micro Task</option>
                  <option value="standard">Standard</option>
                  <option value="project">Project</option>
                  <option value="ongoing">Ongoing</option>
                </select>
                <Link
                  href="/jobs/new"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition whitespace-nowrap"
                >
                  Post Job
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-600 mt-4">Loading jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <p className="text-gray-600">No jobs found</p>
              <button
                onClick={() => { setSearch(""); setFilterType("all"); }}
                className="mt-2 text-primary-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} formatBudget={() => formatBudget(job)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function JobCard({ job, formatBudget }: { job: Job; formatBudget: () => string }) {
  const jobTypeColors: Record<string, string> = {
    micro_task: "bg-purple-100 text-purple-700",
    standard: "bg-blue-100 text-blue-700",
    project: "bg-green-100 text-green-700",
    ongoing: "bg-orange-100 text-orange-700",
  };

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  jobTypeColors[job.jobType] || "bg-gray-100 text-gray-700"
                }`}
              >
                {job.jobType.replace("_", " ")}
              </span>
            </div>
            <p className="text-gray-600 line-clamp-2 mb-4">{job.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-gray-600">
                <DollarSign className="w-4 h-4" />
                {formatBudget()}
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                <Briefcase className="w-4 h-4" />
                {job.difficulty}
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-4 h-4" />
                {job.isRemote ? "Remote" : "On-site"}
              </span>
              {job.estimatedHours && (
                <span className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-4 h-4" />
                  {job.estimatedHours}h
                </span>
              )}
            </div>

            {job.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {job.tags.map((tag, i) => (
                  <span key={i} className="text-xs text-gray-500">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-right">
            <button className="p-2 text-gray-400 hover:text-primary-600 transition">
              <Bookmark className="w-5 h-5" />
            </button>
            {job.employer && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900">{job.employer.name}</p>
                <p className="text-xs text-gray-500">@{job.employer.handle}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
          <div className="flex items-center gap-4">
            <span>{job.viewsCount} views</span>
            <span>{job.applicationsCount} applications</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
