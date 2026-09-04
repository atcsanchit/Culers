import type { MatchLineupPlayer } from '../types';
import type { Player } from '../types';
import { assignToFormation } from '../lib/lineup';

function toPlayer(p: MatchLineupPlayer): Player {
	return {
		id: p.id,
		name: p.name,
		position: p.position,
		number: p.number,
		nationality: '',
		photo: '',
		birthDate: '',
	};
}

type Props = {
	team: string;
	starters: MatchLineupPlayer[];
	subs: MatchLineupPlayer[];
	side: 'home' | 'away';
};

export function MatchLineupPitch({ team, starters, subs, side }: Props) {
	const pitchPlayers = assignToFormation(starters.map(toPlayer), '4-3-3');

	return (
		<div className={`match-pitch-block ${side}`}>
			<h4>{team}</h4>
			<div className="match-mini-pitch">
				<div className="pitch-grass" />
				<div className="pitch-box top" />
				<div className="pitch-box bottom" />
				<div className="pitch-half-line" />
				<div className="pitch-center-circle" />
				{pitchPlayers.map(({ player, x, y }) => (
					<div
						key={player.id}
						className="match-pitch-player"
						style={{ left: `${x}%`, top: `${y}%` }}
						title={`${player.name} · ${player.position}`}
					>
						<span className="match-pitch-num">{player.number || '·'}</span>
						<span className="match-pitch-name">{player.name.split(' ').pop()}</span>
					</div>
				))}
			</div>
			{subs.length > 0 && (
				<div className="match-pitch-bench">
					<span className="lineup-section-label">Bench</span>
					<div className="match-pitch-bench-chips">
						{subs.map((p) => (
							<span key={p.id} className="bench-chip">
								{p.number && <strong>{p.number}</strong>}
								{p.name.split(' ').pop()}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
