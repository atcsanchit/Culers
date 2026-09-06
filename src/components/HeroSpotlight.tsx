import { useEffect, useMemo, useRef, useState } from 'react';
import type { Fixture, MatchSummary, NewsItem } from '../types';
import { fetchMatchSummary, formatFixtureWhen } from '../lib/api';
import { countdownParts, fixtureKickoffMs, matchRivalry, type RivalryContext } from '../lib/rivalry';
import { pickOnThisDay } from '../data/onThisDay';
import { BARCA_CREST, teamCrestSrc, teamInitials } from '../lib/photos';

/** Keep in sync with La Masia spotlight auto-rotate. */
export const HERO_ROTATE_MS = 7000;

type Props = {
	news: NewsItem[];
	next: Fixture | null;
	rivalry: RivalryContext | null;
	onOpenFixture: (fixture: Fixture) => void;
	onOpenNews: () => void;
	onOpenOnThisDay: () => void;
};

type SlideKind = 'next' | 'rivalry' | 'history' | 'news';

type Slide = {
	id: string;
	kind: SlideKind;
};

function pad(n: number) {
	return String(n).padStart(2, '0');
}

function MiniCrest({ name, url }: { name: string; url: string }) {
	const [ok, setOk] = useState(false);
	const ref = useRef<HTMLImageElement>(null);
	const src = teamCrestSrc(name, url);

	useEffect(() => {
		setOk(false);
		const img = ref.current;
		if (img?.complete && img.naturalWidth > 0) setOk(true);
	}, [src]);

	return (
		<span className="hero-spot-crest-wrap">
			{src ? (
				<img
					ref={ref}
					key={src}
					src={src}
					alt=""
					className={`hero-spot-crest${ok ? '' : ' is-loading'}`}
					onLoad={() => setOk(true)}
					onError={() => setOk(false)}
				/>
			) : null}
			{(!src || !ok) && <span className="hero-spot-crest-fallback">{teamInitials(name)}</span>}
		</span>
	);
}

