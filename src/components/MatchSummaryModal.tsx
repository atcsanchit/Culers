import { useEffect, useState } from 'react';
import type { Fixture, MatchSummary } from '../types';
import { fetchMatchSummary, formatDate, formatTime, isFixtureLive } from '../lib/api';
import { useProfileMotion } from '../lib/motion';
import { CAMP_NOU_BG, teamCrestSrc, teamInitials } from '../lib/photos';
import { MatchSummaryContent, MatchSummarySkeleton } from './MatchSummaryContent';

type Props = {
	fixture: Fixture | null;
	onClose: () => void;
};

type Tab = 'stats' | 'events' | 'lineups';

function crestFor(teamName: string, url: string) {
	return teamCrestSrc(teamName, url);
}

export function MatchSummaryModal({ fixture, onClose }: Props) {
	const [summary, setSummary] = useState<MatchSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>('stats');
	const [homeCrestOk, setHomeCrestOk] = useState(false);
	const [awayCrestOk, setAwayCrestOk] = useState(false);
	const { motion, requestClose } = useProfileMotion(fixture?.id ?? null, onClose);

	const wallpaper = summary?.backgroundImage ?? CAMP_NOU_BG;

	useEffect(() => {
		if (!fixture) return;
		setTab('stats');
		setHomeCrestOk(false);
		setAwayCrestOk(false);
	}, [fixture?.id]);

	useEffect(() => {
		if (!fixture) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') requestClose();
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [fixture, requestClose]);

	useEffect(() => {
		if (!fixture?.id) {
			setSummary(null);
			return;
		}
		setLoading(true);
		setError(null);
		void fetchMatchSummary(fixture.id)
			.then(setSummary)
			.catch(() => setError('Could not load match summary from FC Barcelona official API.'))
			.finally(() => setLoading(false));
	}, [fixture?.id]);

	if (!fixture) return null;

	const homeTeam = summary?.homeTeam ?? fixture.homeTeam;
	const awayTeam = summary?.awayTeam ?? fixture.awayTeam;
	const isPreview = summary?.preview || (!summary && !isFixtureLive(fixture) && fixture.kind === 'upcoming');
	const homeScore = summary?.homeScore ?? fixture.homeScore ?? 0;
	const awayScore = summary?.awayScore ?? fixture.awayScore ?? 0;
	const homeCrest = crestFor(homeTeam, summary?.homeCrest ?? '');
	const awayCrest = crestFor(awayTeam, summary?.awayCrest ?? '');

	return (
		<div
			className={`modal-backdrop split-backdrop fullscreen profile-backdrop match-backdrop profile-motion-${motion}`}
			role="presentation"
		>
			<div
				className={`player-stats-modal split blended fullscreen match-summary-modal profile-motion-${motion}`}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				<div
					className={`modal-photo-panel match-photo-panel profile-photo-panel profile-motion-${motion}`}
					style={{ backgroundImage: `url(${wallpaper})` }}
					onClick={requestClose}
					role="presentation"
				>
					<div className={`match-crests-hero profile-motion-${motion}`}>
						<div className="match-crest-slot home">
							{homeCrest && (
								<img
									src={homeCrest}
									alt=""
									className={`match-crest-img ${homeCrestOk ? '' : 'is-loading'}`}
									onLoad={() => setHomeCrestOk(true)}
									onError={() => setHomeCrestOk(false)}
								/>
							)}
							{(!homeCrest || !homeCrestOk) && (
								<span className="match-crest-fallback">{teamInitials(homeTeam)}</span>
							)}
							<span className="match-crest-name">{homeTeam}</span>
						</div>

						<div className={`match-score-center profile-motion-${motion}`}>
							{isPreview ? (
								<span className="match-scoreline preview">vs</span>
							) : (
								<span className="match-scoreline">
									{homeScore} – {awayScore}
								</span>
							)}
							<span className="match-comp">{summary?.competition ?? fixture.competition}</span>
							{isPreview && (
								<span className="tag upcoming match-preview-tag">Upcoming preview</span>
							)}
							<span className="match-when muted">
								{formatDate(summary?.date ?? fixture.date, summary?.time ?? fixture.time)}
								{(summary?.time ?? fixture.time) &&
									` · ${formatTime(summary?.time ?? fixture.time, summary?.date ?? fixture.date)} IST`}
							</span>
						</div>

						<div className="match-crest-slot away">
							{awayCrest && (
								<img
									src={awayCrest}
									alt=""
									className={`match-crest-img ${awayCrestOk ? '' : 'is-loading'}`}
									onLoad={() => setAwayCrestOk(true)}
									onError={() => setAwayCrestOk(false)}
								/>
							)}
							{(!awayCrest || !awayCrestOk) && (
								<span className="match-crest-fallback">{teamInitials(awayTeam)}</span>
							)}
							<span className="match-crest-name">{awayTeam}</span>
						</div>
					</div>

					<div className={`modal-photo-meta match-photo-meta profile-motion-${motion}`}>
						<p className="muted match-venue">{summary?.venue ?? fixture.venue}</p>
						{summary?.attendance != null && (
							<p className="muted">Attendance {summary.attendance.toLocaleString('en-IN')}</p>
						)}
						<div className="match-opta-badge" aria-label="Opta Match Stats">
							<span className="opta-mark">Opta</span>
							<span className="opta-label">Match Stats</span>
						</div>
					</div>
				</div>

				<div className={`modal-stats-panel profile-stats-panel match-stats-rich-panel profile-motion-${motion}`}>
					<div className="stats-tabs match-stats-tabs">
						<button type="button" className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
							Match stats
						</button>
						<button type="button" className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>
							Goals & cards
						</button>
						<button type="button" className={tab === 'lineups' ? 'active' : ''} onClick={() => setTab('lineups')}>
							Lineups
						</button>
					</div>

					{loading && (
						<>
							<p className="muted loading-msg">Loading match summary…</p>
							<MatchSummarySkeleton />
						</>
					)}
					{error && <p className="fetch-error">{error}</p>}

					{!loading && !error && summary && (
						<MatchSummaryContent
							summary={summary}
							homeTeam={homeTeam}
							awayTeam={awayTeam}
							tab={tab}
							motion={motion}
						/>
					)}

					{summary?.source && <p className="stats-source muted">{summary.source}</p>}
				</div>
			</div>
		</div>
	);
}
