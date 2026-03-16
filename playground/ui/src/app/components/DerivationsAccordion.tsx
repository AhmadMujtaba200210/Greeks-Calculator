import { useEffect, useRef } from "react";
import { renderDerivationPanels } from "../../../../public/js/derivations.js";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function DerivationsAccordion() {
  const derivationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!derivationsRef.current) return;
    renderDerivationPanels(derivationsRef.current);
  }, []);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="derivations">
        <AccordionTrigger className="py-3 text-sm">Mathematical Derivations</AccordionTrigger>
        <AccordionContent>
          <div ref={derivationsRef} className="pg-derivations max-h-[360px] overflow-y-auto pr-1" />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
