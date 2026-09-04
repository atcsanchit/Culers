type Props = {
	muted: boolean;
	onToggle: () => void;
};

export function FetchSfxMuteButton({ muted, onToggle }: Props) {
	return (
		<button
			type="button"
			className={`anthem-mute-btn fetch-sfx-mute-btn ${muted ? 'is-muted' : ''}`}
			onClick={onToggle}
			aria-pressed={muted}
			aria-label={muted ? 'Unmute fetch sounds' : 'Mute fetch sounds'}
			title={muted ? 'Unmute fetch dribble & goal cheer' : 'Mute fetch dribble & goal cheer'}
		>
			<span aria-hidden>{muted ? '📴' : '📣'}</span>
		</button>
	);
}
