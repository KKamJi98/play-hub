import { useEffect, useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS } from "./constants";
import { useTheme } from "../../hooks/useTheme";
import { clampPlayerCount, resizeLadderEntries } from "./playerCount";

interface LadderSetupProps {
  players: string[];
  prizes: string[];
  onPlayersChange: (players: string[]) => void;
  onPrizesChange: (prizes: string[]) => void;
  onGenerate: () => void;
}

export default function LadderSetup({
  players,
  prizes,
  onPlayersChange,
  onPrizesChange,
  onGenerate,
}: LadderSetupProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [countInput, setCountInput] = useState(String(players.length));

  const isValid = players.every((p) => p.trim() !== "") && prizes.every((p) => p.trim() !== "");

  useEffect(() => {
    setCountInput(String(players.length));
  }, [players.length]);

  const applyPlayerCount = (count: number) => {
    const next = resizeLadderEntries(players, prizes, count);
    onPlayersChange(next.players);
    onPrizesChange(next.prizes);
  };

  const updatePlayer = (index: number, value: string) => {
    const next = [...players];
    next[index] = value;
    onPlayersChange(next);
  };

  const updatePrize = (index: number, value: string) => {
    const next = [...prizes];
    next[index] = value;
    onPrizesChange(next);
  };

  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#00f0ff]/50 focus:ring-[#00f0ff]/20"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-200";

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4 w-full max-w-2xl mx-auto">
      <h1 className="font-display text-4xl font-bold tracking-wider">
        <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
          사다리 게임
        </span>
      </h1>
      <p className="text-[#8892a4] text-center max-w-md">
        참가자와 상품을 입력하고 사다리를 타서 결과를 확인하세요!
      </p>

      {/* Player count controls */}
      <div className="flex w-full flex-col items-center gap-3">
        <span className="text-sm font-medium text-[#8892a4]">인원수</span>
        <div className="flex w-full max-w-xs items-center gap-3">
          <button
            type="button"
            onClick={() => applyPlayerCount(players.length - 1)}
            disabled={players.length <= MIN_PLAYERS}
            className={`touch-manipulation flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-bold transition-all duration-200 ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            aria-label="인원수 감소"
          >
            -
          </button>

          <div className="flex-1">
            <input
              type="number"
              inputMode="numeric"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={countInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCountInput(nextValue);
                const parsed = Number.parseInt(nextValue, 10);
                if (!Number.isNaN(parsed)) {
                  applyPlayerCount(parsed);
                }
              }}
              onBlur={() => {
                const parsed = Number.parseInt(countInput, 10);
                if (Number.isNaN(parsed)) {
                  setCountInput(String(players.length));
                  return;
                }
                const clamped = clampPlayerCount(parsed);
                applyPlayerCount(clamped);
                setCountInput(String(clamped));
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-center text-lg font-semibold outline-none transition-all focus:ring-2 ${inputClass}`}
              aria-label="인원수 입력"
            />
            <p className="mt-2 text-center text-xs text-[#8892a4]">
              {MIN_PLAYERS}명 ~ {MAX_PLAYERS}명
            </p>
          </div>

          <button
            type="button"
            onClick={() => applyPlayerCount(players.length + 1)}
            disabled={players.length >= MAX_PLAYERS}
            className={`touch-manipulation flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-bold transition-all duration-200 ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            aria-label="인원수 증가"
          >
            +
          </button>
        </div>
      </div>

      {/* Input rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
        {/* Players column */}
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-sm font-semibold tracking-wider text-[#00f0ff]">
            참가자
          </h3>
          {players.map((name, i) => (
            <div key={`player-${i}`} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => updatePlayer(i, e.target.value)}
                placeholder={`Player ${i + 1}`}
                className={`flex-1 px-3 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${inputClass}`}
              />
            </div>
          ))}
        </div>

        {/* Prizes column */}
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-sm font-semibold tracking-wider text-[#ffb800]">
            상품 / 결과
          </h3>
          {prizes.map((prize, i) => (
            <div key={`prize-${i}`} className="flex items-center gap-2">
              <span className="text-sm text-[#8892a4] w-4 text-center flex-shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                value={prize}
                onChange={(e) => updatePrize(i, e.target.value)}
                placeholder={`Prize ${i + 1}`}
                className={`flex-1 px-3 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${inputClass}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!isValid}
        className={`px-8 py-3 rounded-xl font-display font-semibold tracking-wider text-lg
                   bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                   text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                   hover:shadow-cyan-500/50 hover:scale-105
                   transition-all duration-300 active:scale-95
                   ${!isValid ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        사다리 생성
      </button>
    </div>
  );
}
