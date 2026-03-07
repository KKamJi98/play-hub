import { lazy } from "react";
import type { GameDefinition } from "../types";

const billiards: GameDefinition = {
  id: "billiards",
  name: "Four-Ball Billiards",
  nameKo: "4구 당구",
  description:
    "4개의 공으로 진행하는 캐롬 당구입니다. 자신의 수구로 나머지 3개 중 2개 이상의 공을 맞히면 1점을 획득합니다.",
  thumbnail: "",
  category: "physics",
  multiplayer: {
    type: "both",
    minPlayers: 2,
    maxPlayers: 2,
  },
  hasAI: false,
  component: lazy(() => import("./BilliardsPage")),
};

export default billiards;
