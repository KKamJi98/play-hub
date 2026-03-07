import { MIN_PLAYERS, MAX_PLAYERS, PLAYER_COLORS } from "./constants";
import { useTheme } from "../../hooks/useTheme";

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

  const canAdd = players.length < MAX_PLAYERS;
  const canRemove = players.length > MIN_PLAYERS;
  const isValid = players.every((p) => p.trim() !== "") && prizes.every((p) => p.trim() !== "");

  const addPlayer = () => {
    if (!canAdd) return;
    onPlayersChange([...players, `Player ${players.length + 1}`]);
    onPrizesChange([...prizes, `Prize ${prizes.length + 1}`]);
  };

  const removePlayer = () => {
    if (!canRemove) return;
    onPlayersChange(players.slice(0, -1));
    onPrizesChange(prizes.slice(0, -1));
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
      <div className="flex items-center gap-4">
        <button
          onClick={removePlayer}
          disabled={!canRemove}
          className={`w-10 h-10 rounded-lg text-xl font-bold transition-all duration-200 border
            ${
              canRemove
                ? isDark
                  ? "border-white/20 bg-white/10 hover:bg-white/20 text-white"
                  : "border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700"
                : "opacity-30 cursor-not-allowed border-transparent"
            }`}
        >
          -
        </button>
        <span className="font-display text-lg font-semibold tracking-wide">
          {players.length}명
        </span>
        <button
          onClick={addPlayer}
          disabled={!canAdd}
          className={`w-10 h-10 rounded-lg text-xl font-bold transition-all duration-200 border
            ${
              canAdd
                ? isDark
                  ? "border-white/20 bg-white/10 hover:bg-white/20 text-white"
                  : "border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700"
                : "opacity-30 cursor-not-allowed border-transparent"
            }`}
        >
          +
        </button>
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
                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 ${inputClass}`}
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
                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 ${inputClass}`}
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
