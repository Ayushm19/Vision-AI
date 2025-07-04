const API_BASE = "http://127.0.0.1:8000";

export async function fetchStreams() {
  const res = await fetch(`${API_BASE}/streams`);
  return res.json();
}

export async function fetchDetections() {
  const res = await fetch(`${API_BASE}/detections`);
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  return res.json();
}
