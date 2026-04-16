import type { RoomSnapshot } from "@/server/game/types";

type RoomListener = (snapshot: RoomSnapshot) => void;

class RoomEventBus {
  private listeners = new Map<string, Set<RoomListener>>();

  subscribe(roomCode: string, listener: RoomListener) {
    const roomListeners = this.listeners.get(roomCode) ?? new Set<RoomListener>();
    roomListeners.add(listener);
    this.listeners.set(roomCode, roomListeners);

    return () => {
      const current = this.listeners.get(roomCode);
      if (!current) {
        return;
      }

      current.delete(listener);

      if (current.size === 0) {
        this.listeners.delete(roomCode);
      }
    };
  }

  publish(roomCode: string, snapshot: RoomSnapshot) {
    const roomListeners = this.listeners.get(roomCode);
    if (!roomListeners) {
      return;
    }

    for (const listener of roomListeners) {
      listener(snapshot);
    }
  }
}

export const roomEvents = new RoomEventBus();
