const FONT = "Manrope, sans-serif";

export const CHART_COLORS = ["#1b5e4a", "#4f9b78", "#b98a2f", "#8a5a44", "#68746e"];

export const chartFont = { family: FONT, size: 12 };

const HOVER = {
  bgcolor: "#14171a",
  bordercolor: "#14171a",
  font: { family: FONT, color: "#ffffff", size: 13 },
};

function axes(extraAxis) {
  const defaults = {
    gridcolor: "rgba(22,26,23,0.06)",
    zerolinecolor: "rgba(22,26,23,0.12)",
    tickfont: chartFont,
  };
  return extraAxis ? { ...defaults, ...extraAxis } : defaults;
}

export function baseLayout(extra = {}) {
  const { xaxis, yaxis, ...rest } = extra;
  return {
    paper_bgcolor: "transparent",
    plot_bgcolor: "#fbfaf7",
    font: { ...chartFont, color: "#6b766e" },
    margin: { l: 56, r: 18, t: 18, b: 48 },
    colorway: CHART_COLORS,
    hoverlabel: HOVER,
    xaxis: axes(xaxis),
    yaxis: axes(yaxis),
    ...rest,
  };
}

export function polarLayout(extra = {}) {
  const { polar, ...rest } = extra;
  return {
    paper_bgcolor: "transparent",
    font: { ...chartFont, color: "#6b766e" },
    margin: { l: 50, r: 50, t: 30, b: 30 },
    colorway: CHART_COLORS,
    hoverlabel: HOVER,
    polar: {
      bgcolor: "#fbfaf7",
      radialaxis: { range: [0, 100], gridcolor: "rgba(22,26,23,0.08)", tickfont: { size: 10 } },
      angularaxis: { gridcolor: "rgba(22,26,23,0.08)", tickfont: { size: 11 } },
      ...(polar ?? {}),
    },
    showlegend: true,
    legend: { orientation: "h", y: -0.12, font: { size: 11.5 } },
    ...rest,
  };
}

export const plotConfig = { responsive: true, displayModeBar: false };
