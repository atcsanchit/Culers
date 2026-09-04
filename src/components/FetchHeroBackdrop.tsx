import { useFetchAnimationState } from '../context/FetchAnimationContext';
import { FetchCampNouScene } from './FetchCampNouScene';

/** Full-width Camp Nou animation behind the home hero. */
export function FetchHeroBackdrop() {
	const { isActive, isGoal, goalSubPhase, sceneClass, caption, pitchBanner, pitchChants } =
		useFetchAnimationState();

	if (!isActive) return null;

	return (
		<div
			className={`fetch-hero-backdrop ${sceneClass}`}
			role="status"
			aria-live="polite"
			aria-label={isGoal ? 'Data loaded — Camp Nou erupts' : 'Fetching — Messi at Camp Nou'}
		>
			<FetchCampNouScene
				goalSubPhase={goalSubPhase}
				pitchBanner={pitchBanner}
				pitchChants={pitchChants}
			/>
			<div className="fetch-hero-caption">
				<p className="fetch-overlay-title">{caption.title}</p>
				<p className="fetch-overlay-line">{caption.line}</p>
			</div>
		</div>
	);
}

/** Compact status in the header while fetch runs. */
export function FetchHeaderStatus() {
	const { isActive, isGoal, sceneClass } = useFetchAnimationState();

	if (!isActive) return null;

	return (
		<div className={`fetch-header-pill ${sceneClass}`}>
			<span className="fetch-header-pill-dot" />
			{isGoal ? 'GOAL — data loaded' : 'Fetching…'}
		</div>
	);
}
