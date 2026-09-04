import { useBarca } from '../store/BarcaState';
import { sortPlayers, formatDate } from '../lib/api';
import { FetchButton } from './FetchButton';
import { PlayerAvatar } from './PlayerAvatar';
import type { PlayerOpenOrigin } from '../store/BarcaState';

export function SquadHubPage() {
	const { data, openPlayerStats } = useBarca();

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
					{data.squad.source ??
						'Official first-team roster from FC Barcelona — click any player for season & Barça career stats.'}
				</p>
				{data.squad.lastMatch && (
					<p className="muted squad-source-note">
						Full first-team roster · last match: {data.squad.lastMatch.starters} starters +{' '}
						{data.squad.lastMatch.subs} subs vs {data.squad.lastMatch.opponent} (
						{formatDate(data.squad.lastMatch.date)})
					</p>
				)}
			</div>

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
		</section>
	);
}

function SquadCard({
	player,
	onOpen,
}: {
	player: import('../types').Player;
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