export function HeroSpotlight({
	news,
	next,
	rivalry,
	onOpenFixture,
	onOpenNews,
	onOpenOnThisDay,
}: Props) {
	const history = useMemo(() => pickOnThisDay(new Date()), []);
	const newsItem = news[0] ?? null;
	const [summary, setSummary] = useState<MatchSummary | null>(null);

	useEffect(() => {
		if (!next?.id) {
			setSummary(null);
			return;
		}
		let cancelled = false;
		setSummary(null);
		void fetchMatchSummary(next.id)
			.then((s) => {
				if (!cancelled) setSummary(s);
			})
			.catch(() => {
				if (!cancelled) setSummary(null);
			});
		return () => {
			cancelled = true;
		};
	}, [next?.id]);

	const nextIsRivalry = next ? matchRivalry(next.opponent) : null;
	const rivalryUpcoming = rivalry && rivalry.phase === 'upcoming' ? rivalry : null;
	const showRivalrySlide = Boolean(
		rivalryUpcoming && (!next || rivalryUpcoming.fixture.id !== next.id),
	);

	const slides = useMemo(() => {
		const list: Slide[] = [];
		if (next) list.push({ id: `next-${next.id}`, kind: 'next' });
		if (showRivalrySlide && rivalryUpcoming) {
			list.push({ id: `rivalry-${rivalryUpcoming.rivalry.id}`, kind: 'rivalry' });
		}
		list.push({ id: `history-${history.event.md}-${history.event.year}`, kind: 'history' });
		if (newsItem) list.push({ id: `news-${newsItem.link}`, kind: 'news' });
		return list;
	}, [next, showRivalrySlide, rivalryUpcoming, history.event.md, history.event.year, newsItem]);

	const [idx, setIdx] = useState(0);
	const [paused, setPaused] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const [animKey, setAnimKey] = useState(0);

	const go = (delta: number) => {
		if (!slides.length) return;
		setIdx((i) => (i + delta + slides.length) % slides.length);
		setAnimKey((k) => k + 1);
	};

	useEffect(() => {
		setIdx(0);
		setAnimKey((k) => k + 1);
	}, [slides.map((s) => s.id).join('|')]);

	useEffect(() => {
		if (slides.length <= 1 || paused) return;
		const t = window.setInterval(() => {
			setIdx((i) => (i + 1) % slides.length);
			setAnimKey((k) => k + 1);
		}, HERO_ROTATE_MS);
		return () => window.clearInterval(t);
	}, [slides.length, paused]);

	useEffect(() => {
		const needsClock = slides.some((s) => s.kind === 'next' || s.kind === 'rivalry');
		if (!needsClock) return;
		const t = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(t);
	}, [slides]);

	if (!slides.length) return null;

	const safeIdx = idx % slides.length;
	const slide = slides[safeIdx]!;

	const nextKick = next ? fixtureKickoffMs(next) : null;
	const nextCd = nextKick != null ? countdownParts(nextKick, now) : null;
	const rivKick = rivalryUpcoming ? fixtureKickoffMs(rivalryUpcoming.fixture) : null;
	const rivCd = rivKick != null ? countdownParts(rivKick, now) : null;

	const nextHome = summary?.homeTeam ?? next?.homeTeam ?? 'FC Barcelona';
	const nextAway = summary?.awayTeam ?? next?.awayTeam ?? next?.opponent ?? '';
	const homeCrest =
		summary?.homeCrest ||
		(next?.isHome ? BARCA_CREST : nextIsRivalry?.crestUrl || '');
	const awayCrest =
		summary?.awayCrest ||
		(next && !next.isHome ? BARCA_CREST : nextIsRivalry?.crestUrl || '');

	return (
		<div
			className="hero-spotlight"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
		>
			<div className="hero-spotlight-stage" aria-live="polite">
				<div key={`${slide.id}-${animKey}`} className="hero-spot-anim">
					{slide.kind === 'next' && next && nextCd && !nextCd.expired && (
						<button
							type="button"
							className={`hero-spot-card${nextIsRivalry ? ' is-rivalry' : ''}`}
							onClick={() => onOpenFixture(next)}
						>
							<span className="hero-spot-label">
								{nextIsRivalry ? nextIsRivalry.shortLabel : 'Next match'}
							</span>
							<div className="hero-spot-teams">
								<MiniCrest name={nextHome} url={homeCrest} />
								<span className="hero-spot-vs">vs</span>
								<MiniCrest name={nextAway} url={awayCrest} />
							</div>
							<strong className="hero-spot-title">
								{nextHome} vs {nextAway}
							</strong>
							<span className="hero-spot-when muted">{formatFixtureWhen(next.date, next.time)}</span>
							<div className="hero-spot-countdown" aria-label="Countdown">
								{(
									[
										['D', nextCd.days, false],
										['H', nextCd.hours, true],
										['M', nextCd.minutes, true],
										['S', nextCd.seconds, true],
									] as const
								).map(([label, value, padded]) => (
									<div key={label}>
										<strong>{padded ? pad(value) : value}</strong>
										<span>{label}</span>
									</div>
								))}
							</div>
						</button>
					)}

					{slide.kind === 'rivalry' && rivalryUpcoming && rivCd && !rivCd.expired && (
						<button
							type="button"
							className="hero-spot-card is-rivalry"
							onClick={() => onOpenFixture(rivalryUpcoming.fixture)}
						>
							<span className="hero-spot-label">Rivalry countdown</span>
							<div className="hero-spot-teams">
								<img src={BARCA_CREST} alt="" className="hero-spot-crest" />
								<span className="hero-spot-vs">vs</span>
								<MiniCrest
									name={rivalryUpcoming.rivalry.opponentLabel}
									url={rivalryUpcoming.rivalry.crestUrl}
								/>
							</div>
							<strong className="hero-spot-title">{rivalryUpcoming.rivalry.name}</strong>
							<span className="hero-spot-when muted">
								{formatFixtureWhen(rivalryUpcoming.fixture.date, rivalryUpcoming.fixture.time)}
							</span>
							<p className="hero-spot-blurb">{rivalryUpcoming.rivalry.tagline}</p>
							<div className="hero-spot-countdown" aria-label="Rivalry countdown">
								{(
									[
										['D', rivCd.days, false],
										['H', rivCd.hours, true],
										['M', rivCd.minutes, true],
										['S', rivCd.seconds, true],
									] as const
								).map(([label, value, padded]) => (
									<div key={label}>
										<strong>{padded ? pad(value) : value}</strong>
										<span>{label}</span>
									</div>
								))}
							</div>
						</button>
					)}

					{slide.kind === 'history' && (
						<button type="button" className="hero-spot-card is-history" onClick={onOpenOnThisDay}>
							<span className="hero-spot-label">
								{history.exact ? 'On this day' : 'Barça lore'}
							</span>
							<strong className="hero-spot-title">{history.event.title}</strong>
							<p className="hero-spot-blurb">{history.event.blurb}</p>
							<span className="hero-spot-cta">Open archive →</span>
						</button>
					)}

					{slide.kind === 'news' && newsItem && (
						<button type="button" className="hero-spot-card is-news" onClick={onOpenNews}>
							<span className="hero-spot-label">Barça news</span>
							<strong className="hero-spot-title">{newsItem.title}</strong>
							<span className="hero-spot-when muted">{newsItem.source}</span>
							<span className="hero-spot-cta">Read more →</span>
						</button>
					)}
				</div>
			</div>

			{slides.length > 1 && (
				<div className="hero-spotlight-nav">
					<button
						type="button"
						className="carousel-btn"
						onClick={() => go(-1)}
						aria-label="Previous highlight"
					>
						‹
					</button>
					<div className="hero-spotlight-dots" role="tablist" aria-label="Hero highlights">
						{slides.map((s, i) => (
							<button
								key={s.id}
								type="button"
								role="tab"
								aria-selected={i === safeIdx}
								className={`hero-spotlight-dot${i === safeIdx ? ' active' : ''}`}
								onClick={() => {
									setIdx(i);
									setAnimKey((k) => k + 1);
								}}
								aria-label={`Show ${s.kind}`}
							/>
						))}
					</div>
					<button
						type="button"
						className="carousel-btn"
						onClick={() => go(1)}
						aria-label="Next highlight"
					>
						›
					</button>
				</div>
			)}
		</div>
	);
}
