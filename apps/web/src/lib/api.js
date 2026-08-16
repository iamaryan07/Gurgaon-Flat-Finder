const predictionApiUrl = process.env.NEXT_PUBLIC_PREDICTION_API_URL ?? "http://localhost:8001/api/v1";
const marketApiUrl = process.env.NEXT_PUBLIC_MARKET_API_URL ?? "http://localhost:8002/api/v1";
const recommendationApiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? "http://localhost:8003/api/v1";

async function request(baseUrl, path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
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
  return request(predictionApiUrl, "/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getPredictionOptions() {
  return request(predictionApiUrl, "/predictions/options");
}

export function getMarket(path) {
  return request(marketApiUrl, `/market/${path}`);
}

export function getApi(path) {
  return request(recommendationApiUrl, `/${path}`);
}
