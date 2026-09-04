import { useEffect, useRef, useState } from 'react';
import type { Fixture } from '../types';
import { barcaScore, formatDate, formatTime, isFinished, isLiveStatus, opponentScore, resultLabel } from '../lib/api';

type Props = {
	fixture: Fixture;
	large?: boolean;
	live?: boolean;
	clock?: string;
};

export function Scoreboard({ fixture, large = false, live = false, clock }: Props) {
	const us = barcaScore(fixture);
	const them = opponentScore(fixture);
	const result = resultLabel(fixture);
	const showScore = us != null && them != null;
	const left = fixture.isHome ? us : them;
	const right = fixture.isHome ? them : us;

	const [tick, setTick] = useState(false);
	const prev = useRef(`${left}-${right}`);
	useEffect(() => {
		const next = `${left}-${right}`;
		if (live && prev.current !== next && showScore) {
			setTick(true);
			const t = window.setTimeout(() => setTick(false), 900);
			prev.current = next;
			return () => window.clearTimeout(t);
		}
		prev.current = next;
	}, [left, right, live, showScore]);

	return (
		<div className={`scoreboard ${large ? 'large' : ''} ${live ? 'live' : ''}${tick ? ' score-tick' : ''}`}>
			{live && (
				<div className="live-banner">
					<span className="pulse" />
					LIVE · {clock ?? fixture.status}
				</div>
			)}
			<div className="score-meta">
				<span className="comp">{fixture.competition}</span>
				<span className="date">
					{formatDate(fixture.date, fixture.time)} · {formatTime(fixture.time, fixture.date)} IST
				</span>
			</div>
			<div className="score-row">
				<div className={`team-side ${fixture.isHome ? 'barca' : ''}`}>
					<span className="team-name">{fixture.isHome ? 'Barcelona' : fixture.opponent}</span>
					{fixture.isHome && <span className="badge-home">HOME</span>}
				</div>
				<div className="score-center">
					{showScore ? (
						<span className={`score-digits${tick ? ' is-tick' : ''}`}>
							{left}
							<span className="sep">:</span>
							{right}
						</span>
					) : (
						<span className="vs">VS</span>
					)}
					{result && (
						<span className={`result-pill ${result === 'W' ? 'win' : result === 'L' ? 'loss' : 'draw'}`}>
							{result}
						</span>
					)}
					{!live && isFinished(fixture.status) && <span className="status-ft">Full time</span>}
					{!live && !isFinished(fixture.status) && isLiveStatus(fixture.status) && (
						<span className="status-live">In progress</span>
					)}
				</div>
				<div className={`team-side ${!fixture.isHome ? 'barca' : ''}`}>
					<span className="team-name">{!fixture.isHome ? 'Barcelona' : fixture.opponent}</span>
					{!fixture.isHome && <span className="badge-away">AWAY</span>}
				</div>
			</div>
			<p className="venue">{fixture.venue}</p>
		</div>
	);
}
