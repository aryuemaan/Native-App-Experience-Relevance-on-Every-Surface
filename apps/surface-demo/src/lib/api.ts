import type { AuditRecord, Consent, GamingCatalog, Moment, RGStatus, UserGraph } from './types';

const GATEWAY: string =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'http://localhost:8080';

function wsUrl(userId: string): string {
  return `${GATEWAY.replace(/^http/, 'ws')}/stream?userId=${encodeURIComponent(userId)}`;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

const post = (path: string, body?: unknown) =>
  fetch(`${GATEWAY}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

const put = (path: string, body: unknown) =>
  fetch(`${GATEWAY}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

export const api = {
  gateway: GATEWAY,
  listUsers: () => fetch(`${GATEWAY}/api/users`).then(json<{ id: string; name: string }[]>),
  getGraph: (id: string) => fetch(`${GATEWAY}/api/users/${id}/graph`).then(json<UserGraph>),
  getAudit: (id: string) => fetch(`${GATEWAY}/api/users/${id}/audit`).then(json<AuditRecord[]>),
  getSlip: (id: string) =>
    fetch(`${GATEWAY}/api/users/${id}/slip`).then(json<{ spoken: string }>),

  setConsent: (id: string, patch: Partial<Consent>) =>
    put(`/api/users/${id}/consent`, patch).then(json<Consent>),
  setRG: (id: string, patch: Partial<RGStatus>) =>
    put(`/api/users/${id}/rg`, patch).then(json<RGStatus>),
  setAccount: (id: string, patch: { kycVerified?: boolean }) =>
    put(`/api/users/${id}/account`, patch).then(json),

  startScenario: (id: string) => 
    fetch(`${GATEWAY}/api/demo/${id}/scenario`, { method: 'POST' }).then(json),
    
  getGamingCatalog: () => fetch(`${GATEWAY}/api/gaming/catalog`).then(json<GamingCatalog>),
  
  startGaming: (id: string, scenario: 'slot' | 'tournament' | 'live_dealer') =>
    post(`/api/demo/${id}/gaming`, { scenario }).then(json),
    
  sendBonus: (id: string) =>
    post(`/api/demo/${id}/bonus`).then(json<{ delivered: boolean; moment: Moment | null }>),
    
  sendBoost: (id: string) =>
    fetch(`${GATEWAY}/api/demo/${id}/boost`, { method: 'POST' }).then(json<{ delivered: boolean; moment: Moment | null }>),
    
  sendPushyPromo: (id: string) =>
    post(`/api/demo/${id}/pushy-promo`).then(json<{ delivered: boolean }>),
    
  nearShop: (id: string) =>
    post(`/api/users/${id}/context/location`, { context: 'near_shop' }).then(json),
    
  cashout: (id: string) =>
    post(`/api/users/${id}/cashout`, {}).then(async (r) => ({ ok: r.ok, data: await r.json() })),
    
  repeatBet: (id: string) => post(`/api/users/${id}/repeat-bet`).then((r) => r.status),
};

export interface StreamHandlers {
  onMoment: (m: Moment) => void;
  onStatus: (connected: boolean) => void;
}

export function openStream(userId: string, handlers: StreamHandlers): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  
  const connect = () => {
    if (closed) return;
    socket = new WebSocket(wsUrl(userId));
    socket.onopen = () => handlers.onStatus(true);
    socket.onclose = () => {
      handlers.onStatus(false);
      if (!closed) retry = setTimeout(connect, 1200);
    };
    socket.onerror = () => socket?.close();
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === 'moment') handlers.onMoment(msg.moment as Moment);
      } catch { /* ignore */ }
    };
  };
  
  connect();
  
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}