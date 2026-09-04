import type { CSSProperties } from 'react';
import type { GoalSubPhase } from '../hooks/useFetchAnimation';
import { OPPONENT_SPOTS, TEAMMATE_SPOTS } from '../data/pitchFormation';

type Props = {
	goalSubPhase: GoalSubPhase | null;
	pitchBanner: string | null;
	pitchChants: readonly string[] | null;
	goalMinute: number | null;
};

type Kit = 'barca' | 'white';

function PitchSprite({ kit, number }: { kit: Kit; number?: number }) {
	return (
		<div className={`fetch-sprite fetch-sprite-${kit}`}>
			<div className="fetch-sprite-head" />
			<div className="fetch-sprite-hair" />
			<div className="fetch-sprite-arm fetch-sprite-arm-l" />
			<div className="fetch-sprite-arm fetch-sprite-arm-r" />
			<div className="fetch-sprite-torso">{number != null ? <span>{number}</span> : null}</div>
			<div className="fetch-sprite-shorts" />
			<div className="fetch-sprite-legs">
				<span className="fetch-sprite-leg" />
				<span className="fetch-sprite-leg" />
			</div>
		</div>
	);
}

/** Top-down Camp Nou — full squads, keeper, trail, celebrate. */
export function FetchCampNouScene({ goalSubPhase, pitchBanner, pitchChants, goalMinute }: Props) {
	const showCelebrate = goalSubPhase === 'celebrate';
	const showScoreFx = goalSubPhase === 'score' || showCelebrate;
	const showKeeper = goalSubPhase === 'approach' || goalSubPhase === 'score' || showCelebrate;
	const showBanner = pitchBanner !== null || (pitchChants !== null && pitchChants.length > 0);

	return (
		<div className="campnou-aerial" aria-hidden>
			<div className="campnou-bowl">
				<div className="campnou-stand campnou-stand-north">
					<span className="campnou-stand-label">Spotify Camp Nou</span>
					{showCelebrate && (
						<div className="campnou-stand-fans">
							{Array.from({ length: 10 }, (_, i) => (
								<span key={i} className={`messi-fan messi-fan-${(i % 9) + 1}`} />
							))}
						</div>
					)}
				</div>
				<div className="campnou-stand campnou-stand-east" />
				<div className="campnou-stand campnou-stand-south" />
				<div className="campnou-stand campnou-stand-west" />

				<div className="campnou-pitch">
					<div className="campnou-grass" />
					<div className="campnou-stripes" />
					<div className="campnou-line campnou-half" />
					<div className="campnou-circle" />
					<div className="campnou-box campnou-box-left" />
					<div className="campnou-box campnou-box-right" />
					<div className="campnou-goal campnou-goal-left" />
					<div className="campnou-goal campnou-goal-right" />
					<div className="campnou-goal-mouth campnou-goal-mouth-right" aria-hidden>
						<span className="campnou-goal-post-near campnou-goal-post-near-top" />
						<span className="campnou-goal-post-near campnou-goal-post-near-bottom" />
					</div>

					{OPPONENT_SPOTS.map((spot, i) => (
						<div
							key={`opp-${i}`}
							className="fetch-pitch-player fetch-pitch-opponent"
							style={{ left: `${spot.left}%`, bottom: `${spot.bottom}%` }}
						>
							<PitchSprite kit="white" />
						</div>
					))}

					{TEAMMATE_SPOTS.map((spot, i) => {
						const rushLeft = 72 + (i % 5) * 1.6;
						const rushBottom = 14 + (i % 4) * 2.8;
						return (
							<div
								key={`tm-${i}`}
								className="fetch-pitch-player fetch-pitch-teammate"
								style={
									{
										'--spot-left': `${spot.left}%`,
										'--spot-bottom': `${spot.bottom}%`,
										'--rush-left': `${rushLeft}%`,
										'--rush-bottom': `${rushBottom}%`,
										'--rush-i': i,
										left: `${spot.left}%`,
										bottom: `${spot.bottom}%`,
									} as CSSProperties
								}
							>
								<PitchSprite kit="barca" number={spot.number} />
							</div>
						);
					})}

					{showKeeper && (
						<div className={`fetch-pitch-player fetch-pitch-keeper${goalSubPhase === 'score' ? ' is-diving' : ''}`}>
							<PitchSprite kit="white" number={1} />
						</div>
					)}

					<div className="fetch-pitch-player messi-hero">
						<PitchSprite kit="barca" number={10} />
					</div>

					<div className="messi-ball-trail" aria-hidden>
						<span className="messi-ball-trail-bit messi-ball-trail-1" />
						<span className="messi-ball-trail-bit messi-ball-trail-2" />
						<span className="messi-ball-trail-bit messi-ball-trail-3" />
					</div>
					<div className="messi-ball" />

					{showScoreFx && goalMinute != null && (
						<div className="campnou-minute-flash" key={goalMinute}>
							{goalMinute}&apos;
						</div>
					)}

					{showBanner && (
						<div className="campnou-pitch-banner" key={pitchBanner ?? 'chants'}>
							{pitchBanner && <span>{pitchBanner}</span>}
							{pitchChants?.map((line) => (
								<span key={line} className="campnou-pitch-chant">
									{line}
								</span>
							))}
						</div>
					)}

					{showCelebrate && (
						<>
							<div className="messi-camp-flare" />
							<div className="messi-confetti messi-confetti-soft">
								{Array.from({ length: 18 }, (_, i) => (
									<span key={i} className={`messi-confetti-bit messi-confetti-bit-${(i % 10) + 1}`} />
								))}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
