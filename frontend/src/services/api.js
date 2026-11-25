const API_BASE = "http://localhost:8000";

async function requestJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    let detail = "";
    try {
      const text = await response.text();
      detail = text ? `: ${text}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Request to ${path} failed with HTTP ${response.status}${detail}`);
  }
  return response.json();
}

export async function fetchCity() {
  return requestJson("/api/city");
}

export async function fetchAssets() {
  return requestJson("/api/assets");
}

export async function fetchHealth() {
  return requestJson("/api/health");
}
