const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function request(path, options) {
  const response = await fetch(`${apiUrl}${path}`, options);
  if (!response.ok) {
    let detail;
    try {
      const body = await response.json();
      detail = body.detail ?? body.message;
    } catch {
      detail = null;
    }
    if (typeof detail === "string") throw new Error(detail);
    throw new Error("The request could not be completed.");
  }
  return response.json();
}

export function predictPrice(payload) {
  return request("/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getPredictionOptions() {
  return request("/predictions/options");
}

export function getMarket(path) {
  return request(`/market/${path}`);
}

export function getApi(path) {
  return request(`/${path}`);
}
