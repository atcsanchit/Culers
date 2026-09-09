import { useEffect, useRef, useState } from 'react';
import { useBarca } from '../store/BarcaState';
import { sortPlayers, formatDate, formatTime, formatDateTime, fetchLaMasia, fetchInstagramFeed, isLiveStatus } from '../lib/api';
import { FetchButton } from './FetchButton';
import { PlayerAvatar } from './PlayerAvatar';
import { InstagramIcon } from './InstagramIcon';
import type { PlayerOpenOrigin } from '../store/BarcaState';
import type { InstagramFeed, LaMasiaHub, LaMasiaMatch, LaMasiaPlayer, Player } from '../types';
import { LA_MASIA_HEART, LA_MASIA_ORIGIN, LA_MASIA_PLACE } from '../data/laMasiaCulture';

type SquadTab = 'first-team' | 'la-masia';

const ACADEMY_POLL_MS = 5 * 60 * 1000;
const ACADEMY_LIVE_POLL_MS = 45_000;

function weekendHasLive(hub: LaMasiaHub | null) {
	if (!hub) return false;
	return hub.weekend.some(
		(team) => isLiveStatus(team.last?.status ?? '') || isLiveStatus(team.next?.status ?? ''),
	);
}

export function SquadHubPage() {
	const { data, openPlayerStats } = useBarca();
	const [tab, setTab] = useState<SquadTab>('first-team');
	const [laMasia, setLaMasia] = useState<LaMasiaHub | null>(null);
	const [laMasiaLoading, setLaMasiaLoading] = useState(false);
	const [laMasiaError, setLaMasiaError] = useState<string | null>(null);
	const [igFeed, setIgFeed] = useState<InstagramFeed | null>(null);
	const [igLoading, setIgLoading] = useState(false);
	const laMasiaRef = useRef<LaMasiaHub | null>(null);

	useEffect(() => {
		laMasiaRef.current = laMasia;
	}, [laMasia]);

	useEffect(() => {
		if (tab !== 'la-masia' || !data) return;

		let cancelled = false;
		let timer: number | undefined;
		let inFlight = false;

		const schedule = (hub: LaMasiaHub | null) => {
			window.clearTimeout(timer);
			timer = window.setTimeout(
				() => void load(true),
				weekendHasLive(hub) ? ACADEMY_LIVE_POLL_MS : ACADEMY_POLL_MS,
			);
		};

		const load = async (silent: boolean) => {
			if (inFlight || cancelled) return;
			inFlight = true;
			if (!silent) {
				setLaMasiaLoading(true);
				setLaMasiaError(null);
			}
			try {
				const hub = await fetchLaMasia();
				if (cancelled) return;
				setLaMasia(hub);
				setLaMasiaError(null);
				schedule(hub);
			} catch {
				if (!cancelled && !silent) {
					setLaMasiaError('Could not load La Masia / Barça Atlètic roster.');
				}
				if (!cancelled) schedule(laMasiaRef.current);
			} finally {
				inFlight = false;
				if (!cancelled) setLaMasiaLoading(false);
			}
		};

		void load(Boolean(laMasiaRef.current));

		const onVisible = () => {
			if (document.visibilityState === 'visible') void load(true);
		};
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [tab, data]);

	useEffect(() => {
		if (tab !== 'la-masia' || igFeed || igLoading) return;
		setIgLoading(true);
		void fetchInstagramFeed('fcbmasia')
			.then(setIgFeed)
			.catch(() => setIgFeed(null))
			.finally(() => setIgLoading(false));
	}, [tab, igFeed, igLoading]);

	if (!data) {
		return (
			<div className="empty-state">
				<p>Fetch latest to load the official Barça squad.</p>
				<FetchButton />
			</div>
		);
	}

	const players = sortPlayers(data.squad.players);

	return (
		<section className="squad-hub-page">
			<div className="section-head">
				<h2>Squad Hub</h2>
				<p>
					{tab === 'first-team'
						? data.squad.source ??
							'Official first-team roster from FC Barcelona — click any player for season & Barça career stats.'
						: laMasia?.source ??
							'La Masia pathway — Infantil to first team, with live Juvenil A and Atlètic.'}
				</p>
				{tab === 'first-team' && data.squad.lastMatch && (
					<p className="muted squad-source-note">
						Full first-team roster · last match: {data.squad.lastMatch.starters} starters +{' '}
						{data.squad.lastMatch.subs} subs vs {data.squad.lastMatch.opponent} (
						{formatDate(data.squad.lastMatch.date)})
					</p>
				)}
				{tab === 'la-masia' && laMasia?.note && (
					<p className="muted squad-source-note">{laMasia.note}</p>
				)}
			</div>

			<div className="filter-pills squad-hub-tabs">
				<button type="button" className={tab === 'first-team' ? 'active' : ''} onClick={() => setTab('first-team')}>
					First Team
				</button>
				<button type="button" className={tab === 'la-masia' ? 'active' : ''} onClick={() => setTab('la-masia')}>
					La Masia
				</button>
			</div>

			{tab === 'first-team' && (
				<>
					<div className="coach-card">
						<span className="coach-label">Head Coach</span>
						<strong>{data.squad.coach}</strong>
					</div>
					<div className="squad-hub-grid">
						{players.map((p) => (
							<SquadCard
								key={p.id}
								player={p}
								onOpen={(origin) => openPlayerStats(p, origin)}
							/>
						))}
					</div>
				</>
			)}

			{tab === 'la-masia' && (
				<div className="la-masia-hub">
					{laMasiaLoading && <p className="muted loading-msg">Loading La Masia roster…</p>}
					{laMasiaError && <p className="fetch-error">{laMasiaError}</p>}
					{laMasia && (
						<>
							<div className="la-masia-section">
								<div className="section-head inline">
									<div>
										<span className="panel-label">Pathway</span>
										<h3>Infantil → Cadet → Juvenil → Atlètic → first team</h3>
									</div>
								</div>
								<p className="muted la-masia-pathway-lead">
									Same language all the way up. Live lists here are Juvenil A, Barça Atlètic, and academy names already in the first team.
								</p>
								<ol className="la-masia-pathway">
									{laMasia.pathway.map((rung, i) => (
										<li key={rung.id}>
											{i > 0 && (
												<span className="la-masia-pathway-arrow" aria-hidden>
													→
												</span>
											)}
											{rung.live ? (
												<a className="la-masia-rung is-live" href={`#la-masia-${rung.id}`}>
													<strong>{rung.label}</strong>
													<span>{rung.ages}</span>
													<em>{rung.count != null ? `${rung.count} in feed` : 'Live'}</em>
												</a>
											) : (
												<div className="la-masia-rung">
													<strong>{rung.label}</strong>
													<span>{rung.ages}</span>
													<em>Campus</em>
												</div>
											)}
										</li>
									))}
								</ol>
							</div>

							<div className="la-masia-section">
								<div className="section-head inline">
									<div>
										<span className="panel-label">Weekend</span>
										<h3>Academy round-up</h3>
									</div>
									{laMasia.fetchedAt && (
										<span className="muted">Updated {formatDateTime(laMasia.fetchedAt)}</span>
									)}
								</div>
								<div className="la-masia-weekend">
									{laMasia.weekend.map((team) => (
										<article key={team.id} className="la-masia-weekend-card">
											<span className="panel-label">{team.label}</span>
											<WeekendLine kind="Last" match={team.last} />
											<WeekendLine kind="Next" match={team.next} />
										</article>
									))}
								</div>
							</div>

							<div className="la-masia-section">
								<div className="section-head inline">
									<div>
										<span className="panel-label">Instagram</span>
										<h3>@fcbmasia</h3>
									</div>
									<a
										href={igFeed?.profileUrl ?? 'https://www.instagram.com/fcbmasia/'}
										target="_blank"
										rel="noreferrer"
										className="btn-ghost"
									>
										Open official →
									</a>
								</div>
								<p className="muted la-masia-pathway-lead">
									Official academy feed — scores graphics, kick-offs, and the kids. Weekend results above stay on SofaScore.
								</p>
								{igLoading && !igFeed && <p className="muted loading-msg">Loading @fcbmasia…</p>}
								{igFeed?.posts.length ? (
									<div className="la-masia-ig-grid">
										{igFeed.posts.slice(0, 6).map((post) => (
											<a
												key={post.id}
												href={post.url}
												target="_blank"
												rel="noreferrer"
												className="la-masia-ig-tile"
											>
												<img src={post.image} alt="" loading="lazy" />
												<span>{post.caption || 'Open on Instagram'}</span>
											</a>
										))}
									</div>
								) : (
									!igLoading && (
										<a
											href="https://www.instagram.com/fcbmasia/"
											target="_blank"
											rel="noreferrer"
											className="la-masia-ig-fallback"
										>
											<InstagramIcon />
											<div>
												<strong>@fcbmasia</strong>
												<em>Public previews didn’t load here — open the official academy Instagram.</em>
											</div>
										</a>
									)
								)}
							</div>

							<div className="la-masia-culture">
								<article className="la-masia-culture-panel">
									<span className="panel-label">Origin</span>
									<h3>{LA_MASIA_ORIGIN.title}</h3>
									<p>
										Opened <strong>{LA_MASIA_ORIGIN.founded}</strong>. {LA_MASIA_ORIGIN.body}
									</p>
									<p className="muted">{LA_MASIA_ORIGIN.cruyff}</p>
								</article>
								<article className="la-masia-culture-panel">
									<span className="panel-label">HEART</span>
									<h3>How they ask the kids to live</h3>
									<ul className="la-masia-heart">
										{LA_MASIA_HEART.map((item) => (
											<li key={item.letter}>
												<strong>{item.letter}</strong>
												<div>
													<span>{item.word}</span>
													<em>{item.line}</em>
												</div>
											</li>
										))}
									</ul>
								</article>
								<article className="la-masia-culture-panel">
									<span className="panel-label">Place</span>
									<h3>Where they train and play</h3>
									<p>
										<strong>{LA_MASIA_PLACE.campus}</strong>
										<span className="muted"> {LA_MASIA_PLACE.campusNote}</span>
									</p>
									<p>
										<strong>{LA_MASIA_PLACE.stadium}</strong>
										<span className="muted"> {LA_MASIA_PLACE.stadiumNote}</span>
									</p>
								</article>
							</div>

							<div className="la-masia-section" id="la-masia-juvenil">
								<div className="section-head inline">
									<div>
										<span className="panel-label">Juvenil A</span>
										<h3>U19 — last step before Atlètic</h3>
									</div>
									<span className="muted">{laMasia.juvenil.length} players</span>
								</div>
								{laMasia.juvenil.length ? (
									<div className="squad-hub-grid">
										{laMasia.juvenil.map((p) => (
											<LaMasiaCard
												key={p.id}
												player={p}
												onOpen={
													p.statsAvailable
														? (origin) => openPlayerStats(toPlayer(p), origin)
														: undefined
												}
											/>
										))}
									</div>
								) : (
									<p className="muted">Juvenil A roster is not in this feed right now.</p>
								)}
							</div>

							<div className="la-masia-section" id="la-masia-atletic">
								<div className="section-head inline">
									<div>
										<span className="panel-label">Barça Atlètic</span>
										<h3>Reserve team at Estadi Johan Cruyff</h3>
									</div>
									<span className="muted">{laMasia.atletic.length} players</span>
								</div>
								<div className="squad-hub-grid">
									{laMasia.atletic.map((p) => (
										<LaMasiaCard
											key={p.id}
											player={p}
											onOpen={
												p.statsAvailable
													? (origin) => openPlayerStats(toPlayer(p), origin)
													: undefined
											}
										/>
									))}
								</div>
							</div>

							<div className="la-masia-section" id="la-masia-first-team">
								<div className="section-head inline">
									<div>
										<span className="panel-label">First team</span>
										<h3>Academy already in the senior squad</h3>
									</div>
									<span className="muted">{laMasia.firstTeam.length} players</span>
								</div>
								{laMasia.firstTeam.length ? (
									<div className="squad-hub-grid">
										{laMasia.firstTeam.map((p) => (
											<LaMasiaCard
												key={p.id}
												player={p}
												onOpen={
													p.statsAvailable
														? (origin) => openPlayerStats(toPlayer(p), origin)
														: undefined
												}
											/>
										))}
									</div>
								) : (
									<p className="muted">No first-team academy matches in the loaded squad yet.</p>
								)}
							</div>
						</>
					)}
				</div>
			)}
		</section>
	);
}

function matchScore(match: LaMasiaMatch) {
	if (match.homeScore == null || match.awayScore == null) return null;
	return match.isHome
		? `${match.homeScore}–${match.awayScore}`
		: `${match.awayScore}–${match.homeScore}`;
}

function WeekendLine({ kind, match }: { kind: 'Last' | 'Next'; match: LaMasiaMatch | null }) {
	if (!match) {
		return (
			<p className="la-masia-weekend-line">
				<span>{kind}</span>
				<em className="muted">TBD</em>
			</p>
		);
	}
	const live = isLiveStatus(match.status);
	const score = matchScore(match);
	const when = [formatDate(match.date, match.time), formatTime(match.time, match.date)]
		.filter(Boolean)
		.join(' · ');
	return (
		<p className={`la-masia-weekend-line${live ? ' is-live' : ''}`}>
			<span>{live ? 'Live' : kind}</span>
			<strong>
				{match.isHome ? 'vs' : '@'} {match.opponent}
				{score ? ` ${score}` : ''}
			</strong>
			<em>
				{match.competition ? `${match.competition} · ` : ''}
				{when}
			</em>
		</p>
	);
}

function toPlayer(p: LaMasiaPlayer): Player {
	return {
		id: p.id,
		fcbId: p.fcbId,
		sofaId: p.sofaId,
		name: p.name,
		position: p.position,
		number: p.number,
		nationality: p.nationality,
		photo: p.photo,
		birthDate: p.birthDate,
	};
}

function SquadCard({
	player,
	onOpen,
}: {
	player: Player;
	onOpen: (origin: PlayerOpenOrigin) => void;
}) {
	return (
		<button
			type="button"
			className="squad-hub-card"
			onClick={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				onOpen({
					x: rect.left + rect.width / 2,
					y: rect.top + rect.height / 2,
				});
			}}
		>
			<PlayerAvatar player={player} size="lg" />
			<div>
				{player.number && <span className="num">#{player.number}</span>}
				<strong>{player.name}</strong>
				<span className="muted">{player.position}</span>
				<span className="click-hint">View stats →</span>
			</div>
		</button>
	);
}

function LaMasiaCard({
	player,
	onOpen,
}: {
	player: LaMasiaPlayer;
	onOpen?: (origin: PlayerOpenOrigin) => void;
}) {
	const clickable = Boolean(onOpen);
	const body = (
		<>
			<PlayerAvatar player={toPlayer(player)} size="lg" />
			<div>
				{player.number && <span className="num">#{player.number}</span>}
				<strong>{player.name}</strong>
				<span className="muted">{player.position}</span>
				<span className={`la-masia-badge ${player.group}`}>
					{player.group === 'first-team' ? 'First team' : player.group === 'juvenil' ? 'Juvenil A' : 'Atlètic'}
				</span>
				{clickable ? (
					<span className="click-hint">View stats →</span>
				) : (
					<span className="click-hint muted">Stats unavailable</span>
				)}
			</div>
		</>
	);

	if (!clickable) {
		return <div className="squad-hub-card is-static">{body}</div>;
	}

	return (
		<button
			type="button"
			className="squad-hub-card"
			onClick={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				onOpen?.({
					x: rect.left + rect.width / 2,
					y: rect.top + rect.height / 2,
				});
			}}
		>
			{body}
		</button>
	);
}
