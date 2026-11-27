import * as Tooltip from "@radix-ui/react-tooltip";
import * as Popover from "@radix-ui/react-popover";
import { CircleHelp } from "lucide-react";
import { ReactNode, useState } from "react";

interface TooltipWrapperProps {
  content: ReactNode; // o texto que vai aparecer no tooltip
  children: ReactNode; // o trigger (qualquer elemento)
  side?: "top" | "right" | "bottom" | "left"; // posição opcional
}

export function TooltipWrapper({ content, children, side = "top" }: TooltipWrapperProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
             className="
              rounded px-3 py-1.5 text-sm z-50 border shadow-lg
            bg-gray-100 text-gray-900 border-gray-300
            dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
            "
          >
            {content}
            <Tooltip.Arrow className="fill-gray-100 dark:fill-gray-800" width={18} height={9} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/** Field help: hover or focus for a tooltip; click/tap for a dismissible explanation. */
export function SettingHelp({ label, content }: { label: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const panelClass = "z-50 max-w-[min(20rem,calc(100vw-2rem))] rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md";
  return (
    <Popover.Root open={expanded} onOpenChange={setExpanded}>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root open={!expanded && hovered} onOpenChange={setHovered}>
          <Tooltip.Trigger asChild>
            <Popover.Trigger asChild>
              <button type="button" aria-label={`Help: ${label}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CircleHelp aria-hidden="true" className="h-4 w-4" />
              </button>
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content side="top" sideOffset={4} className={panelClass}>{content}<Tooltip.Arrow className="fill-popover" /></Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <Popover.Portal>
        <Popover.Content side="top" sideOffset={4} className={panelClass} aria-label={`Help: ${label}`} onOpenAutoFocus={(event) => event.preventDefault()}>
          {content}
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
