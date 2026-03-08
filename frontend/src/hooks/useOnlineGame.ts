import { useState, useCallback, useEffect, useRef } from "react";
import { useStompClient } from "./useStompClient";

export type OnlinePhase = "nickname" | "lobby" | "waiting" | "playing";

export interface OnlinePlayer {
  sessionId: string;
  nickname: string;
  index: number;
}

interface RoomResponse {
  id: string;
  gameId: string;
  playerCount: number;
  state: "WAITING" | "PLAYING" | "FINISHED";
}

export interface OnlineGameState {
  phase: OnlinePhase;
  nickname: string;
  roomId: string | null;
  playerIndex: number | null;
  players: OnlinePlayer[];
  isHost: boolean;
  gameState: unknown;
  gameResult: { isOver: boolean; winner: number | null; reason: string | null } | null;
}

const NICKNAME_KEY = "play-hub-nickname";

export function useOnlineGame(gameId: string) {
  const { connected, subscribe, publish } = useStompClient();

  const [state, setState] = useState<OnlineGameState>({
    phase: "nickname",
    nickname: typeof localStorage !== "undefined" ? localStorage.getItem(NICKNAME_KEY) ?? "" : "",
    roomId: null,
    playerIndex: null,
    players: [],
    isHost: false,
    gameState: null,
    gameResult: null,
  });

  const unsubRoomRef = useRef<(() => void) | null>(null);
  const unsubGameRef = useRef<(() => void) | null>(null);

  const setNickname = useCallback((nickname: string) => {
    setState((s) => ({ ...s, nickname }));
  }, []);

  const confirmNickname = useCallback(() => {
    if (!state.nickname.trim()) return;
    localStorage.setItem(NICKNAME_KEY, state.nickname.trim());
    setState((s) => ({ ...s, phase: "lobby", nickname: s.nickname.trim() }));
  }, [state.nickname]);

  const subscribeToRoom = useCallback(
    (roomId: string) => {
      // Subscribe to room events
      unsubRoomRef.current?.();
      unsubRoomRef.current = subscribe(`/topic/room/${roomId}`, (msg) => {
        const data = JSON.parse(msg.body);
        if (data.type === "PLAYER_JOINED" || data.type === "PLAYER_LEFT") {
          setState((s) => ({ ...s, players: data.players ?? s.players }));
        } else if (data.type === "GAME_STARTED") {
          setState((s) => ({
            ...s,
            phase: "playing",
            gameState: data.initialState ?? null,
          }));
        }
      });

      // Subscribe to game state updates
      unsubGameRef.current?.();
      unsubGameRef.current = subscribe(`/topic/game/${roomId}`, (msg) => {
        const data = JSON.parse(msg.body);
        setState((s) => ({
          ...s,
          gameState: data.state ?? s.gameState,
          gameResult: data.gameResult ?? s.gameResult,
        }));
      });
    },
    [subscribe],
  );

  const createRoom = useCallback(async () => {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const room: RoomResponse = await res.json();

    // Join the room
    const joinRes = await fetch(`/api/rooms/${room.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: state.nickname }),
    });
    const joinData = await joinRes.json();

    subscribeToRoom(room.id);
    setState((s) => ({
      ...s,
      phase: "waiting",
      roomId: room.id,
      playerIndex: joinData.playerIndex ?? 0,
      players: joinData.players ?? [],
      isHost: true,
    }));
  }, [gameId, state.nickname, subscribeToRoom]);

  const joinRoom = useCallback(
    async (roomId: string) => {
      const joinRes = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: state.nickname }),
      });

      if (!joinRes.ok) {
        throw new Error("Failed to join room");
      }

      const joinData = await joinRes.json();

      subscribeToRoom(roomId);
      setState((s) => ({
        ...s,
        phase: "waiting",
        roomId,
        playerIndex: joinData.playerIndex ?? 1,
        players: joinData.players ?? [],
        isHost: false,
      }));
    },
    [state.nickname, subscribeToRoom],
  );

  const startGame = useCallback(() => {
    if (!state.roomId) return;
    publish("/app/room/start", { roomId: state.roomId });
  }, [state.roomId, publish]);

  const sendAction = useCallback(
    (action: unknown) => {
      if (!state.roomId || state.playerIndex === null) return;
      publish("/app/game/action", {
        roomId: state.roomId,
        playerIndex: state.playerIndex,
        action,
      });
    },
    [state.roomId, state.playerIndex, publish],
  );

  const leaveRoom = useCallback(() => {
    if (state.roomId) {
      publish("/app/room/leave", { roomId: state.roomId });
    }
    unsubRoomRef.current?.();
    unsubGameRef.current?.();
    setState((s) => ({
      ...s,
      phase: "lobby",
      roomId: null,
      playerIndex: null,
      players: [],
      isHost: false,
      gameState: null,
      gameResult: null,
    }));
  }, [state.roomId, publish]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubRoomRef.current?.();
      unsubGameRef.current?.();
    };
  }, []);

  return {
    state,
    connected,
    setNickname,
    confirmNickname,
    createRoom,
    joinRoom,
    startGame,
    sendAction,
    leaveRoom,
  };
}
