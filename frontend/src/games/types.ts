import { ComponentType, LazyExoticComponent } from "react";

export interface GameDefinition {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  thumbnail: string;
  category: "board" | "physics" | "party" | "random";
  multiplayer: {
    type: "local" | "network" | "both" | "none";
    minPlayers: number;
    maxPlayers: number;
  };
  hasAI: boolean;
  component: LazyExoticComponent<ComponentType>;
}
