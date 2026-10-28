export type HarvyProduct = "Newsk" | "Tower" | "Ops" | "Civic";

export interface ModeInfo {
  name: HarvyProduct;
  label: string;
  description: string;
  status: string;
}

export const MODES: readonly ModeInfo[] = [
  { name: "Newsk", label: "Newsroom intelligence", description: "Notice emerging stories, inspect evidence, and prepare attributed briefs.", status: "First build slice" },
  { name: "Tower", label: "Global and business intelligence", description: "Track markets, competitors, sectors, and risk through connected evidence.", status: "Specified" },
  { name: "Ops", label: "Business operations", description: "Turn verified signals into owned actions, monitors, and decisions.", status: "Specified" },
  { name: "Civic", label: "Civic intelligence", description: "Connect public records, civic events, institutions, and outcomes.", status: "Specified" },
] as const;
