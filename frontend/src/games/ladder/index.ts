import { lazy } from "react";
import type { GameDefinition } from "../types";

const ladder: GameDefinition = {
  id: "ladder",
  name: "Ladder Game",
  nameKo: "사다리 게임",
  description:
    "참가자와 상품을 설정하고 사다리를 타서 결과를 확인하는 파티 게임입니다.",
  thumbnail: "",
  category: "party",
  multiplayer: {
    type: "none",
    minPlayers: 2,
    maxPlayers: 8,
  },
  hasAI: false,
  component: lazy(() => import("./LadderPage")),
};

export default ladder;
