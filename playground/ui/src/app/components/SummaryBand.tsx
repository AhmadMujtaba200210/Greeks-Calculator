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

function GreekCell({
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
    <div className="pg-greek-cell space-y-1.5 bg-white/88 p-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
        <Sigma className="h-3 w-3 text-muted-foreground/70" />
      </div>
      <p className={`pg-metric-value text-[1rem] font-semibold leading-none sm:text-[1.0625rem] ${tone}`}>{value}</p>
      <p className="text-[11px] leading-4 text-muted-foreground">{caption}</p>
    </div>
  );
}

type SummaryBandProps = {
  computed: PlaygroundComputed;
  params: PlaygroundParams;
};

export default function SummaryBand({ computed, params }: SummaryBandProps) {
  return (
    <div className="space-y-2.5" data-testid="playground-summary-band">
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.08fr)_repeat(3,minmax(0,0.8fr))]" data-testid="playground-summary-mini-group">
        <Card className="pg-hero-panel pg-summary-hero shadow-sm" data-testid="metric-fair-value">
          <CardHeader className="p-3 pb-1.5 sm:p-3.5 sm:pb-1.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardDescription>Fair Value</CardDescription>
                <CardTitle
                  className="mt-1.5 pg-metric-value text-[2rem] font-semibold leading-none text-slate-950 sm:text-[2.125rem]"
                  data-testid="playground-summary-hero-cell"
                >
                  {formatCurrency(computed.price)}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{computed.modelLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-3.5 sm:pt-0">
            <div className="pg-stat-strip grid gap-2 sm:grid-cols-3">
              <div className="pg-stat-cell">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Spot / Strike</p>
                <p className="mt-1 pg-metric-value text-[13px] font-semibold leading-tight">
                  {params.spot.toFixed(0)} / {params.strike.toFixed(0)}
                </p>
              </div>
              <div className="pg-stat-cell">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Carry</p>
                <p className="mt-1 pg-metric-value text-[13px] font-semibold leading-tight">
                  {((params.rate - params.dividend) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="pg-stat-cell">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Desk signal</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold leading-tight text-slate-900">
                  <Gauge className="h-3 w-3 shrink-0 text-primary" />
                  {computed.advice?.title ?? "Neutral"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pg-panel pg-summary-mini shadow-sm" data-testid="metric-intrinsic">
          <CardContent className="space-y-1 p-3 sm:p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Intrinsic</p>
            <p className="pg-metric-value text-[1.45rem] font-semibold leading-none text-emerald-700 sm:text-[1.55rem]">{formatCurrency(computed.intrinsicValue)}</p>
            <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Exercise value now</p>
          </CardContent>
        </Card>

        <Card className="pg-panel pg-summary-mini shadow-sm" data-testid="metric-extrinsic">
          <CardContent className="space-y-1 p-3 sm:p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Extrinsic</p>
            <p className={`pg-metric-value text-[1.45rem] font-semibold leading-none sm:text-[1.55rem] ${metricTone(computed.timeValue)}`}>
              {formatCurrency(computed.timeValue)}
            </p>
            <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Time/vol premium</p>
          </CardContent>
        </Card>

        <Card className="pg-panel pg-summary-mini shadow-sm" data-testid="metric-moneyness">
          <CardContent className="space-y-1 p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Moneyness</p>
              {computed.moneynessPct >= 100 ? (
                <ArrowUp className="h-3 w-3 text-blue-700" />
              ) : (
                <ArrowDown className="h-3 w-3 text-amber-600" />
              )}
            </div>
            <p className="pg-metric-value text-[1.45rem] font-semibold leading-none text-blue-700 sm:text-[1.55rem]">{computed.moneynessPct.toFixed(1)}%</p>
            <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Spot vs strike</p>
          </CardContent>
        </Card>
      </div>

      <Card className="pg-panel shadow-sm" data-testid="playground-greeks-strip">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 gap-px bg-border/70 lg:grid-cols-3 xl:grid-cols-5">
            <GreekCell title="Delta" value={formatSigned(computed.delta)} caption="Directional sensitivity" tone={metricTone(computed.delta)} testId="metric-delta" />
            <GreekCell title="Gamma" value={formatSigned(computed.gamma)} caption="Delta acceleration" tone={metricTone(computed.gamma)} testId="metric-gamma" />
            <GreekCell title="Vega" value={formatSigned(computed.vega)} caption="IV sensitivity" tone={metricTone(computed.vega)} testId="metric-vega" />
            <GreekCell title="Theta" value={formatSigned(computed.theta)} caption="Daily decay" tone={metricTone(computed.theta, true)} testId="metric-theta" />
            <GreekCell title="Rho" value={formatSigned(computed.rho)} caption="Rate sensitivity" tone={metricTone(computed.rho)} testId="metric-rho" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
