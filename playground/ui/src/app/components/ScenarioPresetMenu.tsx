import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlaygroundParams, ScenarioPresetId } from "@/lib/types";

type ScenarioPreset = {
  id: ScenarioPresetId;
  label: string;
  description: string;
  apply: (params: PlaygroundParams) => PlaygroundParams;
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "atm_call",
    label: "ATM Call",
    description: "Balanced call exposure around spot.",
    apply: (params) => ({ ...params, optionType: "call", spot: 100, strike: 100, maturity: 1, volatility: 0.25, rate: 0.05, dividend: 0 }),
  },
  {
    id: "atm_put",
    label: "ATM Put",
    description: "Balanced put hedge around spot.",
    apply: (params) => ({ ...params, optionType: "put", spot: 100, strike: 100, maturity: 1, volatility: 0.25, rate: 0.05, dividend: 0 }),
  },
  {
    id: "itm_call",
    label: "ITM Call",
    description: "Higher-delta stock replacement setup.",
    apply: (params) => ({ ...params, optionType: "call", spot: 124, strike: 100, maturity: 0.65, volatility: 0.22, rate: 0.04, dividend: 0 }),
  },
  {
    id: "otm_put",
    label: "OTM Put",
    description: "Protective convexity farther from spot.",
    apply: (params) => ({ ...params, optionType: "put", spot: 100, strike: 90, maturity: 0.5, volatility: 0.28, rate: 0.045, dividend: 0 }),
  },
  {
    id: "high_vol",
    label: "High Vol",
    description: "Event-style IV shock scenario.",
    apply: (params) => ({ ...params, volatility: 0.6, maturity: 0.3, strike: 100, spot: 100 }),
  },
  {
    id: "short_dte",
    label: "Short DTE",
    description: "Near-expiry gamma and theta focus.",
    apply: (params) => ({ ...params, maturity: 0.05, volatility: 0.32, strike: 100, spot: 100 }),
  },
];

type ScenarioPresetMenuProps = {
  onSelect: (preset: ScenarioPresetId) => void;
};

export default function ScenarioPresetMenu({ onSelect }: ScenarioPresetMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" data-testid="playground-preset-menu">
          <Sparkles className="h-4 w-4" />
          Presets
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Scenario Presets</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SCENARIO_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.id} onSelect={() => onSelect(preset.id)}>
            <div className="space-y-0.5">
              <p className="font-medium">{preset.label}</p>
              <p className="text-xs text-muted-foreground">{preset.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
