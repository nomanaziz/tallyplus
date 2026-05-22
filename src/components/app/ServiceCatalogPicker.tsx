import { useState } from "react";
import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useI18n } from "@/lib/i18n";
import { SERVICE_CATALOG, catalogCategoriesGrouped, type CatalogItem } from "@/lib/service-catalog";
import { cn } from "@/lib/utils";

export function ServiceCatalogPicker({
  value,
  onPick,
}: {
  value?: string | null;
  onPick: (item: CatalogItem) => void;
}) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const groups = catalogCategoriesGrouped(lang as "en" | "bn");
  const selected = value ? SERVICE_CATALOG.find((s) => s.slug === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Sparkles className="h-4 w-4 text-primary" />
            {selected
              ? lang === "bn" ? selected.name_bn : selected.name_en
              : t("p4_PickCatalog")}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(540px,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("p4_SearchServiceDots")} />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>{t("p4_NoMatches")}</CommandEmpty>
            {groups.map(([catLabel, items]) => (
              <CommandGroup key={catLabel} heading={catLabel}>
                {items.map((item) => {
                  const name = lang === "bn" ? item.name_bn : item.name_en;
                  const desc = lang === "bn" ? item.description_bn : item.description_en;
                  const isSel = selected?.slug === item.slug;
                  return (
                    <CommandItem
                      key={item.slug}
                      value={`${name} ${item.name_en} ${item.name_bn}`}
                      onSelect={() => {
                        onPick(item);
                        setOpen(false);
                      }}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-medium">{name}</span>
                        <Check className={cn("h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2">{desc}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
