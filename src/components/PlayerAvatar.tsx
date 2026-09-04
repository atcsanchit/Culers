import { useState } from 'react';
import type { Player } from '../types';
import { BARCA_CREST, playerInitials, playerPhotoSrc } from '../lib/photos';

type Props = {
	player: Player;
	className?: string;
	imgClassName?: string;
	size?: 'sm' | 'md' | 'lg';
};

/** Crest + shirt number when SofaScore / remote photo is missing or fails. */
export function PlayerAvatar({ player, className = '', imgClassName = '', size = 'md' }: Props) {
	const src = playerPhotoSrc(player);
	const [failed, setFailed] = useState(false);
	const showPhoto = Boolean(src && !failed);
	const number = player.number?.trim();

	if (!showPhoto) {
		return (
			<div
				className={`player-placeholder player-fallback ${size} ${className}`}
				aria-hidden
				title={player.name}
			>
				<img src={BARCA_CREST} alt="" className="player-fallback-crest" />
				{number ? (
					<span className="player-fallback-num">{number}</span>
				) : (
					<span className="player-fallback-initials">{playerInitials(player.name)}</span>
				)}
			</div>
		);
	}

	return (
		<img
			src={src}
			alt=""
			className={imgClassName || className}
			loading="lazy"
			onError={() => setFailed(true)}
		/>
	);
}
