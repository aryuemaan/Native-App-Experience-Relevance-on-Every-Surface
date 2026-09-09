import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { Phone } from './components/Phone';
import { Watch } from './components/Watch';
import { api, openStream } from './lib/api';
import { emptySurfaceState, reduceSurface, type SurfaceState } from './lib/surfaceState';
import type { AuditRecord, GamingCatalog, Moment, UserGraph, Vertical } from './lib/types';

export default function App() {
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [userId, setUserId] = useState('marek');
  const [vertical, setVertical] = useState<Vertical>('sports');
  const [graph, setGraph] = useState<UserGraph>();
  const [catalog, setCatalog] = useState<GamingCatalog>();
  const [surface, setSurface] = useState<SurfaceState>(emptySurfaceState);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [siri, setSiri] = useState<string>();
  const closerRef = useRef<() => void>();

  const refreshGraph = useCallback((id: string) => { api.getGraph(id).then(setGraph).catch(() => undefined); }, []);
  const refreshAudit = useCallback((id: string) => { api.getAudit(id).then(setAudit).catch(() => undefined); }, []);

  useEffect(() => {
    api.listUsers().then(setUsers).catch(() => setUsers([{ id: 'marek', name: 'Marek' }]));
    api.getGamingCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  useEffect(() => {
    setSurface(emptySurfaceState);
    refreshGraph(userId);
    refreshAudit(userId);
    closerRef.current?.();
    closerRef.current = openStream(userId, {
      onStatus: setConnected,
      onMoment: (m: Moment) => {
        setSurface((s) => reduceSurface(s, m));
        refreshAudit(userId);
      },
    });
    return () => closerRef.current?.();
  }, [userId, refreshGraph, refreshAudit]);

  useEffect(() => {
    const t = setInterval(() => refreshAudit(userId), 2000);
    return () => clearInterval(t);
  }, [userId, refreshAudit]);

  const act = async (pr: Promise<unknown>) => {
    await pr.catch(() => undefined);
    refreshGraph(userId);
    refreshAudit(userId);
  };

  const askSiri = async () => {
    try {
      const { spoken } = await api.getSlip(userId);
      setSiri(spoken);
    } catch {
      setSiri('Slip unavailable.');
    }
  };

  return (
    <div className="app">
      <div className="stage">
        <div className="stage-glow" />
        <Phone
          s={surface}
          graph={graph}
          vertical={vertical}
          catalog={catalog}
          onWhy={() => setWhyOpen(true)}
          onCashout={() => act(api.cashout(userId))}
        />
        <Watch s={surface} vertical={vertical} onCashout={() => act(api.cashout(userId))} />
      </div>

      <ControlPanel
        users={users}
        userId={userId}
        vertical={vertical}
        graph={graph}
        connected={connected}
        audit={audit}
        onSelectUser={setUserId}
        onSetVertical={setVertical}
        onStartScenario={() => act(api.startScenario(userId))}
        onSendBoost={() => act(api.sendBoost(userId))}
        onPushyPromo={() => act(api.sendPushyPromo(userId))}
        onNearShop={() => act(api.nearShop(userId))}
        onAskSiri={askSiri}
        onStartGaming={(scenario) => act(api.startGaming(userId, scenario))}
        onSendBonus={() => act(api.sendBonus(userId))}
        onSetSurface={(key, v) => act(api.setConsent(userId, { surfaces: { [key]: v } as never }))}
        onSetMarketing={(v) => act(api.setConsent(userId, { marketing: v }))}
        onSetSelfExcluded={(v) => act(api.setRG(userId, { selfExcluded: v }))}
        onSetDepositLimit={(v) => act(api.setRG(userId, { depositLimitReached: v }))}
        onSetKyc={(v) => act(api.setAccount(userId, { kycVerified: v }))}
      />

      {whyOpen && (
        <div className="modal" onClick={() => setWhyOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Why am I seeing this?</div>
            <div className="modal-sub">
              Every surface renders only after passing the Care Gate. Here is the decision trail for
              the most recent moment.
            </div>
            <ul className="modal-reasons">
              {surface.lastReasons.length === 0 && <li>No moment yet.</li>}
              {surface.lastReasons.map((r, i) => (
                <li key={i}><code>{r.code}</code><span>{r.message}</span></li>
              ))}
            </ul>
            <button className="btn btn--primary" onClick={() => setWhyOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {siri && (
        <div className="modal" onClick={() => setSiri(undefined)}>
          <div className="modal-card siri-card" onClick={(e) => e.stopPropagation()}>
            <div className="siri-orb" />
            <div className="modal-title">What is my PSK slip?</div>
            <div className="siri-answer">{siri}</div>
            <button className="btn btn--primary" onClick={() => setSiri(undefined)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
