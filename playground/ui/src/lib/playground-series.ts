import type { PlaygroundParams } from "@/lib/types";
import { priceOption } from "@/lib/pricing-engine";

type ChartDataset = {
  type?: string;
  label: string;
  data: Array<number | { x: number; y: number }>;
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
  tension?: number;
  borderWidth?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  pointBackgroundColor?: string | string[];
  yAxisID?: string;
};

const chartPalette = {
  blue: "#2563eb",
  blueSoft: "rgba(37, 99, 235, 0.12)",
  emerald: "#10b981",
  emeraldSoft: "rgba(16, 185, 129, 0.12)",
  amber: "#d97706",
  amberSoft: "rgba(217, 119, 6, 0.12)",
  rose: "#dc2626",
  roseSoft: "rgba(220, 38, 38, 0.12)",
  slate: "#475569",
  violet: "#7c3aed",
};

async function calculateModelGreeksRange(params: PlaygroundParams, points = 44) {
  const spotMin = params.strike * 0.7;
  const spotMax = params.strike * 1.3;
  const step = (spotMax - spotMin) / (points - 1);
  const results: Array<{ spot: number; price: number; delta: number; gamma: number; vega: number }> = [];

  for (let index = 0; index < points; index += 1) {
    const spot = spotMin + index * step;
    const execution = await priceOption({ ...params, spot }, "chart");
    results.push({
      spot,
      price: execution.result.price,
      delta: execution.result.delta,
      gamma: execution.result.gamma,
      vega: execution.result.vega,
    });
  }

  return results;
}

async function calculateTimeDecayRange(params: PlaygroundParams, maxDays = 90) {
  const step = Math.max(1, Math.ceil(maxDays / 40));
  const results: Array<{ daysToExpiry: number; price: number }> = [];

  for (let days = maxDays; days >= 1; days -= step) {
    const maturity = Math.max(days / 365, 1 / 365);
    const execution = await priceOption({ ...params, maturity }, "chart");
    results.push({ daysToExpiry: days, price: execution.result.price });
  }

  return results;
}

export async function buildPriceSeries(params: PlaygroundParams) {
  const data = await calculateModelGreeksRange(params);
  return {
    labels: data.map((entry) => entry.spot.toFixed(0)),
    datasets: [
      {
        label: "Option Price",
        data: data.map((entry) => entry.price),
        borderColor: chartPalette.blue,
        backgroundColor: chartPalette.blueSoft,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
      },
    ] satisfies ChartDataset[],
    xTitle: "Spot Price",
    yTitle: "Option Price ($)",
  };
}

export async function buildGreeksSeries(params: PlaygroundParams) {
  const data = await calculateModelGreeksRange(params);
  return {
    labels: data.map((entry) => entry.spot.toFixed(0)),
    datasets: [
      {
        label: "Delta",
        data: data.map((entry) => entry.delta),
        borderColor: chartPalette.blue,
        borderWidth: 2,
        tension: 0.35,
      },
      {
        label: "Gamma (x10)",
        data: data.map((entry) => entry.gamma * 10),
        borderColor: chartPalette.emerald,
        borderWidth: 2,
        tension: 0.35,
      },
      {
        label: "Vega",
        data: data.map((entry) => entry.vega),
        borderColor: chartPalette.violet,
        borderWidth: 2,
        tension: 0.35,
      },
    ] satisfies ChartDataset[],
    xTitle: "Spot Price",
    yTitle: "Greek Value",
  };
}

export function buildVolatilitySeries(params: PlaygroundParams) {
  const strikes: string[] = [];
  const vols: number[] = [];

  for (let strike = params.strike * 0.7; strike <= params.strike * 1.3; strike += params.strike * 0.05) {
    const moneyness = Math.log(strike / params.strike);
    const vol = params.volatility + 0.1 * Math.abs(moneyness) + 0.05 * moneyness;
    strikes.push(strike.toFixed(0));
    vols.push(vol * 100);
  }

  return {
    labels: strikes,
    datasets: [
      {
        label: "Implied Volatility (%)",
        data: vols,
        borderColor: chartPalette.amber,
        backgroundColor: chartPalette.amberSoft,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
      },
    ] satisfies ChartDataset[],
    xTitle: "Strike Price",
    yTitle: "Implied Volatility (%)",
  };
}

export async function buildTimeDecaySeries(params: PlaygroundParams) {
  const data = await calculateTimeDecayRange(params);
  return {
    labels: data.map((entry) => entry.daysToExpiry),
    datasets: [
      {
        label: "Option Price",
        data: data.map((entry) => entry.price),
        borderColor: chartPalette.rose,
        backgroundColor: chartPalette.roseSoft,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
      },
    ] satisfies ChartDataset[],
    xTitle: "Days to Expiration",
    yTitle: "Option Price ($)",
    reverseX: true,
  };
}

export function buildComparisonSeries(comparison: any) {
  if (!comparison?.reference) {
    return {
      labels: ["Unavailable"],
      datasets: [
        {
          label: "Validation",
          data: [0],
          backgroundColor: chartPalette.slate,
          borderColor: chartPalette.slate,
          borderWidth: 1,
        },
      ] satisfies ChartDataset[],
      xTitle: "",
      yTitle: "",
    };
  }

  const labels = ["Price", "Delta x10", "Gamma x100", "Vega"];
  const reference = comparison.reference;
  const datasets: ChartDataset[] = [
    {
      label: "Black-Scholes",
      data: [reference.price, reference.delta * 10, reference.gamma * 100, reference.vega],
      backgroundColor: "rgba(37, 99, 235, 0.84)",
      borderColor: chartPalette.blue,
      borderWidth: 1,
    },
  ];

  const colors = [
    ["rgba(16, 185, 129, 0.84)", chartPalette.emerald],
    ["rgba(217, 119, 6, 0.84)", chartPalette.amber],
    ["rgba(124, 58, 237, 0.84)", chartPalette.violet],
  ] as const;

  comparison.models.forEach((model: any, index: number) => {
    const [backgroundColor, borderColor] = colors[index] ?? ["rgba(71, 85, 105, 0.84)", chartPalette.slate];
    datasets.push({
      label: model.name,
      data: [
        model.result.price,
        model.result.delta * 10,
        model.result.gamma * 100,
        model.result.vega,
      ],
      backgroundColor,
      borderColor,
      borderWidth: 1,
    });
  });

  return {
    labels,
    datasets,
    xTitle: "",
    yTitle: "Relative Output Level",
  };
}

export async function buildSurfaceGrid(params: PlaygroundParams) {
  const points = 24;
  const spotMin = params.strike * 0.5;
  const spotMax = params.strike * 1.5;
  const timeMin = 0.01;
  const timeMax = 2.0;
  const x: number[] = [];
  const y: number[] = [];
  const z: number[][] = [];

  const spotStep = (spotMax - spotMin) / (points - 1);
  const timeStep = (timeMax - timeMin) / (points - 1);

  for (let spotIndex = 0; spotIndex < points; spotIndex += 1) {
    x.push(Number((spotMin + spotIndex * spotStep).toFixed(3)));
  }

  for (let timeIndex = 0; timeIndex < points; timeIndex += 1) {
    const maturity = Number((timeMin + timeIndex * timeStep).toFixed(4));
    y.push(maturity);
    const row: number[] = [];

    for (const spot of x) {
      const execution = await priceOption({ ...params, spot, maturity }, "chart");
      row.push(execution.result.price);
    }

    z.push(row);
  }

  return { x, y, z };
}
