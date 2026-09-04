import { sortPlayers } from '../lib/api';
import type { Player } from '../types';

type Props = {
	players: Player[];
	coach: string;
	compact?: boolean;
};

export function SquadPanel({ players, coach, compact = false }: Props) {
	const sorted = sortPlayers(players);

	const grouped = sorted.reduce<Record<string, Player[]>>((acc, p) => {
		const key = p.position.split(' ')[0] || 'Other';
		(acc[key] ??= []).push(p);
		return acc;
	}, {});

	return (
		<div className={`squad-panel ${compact ? 'compact' : ''}`}>
			<div className="coach-card">
				<span className="coach-label">Head Coach</span>
				<strong>{coach}</strong>
			</div>
			{Object.entries(grouped).map(([group, list]) => (
				<section key={group}>
					<h4>{group}s</h4>
					<div className="player-grid">
						{list.map((p) => (
							<div key={p.id} className="player-card">
								{p.photo ? (
									<img src={p.photo} alt="" loading="lazy" />
								) : (
									<div className="player-placeholder">{p.name.slice(0, 1)}</div>
								)}
								<div>
									{p.number && <span className="num">#{p.number}</span>}
									<strong>{p.name}</strong>
									<span className="muted">{p.position}</span>
									{p.nationality && <span className="nat">{p.nationality}</span>}
								</div>
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
