import { useEffect, useRef, useCallback, useState } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";

export interface StompSubscription {
  destination: string;
  callback: (msg: IMessage) => void;
}

export function useStompClient() {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const pendingSubsRef = useRef<StompSubscription[]>([]);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        // Apply pending subscriptions
        for (const sub of pendingSubsRef.current) {
          client.subscribe(sub.destination, sub.callback);
        }
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame.headers["message"], frame.body);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, []);

  const subscribe = useCallback(
    (destination: string, callback: (msg: IMessage) => void) => {
      const sub: StompSubscription = { destination, callback };
      pendingSubsRef.current.push(sub);

      const client = clientRef.current;
      if (client?.connected) {
        const stompSub = client.subscribe(destination, callback);
        return () => {
          stompSub.unsubscribe();
          pendingSubsRef.current = pendingSubsRef.current.filter((s) => s !== sub);
        };
      }

      return () => {
        pendingSubsRef.current = pendingSubsRef.current.filter((s) => s !== sub);
      };
    },
    [],
  );

  const publish = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current;
    if (client?.connected) {
      client.publish({ destination, body: JSON.stringify(body) });
    }
  }, []);

  return { connected, subscribe, publish };
}
