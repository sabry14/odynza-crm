const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

export function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signup(full_name, email, password) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password }),
  });
}

export function getCurrentUser(token) {
  return request("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getLeads(token) {
  return request("/leads", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createLead(token, lead) {
  return fetch(`${API_BASE_URL}/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(lead),
  }).then(async (response) => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create lead");
    }

    return data;
  });
}

export { API_BASE_URL };
