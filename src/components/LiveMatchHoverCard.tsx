import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchLiveMatch } from '../lib/api';
import type { LiveBoardDetail, LiveBoardMatch } from '../types';
import { LiveGraphic } from './LiveGraphic';
import { MatchRatingsPitch } from './MatchRatingsPitch';

type Props = {
	match: LiveBoardMatch;
	isLive: boolean;
	isUpcoming?: boolean;
	anchor: { top: number; left: number };
	onKeepOpen: () => void;
	onRequestClose: () => void;
};

function hoursAgo(ts: number) {
	if (!ts) return '';
	const end = ts + 105 * 60;
	const hours = Math.max(0, Math.round((Date.now() / 1000 - end) / 3600));
	if (hours < 1) return 'Just finished';
	if (hours === 1) return '1 hour ago';
	return `${hours} hours ago`;
}

function kickoffLabel(ts: number) {
	if (!ts) return 'Upcoming';
	const d = new Date(ts * 1000);
	if (Number.isNaN(d.getTime())) return 'Upcoming';
	return d.toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
}

function clampPosition(top: number, left: number, width: number, height: number) {
	const pad = 12;
	const maxLeft = Math.max(pad, window.innerWidth - width - pad);
	const maxTop = Math.max(pad, window.innerHeight - height - pad);
	return {
		top: Math.min(Math.max(pad, top), maxTop),
		left: Math.min(Math.max(pad, left), maxLeft),
	};
}

/** Floating gold-edged preview: score, timeline, and lineup pitch. */
export function LiveMatchHoverCard({
	match,
	isLive,
	isUpcoming = false,
	anchor,
	onKeepOpen,
	onRequestClose,
}: Props) {
	const [detail, setDetail] = useState<LiveBoardDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [pos, setPos] = useState(anchor);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setDetail(null);
		void fetchLiveMatch(match.id)
			.then((next) => {
				if (!cancelled) setDetail(next);
			})
			.catch(() => {
				if (!cancelled) setDetail(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [match.id]);

	useEffect(() => {
		const width = Math.min(560, window.innerWidth * 0.56);
		const height = Math.min(680, window.innerHeight * 0.82);
		setPos(clampPosition(anchor.top, anchor.left, width, height));
	}, [anchor.top, anchor.left]);

	const clock = isLive ? detail?.clock || match.clock : isUpcoming ? kickoffLabel(match.startTimestamp) : 'Full time';
	const statusLine = isLive
		? clock
		: isUpcoming
			? `Kick-off ${kickoffLabel(match.startTimestamp)}${match.venue ? ` · ${match.venue}` : ''}`
			: `Full time${match.startTimestamp ? ` · ${hoursAgo(match.startTimestamp)}` : ''}${match.venue ? ` · ${match.venue}` : ''}`;

	return createPortal(
		<div
			className="live-board-hover-card"
			style={{ top: pos.top, left: pos.left }}
			role="dialog"
			aria-label={`${match.homeTeam} versus ${match.awayTeam} preview`}
			onMouseEnter={onKeepOpen}
			onMouseLeave={onRequestClose}
		>
			<header className="live-board-hover-score">
				<span className="panel-label">{match.competition}</span>
				<div className="live-board-score-row">
					<strong>{match.homeTeam}</strong>
					<span>{isUpcoming ? 'vs' : `${match.homeScore ?? '–'} : ${match.awayScore ?? '–'}`}</span>
					<strong>{match.awayTeam}</strong>
				</div>
				<p className="muted">
					{isLive ? <span className="pulse" /> : null} {statusLine}
				</p>
			</header>

			{loading && <p className="muted live-board-hover-status">Loading match preview…</p>}

			{!loading && isUpcoming && (
				<p className="muted live-board-hover-status">Lineups and events unlock at kick-off.</p>
			)}

			{!loading && !isUpcoming && (
				<>
					<LiveGraphic
						events={detail?.events ?? []}
						clock={clock}
						live={isLive}
						homeScore={match.homeScore}
						awayScore={match.awayScore}
						homeLabel={match.homeTeam}
						awayLabel={match.awayTeam}
					/>

					<details className="match-ratings-details live-board-hover-lineup" open>
						<summary>Lineup & match ratings</summary>
						<MatchRatingsPitch fixtureId={String(match.id)} pollKey={detail?.fetchedAt ?? match.id} />
					</details>
				</>
			)}
		</div>,
		document.body,
	);
}
