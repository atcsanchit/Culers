import { useEffect, useState } from 'react';
import { useBarca } from '../store/BarcaState';
import { sortPlayers, formatDate, fetchLaMasia } from '../lib/api';
import { FetchButton } from './FetchButton';
import { PlayerAvatar } from './PlayerAvatar';
import type { PlayerOpenOrigin } from '../store/BarcaState';
import type { LaMasiaHub, LaMasiaPlayer, Player } from '../types';

type SquadTab = 'first-team' | 'la-masia';

export function SquadHubPage() {
	const { data, openPlayerStats } = useBarca();
	const [tab, setTab] = useState<SquadTab>('first-team');
	const [laMasia, setLaMasia] = useState<LaMasiaHub | null>(null);
	const [laMasiaLoading, setLaMasiaLoading] = useState(false);
	const [laMasiaError, setLaMasiaError] = useState<string | null>(null);

	useEffect(() => {
		if (tab !== 'la-masia' || !data || laMasia || laMasiaLoading) return;
		setLaMasiaLoading(true);
		setLaMasiaError(null);
		void fetchLaMasia()
			.then(setLaMasia)
			.catch(() => setLaMasiaError('Could not load La Masia / Barça Atlètic roster.'))
			.finally(() => setLaMasiaLoading(false));
	}, [tab, data, laMasia, laMasiaLoading]);

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
							'La Masia — first-team academy products and current Barça Atlètic.'}
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
										<span className="panel-label">First team</span>
										<h3>Academy in the first team</h3>
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

							<div className="la-masia-section">
								<div className="section-head inline">
									<div>
										<span className="panel-label">Barça Atlètic</span>
										<h3>Current reserve squad</h3>
									</div>
									<span className="muted">{laMasia.atletic.length} players</span>
								</div>
								<div className="squad-hub-grid">
									{laMasia.atletic.map((p) => (
										<LaMasiaCard key={p.id} player={p} />
									))}
								</div>
							</div>
						</>
					)}
				</div>
			)}
		</section>
	);
}

function toPlayer(p: LaMasiaPlayer): Player {
	return {
		id: p.id,
		fcbId: p.fcbId,
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
					{player.group === 'first-team' ? 'First team' : 'Atlètic'}
				</span>
				{clickable ? (
					<span className="click-hint">View stats →</span>
				) : (
					<span className="click-hint muted">Reserve roster</span>
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
