"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, Briefcase, Clock, MapPin, Building2, Calendar } from "lucide-react";
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
  deadline?: string;
  status: string;
  isRemote: boolean;
  locationRequirements?: string;
  skillsRequired: any[];
  tags: string[];
  viewsCount: number;
  applicationsCount: number;
  createdAt: string;
  employer?: {
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  applications?: any[];
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["job", params.id],
    queryFn: () => jobsAPI.get(params.id),
  });

  const job: Job | undefined = data?.job;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="h-48 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Job not found</h1>
            <Link href="/jobs" className="text-primary-600 hover:underline">
              Back to jobs
            </Link>
          </div>
        </main>
      </>
    );
  }

  const formatBudget = () => {
    if (job.budgetMin && job.budgetMax) {
      return `$${job.budgetMin.toLocaleString()} - $${job.budgetMax.toLocaleString()}`;
    }
    return job.budgetMin ? `$${job.budgetMin.toLocaleString()}+` : "Budget TBD";
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/jobs" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to jobs
          </Link>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {job.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {job.employer && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.employer.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Posted {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {job.status}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {job.jobType.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                  </section>

                  {job.skillsRequired?.length > 0 && (
                    <section>
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {job.skillsRequired.map((skill: any, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm"
                          >
                            {typeof skill === "string" ? skill : skill.name}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {job.tags?.length > 0 && (
                    <section>
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">Tags</h2>
                      <div className="flex flex-wrap gap-2">
                        {job.tags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-gray-500 text-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Job Details</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Budget</p>
                          <p className="font-medium text-gray-900">{formatBudget()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Type</p>
                          <p className="font-medium text-gray-900 capitalize">
                            {job.jobType.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Difficulty</p>
                          <p className="font-medium text-gray-900 capitalize">
                            {job.difficulty}
                          </p>
                        </div>
                      </div>

                      {job.estimatedHours && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Est. Hours</p>
                            <p className="font-medium text-gray-900">{job.estimatedHours}h</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="font-medium text-gray-900">
                            {job.isRemote ? "Remote" : job.locationRequirements}
                          </p>
                        </div>
                      </div>

                      {job.deadline && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Deadline</p>
                            <p className="font-medium text-gray-900">
                              {new Date(job.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-gray-500">Views</span>
                      <span className="font-medium">{job.viewsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Applications</span>
                      <span className="font-medium">{job.applicationsCount}</span>
                    </div>
                  </div>

                  <button className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
