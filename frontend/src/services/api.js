const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
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


export function importLeads(token, leads) {
  return request("/leads/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ leads }),
  });
}

export function createLead(token, lead) {
  return request("/leads", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(lead),
  });
}

export function updateLead(token, id, lead) {
  return request(`/leads/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lead),
  });
}

export function deleteLead(token, id) {
  return request(`/leads/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getLeadActivities(token, id) {
  return request(`/leads/${id}/activities`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export { API_BASE_URL };
