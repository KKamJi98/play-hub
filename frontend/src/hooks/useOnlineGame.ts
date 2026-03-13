import { useState, useCallback, useEffect, useRef } from "react";
import { useStompClient } from "./useStompClient";

export type OnlinePhase = "nickname" | "lobby" | "queuing" | "waiting" | "playing" | "finished";

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
  playerSessionId: string | null;
  playerIndex: number | null;
  players: OnlinePlayer[];
  isHost: boolean;
  gameState: unknown;
  gameResult: { isOver: boolean; winner: number | null; reason: string | null } | null;
  opponentLeft: boolean;
  isQuickMatch: boolean;
  queueSize: number | null;
}

export interface UseOnlineGameOptions {
  onGameStarted?: () => void;
}

const NICKNAME_KEY = "play-hub-nickname";

export function useOnlineGame(gameId: string, options?: UseOnlineGameOptions) {
  const { connected, subscribe, publish } = useStompClient();

  const [state, setState] = useState<OnlineGameState>({
    phase: "nickname",
    nickname: typeof localStorage !== "undefined" ? localStorage.getItem(NICKNAME_KEY) ?? "" : "",
    roomId: null,
    playerSessionId: null,
    playerIndex: null,
    players: [],
    isHost: false,
    gameState: null,
    gameResult: null,
    opponentLeft: false,
    isQuickMatch: false,
    queueSize: null,
  });

  const onGameStartedRef = useRef(options?.onGameStarted);
  onGameStartedRef.current = options?.onGameStarted;

  const unsubRoomRef = useRef<(() => void) | null>(null);
  const unsubGameRef = useRef<(() => void) | null>(null);
  const unsubMatchRef = useRef<(() => void) | null>(null);
  const unsubQueueSizeRef = useRef<(() => void) | null>(null);

  const safePublish = useCallback(
    (destination: string, body: unknown) => {
      if (!connected) {
        console.warn(`[useOnlineGame] STOMP not connected, skipping publish to ${destination}`);
        return;
      }
      publish(destination, body);
    },
    [connected, publish],
  );

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
        if (data.type === "PLAYER_JOINED") {
          setState((s) => ({ ...s, players: data.players ?? s.players }));
        } else if (data.type === "PLAYER_LEFT") {
          setState((s) => {
            const isPlaying = s.phase === "playing";
            return {
              ...s,
              players: data.players ?? s.players,
              opponentLeft: isPlaying ? true : s.opponentLeft,
              phase: isPlaying ? "finished" : s.phase,
            };
          });
        } else if (data.type === "OPPONENT_DISCONNECTED") {
          setState((s) => {
            const isPlaying = s.phase === "playing";
            return {
              ...s,
              players: data.players ?? s.players,
              opponentLeft: isPlaying ? true : s.opponentLeft,
              phase: isPlaying ? "finished" : s.phase,
            };
          });
        } else if (data.type === "GAME_STARTED") {
          setState((s) => ({
            ...s,
            phase: "playing",
            gameState: data.initialState ?? null,
          }));
          onGameStartedRef.current?.();
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
    const sid = joinData.sessionId ?? null;
    setState((s) => ({
      ...s,
      phase: "waiting",
      roomId: room.id,
      playerSessionId: sid,
      playerIndex: joinData.playerIndex ?? 0,
      players: joinData.players ?? [],
      isHost: true,
    }));
    // Register WebSocket session mapping for disconnect cleanup
    if (sid) {
      safePublish("/app/room/join", { roomId: room.id, sessionId: sid });
    }
  }, [gameId, state.nickname, subscribeToRoom, safePublish]);

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
      const sid = joinData.sessionId ?? null;
      setState((s) => ({
        ...s,
        phase: "waiting",
        roomId,
        playerSessionId: sid,
        playerIndex: joinData.playerIndex ?? 1,
        players: joinData.players ?? [],
        isHost: false,
      }));
      // Register WebSocket session mapping for disconnect cleanup
      if (sid) {
        safePublish("/app/room/join", { roomId, sessionId: sid });
      }
    },
    [state.nickname, subscribeToRoom, safePublish],
  );

  const joinQueue = useCallback(() => {
    const ticketId = crypto.randomUUID();

    setState((s) => ({
      ...s,
      phase: "queuing",
      isQuickMatch: true,
      queueSize: null,
    }));

    // Subscribe to match result
    unsubMatchRef.current?.();
    unsubMatchRef.current = subscribe(
      `/topic/matchmaking/result/${ticketId}`,
      (msg) => {
        const data = JSON.parse(msg.body);
        if (data.type === "MATCHED") {
          // Clean up matchmaking subscriptions
          unsubMatchRef.current?.();
          unsubMatchRef.current = null;
          unsubQueueSizeRef.current?.();
          unsubQueueSizeRef.current = null;

          // Subscribe to room/game topics
          subscribeToRoom(data.roomId);

          setState((s) => ({
            ...s,
            phase: "playing",
            roomId: data.roomId,
            playerSessionId: data.sessionId,
            playerIndex: data.playerIndex,
            players: data.players ?? [],
            isHost: data.playerIndex === 0,
            gameState: data.initialState ?? null,
            queueSize: null,
          }));

          // Register WS session for disconnect cleanup
          safePublish("/app/room/join", {
            roomId: data.roomId,
            sessionId: data.sessionId,
          });

          onGameStartedRef.current?.();
        } else if (data.type === "QUEUE_TIMEOUT") {
          unsubMatchRef.current?.();
          unsubMatchRef.current = null;
          unsubQueueSizeRef.current?.();
          unsubQueueSizeRef.current = null;

          setState((s) => ({
            ...s,
            phase: "lobby",
            isQuickMatch: false,
            queueSize: null,
          }));
        }
      },
    );

    // Subscribe to queue size updates
    unsubQueueSizeRef.current?.();
    unsubQueueSizeRef.current = subscribe(
      `/topic/matchmaking/queue/${gameId}`,
      (msg) => {
        const data = JSON.parse(msg.body);
        setState((s) => ({ ...s, queueSize: data.queueSize ?? s.queueSize }));
      },
    );

    // Send join queue message
    safePublish("/app/matchmaking/join", {
      gameId,
      nickname: state.nickname,
      matchTicketId: ticketId,
    });
  }, [gameId, state.nickname, subscribe, subscribeToRoom, safePublish]);

  const cancelQueue = useCallback(() => {
    safePublish("/app/matchmaking/cancel", {});
    unsubMatchRef.current?.();
    unsubMatchRef.current = null;
    unsubQueueSizeRef.current?.();
    unsubQueueSizeRef.current = null;
    setState((s) => ({
      ...s,
      phase: "lobby",
      isQuickMatch: false,
      queueSize: null,
    }));
  }, [safePublish]);

  const startGame = useCallback(() => {
    if (!state.roomId) return;
    safePublish("/app/room/start", { roomId: state.roomId });
  }, [state.roomId, safePublish]);

  const sendAction = useCallback(
    (action: unknown) => {
      if (!state.roomId || state.playerIndex === null) return;
      safePublish("/app/game/action", {
        roomId: state.roomId,
        playerIndex: state.playerIndex,
        action,
      });
    },
    [state.roomId, state.playerIndex, safePublish],
  );

  const leaveRoom = useCallback(() => {
    if (state.roomId) {
      safePublish("/app/room/leave", { roomId: state.roomId, sessionId: state.playerSessionId });
    }
    unsubRoomRef.current?.();
    unsubGameRef.current?.();
    setState((s) => ({
      ...s,
      phase: "lobby",
      roomId: null,
      playerSessionId: null,
      playerIndex: null,
      players: [],
      isHost: false,
      gameState: null,
      gameResult: null,
      opponentLeft: false,
      isQuickMatch: false,
    }));
  }, [state.roomId, state.playerSessionId, safePublish]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubRoomRef.current?.();
      unsubGameRef.current?.();
      unsubMatchRef.current?.();
      unsubQueueSizeRef.current?.();
    };
  }, []);

  return {
    state,
    connected,
    setNickname,
    confirmNickname,
    createRoom,
    joinRoom,
    joinQueue,
    cancelQueue,
    startGame,
    sendAction,
    leaveRoom,
  };
}
