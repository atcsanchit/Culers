const TOKEN = /(\#[\w]+|@[\w]+|https?:\/\/\S+)/g;

export function highlightTweetText(text: string) {
	const parts = text.split(TOKEN);
	return parts.map((part, i) => {
		if (part.startsWith('#')) {
			return (
				<span key={i} className="tweet-hl-hashtag">
					{part}
				</span>
			);
		}
		if (part.startsWith('@')) {
			return (
				<span key={i} className="tweet-hl-mention">
					{part}
				</span>
			);
		}
		if (part.startsWith('http')) {
			return (
				<span key={i} className="tweet-hl-link">
					{part}
				</span>
			);
		}
		if (/["“][^"”]+["”]/.test(part)) {
			return part.split(/(["“][^"”]+["”])/).map((bit, j) =>
				/^["“]/.test(bit) ? (
					<span key={`${i}-${j}`} className="tweet-hl-quote">
						{bit}
					</span>
				) : (
					<span key={`${i}-${j}`}>{bit}</span>
				),
			);
		}
		return <span key={i}>{part}</span>;
	});
}

type Props = {
	text: string;
	variant?: 'hero' | 'compact';
};

export function TweetQuoteHero({ text, variant = 'hero' }: Props) {
	return (
		<div className={`tweet-quote-hero ${variant}`}>
			<span className="tweet-quote-watermark" aria-hidden>
				“
			</span>
			<p className="tweet-quote-text">{highlightTweetText(text)}</p>
			<div className="tweet-quote-stripes" aria-hidden />
		</div>
	);
}
