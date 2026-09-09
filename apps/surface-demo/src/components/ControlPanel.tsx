import type { AuditRecord, UserGraph, Vertical } from '../lib/types';
import { IconBall, IconBolt, IconCards, IconDice, IconGift, IconMic, IconPin, IconPlay, IconTrophy } from './Icons';

interface Props {
  users: { id: string; name: string }[];
  userId: string;
  vertical: Vertical;
  graph?: UserGraph;
  connected: boolean;
  audit: AuditRecord[];
  onSelectUser: (id: string) => void;
  onSetVertical: (v: Vertical) => void;
  onStartScenario: () => void;
  onSendBoost: () => void;
  onPushyPromo: () => void;
  onNearShop: () => void;
  onAskSiri: () => void;
  onStartGaming: (scenario: 'slot' | 'tournament' | 'live_dealer') => void;
  onSendBonus: () => void;
  onSetSurface: (key: keyof UserGraph['consent']['surfaces'], v: boolean) => void;
  onSetMarketing: (v: boolean) => void;
  onSetSelfExcluded: (v: boolean) => void;
  onSetDepositLimit: (v: boolean) => void;
  onSetKyc: (v: boolean) => void;
}

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {hint && <span className="toggle-hint">{hint}</span>}
      </span>
    </label>
  );
}

export function ControlPanel(p: Props) {
  const g = p.graph;
  const gaming = p.vertical === 'gaming';
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="brand"><span className="brand-dot" /> PSK Pulse</div>
        <div className={`conn ${p.connected ? 'conn--on' : ''}`}>{p.connected ? 'live' : 'connecting'}</div>
      </div>

      <div className="panel-section">
        <div className="panel-title">Customer</div>
        <div className="user-tabs">
          {p.users.map((u) => (
            <button key={u.id} className={`user-tab ${u.id === p.userId ? 'user-tab--active' : ''}`}
              onClick={() => p.onSelectUser(u.id)}>{u.name}</button>
          ))}
        </div>
        {g && (
          <div className="user-meta">
            {g.account.market} - {gaming
              ? `slots ${(g.favoriteSlots ?? []).length} - tournaments ${(g.followedTournaments ?? []).length}`
              : `follows ${g.follows.teams.join(', ') || '-'}`} - {g.account.kycVerified ? 'KYC ok' : 'KYC missing'}
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="vertical-tabs">
          <button className={`vtab ${!gaming ? 'vtab--active' : ''}`} onClick={() => p.onSetVertical('sports')}>
            <IconBall size={15} /> Sports
          </button>
          <button className={`vtab ${gaming ? 'vtab--active' : ''}`} onClick={() => p.onSetVertical('gaming')}>
            <IconDice size={15} /> Gaming
          </button>
        </div>

        {!gaming ? (
          <div className="controls">
            <div className="panel-title">Run the moment - sports</div>
            <div className="btn-row">
              <button className="btn btn--primary" onClick={p.onStartScenario}><IconPlay size={14} /> Start live match</button>
              <button className="btn" onClick={p.onAskSiri}><IconMic size={14} /> Ask Siri</button>
            </div>
            <div className="btn-row">
              <button className="btn" onClick={p.onSendBoost}><IconBolt size={14} /> Send boost</button>
              <button className="btn" onClick={p.onNearShop}><IconPin size={14} /> Near a shop</button>
            </div>
            <button className="btn btn--warn" onClick={p.onPushyPromo}>Try a pushy promo (should be rejected)</button>
          </div>
        ) : (
          <div className="controls">
            <div className="panel-title">Run the moment - gaming</div>
            <div className="btn-row">
              <button className="btn btn--primary" onClick={() => p.onStartGaming('slot')}><IconDice size={14} /> New slot drop</button>
              <button className="btn btn--primary" onClick={() => p.onStartGaming('tournament')}><IconTrophy size={14} /> Tournament seats</button>
            </div>
            <div className="btn-row">
              <button className="btn btn--primary" onClick={() => p.onStartGaming('live_dealer')}><IconCards size={14} /> Live dealer opens</button>
              <button className="btn" onClick={p.onSendBonus}><IconGift size={14} /> Send bonus</button>
            </div>
            <button className="btn btn--warn" onClick={p.onPushyPromo}>Try a pushy promo (should be rejected)</button>
          </div>
        )}
      </div>

      {g && (
        <>
          <div className="panel-section">
            <div className="panel-title">Per-surface consent (granular)</div>
            <Toggle label="Live Activity / Dynamic Island" checked={g.consent.surfaces.liveActivity}
              onChange={(v) => p.onSetSurface('liveActivity', v)} />
            <Toggle label="Widgets" checked={g.consent.surfaces.widgets}
              onChange={(v) => p.onSetSurface('widgets', v)} />
            <Toggle label="Watch" checked={g.consent.surfaces.watch}
              onChange={(v) => p.onSetSurface('watch', v)} />
            <Toggle label="Geolocation shortcuts" checked={g.consent.surfaces.geolocation}
              onChange={(v) => p.onSetSurface('geolocation', v)} />
          </div>

          <div className="panel-section">
            <div className="panel-title">Care Gate - guardrails</div>
            <Toggle label="Marketing consent" hint="off blocks all inducements"
              checked={g.consent.marketing} onChange={p.onSetMarketing} />
            <Toggle label="Self-excluded" hint="inducements blocked, info still flows"
              checked={g.rg.selfExcluded} onChange={p.onSetSelfExcluded} />
            <Toggle label="Deposit limit reached" hint="inducements blocked by construction"
              checked={g.rg.depositLimitReached} onChange={p.onSetDepositLimit} />
            <Toggle label="KYC verified" hint="off = no surface may exist at all"
              checked={g.account.kycVerified} onChange={p.onSetKyc} />
          </div>
        </>
      )}

      <div className="panel-section panel-section--grow">
        <div className="panel-title">Decision log - provenance</div>
        <div className="log">
          {p.audit.length === 0 && <div className="log-empty">No decisions yet.</div>}
          {p.audit.map((a) => (
            <div key={a.id} className={`log-row ${a.allowed ? 'log-row--ok' : 'log-row--block'}`}>
              <div className="log-head">
                <span className="log-kind">{a.kind}</span>
                {a.vertical && <span className={`log-vert log-vert--${a.vertical}`}>{a.vertical}</span>}
                <span className={`log-badge ${a.contentClass === 'inducement' ? 'log-badge--ind' : ''}`}>
                  {a.contentClass}
                </span>
                <span className="log-verdict">{a.allowed ? `-> ${a.surface}` : 'blocked'}</span>
              </div>
              <div className="log-reason">{a.reasons[0]?.message ?? ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
