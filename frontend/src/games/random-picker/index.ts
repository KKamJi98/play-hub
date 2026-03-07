import { lazy } from "react";
import type { GameDefinition } from "../types";

const randomPicker: GameDefinition = {
  id: "random-picker",
  name: "Random Picker",
  nameKo: "랜덤 뽑기",
  description:
    "항목을 추가하고 룰렛을 돌려 랜덤으로 하나를 뽑는 유틸리티 게임입니다.",
  thumbnail: "",
  category: "random",
  multiplayer: {
    type: "none",
    minPlayers: 1,
    maxPlayers: 1,
  },
  hasAI: false,
  component: lazy(() => import("./RandomPickerPage")),
};

export default randomPicker;
