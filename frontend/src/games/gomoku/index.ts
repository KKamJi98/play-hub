import { lazy } from "react";
import type { GameDefinition } from "../types";

const gomoku: GameDefinition = {
  id: "gomoku",
  name: "Gomoku",
  nameKo: "오목",
  description: "15x15 바둑판 위에서 가로, 세로, 대각선으로 다섯 개의 돌을 먼저 연속으로 놓으면 승리하는 전략 보드게임입니다.",
  thumbnail: "",
  category: "board",
  multiplayer: {
    type: "both",
    minPlayers: 2,
    maxPlayers: 2,
  },
  hasAI: true,
  component: lazy(() => import("./GomokuPage")),
};

export default gomoku;
