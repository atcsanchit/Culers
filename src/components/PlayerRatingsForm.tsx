import { useEffect, useMemo, useState } from 'react';
import { emptyPlayerRatings, useBarca, useSelectedFixture } from '../store/BarcaState';
import { fetchLineup, formatFixtureWhen, sortPlayers } from '../lib/api';
import {
	communityAverageFor,
	loadCommunityAverages,
	type CommunityAverages,
} from '../lib/storage';
import type { PlayerRating } from '../types';

export function PlayerRatingsForm() {
	const { data, selectedMatchId, selectMatch, ratings, saveMatchRatings, setTab } = useBarca();
	const fixture = useSelectedFixture();
	const [coachRating, setCoachRating] = useState(6);
	const [coachNote, setCoachNote] = useState('');
	const [playerRatings, setPlayerRatings] = useState<PlayerRating[]>([]);
	const [saved, setSaved] = useState(false);
	const [startersOnly, setStartersOnly] = useState(true);
	const [xiIds, setXiIds] = useState<Set<string>>(new Set());
	const [community, setCommunity] = useState<CommunityAverages>(() => loadCommunityAverages());

	const finishedMatches = (data?.fixtures ?? []).filter(
		(f) => f.kind === 'past' && f.homeScore != null,
	);

	useEffect(() => {
		if (!selectedMatchId || !data?.squad.players.length) return;
		let cancelled = false;

		const existing = ratings[selectedMatchId];
		const squadSorted = sortPlayers(data.squad.players);

		void fetchLineup(selectedMatchId)
			.then((lineup) => {
				if (cancelled) return;
				const ids = new Set([
					...lineup.starters.map((p) => p.id),
					...lineup.bench.map((p) => p.id),
				]);
				setXiIds(ids);

				if (existing) {
					setCoachRating(existing.coachRating);
					setCoachNote(existing.coachNote);
					setPlayerRatings(existing.players);
					return;
				}

				const xiPlayers = lineup.starters.length
					? [
							...lineup.starters,
							...lineup.bench.filter((b) => !lineup.starters.some((s) => s.id === b.id)),
						]
					: squadSorted;

				setCoachRating(6);
				setCoachNote('');
				setPlayerRatings(emptyPlayerRatings(xiPlayers.length ? xiPlayers : squadSorted));
			})
			.catch(() => {
				if (cancelled) return;
				setXiIds(new Set());
				if (existing) {
					setCoachRating(existing.coachRating);
					setCoachNote(existing.coachNote);
					setPlayerRatings(existing.players);
				} else {
					setCoachRating(6);
					setCoachNote('');
					setPlayerRatings(emptyPlayerRatings(squadSorted));
				}
			});

		setSaved(false);
		return () => {
			cancelled = true;
		};
	}, [selectedMatchId, data?.squad.players, ratings]);

	const visibleRatings = useMemo(() => {
		if (!startersOnly || xiIds.size === 0) return playerRatings;
		const starters = playerRatings.filter((p) => xiIds.has(p.playerId));
		return starters.length > 0 ? starters : playerRatings;
	}, [playerRatings, startersOnly, xiIds]);

	if (!data) {
		return (
			<div className="empty-state">
				<p>Fetch data first to rate players after a match.</p>
			</div>
		);
	}

	const updatePlayer = (id: string, patch: Partial<PlayerRating>) => {
		setPlayerRatings((prev) => prev.map((p) => (p.playerId === id ? { ...p, ...patch } : p)));
		setSaved(false);
	};

	const setAllVisible = (rating: number) => {
		const ids = new Set(visibleRatings.map((p) => p.playerId));
		setPlayerRatings((prev) => prev.map((p) => (ids.has(p.playerId) ? { ...p, rating } : p)));
		setCoachRating(rating);
		setSaved(false);
	};

	const handleSave = () => {
		if (!selectedMatchId) return;
		const nextAvgs = saveMatchRatings(selectedMatchId, {
			coachRating,
			coachNote,
			players: playerRatings,
		});
		if (nextAvgs) setCommunity(nextAvgs);
		else setCommunity(loadCommunityAverages());
		setSaved(true);
	};

	return (
		<div className="ratings-page">
			<div className="section-head">
				<h2>Post-match ratings</h2>
				<p>Prefills today’s XI when available — save to update your local community averages.</p>
			</div>

			<label className="field">
				<span>Select match</span>
				<select
					value={selectedMatchId ?? ''}
					onChange={(e) => selectMatch(e.target.value || null)}
				>
					<option value="">Choose a fixture…</option>
					{finishedMatches.map((f) => (
						<option key={f.id} value={f.id}>
							{formatFixtureWhen(f.date, f.time)} — vs {f.opponent} ({f.homeScore}-{f.awayScore})
						</option>
					))}
				</select>
			</label>

			{fixture && (
				<div className="rating-match-banner">
					<strong>vs {fixture.opponent}</strong>
					<span>{fixture.competition}</span>
				</div>
			)}

			{selectedMatchId && (
				<>
					<section className="coach-rating">
						<h3>Coach — {data.squad.coach}</h3>
						<div className="rating-row">
							<input
								type="range"
								min={1}
								max={10}
								step={0.5}
								value={coachRating}
								onChange={(e) => {
									setCoachRating(Number(e.target.value));
									setSaved(false);
								}}
							/>
							<span className="rating-value">{coachRating.toFixed(1)}</span>
						</div>
						<textarea
							placeholder="Tactical notes, subs, press conference vibes…"
							value={coachNote}
							onChange={(e) => {
								setCoachNote(e.target.value);
								setSaved(false);
							}}
							rows={2}
						/>
					</section>

					<section className="player-ratings">
						<div className="ratings-toolbar">
							<h3>
								{startersOnly && xiIds.size > 0 ? 'Match XI' : 'Squad'} ({visibleRatings.length})
							</h3>
							<div className="ratings-toolbar-actions">
								{xiIds.size > 0 && (
									<label className="ratings-toggle">
										<input
											type="checkbox"
											checked={startersOnly}
											onChange={(e) => setStartersOnly(e.target.checked)}
										/>
										XI / bench only
									</label>
								)}
								<button type="button" className="btn-ghost" onClick={() => setAllVisible(7)}>
									Set all 7.0
								</button>
								<button type="button" className="btn-ghost" onClick={() => setAllVisible(8)}>
									Set all 8.0
								</button>
							</div>
						</div>
						<div className="rating-list">
							{visibleRatings.map((p) => {
								const avg = communityAverageFor(community, p.playerId);
								return (
									<div key={p.playerId} className="rating-card">
										<div className="rating-player">
											<strong>{p.name}</strong>
											<span className="muted">{p.position}</span>
											{avg != null && (
												<span className="rating-community" title="Your local community average">
													Avg {avg.toFixed(1)}
												</span>
											)}
										</div>
										<div className="rating-row">
											<input
												type="range"
												min={1}
												max={10}
												step={0.5}
												value={p.rating}
												onChange={(e) =>
													updatePlayer(p.playerId, { rating: Number(e.target.value) })
												}
											/>
											<span className={`rating-value tier-${Math.round(p.rating)}`}>
												{p.rating.toFixed(1)}
											</span>
										</div>
										<input
											type="text"
											className="note-input"
											placeholder="Quick note"
											value={p.note}
											onChange={(e) => updatePlayer(p.playerId, { note: e.target.value })}
										/>
									</div>
								);
							})}
						</div>
					</section>

					<div className="rating-actions">
						<button type="button" className="btn-primary" onClick={handleSave}>
							Submit all ratings
						</button>
						{saved && <span className="saved-msg">Saved locally ✓</span>}
						<button type="button" className="btn-ghost" onClick={() => setTab('match')}>
							Back to match
						</button>
					</div>
				</>
			)}
		</div>
	);
}
