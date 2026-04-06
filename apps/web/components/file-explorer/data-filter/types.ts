import type { LucideIcon } from "lucide-react";

export type FilterOption = {
  label: string;
  value: string;
  color?: string | null;
};

export type FilterColumnDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  options: FilterOption[];
};

export type ActiveFilters = Record<string, string[]>;
