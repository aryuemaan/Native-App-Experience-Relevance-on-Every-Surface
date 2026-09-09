import type { SurfaceState } from '../lib/surfaceState';
import type { Vertical } from '../lib/types';

export function Watch({ s, vertical, onCashout }: { s: SurfaceState; vertical: Vertical; onCashout: () => void }) {
  const f = s.fixture;
  const t = s.ticket;
  const canCashout = t && (t.status === 'open' || t.status === 'cashout_available');
  const showGaming = vertical === 'gaming' && (s.tournament || s.liveDealer);

  return (
    <div className="watch">
      <div className="watch-screen">
        <div className="watch-time">
          {new Date().getHours().toString().padStart(2, '0')}:
          {new Date().getMinutes().toString().padStart(2, '0')}
        </div>
        {showGaming ? (
          <div className="complication complication--gaming">
            {s.liveDealer ? (
              <>
                <div className="comp-score comp-score--sm">{s.liveDealer.name}</div>
                <div className="comp-sub">min EUR {s.liveDealer.minBet ?? '-'}</div>
              </>
            ) : (
              <>
                <div className="comp-score comp-score--sm">{s.tournament?.seatsLeft ?? '-'} seats</div>
                <div className="comp-sub">{s.tournament?.startsInMinutes ?? '-'} min - {s.tournament?.name}</div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="complication">
              {f ? (
                <>
                  <div className="comp-score">{f.homeScore}:{f.awayScore}</div>
                  <div className="comp-sub">{f.settled ? 'FT' : `${f.minute}'`} - {f.home}</div>
                </>
              ) : (
                <div className="comp-sub">No live event</div>
              )}
            </div>
            {t && canCashout ? (
              <button className="comp-chip comp-chip--btn" onClick={onCashout}>
                Cash out EUR {t.liveValue.toFixed(0)}
              </button>
            ) : t ? (
              <div className="comp-chip">{t.status.replace('_', ' ')}</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
