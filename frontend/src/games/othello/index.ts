import { lazy } from "react";
import type { GameDefinition } from "../types";

const othello: GameDefinition = {
  id: "othello",
  name: "Othello",
  nameKo: "오델로",
  description: "8x8 보드 위에서 상대의 돌을 뒤집어 더 많은 돌을 차지하는 전략 보드게임입니다. 리버시(Reversi)라고도 불립니다.",
  thumbnail: "",
  category: "board",
  multiplayer: {
    type: "both",
    minPlayers: 2,
    maxPlayers: 2,
  },
  hasAI: true,
  component: lazy(() => import("./OthelloPage")),
};

export default othello;
