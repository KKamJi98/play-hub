import { useState } from "react";
import type { OnlineGameState, OnlinePlayer } from "../../hooks/useOnlineGame";
import { useTheme } from "../../hooks/useTheme";

interface OnlineLobbyProps {
  state: OnlineGameState;
  connected: boolean;
  gameLabel: string;
  minPlayers?: number;
  onSetNickname: (nickname: string) => void;
  onConfirmNickname: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export default function OnlineLobby({
  state,
  connected,
  gameLabel,
  minPlayers = 2,
  onSetNickname,
  onConfirmNickname,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
}: OnlineLobbyProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [roomCode, setRoomCode] = useState("");

  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#00f0ff]/50 focus:ring-[#00f0ff]/20"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-200";

  const btnPrimary =
    "px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider text-sm bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300 active:scale-95";

  const btnSecondary = `px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider text-sm border transition-all duration-200 ${
    isDark
      ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
      : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
  }`;

  // Phase: Nickname
  if (state.phase === "nickname") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto">
        <h2 className="font-display text-2xl font-bold tracking-wider">
          <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
            온라인 대전
          </span>
        </h2>
        <p className="text-sm text-[#8892a4] text-center">{gameLabel}</p>

        <div className="flex flex-col gap-3 w-full">
          <label className="text-sm font-medium text-[#8892a4]">닉네임</label>
          <input
            type="text"
            value={state.nickname}
            onChange={(e) => onSetNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && state.nickname.trim()) {
                onConfirmNickname();
              }
            }}
            placeholder="닉네임을 입력하세요"
            maxLength={12}
            className={`px-4 py-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2 ${inputClass}`}
          />
        </div>

        <button
          onClick={onConfirmNickname}
          disabled={!state.nickname.trim()}
          className={`${btnPrimary} ${!state.nickname.trim() ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          확인
        </button>
      </div>
    );
  }

  // Phase: Lobby
  if (state.phase === "lobby") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto">
        <h2 className="font-display text-2xl font-bold tracking-wider">
          <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
            온라인 대전
          </span>
        </h2>
        <p className="text-sm text-[#8892a4]">
          안녕하세요, <span className="font-semibold text-[#00f0ff]">{state.nickname}</span>님
        </p>

        {!connected && (
          <p className="text-xs text-amber-400 animate-pulse">서버에 연결 중...</p>
        )}

        <div className="flex flex-col gap-4 w-full">
          <button onClick={onCreateRoom} disabled={!connected} className={btnPrimary}>
            방 만들기
          </button>

          <div className="flex items-center gap-2">
            <div
              className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`}
            />
            <span className="text-xs text-[#8892a4]">또는</span>
            <div
              className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`}
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.trim())}
              placeholder="방 코드 입력"
              maxLength={8}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2 ${inputClass}`}
            />
            <button
              onClick={() => roomCode && onJoinRoom(roomCode)}
              disabled={!connected || !roomCode}
              className={`${btnPrimary} ${!connected || !roomCode ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              참가
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase: Waiting Room
  if (state.phase === "waiting") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto">
        <h2 className="font-display text-xl font-bold tracking-wider">대기실</h2>

        {/* Room code */}
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
            isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
          }`}
        >
          <span className="text-xs text-[#8892a4]">방 코드</span>
          <span className="font-display text-lg font-bold tracking-widest text-[#00f0ff]">
            {state.roomId}
          </span>
        </div>

        {/* Player list */}
        <div className="w-full flex flex-col gap-2">
          <span className="text-sm font-medium text-[#8892a4]">
            플레이어 ({state.players.length}명)
          </span>
          {state.players.map((p: OnlinePlayer, i: number) => (
            <div
              key={p.sessionId || i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: i === 0 ? "#00f0ff" : "#ffb800",
                }}
              />
              <span className="text-sm font-medium">{p.nickname}</span>
              {i === 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30">
                  HOST
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {state.isHost && (
            <button
              onClick={onStartGame}
              disabled={state.players.length < minPlayers}
              className={`${btnPrimary} ${
                state.players.length < minPlayers ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              게임 시작
            </button>
          )}
          <button onClick={onLeaveRoom} className={btnSecondary}>
            나가기
          </button>
        </div>

        {!state.isHost && (
          <p className="text-xs text-[#8892a4] animate-pulse">호스트가 게임을 시작하기를 기다리는 중...</p>
        )}
      </div>
    );
  }

  return null;
}
