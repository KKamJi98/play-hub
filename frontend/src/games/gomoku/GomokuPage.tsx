import { useEffect } from "react";
import { useGomokuGame } from "./useGomokuGame";
import GomokuBoard from "./GomokuBoard";
import { BLACK, type Stone, type Difficulty, type GameMode } from "./constants";
import { useTheme } from "../../hooks/useTheme";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import OnlineLobby from "../../components/online/OnlineLobby";
import GameViewport from "../../components/game/GameViewport";
import { useCoarsePointer } from "../../hooks/useCoarsePointer";

const MODE_OPTIONS: { mode: GameMode; label: string; desc: string }[] = [
  { mode: "local", label: "로컬 대전", desc: "같은 기기에서 두 명이 번갈아 플레이" },
  { mode: "ai", label: "AI 대전", desc: "컴퓨터와 대결" },
  { mode: "online", label: "온라인 대전", desc: "네트워크로 다른 플레이어와 대결" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "쉬움" },
  { value: "medium", label: "보통" },
  { value: "hard", label: "어려움" },
];

function ModeSelection({
  selectedMode,
  onSelectMode,
  difficulty,
  onSelectDifficulty,
  onStart,
}: {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  onStart: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4">
      <h1 className="font-display text-4xl font-bold tracking-wider">
        <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
          오목
        </span>
      </h1>
      <p className="text-[#8892a4] text-center max-w-md">
        15x15 바둑판 위에 돌을 놓아 가로, 세로, 대각선으로 5개를 연속으로 먼저 만드는 사람이 승리합니다.
      </p>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {MODE_OPTIONS.map(({ mode, label, desc }) => {
          const isSelected = selectedMode === mode;
          return (
            <button
              key={mode}
              onClick={() => onSelectMode(mode)}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-6 transition-all duration-200
                ${
                  isSelected
                    ? isDark
                      ? "border-[#00f0ff]/50 bg-[#00f0ff]/10 shadow-lg shadow-cyan-500/10"
                      : "border-blue-400/50 bg-blue-50 shadow-lg shadow-blue-500/10"
                    : isDark
                      ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              <span
                className={`font-display text-lg font-semibold tracking-wide ${
                  isSelected ? "text-[#00f0ff]" : ""
                }`}
              >
                {label}
              </span>
              <span className="text-xs text-[#8892a4] text-center">{desc}</span>
            </button>
          );
        })}
      </div>

      {/* Difficulty selector (AI mode only) */}
      {selectedMode === "ai" && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm font-medium text-[#8892a4]">난이도</span>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onSelectDifficulty(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                  ${
                    difficulty === value
                      ? isDark
                        ? "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/40"
                        : "bg-blue-100 text-blue-700 border-blue-300"
                      : isDark
                        ? "bg-white/5 text-[#8892a4] border-white/10 hover:bg-white/10"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={onStart}
        className="px-8 py-3 rounded-xl font-display font-semibold tracking-wider text-lg
                   bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                   text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                   hover:shadow-cyan-500/50 hover:scale-105
                   transition-all duration-300 active:scale-95"
      >
        게임 시작
      </button>
    </div>
  );
}

function PlayerInfo({
  currentPlayer,
  mode,
  aiThinking,
  waitingForOpponent,
}: {
  currentPlayer: 1 | 2;
  mode: GameMode;
  aiThinking: boolean;
  waitingForOpponent?: boolean;
}) {
  const isBlackTurn = currentPlayer === BLACK;
  const playerLabel =
    mode === "ai"
      ? isBlackTurn
        ? "당신 (흑)"
        : "AI (백)"
      : isBlackTurn
        ? "Player 1 (흑)"
        : "Player 2 (백)";

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-full"
          style={{
            background:
              currentPlayer === BLACK
                ? "radial-gradient(circle at 35% 35%, #555, #111 60%, #000)"
                : "radial-gradient(circle at 35% 35%, #fff, #e8e8e8 50%, #ccc)",
            boxShadow: currentPlayer === BLACK ? "1px 1px 3px rgba(0,0,0,0.5)" : "1px 1px 3px rgba(0,0,0,0.2)",
          }}
        />
        <span className="font-display text-sm font-semibold tracking-wide">{playerLabel}</span>
      </div>
      {waitingForOpponent && (
        <span className="text-xs text-[#ffb800] animate-pulse font-medium">상대 턴 대기 중...</span>
      )}
      {!waitingForOpponent && aiThinking && (
        <span className="text-xs text-[#ffb800] animate-pulse font-medium">AI 생각 중...</span>
      )}
    </div>
  );
}

function GameOverModal({
  winner,
  mode,
  onReset,
  onQuickRematch,
}: {
  winner: 0 | 1 | 2;
  mode: GameMode;
  onReset: () => void;
  onQuickRematch?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  let title: string;
  let subtitle: string;

  if (winner === 0) {
    title = "무승부!";
    subtitle = "양 플레이어가 대등한 실력을 보여주었습니다.";
  } else if (mode === "ai") {
    if (winner === BLACK) {
      title = "승리!";
      subtitle = "축하합니다! AI를 이겼습니다.";
    } else {
      title = "패배...";
      subtitle = "AI가 승리했습니다. 다시 도전해보세요!";
    }
  } else {
    title = winner === BLACK ? "흑 승리!" : "백 승리!";
    subtitle = `Player ${winner === BLACK ? "1" : "2"}이(가) 5연속 돌을 완성했습니다.`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`flex flex-col items-center gap-6 rounded-2xl border p-8 max-w-sm w-full mx-4
          ${
            isDark
              ? "bg-[#111827] border-white/10"
              : "bg-white border-gray-200 shadow-xl"
          }`}
      >
        {/* Winner stone icon */}
        {winner !== 0 && (
          <div
            className="w-16 h-16 rounded-full"
            style={{
              background:
                winner === BLACK
                  ? "radial-gradient(circle at 35% 35%, #555, #111 60%, #000)"
                  : "radial-gradient(circle at 35% 35%, #fff, #e8e8e8 50%, #ccc)",
              boxShadow:
                winner === BLACK
                  ? "3px 3px 8px rgba(0,0,0,0.5)"
                  : "3px 3px 8px rgba(0,0,0,0.2)",
            }}
          />
        )}

        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-wider">{title}</h2>
          <p className="mt-2 text-sm text-[#8892a4]">{subtitle}</p>
        </div>

        <div className="flex gap-3">
          {onQuickRematch && (
            <button
              onClick={onQuickRematch}
              className="px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider
                         bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                         text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                         hover:shadow-cyan-500/50 hover:scale-105
                         transition-all duration-300 active:scale-95"
            >
              빠른 재매치
            </button>
          )}
          <button
            onClick={onReset}
            className={`px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider transition-all duration-300 active:scale-95
                       ${onQuickRematch
                         ? `border ${isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]" : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"}`
                         : "bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105"
                       }`}
          >
            {onQuickRematch ? "나가기" : "다시 하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GomokuPage() {
  const { state, placeStone, reset, setMode, setDifficulty, startGame } = useGomokuGame();
  const online = useOnlineGame("gomoku");
  const { theme } = useTheme();
  const isCoarsePointer = useCoarsePointer();
  const isDark = theme === "dark";

  // Auto-start game when guest receives GAME_STARTED (online phase becomes 'playing')
  useEffect(() => {
    if (online.state.phase === "playing" && state.gameStatus !== "playing") {
      startGame();
    }
  }, [online.state.phase, state.gameStatus, startGame]);

  // Online mode: show lobby before game starts
  if (state.mode === "online" && state.gameStatus === "waiting") {
    return (
      <GameViewport title="오목">
        <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <div className="flex flex-col items-center gap-4">
            {online.state.phase !== "playing" ? (
              <>
                <button
                  onClick={() => { setMode("local"); }}
                  className={`touch-manipulation self-start rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  뒤로
                </button>
                <OnlineLobby
                  state={online.state}
                  connected={online.connected}
                  gameLabel="오목 - 15x15 보드에서 5개를 연속으로 놓으세요"
                  onSetNickname={online.setNickname}
                  onConfirmNickname={online.confirmNickname}
                  onCreateRoom={online.createRoom}
                  onJoinRoom={online.joinRoom}
                  onJoinQueue={online.joinQueue}
                  onCancelQueue={online.cancelQueue}
                  onStartGame={() => { online.startGame(); startGame(); }}
                  onLeaveRoom={online.leaveRoom}
                />
              </>
            ) : (
              <ModeSelection
                selectedMode={state.mode}
                onSelectMode={setMode}
                difficulty={state.difficulty}
                onSelectDifficulty={setDifficulty}
                onStart={startGame}
              />
            )}
          </div>
        </div>
      </GameViewport>
    );
  }

  if (state.gameStatus === "waiting") {
    return (
      <GameViewport title="오목">
        <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <ModeSelection
            selectedMode={state.mode}
            onSelectMode={setMode}
            difficulty={state.difficulty}
            onSelectDifficulty={setDifficulty}
            onStart={state.mode === "online" ? () => {} : startGame}
          />
        </div>
      </GameViewport>
    );
  }

  // Online playing mode: use server state if available
  const isOnlinePlaying = state.mode === "online" && online.state.phase === "playing";
  const serverState = online.state.gameState as {
    board?: number[][];
    currentPlayer?: number;
    lastMove?: { row: number; col: number } | null;
    gameStatus?: string;
    winner?: number;
  } | null;

  const displayBoard: Stone[][] = isOnlinePlaying && serverState?.board
    ? serverState.board.map((row) => row.map((c) => c as Stone))
    : state.board;
  const displayCurrentPlayer = isOnlinePlaying && serverState?.currentPlayer
    ? (serverState.currentPlayer as 1 | 2)
    : state.currentPlayer;
  const displayLastMove = isOnlinePlaying && serverState
    ? serverState.lastMove ?? null
    : state.lastMove;
  const displayGameStatus = isOnlinePlaying && serverState?.gameStatus
    ? (serverState.gameStatus === "FINISHED" ? "finished" : "playing") as "playing" | "finished"
    : state.gameStatus as "playing" | "finished";
  const displayWinner = isOnlinePlaying && serverState?.winner !== undefined
    ? (serverState.winner as 0 | 1 | 2)
    : state.winner;

  // In online mode, only allow placing stones on your turn
  const myPlayerStone = online.state.playerIndex !== null ? online.state.playerIndex + 1 : 0;
  const isMyTurn = !isOnlinePlaying || displayCurrentPlayer === myPlayerStone;
  const disableBoard = isOnlinePlaying && !isMyTurn;

  const handlePlaceStone = (row: number, col: number) => {
    if (isOnlinePlaying) {
      if (!isMyTurn) return;
      online.sendAction({ type: "PLACE_STONE", row, col });
    } else {
      placeStone(row, col);
    }
  };

  const handleReset = () => {
    if (isOnlinePlaying) {
      online.leaveRoom();
    }
    reset();
  };

  return (
    <GameViewport title="오목">
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div
          className={`rounded-2xl border px-3 py-2 backdrop-blur-md sm:px-4 ${
            isDark
              ? "border-white/10 bg-white/5"
              : "border-gray-200 bg-white/92"
          }`}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <button
              onClick={handleReset}
              className={`touch-manipulation rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
              }`}
            >
              나가기
            </button>

            <PlayerInfo
              currentPlayer={displayCurrentPlayer}
              mode={state.mode}
              aiThinking={state.aiThinking}
              waitingForOpponent={isOnlinePlaying && !isMyTurn}
            />

            <div className="text-sm text-[#8892a4]">
              총 {state.moveHistory.length}수
            </div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div
            className={`flex min-h-[360px] items-center justify-center rounded-[32px] border p-1 backdrop-blur-md sm:p-2 ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white/92"
            }`}
          >
            <GomokuBoard
              board={displayBoard}
              currentPlayer={displayCurrentPlayer}
              lastMove={displayLastMove}
              winningLine={state.winningLine}
              gameStatus={displayGameStatus}
              aiThinking={state.aiThinking || disableBoard}
              onPlaceStone={handlePlaceStone}
            />
          </div>

          <aside
            className={`flex flex-col gap-4 rounded-[32px] border p-6 backdrop-blur-md ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white/92"
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892a4]">
                Match
              </p>
              <h3 className="mt-3 font-display text-2xl tracking-[0.12em]">
                {isOnlinePlaying ? "Online Duel" : state.mode === "ai" ? "AI Match" : "Local Match"}
              </h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-gray-50">
              <p className="text-sm font-semibold text-[#e8ecf1] [data-theme=light]_&:text-[#1a1a2e]">
                현재 차례
              </p>
              <p className="mt-2 text-sm leading-6 text-[#8892a4]">
                {displayCurrentPlayer === BLACK ? "흑" : "백"}이 둘 차례입니다.
                {isOnlinePlaying && isMyTurn && " 당신이 둘 수 있습니다."}
                {isOnlinePlaying && !isMyTurn && " 상대가 두는 중입니다."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-gray-50">
              <p className="text-sm font-semibold text-[#e8ecf1] [data-theme=light]_&:text-[#1a1a2e]">
                입력 안내
              </p>
              <p className="mt-2 text-sm leading-6 text-[#8892a4]">
                {isCoarsePointer
                  ? "모바일에서는 원하는 칸을 한 번 터치해 미리보기한 뒤, 같은 칸을 다시 터치하면 돌을 둡니다."
                  : "마우스 오버로 위치를 확인하고 클릭 한 번으로 즉시 돌을 둘 수 있습니다."}
              </p>
            </div>
          </aside>
        </div>

        {/* Game Over Modal */}
        {displayGameStatus === "finished" && (
          <GameOverModal
            winner={displayWinner}
            mode={state.mode}
            onReset={handleReset}
            onQuickRematch={online.state.isQuickMatch ? () => { handleReset(); online.joinQueue(); } : undefined}
          />
        )}

        {/* Opponent left overlay */}
        {online.state.opponentLeft === true && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              className={`flex flex-col items-center gap-6 rounded-2xl border p-8 max-w-sm w-full mx-4
                ${
                  isDark
                    ? "bg-[#111827] border-white/10"
                    : "bg-white border-gray-200 shadow-xl"
                }`}
            >
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold tracking-wider">상대가 나갔습니다</h2>
                <p className="mt-2 text-sm text-[#8892a4]">상대 플레이어가 게임을 떠났습니다.</p>
              </div>
              <div className="flex gap-3">
                {online.state.isQuickMatch && (
                  <button
                    onClick={() => { handleReset(); online.joinQueue(); }}
                    className="touch-manipulation px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider
                               bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                               text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                               hover:shadow-cyan-500/50 hover:scale-105
                               transition-all duration-300 active:scale-95"
                  >
                    빠른 재매치
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className={`touch-manipulation px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider transition-all duration-300 active:scale-95
                             ${online.state.isQuickMatch
                               ? `border ${isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]" : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"}`
                               : "bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105"
                             }`}
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameViewport>
  );
}
