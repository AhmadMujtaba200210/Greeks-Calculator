import { useState } from "react";
import { ChevronDown, ChevronUp, GaugeCircle, RotateCcw, Sigma } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PlaygroundComputed, PlaygroundParams, PricingModelId } from "@/lib/types";
import DerivationsAccordion from "@/app/components/DerivationsAccordion";
import HealthHoverCard from "@/app/components/HealthHoverCard";
import ModelPicker from "@/app/components/ModelPicker";

type ControlRailProps = {
  params: PlaygroundParams;
  computed: PlaygroundComputed | null;
  onReset: () => void;
  onPricingModelChange: (value: PricingModelId) => void;
  onOptionTypeChange: (value: "call" | "put") => void;
  onNumericParamChange: (key: keyof PlaygroundParams, value: number) => void;
};

const primaryFields = [
  { key: "spot", label: "Spot", min: 1, max: 1000, step: 0.5, scale: 1, digits: 2 },
  { key: "strike", label: "Strike", min: 1, max: 1000, step: 0.5, scale: 1, digits: 2 },
  { key: "maturity", label: "Expiry (yrs)", min: 0.01, max: 10, step: 0.01, scale: 1, digits: 2 },
] as const;

const advancedFields = [
  { key: "volatility", label: "Volatility", min: 1, max: 500, step: 1, scale: 100, digits: 1, suffix: "%" },
  { key: "rate", label: "Rate", min: -5, max: 50, step: 0.1, scale: 100, digits: 1, suffix: "%" },
  { key: "dividend", label: "Dividend", min: 0, max: 50, step: 0.1, scale: 100, digits: 1, suffix: "%" },
] as const;

function FieldRow({
  field,
  params,
  onNumericParamChange,
}: {
  field: (typeof primaryFields)[number] | (typeof advancedFields)[number];
  params: PlaygroundParams;
  onNumericParamChange: (key: keyof PlaygroundParams, value: number) => void;
}) {
  const rawValue = params[field.key];
  const displayValue = rawValue * field.scale;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`pg-${field.key}`} className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {field.label}
        </Label>
        <span className="pg-metric-value text-[13px] text-foreground">
          {displayValue.toFixed(field.digits)}
          {field.suffix ?? ""}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
        <Slider
          id={`pg-${field.key}`}
          data-testid={`slider-${field.key}`}
          value={[displayValue]}
          min={field.min}
          max={field.max}
          step={field.step}
          onValueChange={([nextValue]) => onNumericParamChange(field.key, nextValue / field.scale)}
        />
        <Input
          data-testid={`input-${field.key}`}
          inputMode="decimal"
          className="h-9 rounded-[12px]"
          value={displayValue}
          onChange={(event) => {
            const nextValue = Number.parseFloat(event.target.value);
            if (Number.isFinite(nextValue)) onNumericParamChange(field.key, nextValue / field.scale);
          }}
        />
      </div>
    </div>
  );
}

export default function ControlRail({
  params,
  computed,
  onReset,
  onPricingModelChange,
  onOptionTypeChange,
  onNumericParamChange,
}: ControlRailProps) {
  const [showAdvancedMarket, setShowAdvancedMarket] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  return (
    <Card className="pg-side-panel shadow-sm" data-testid="playground-control-rail">
      <CardHeader className="border-b border-border/70 p-3 pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Scenario Rail</CardTitle>
            <CardDescription className="text-xs leading-[1.125rem]">Contract and market inputs.</CardDescription>
          </div>
          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={onReset} aria-label="Reset Playground">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 py-3">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Contract</p>
                <p className="mt-0.5 text-[12px] leading-[1.125rem] text-foreground">Switch stance and model quickly.</p>
              </div>
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{computed?.modelLabel ?? "Model"}</Badge>
            </div>
            <ToggleGroup type="single" value={params.optionType} onValueChange={(value) => value && onOptionTypeChange(value as "call" | "put")} className="grid grid-cols-2 gap-1.5">
              <ToggleGroupItem value="call" className="h-9 w-full text-[13px]">Call</ToggleGroupItem>
              <ToggleGroupItem value="put" className="h-9 w-full text-[13px]">Put</ToggleGroupItem>
            </ToggleGroup>
            <div className="space-y-1">
              <Label className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Pricing model</Label>
              <ModelPicker value={params.pricingModel} onChange={onPricingModelChange} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {primaryFields.map((field) => (
              <FieldRow key={field.key} field={field} params={params} onNumericParamChange={onNumericParamChange} />
            ))}
          </div>

          <Collapsible open={showAdvancedMarket} onOpenChange={setShowAdvancedMarket} className="rounded-[14px] border border-border/80 bg-muted/35 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Market Inputs</p>
                <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Volatility, rates, and carry.</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" aria-label="Toggle market inputs">
                  {showAdvancedMarket ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-2 space-y-3">
              {advancedFields.map((field) => (
                <FieldRow key={field.key} field={field} params={params} onNumericParamChange={onNumericParamChange} />
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics} className="rounded-[14px] border border-border/80 bg-white/80 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <GaugeCircle className="h-4 w-4 text-primary" />
                  Model & Diagnostics
                </p>
                <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Health and trust state.</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" aria-label="Toggle diagnostics">
                  {showDiagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-2 space-y-1.5">
              <HealthHoverCard
                label="Domain"
                status={computed?.health.domain ?? "warn"}
                description="Domain flags whether the selected model is being used inside a trustworthy region."
                compact
              />
              <HealthHoverCard
                label="Stability"
                status={computed?.health.stability ?? "warn"}
                description="Stability measures how closely the active model tracks the cross-model reference stack."
                compact
              />
              <HealthHoverCard
                label="Overall"
                status={computed?.health.overall ?? "warn"}
                description="Overall combines domain validity and reference agreement into a single desk signal."
                compact
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="rounded-[14px] border border-border/80 bg-muted/20 p-2.5">
            <div className="mb-1.5 flex items-center gap-2">
              <Sigma className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-semibold">Math</p>
            </div>
            <DerivationsAccordion />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
