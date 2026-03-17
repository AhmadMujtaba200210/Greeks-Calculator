import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PricingModelId } from "@/lib/types";

const modelOptions: Array<{ value: PricingModelId; label: string; description: string }> = [
  { value: "black_scholes", label: "Black-Scholes", description: "Analytical European vanilla reference." },
  { value: "binomial", label: "Binomial (Leisen-Reimer)", description: "Lattice approximation with smoother convergence." },
  { value: "monte_carlo", label: "Monte Carlo", description: "Simulation estimate with confidence intervals." },
];

type ModelPickerProps = {
  value: PricingModelId;
  onChange: (value: PricingModelId) => void;
};

export default function ModelPicker({ value, onChange }: ModelPickerProps) {
  const activeModel = modelOptions.find((option) => option.value === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="h-9 w-full justify-between rounded-[12px] px-3 text-[13px]" data-testid="playground-model-picker">
          <span className="truncate">{activeModel?.label ?? "Select model"}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search pricing models..." />
          <CommandList>
            <CommandEmpty>No pricing model found.</CommandEmpty>
            <CommandGroup heading="Models">
              {modelOptions.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.description}`} onSelect={() => onChange(option.value)}>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                  <Check className={cn("ml-auto h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
