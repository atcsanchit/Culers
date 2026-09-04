import { useEffect, useRef, useState } from 'react';
import { useBarca } from '../store/BarcaState';
import {
	ensureFetchLoopPlaying,
	GOAL_AUDIO_FADE_MS,
	GOAL_SOUND_DURATION_MS,
	playGoalSound,
	stopFetchLoop,
} from '../lib/fetchSfx';
import { PITCH_CHANTS } from '../data/pitchFormation';

export const FETCH_LINES = [
	'Messi on the ball…',
	'Cutting past defenders…',
	'Driving toward goal…',
	'La Pulga in full flow…',
];

export const GOAL_FADE_OUT_MS = GOAL_AUDIO_FADE_MS;
/** Build-up: drive toward the right-hand goal. */
export const GOAL_APPROACH_MS = 1800;
/** Ball into the net. */
export const GOAL_SCORE_MS = 1200;
/** Pull back to aerial Camp Nou with fans. */
export const GOAL_CELEBRATE_MS = GOAL_SOUND_DURATION_MS - GOAL_APPROACH_MS - GOAL_SCORE_MS - GOAL_FADE_OUT_MS;

export const GOAL_MOMENTS = [
	{ title: 'GOAL!', line: 'Més que un club — more than a club, since 1899.' },
	{ title: 'Visca Barça!', line: 'La Masia: where Xavi, Iniesta & Messi learned the pass.' },
	{ title: 'Camp Nou', line: '99,354 voices — Europe’s largest club stadium.' },
	{ title: 'Dream Team', line: 'Cruyff’s 1992 side rewrote how football is played.' },
	{ title: 'Sextuple', line: '2009: Guardiola’s Barça won six trophies in one year.' },
	{ title: 'El Clásico', line: 'Bernabéu 2005 — Madrid applauded Ronaldinho.' },
	{ title: 'Wembley 2009', line: 'Iniesta in the 93rd — “Barcelona campeón de Europa!”' },
	{ title: 'MSN', line: 'Messi · Suárez · Neymar — 131 goals together in 2015.' },
	{ title: 'Blaugrana', line: 'Burgundy and blue — the colours of Catalonia on the shirt.' },
	{ title: 'La Remontada', line: '6–1 vs PSG, 2017 — the greatest comeback in Europe.' },
];

export type FetchAnimPhase = 'idle' | 'run' | 'goal';
export type GoalSubPhase = 'approach' | 'score' | 'celebrate';

