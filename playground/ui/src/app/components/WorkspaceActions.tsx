import { Command, LayoutPanelTop, RefreshCcw, Sigma, TableProperties } from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import type { InsightTabId, VizId } from "@/lib/types";

type WorkspaceActionsProps = {
  onReset: () => void;
  onVizChange: (viz: VizId) => void;
  onInsightTabChange: (tab: InsightTabId) => void;
};

export default function WorkspaceActions({
  onReset,
  onVizChange,
  onInsightTabChange,
}: WorkspaceActionsProps) {
  return (
    <Menubar className="h-8">
      <MenubarMenu>
        <MenubarTrigger>
          <Command className="h-4 w-4" />
          Actions
        </MenubarTrigger>
        <MenubarContent align="end">
          <MenubarItem onSelect={onReset}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset contract
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => onVizChange("price")}>
            <LayoutPanelTop className="mr-2 h-4 w-4" />
            Focus price desk
          </MenubarItem>
          <MenubarItem onSelect={() => onVizChange("diagnostics")}>
            <TableProperties className="mr-2 h-4 w-4" />
            Open diagnostics view
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => onInsightTabChange("validation")}>
            <TableProperties className="mr-2 h-4 w-4" />
            Validation dock
          </MenubarItem>
          <MenubarItem onSelect={() => onInsightTabChange("math")}>
            <Sigma className="mr-2 h-4 w-4" />
            Math dock
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
