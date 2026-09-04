type Props = {
	muted: boolean;
	onToggle: () => void;
};

export function AnthemMuteButton({ muted, onToggle }: Props) {
	return (
		<button
			type="button"
			className={`anthem-mute-btn ${muted ? 'is-muted' : ''}`}
			onClick={onToggle}
			aria-pressed={muted}
			aria-label={muted ? 'Unmute background anthem' : 'Mute background anthem'}
			title={
				muted
					? 'Unmute background chants & anthem (8%)'
					: 'Mute background chants & anthem (8%)'
			}
		>
			<span aria-hidden>{muted ? '🔇' : '🔊'}</span>
		</button>
	);
}