export function useFetchAnimation() {
	const { fetching } = useBarca();
	const [phase, setPhase] = useState<FetchAnimPhase>('idle');
	const [goalSubPhase, setGoalSubPhase] = useState<GoalSubPhase | null>(null);
	const [lineIndex, setLineIndex] = useState(0);
	const [goalLineIndex, setGoalLineIndex] = useState(0);
	const [fadingOut, setFadingOut] = useState(false);
	const [goalMinute, setGoalMinute] = useState<number | null>(null);
	const wasFetching = useRef(false);

	useEffect(() => {
		if (fetching) {
			wasFetching.current = true;
			setFadingOut(false);
			setGoalSubPhase(null);
			setGoalMinute(null);
			setPhase('run');
			setLineIndex(0);
			return;
		}
		if (wasFetching.current) {
			wasFetching.current = false;
			setFadingOut(false);
			setGoalMinute(1 + Math.floor(Math.random() * 90));
			setPhase('goal');
			setGoalSubPhase('approach');
			setGoalLineIndex(0);
		}
	}, [fetching]);

	useEffect(() => {
		if (phase !== 'goal') return;

		stopFetchLoop();
		let cancelled = false;
		let endTimer: ReturnType<typeof setTimeout> | null = null;
		let fadeTimer: ReturnType<typeof setTimeout> | null = null;
		let scoreTimer: ReturnType<typeof setTimeout> | null = null;
		let celebrateTimer: ReturnType<typeof setTimeout> | null = null;

		const endAt = Date.now() + GOAL_SOUND_DURATION_MS;
		const fadeAt = endAt - GOAL_FADE_OUT_MS;

		const finish = () => {
			if (!cancelled) {
				setFadingOut(false);
				setGoalSubPhase(null);
				setGoalMinute(null);
				setPhase('idle');
			}
		};

		const startFadeOut = () => {
			if (!cancelled) setFadingOut(true);
		};

		const scheduleFinish = () => {
			const wait = Math.max(0, endAt - Date.now());
			endTimer = window.setTimeout(finish, wait);
		};

		scoreTimer = window.setTimeout(() => {
			if (!cancelled) setGoalSubPhase('score');
		}, GOAL_APPROACH_MS);

		celebrateTimer = window.setTimeout(() => {
			if (!cancelled) setGoalSubPhase('celebrate');
		}, GOAL_APPROACH_MS + GOAL_SCORE_MS);

		fadeTimer = window.setTimeout(startFadeOut, Math.max(0, fadeAt - Date.now()));
		const fallback = window.setTimeout(finish, GOAL_SOUND_DURATION_MS + 300);

		void playGoalSound().then(() => {
			window.clearTimeout(fallback);
			scheduleFinish();
		});

		return () => {
			cancelled = true;
			window.clearTimeout(fallback);
			if (endTimer) window.clearTimeout(endTimer);
			if (fadeTimer) window.clearTimeout(fadeTimer);
			if (scoreTimer) window.clearTimeout(scoreTimer);
			if (celebrateTimer) window.clearTimeout(celebrateTimer);
		};
	}, [phase]);

	useEffect(() => {
		if (fetching) ensureFetchLoopPlaying();
	}, [fetching]);

	useEffect(() => {
		if (phase !== 'run') return;
		const timer = window.setInterval(() => {
			setLineIndex((i) => (i + 1) % FETCH_LINES.length);
		}, 1400);
		return () => window.clearInterval(timer);
	}, [phase]);

	useEffect(() => {
		if (goalSubPhase !== 'celebrate') return;
		const timer = window.setInterval(() => {
			setGoalLineIndex((i) => (i + 1) % GOAL_MOMENTS.length);
		}, 1000);
		return () => window.clearInterval(timer);
	}, [goalSubPhase]);

	const isGoal = phase === 'goal';
	const isActive = phase !== 'idle';

	const sceneClass = [
		'fetch-messi-scene',
		phase === 'run' ? 'is-run' : '',
		isGoal ? 'is-goal' : '',
		goalSubPhase === 'approach' ? 'is-goal-approach' : '',
		goalSubPhase === 'score' ? 'is-goal-score' : '',
		goalSubPhase === 'celebrate' ? 'is-goal-celebrate is-celebrating' : '',
		fadingOut ? 'is-fading-out' : '',
	]
		.filter(Boolean)
		.join(' ');

	let caption: { title: string; line: string };
	if (!isGoal) {
		caption = { title: 'Fetching Barça data', line: FETCH_LINES[lineIndex]! };
	} else if (goalSubPhase === 'approach') {
		caption = { title: 'Through on goal…', line: 'Messi bears down on goal…' };
	} else if (goalSubPhase === 'score') {
		caption = {
			title: goalMinute != null ? `GOAL! ${goalMinute}'` : 'GOAL!',
			line: 'Messi slots it past the keeper!',
		};
	} else {
		caption = GOAL_MOMENTS[goalLineIndex]!;
	}

	let pitchBanner: string | null = null;
	let pitchChants: readonly string[] | null = null;
	if (goalSubPhase === 'score') pitchBanner = 'GOAL!';
	else if (goalSubPhase === 'celebrate') pitchChants = PITCH_CHANTS;

	return {
		phase,
		goalSubPhase,
		isActive,
		isGoal,
		fadingOut,
		sceneClass,
		caption,
		lineIndex,
		goalLineIndex,
		pitchBanner,
		pitchChants,
		goalMinute,
	};
}
