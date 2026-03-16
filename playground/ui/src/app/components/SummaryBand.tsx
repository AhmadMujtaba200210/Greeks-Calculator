import { ArrowDown, ArrowUp, Gauge, Sigma } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlaygroundComputed, PlaygroundParams } from "@/lib/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatSigned(value: number, digits = 4) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function metricTone(value: number, negativeIsGood = false) {
  if (value === 0) return "text-slate-700";
  if (negativeIsGood) return value < 0 ? "text-emerald-700" : "text-amber-700";
  return value > 0 ? "text-blue-700" : "text-rose-700";
}

function GreekTile({
  title,
  value,
  caption,
  tone,
  testId,
}: {
  title: string;
  value: string;
  caption: string;
  tone: string;
  testId: string;
}) {
  return (
    <Card className="pg-panel shadow-sm" data-testid={testId}>
      <CardContent className="space-y-1.5 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <Sigma className="h-3.5 w-3.5 text-muted-foreground/70" />
        </div>
        <p className={`pg-metric-value text-lg font-semibold leading-none ${tone}`}>{value}</p>
        <p className="text-[13px] leading-5 text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

type SummaryBandProps = {
  computed: PlaygroundComputed;
  params: PlaygroundParams;
};

export default function SummaryBand({ computed, params }: SummaryBandProps) {
  return (
    <div className="space-y-3" data-testid="playground-summary-band">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.34fr)_repeat(3,minmax(0,1fr))]">
        <Card className="pg-hero-panel shadow-sm" data-testid="metric-fair-value">
          <CardHeader className="p-4 pb-1.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardDescription>Fair Value</CardDescription>
                <CardTitle className="mt-2.5 pg-metric-value text-2xl font-semibold leading-none text-slate-950 sm:text-[2rem]">
                  {formatCurrency(computed.price)}
                </CardTitle>
              </div>
              <Badge variant="secondary">{computed.modelLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="pg-stat-strip grid gap-2.5 sm:grid-cols-3">
              <div className="pg-stat-cell">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Spot / Strike</p>
                <p className="mt-1.5 pg-metric-value text-sm font-semibold">
                  {params.spot.toFixed(0)} / {params.strike.toFixed(0)}
                </p>
              </div>
              <div className="pg-stat-cell">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Carry</p>
                <p className="mt-1.5 pg-metric-value text-sm font-semibold">
                  {((params.rate - params.dividend) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="pg-stat-cell">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Risk posture</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold leading-tight text-slate-900">
                  <Gauge className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {computed.advice?.title ?? "Neutral"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pg-panel shadow-sm" data-testid="metric-intrinsic">
          <CardContent className="space-y-1.5 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Intrinsic</p>
            <p className="pg-metric-value text-xl font-semibold text-emerald-700">{formatCurrency(computed.intrinsicValue)}</p>
            <p className="text-[13px] leading-5 text-muted-foreground">Exercise value now</p>
          </CardContent>
        </Card>

        <Card className="pg-panel shadow-sm" data-testid="metric-extrinsic">
          <CardContent className="space-y-1.5 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Extrinsic</p>
            <p className={`pg-metric-value text-xl font-semibold ${metricTone(computed.timeValue)}`}>
              {formatCurrency(computed.timeValue)}
            </p>
            <p className="text-[13px] leading-5 text-muted-foreground">Time/volatility premium</p>
          </CardContent>
        </Card>

        <Card className="pg-panel shadow-sm" data-testid="metric-moneyness">
          <CardContent className="space-y-1.5 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Moneyness</p>
              {computed.moneynessPct >= 100 ? (
                <ArrowUp className="h-3.5 w-3.5 text-blue-700" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-amber-600" />
              )}
            </div>
            <p className="pg-metric-value text-xl font-semibold text-blue-700">{computed.moneynessPct.toFixed(1)}%</p>
            <p className="text-[13px] leading-5 text-muted-foreground">Spot vs strike</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <GreekTile title="Delta" value={formatSigned(computed.delta)} caption="Directional sensitivity" tone={metricTone(computed.delta)} testId="metric-delta" />
        <GreekTile title="Gamma" value={formatSigned(computed.gamma)} caption="Delta acceleration" tone={metricTone(computed.gamma)} testId="metric-gamma" />
        <GreekTile title="Vega" value={formatSigned(computed.vega)} caption="IV sensitivity" tone={metricTone(computed.vega)} testId="metric-vega" />
        <GreekTile title="Theta" value={formatSigned(computed.theta)} caption="Daily decay" tone={metricTone(computed.theta, true)} testId="metric-theta" />
        <GreekTile title="Rho" value={formatSigned(computed.rho)} caption="Rate sensitivity" tone={metricTone(computed.rho)} testId="metric-rho" />
      </div>
    </div>
  );
}
