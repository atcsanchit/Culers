import type { Player } from '../types';
import { PlayerAvatar } from './PlayerAvatar';

type Props = {
	player: Player;
	slot?: string;
};

export function PlayerHoverCard({ player, slot }: Props) {
	return (
		<div className="player-hover-card">
			<PlayerAvatar player={player} size="md" imgClassName="hover-photo" />
			<div className="hover-body">
				{player.number && <span className="num">#{player.number}</span>}
				<strong>{player.name}</strong>
				<span className="muted">{player.position}</span>
				{slot && slot !== 'SUB' && <span className="slot-tag">{slot}</span>}
				{player.nationality && <span className="nat">{player.nationality}</span>}
			</div>
		</div>
	);
}
