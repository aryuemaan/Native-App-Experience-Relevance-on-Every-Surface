import { useEffect, useState } from 'react';
import type { SurfaceState } from '../lib/surfaceState';
import type { GamingCatalog, UserGraph, Vertical } from '../lib/types';
import { IconBall, IconCards, IconDice, IconGift, IconPin, IconShield, IconTrophy } from './Icons';

function clock(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
const arrow = (dir: 'up' | 'down' | 'flat') => (dir === 'up' ? '+' : dir === 'down' ? '-' : '');
const TEAM_NAMES: Record<string, string> = {
  dinamo: 'GNK Dinamo', hajduk: 'HNK Hajduk', rijeka: 'HNK Rijeka', osijek: 'NK Osijek',
};

export function Phone({
  s,
  graph,
  vertical,
  catalog,
  onWhy,
  onCashout,
}: {
  s: SurfaceState;
  graph?: UserGraph;
  vertical: Vertical;
  catalog?: GamingCatalog;
  onWhy: () => void;
  onCashout: () => void;
}) {
  const [now, setNow] = useState(clock());
  const [showPush, setShowPush] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!s.push) return;
    setShowPush(true);
    const t = setTimeout(() => setShowPush(false), 4500);
    return () => clearTimeout(t);
  }, [s.push?.at]);

  const f = s.fixture;
  const t = s.ticket;
  const canCashout = t && (t.status === 'open' || t.status === 'cashout_available');
  const islandGaming = s.islandGaming && !!s.liveDealer;

  const followedSlots = (graph?.favoriteSlots ?? [])
    .map((id) => catalog?.slots.find((x) => x.id === id)?.name)
    .filter(Boolean) as string[];
  const followedTournament = (graph?.followedTournaments ?? [])
    .map((id) => catalog?.tournaments.find((x) => x.id === id)?.name)
    .filter(Boolean)[0];

  const gamingIdle = !s.games && !s.tournament && !s.liveDealer && !s.bonus;
  const sportsIdle = !f && !s.reward && !s.boost && !s.quickAction;

  return (
    <div className="phone">
      <div className="phone-screen">
        <div className={`island ${s.islandActive ? 'island--live' : ''} ${islandGaming ? 'island--gaming' : ''}`}>
          <span className="island-dot" />
          {islandGaming ? (
            <>
              <span className="island-score"><IconCards size={13} /> {s.liveDealer?.name}</span>
              {s.liveDealer?.minBet != null && <span className="island-min">min EUR {s.liveDealer.minBet}</span>}
            </>
          ) : (
            <>
              <span className="island-score"><IconBall size={13} /> {f ? `${f.homeScore}-${f.awayScore}` : 'LIVE'}</span>
              {f && !f.settled && <span className="island-min">{f.minute}'</span>}
              {t && (
                <span className="island-value">
                  EUR {t.liveValue.toFixed(2)} <span className={`delta delta--${t.direction}`}>{arrow(t.direction)}</span>
                </span>
              )}
            </>
          )}
        </div>

        {showPush && s.push && (
          <div className="push-banner">
            <div className="push-app">PSK</div>
            <div className="push-title">{s.push.title}</div>
            <div className="push-body">{s.push.body}</div>
          </div>
        )}

        <div className="lock-time">{now}</div>
        <div className="lock-date">{vertical === 'gaming' ? 'Casino - your surfaces' : 'Sports - your surfaces'}</div>

        <div className="lock-widgets">
          {s.islandActive && f && t && !islandGaming && (
            <div className="widget la-widget">
              <div className="widget-head">
                <span className="la-tag">LIVE ACTIVITY</span>
                <span className="live-pill"><span className="live-pill-dot" />{f.settled ? 'FT' : `${f.minute}'`}</span>
              </div>
              <div className="score-row">
                <span className="team">{f.home}</span>
                <span className="score">{f.homeScore}<span className="score-sep">:</span>{f.awayScore}</span>
                <span className="team team--right">{f.away}</span>
              </div>
              <div className="la-foot">
                <span className="la-value">Cash out EUR {t.liveValue.toFixed(2)} <span className={`delta delta--${t.direction}`}>{arrow(t.direction)}</span></span>
                {canCashout ? (
                  <button className="cashout-btn" onClick={onCashout}>Cash Out</button>
                ) : (
                  <span className="settled-tag">{t.status.replace('_', ' ')}</span>
                )}
              </div>
            </div>
          )}

          {f && !s.islandActive && vertical === 'sports' && (
            <div className="widget">
              <div className="widget-label"><IconBall size={12} /> MY TEAMS</div>
              <div className="score-row">
                <span className="team">{f.home}</span>
                <span className="score">{f.homeScore}<span className="score-sep">:</span>{f.awayScore}</span>
                <span className="team team--right">{f.away}</span>
              </div>
            </div>
          )}

          {s.tournament && (
            <div className="widget tourn-widget">
              <div className="widget-head">
                <span className="la-tag la-tag--gaming"><IconTrophy size={12} /> LIVE ACTIVITY</span>
                {s.tournament.startsInMinutes != null && (
                  <span className="live-pill live-pill--gaming"><span className="live-pill-dot" />{s.tournament.startsInMinutes} min</span>
                )}
              </div>
              <div className="tourn-name">{s.tournament.name}</div>
              <div className="tourn-meta">
                {s.tournament.seatsLeft != null && (
                  <span className="seat-chip">{s.tournament.seatsLeft}{s.tournament.seatsTotal ? `/${s.tournament.seatsTotal}` : ''} seats left</span>
                )}
                <span className="tourn-body">{s.tournament.body}</span>
              </div>
              {s.tournament.cta && (
                <button className="game-btn" onClick={onWhy}>{s.tournament.cta}</button>
              )}
            </div>
          )}

          {s.games && (
            <div className="widget games-widget">
              <div className="widget-label games-label"><IconDice size={12} /> MY GAMES</div>
              <div className="game-row">
                <div className="game-tile"><IconDice size={20} /></div>
                <div className="game-copy">
                  <div className="promo-title">{s.games.title}</div>
                  <div className="promo-body">
                    {s.games.provider ? `${s.games.provider}` : ''}
                    {s.games.body ? ` - ${s.games.body}` : ''}
                  </div>
                </div>
                {s.games.freeSpins ? <span className="spins-chip">{s.games.freeSpins} FS</span> : null}
              </div>
              {s.games.cta && <button className="game-btn" onClick={onWhy}>{s.games.cta}</button>}
            </div>
          )}

          {s.liveDealer && (
            <div className="widget dealer-widget">
              <div className="widget-label dealer-label"><IconCards size={12} /> DYNAMIC ISLAND - LIVE DEALER</div>
              <div className="game-row">
                <div className="game-tile game-tile--dealer"><IconCards size={20} /></div>
                <div className="game-copy">
                  <div className="promo-title">{s.liveDealer.name}</div>
                  <div className="promo-body">{s.liveDealer.body}{s.liveDealer.minBet != null ? ` - min EUR ${s.liveDealer.minBet}` : ''}</div>
                </div>
                {s.liveDealer.cta && <button className="game-btn game-btn--tight" onClick={onWhy}>{s.liveDealer.cta}</button>}
              </div>
            </div>
          )}

          {s.reward && (
            <div className="widget">
              <div className="widget-label">MY SLIP</div>
              <div className="reward-title">{s.reward.title}</div>
              <div className="promo-body">{s.reward.body}</div>
            </div>
          )}

          {s.quickAction && (
            <div className="widget quick-widget">
              <div className="widget-label quick-label"><IconPin size={12} /> QUICK ACTION - nearby</div>
              <div className="promo-title">{s.quickAction.title}</div>
              <div className="promo-body">{s.quickAction.body}</div>
            </div>
          )}

          {s.boost && (
            <div className="widget boost-widget" onClick={onWhy}>
              <div className="widget-label boost-label"><IconShield size={12} /> BOOSTED FOR YOU - tap why</div>
              <div className="promo-title">{s.boost.title}</div>
              <div className="promo-body">{s.boost.body}</div>
            </div>
          )}

          {s.bonus && (
            <div className="widget bonus-widget" onClick={onWhy}>
              <div className="widget-label bonus-label"><IconGift size={12} /> BONUS - tap why</div>
              <div className="promo-title">{s.bonus.title}</div>
              <div className="promo-body">{s.bonus.body}</div>
            </div>
          )}

          {vertical === 'sports' && sportsIdle && (
            <div className="widget widget--faint">
              <div className="widget-label"><IconBall size={12} /> MY TEAMS</div>
              <div className="faint-line">{(graph?.follows.teams ?? []).map((id) => TEAM_NAMES[id] ?? id).join(', ') || 'Your followed teams appear here'}</div>
              <div className="faint-hint">Start the match to bring the surfaces alive</div>
            </div>
          )}

          {vertical === 'gaming' && gamingIdle && (
            <div className="widget widget--faint">
              <div className="widget-label games-label"><IconDice size={12} /> MY GAMES</div>
              <div className="faint-line">{followedSlots.join(', ') || 'Your favourite slots appear here'}</div>
              {followedTournament && <div className="faint-hint">Following {followedTournament}</div>}
              {!followedTournament && <div className="faint-hint">Run a gaming moment to see it surface</div>}
            </div>
          )}
        </div>

        <button className="why-btn" onClick={onWhy}><IconShield size={13} /> Why am I seeing this?</button>
      </div>
    </div>
  );
}
