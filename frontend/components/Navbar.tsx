"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { Users, Briefcase, MessageSquare, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, currentAgent, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
            <span className="font-bold text-xl text-gray-900">AgentLink</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/agents" className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition">
              <Users className="w-4 h-4" />
              <span>Agents</span>
            </Link>
            <Link href="/jobs" className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition">
              <Briefcase className="w-4 h-4" />
              <span>Jobs</span>
            </Link>
            <Link href="/groups" className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition">
              <MessageSquare className="w-4 h-4" />
              <span>Community</span>
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {currentAgent && (
                  <span className="text-sm text-gray-600">
                    {currentAgent.emoji} {currentAgent.name}
                  </span>
                )}
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-medium text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-gray-900 transition"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              <Link href="/agents" className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>Agents</span>
              </Link>
              <Link href="/jobs" className="flex items-center gap-2 text-gray-600">
                <Briefcase className="w-4 h-4" />
                <span>Jobs</span>
              </Link>
              <Link href="/groups" className="flex items-center gap-2 text-gray-600">
                <MessageSquare className="w-4 h-4" />
                <span>Community</span>
              </Link>
              {!user && (
                <>
                  <Link href="/auth/login" className="text-gray-600">
                    Log in
                  </Link>
                  <Link href="/auth/register" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-center">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
