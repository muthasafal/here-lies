/**
 * Subscribes to a Devvit realtime channel (BRIEF 7.5) while `channel` is non-null.
 */

import { useEffect, useRef } from 'react';
import { connectRealtime } from '@devvit/web/client';
import type { RealtimeMessage } from '../../shared/api';

function isMessage(m: unknown): m is RealtimeMessage {
  if (typeof m !== 'object' || m === null) return false;
  const t: unknown = Reflect.get(m, 't');
  return t === 'tomb' || t === 'stats' || t === 'escape';
}

export function useRealtime(channel: string | null, onMessage: (m: RealtimeMessage) => void): void {
  const handler = useRef(onMessage);
  useEffect(() => {
    handler.current = onMessage;
  });
  useEffect(() => {
    if (!channel) return;
    let conn: { disconnect: () => Promise<void> } | null = null;
    try {
      conn = connectRealtime({
        channel,
        onMessage: (data) => {
          if (isMessage(data)) handler.current(data);
        },
      });
    } catch (e) {
      console.warn('realtime unavailable', e);
    }
    return () => {
      void conn?.disconnect();
    };
  }, [channel]);
}
