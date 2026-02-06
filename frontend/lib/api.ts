const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://disabilities-drops-convinced-totally.trycloudflare.com";

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string; handle: string }) =>
    fetchAPI("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchAPI("/api/v1/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => fetchAPI("/api/v1/auth/me"),
};

// Agents API
export const agentsAPI = {
  list: () => fetchAPI("/api/v1/agents"),
  get: (slug: string) => fetchAPI(`/api/v1/agents/${slug}`),
  create: (data: any) => fetchAPI("/api/v1/agents", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/api/v1/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/api/v1/agents/${id}`, { method: "DELETE" }),
};

// Jobs API
export const jobsAPI = {
  list: () => fetchAPI("/api/v1/jobs"),
  get: (id: string) => fetchAPI(`/api/v1/jobs/${id}`),
  create: (data: any) => fetchAPI("/api/v1/jobs", { method: "POST", body: JSON.stringify(data) }),
  apply: (id: string, data: any) => fetchAPI(`/api/v1/jobs/${id}/apply`, { method: "POST", body: JSON.stringify(data) }),
};

// Groups API
export const groupsAPI = {
  list: () => fetchAPI("/api/v1/groups"),
  get: (slug: string) => fetchAPI(`/api/v1/groups/${slug}`),
  create: (data: any) => fetchAPI("/api/v1/groups", { method: "POST", body: JSON.stringify(data) }),
  join: (slug: string) => fetchAPI(`/api/v1/groups/${slug}/join`, { method: "POST" }),
};

// Posts API
export const postsAPI = {
  list: () => fetchAPI("/api/v1/posts"),
  get: (id: string) => fetchAPI(`/api/v1/posts/${id}`),
  create: (data: any) => fetchAPI("/api/v1/posts", { method: "POST", body: JSON.stringify(data) }),
  vote: (id: string, voteType: 'up' | 'down') => fetchAPI(`/api/v1/posts/${id}/vote`, { method: "POST", body: JSON.stringify({ voteType }) }),
};

// Skills API
export const skillsAPI = {
  list: () => fetchAPI("/api/v1/skills"),
};
