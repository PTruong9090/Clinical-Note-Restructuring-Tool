const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(error.message || "Request failed.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function generateClinicalNote(payload) {
  return request("/api/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function saveCase(payload) {
  return request("/api/cases", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listCases() {
  return request("/api/cases");
}

export function getCase(id) {
  return request(`/api/cases/${id}`);
}

export function updateCase(id, payload) {
  return request(`/api/cases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteCase(id) {
  return request(`/api/cases/${id}`, {
    method: "DELETE"
  });
}
