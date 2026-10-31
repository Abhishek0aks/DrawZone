import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import { EVENTS } from '../types/events';
import type { ChatMessage, RoomView } from '../types';
import { emitWithAck } from '../utils/emitWithAck';

const MAX_MESSAGES = 200;

// All real-time state lives here. The server is the source of truth: this hook only
// stores what the server sends and exposes actions that ask the server to do things.
export function useGame() {
  const [connected, setConnected] = useState(socket.connected);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [wordOptions, setWordOptions] = useState<string[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const roomRef = useRef<RoomView | null>(null);

  const applyRoom = useCallback((view: RoomView) => {
    roomRef.current = view;
    setClockOffset(view.serverNow - Date.now());
    setRoom(view);
    if (view.phase !== 'choosing') setWordOptions(null);
  }, []);

  const resetLocal = useCallback(() => {
    roomRef.current = null;
    setRoom(null);
    setWordOptions(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setConnectError(null);
    };
    const onDisconnect = () => {
      setConnected(false);
      if (roomRef.current) {
        resetLocal();
        setNotice('Connection lost, so you left the room. Create or join a room again.');
      }
    };
    const onConnectError = (err: Error) => {
      setConnected(false);
      setConnectError(err.message);
    };
    const onRoomUpdated = (view: RoomView) => applyRoom(view);
    const onWordOptions = (data: { options: string[] }) => setWordOptions(data.options);
    const onRoundStarted = () => setMessages([]);
    const onChat = (msg: ChatMessage) => setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
    const onRoomError = (data: { message: string }) => setNotice(data.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(EVENTS.ROOM_UPDATED, onRoomUpdated);
    socket.on(EVENTS.WORD_OPTIONS, onWordOptions);
    socket.on(EVENTS.ROUND_STARTED, onRoundStarted);
    socket.on(EVENTS.CHAT_MESSAGE, onChat);
    socket.on(EVENTS.ROOM_ERROR, onRoomError);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off(EVENTS.ROOM_UPDATED, onRoomUpdated);
      socket.off(EVENTS.WORD_OPTIONS, onWordOptions);
      socket.off(EVENTS.ROUND_STARTED, onRoundStarted);
      socket.off(EVENTS.CHAT_MESSAGE, onChat);
      socket.off(EVENTS.ROOM_ERROR, onRoomError);
    };
  }, [applyRoom, resetLocal]);

  // Create/Join return an error message (string) or null on success, so the Home page can show it inline.
  const createRoom = useCallback(
    async (name: string): Promise<string | null> => {
      setBusy(true);
      setNotice(null);
      const res = await emitWithAck<{ room: RoomView }>(socket, EVENTS.CREATE_ROOM, { name });
      setBusy(false);
      if (res.ok) {
        applyRoom(res.room);
        return null;
      }
      return res.error;
    },
    [applyRoom],
  );

  const joinRoom = useCallback(
    async (name: string, code: string): Promise<string | null> => {
      setBusy(true);
      setNotice(null);
      const res = await emitWithAck<{ room: RoomView }>(socket, EVENTS.JOIN_ROOM, { name, code });
      setBusy(false);
      if (res.ok) {
        applyRoom(res.room);
        return null;
      }
      return res.error;
    },
    [applyRoom],
  );

  const leaveRoom = useCallback(async () => {
    await emitWithAck(socket, EVENTS.LEAVE_ROOM, {});
    resetLocal();
    setNotice(null);
  }, [resetLocal]);

  const simpleAction = useCallback(async (event: string, payload: object = {}) => {
    const res = await emitWithAck(socket, event, payload);
    if (!res.ok) setNotice(res.error);
  }, []);

  const startGame = useCallback(() => simpleAction(EVENTS.START_GAME), [simpleAction]);
  const playAgain = useCallback(() => simpleAction(EVENTS.PLAY_AGAIN), [simpleAction]);
  const selectWord = useCallback((word: string) => simpleAction(EVENTS.SELECT_WORD, { word }), [simpleAction]);

  // Returns an error message or null. A wrong guess is not an error (it just shows in the chat).
  const submitGuess = useCallback(async (text: string): Promise<string | null> => {
    const res = await emitWithAck(socket, EVENTS.SUBMIT_GUESS, { text });
    return res.ok ? null : res.error;
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  return {
    connected,
    connectError,
    room,
    clockOffset,
    wordOptions,
    messages,
    notice,
    busy,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    playAgain,
    selectWord,
    submitGuess,
    clearNotice,
  };
}

export type GameApi = ReturnType<typeof useGame>;
