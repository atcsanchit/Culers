/** Fetch SFX — dribble loop (fbNRxK 1:27–1:40) + layered goal (bed + cheer). */
export const FETCH_SFX_MUTE_KEY = 'culers-fetch-sfx-muted';
export const FETCH_DRIBBLE_LOOP_SRC = '/audio/fetch-dribble-loop.ogg';
export const GOAL_BED_SRC = '/audio/goal-bed.ogg';
export const GOAL_CHEER_SRC = '/audio/goal-cheer.ogg';

const FETCH_VOLUME = 0.4;
/** Bed was 28% of cheer at full volume — keep ratio at 40% scale. */
const GOAL_BED_VOLUME = 0.4 * 0.28;
const GOAL_CHEER_VOLUME = FETCH_VOLUME;

/** Dribble loop fade when fetch completes (before goal cheer). */
export const FETCH_LOOP_FADE_MS = 2200;
/** Goal bed + cheer fade at end of celebration. */
export const GOAL_AUDIO_FADE_MS = 2000;

/** Matches trimmed goal clips (bed + cheer). */
export const GOAL_SOUND_DURATION_MS = 7000;

let fetchMuted = readFetchMuted();
const muteListeners = new Set<() => void>();
const goalEndListeners = new Set<() => void>();

let goalSoundResolve: (() => void) | null = null;

let loopAudio: HTMLAudioElement | null = null;
let goalBedAudio: HTMLAudioElement | null = null;
let goalCheerAudio: HTMLAudioElement | null = null;
let fetchLoopActive = false;
let goalPlaying = false;
let goalTracksDone = 0;
let loopFadeTimer: ReturnType<typeof setInterval> | null = null;
let goalFadeTimer: ReturnType<typeof setInterval> | null = null;
let goalFadeScheduleTimer: ReturnType<typeof setTimeout> | null = null;

function readFetchMuted(): boolean {
	try {
		return localStorage.getItem(FETCH_SFX_MUTE_KEY) === '1';
	} catch {
		return false;
	}
}

function getLoopAudio(): HTMLAudioElement {
	if (!loopAudio) {
		loopAudio = new Audio(FETCH_DRIBBLE_LOOP_SRC);
		loopAudio.loop = true;
		loopAudio.preload = 'auto';
	}
	return loopAudio;
}

function getGoalBedAudio(): HTMLAudioElement {
	if (!goalBedAudio) {
		goalBedAudio = new Audio(GOAL_BED_SRC);
		goalBedAudio.preload = 'auto';
		goalBedAudio.addEventListener('ended', onGoalTrackEnded);
	}
	return goalBedAudio;
}

function getGoalCheerAudio(): HTMLAudioElement {
	if (!goalCheerAudio) {
		goalCheerAudio = new Audio(GOAL_CHEER_SRC);
		goalCheerAudio.preload = 'auto';
		goalCheerAudio.addEventListener('ended', onGoalTrackEnded);
	}
	return goalCheerAudio;
}

function notifyGoalSoundEnd() {
	goalSoundResolve?.();
	goalSoundResolve = null;
	for (const listener of goalEndListeners) listener();
}

function onGoalTrackEnded() {
	if (!goalPlaying) return;
	goalTracksDone++;
	if (goalTracksDone >= 2) {
		stopGoalTracks();
	}
}

function stopGoalTracks() {
	const wasPlaying = goalPlaying;
	goalPlaying = false;
	goalTracksDone = 0;
	clearGoalFade();
	for (const el of [goalBedAudio, goalCheerAudio]) {
		if (!el) continue;
		el.pause();
		el.currentTime = 0;
	}
	if (goalBedAudio) goalBedAudio.volume = GOAL_BED_VOLUME;
	if (goalCheerAudio) goalCheerAudio.volume = GOAL_CHEER_VOLUME;
	if (wasPlaying) notifyGoalSoundEnd();
}

function stopDribbleLoop() {
	const loop = loopAudio;
	if (!loop) return;
	loop.pause();
	loop.currentTime = 0;
	loop.volume = FETCH_VOLUME;
}

function clearLoopFade() {
	if (loopFadeTimer) {
		clearInterval(loopFadeTimer);
		loopFadeTimer = null;
	}
}

function clearGoalFade() {
	if (goalFadeTimer) {
		clearInterval(goalFadeTimer);
		goalFadeTimer = null;
	}
	if (goalFadeScheduleTimer) {
		clearTimeout(goalFadeScheduleTimer);
		goalFadeScheduleTimer = null;
	}
}

function fadeOutDribbleLoop(durationMs = FETCH_LOOP_FADE_MS) {
	clearLoopFade();
	const loop = loopAudio;
	if (!loop || loop.paused) {
		stopDribbleLoop();
		return;
	}
	const startVol = loop.volume;
	const start = performance.now();
	loopFadeTimer = setInterval(() => {
		const t = Math.min(1, (performance.now() - start) / durationMs);
		loop.volume = startVol * (1 - t);
		if (t >= 1) {
			clearLoopFade();
			stopDribbleLoop();
		}
	}, 40);
}

function scheduleGoalAudioFadeOut() {
	clearGoalFade();
	goalFadeScheduleTimer = setTimeout(() => {
		goalFadeScheduleTimer = null;
		if (!goalPlaying) return;
		const bed = goalBedAudio;
		const cheer = goalCheerAudio;
		if (!bed && !cheer) return;

		const bedFrom = bed?.volume ?? 0;
		const cheerFrom = cheer?.volume ?? 0;
		const steps = Math.max(12, Math.round(GOAL_AUDIO_FADE_MS / 40));
		const stepMs = GOAL_AUDIO_FADE_MS / steps;
		let step = 0;

		goalFadeTimer = setInterval(() => {
			step++;
			const t = Math.min(1, step / steps);
			if (bed) bed.volume = bedFrom * (1 - t);
			if (cheer) cheer.volume = cheerFrom * (1 - t);
			if (t >= 1) {
				clearGoalFade();
				stopGoalTracks();
			}
		}, stepMs);
	}, Math.max(0, GOAL_SOUND_DURATION_MS - GOAL_AUDIO_FADE_MS));
}

export function isFetchSfxMuted(): boolean {
	return fetchMuted;
}

export function subscribeFetchSfxMute(listener: () => void): () => void {
	muteListeners.add(listener);
	return () => muteListeners.delete(listener);
}

export function setFetchSfxMuted(nextMuted: boolean) {
	fetchMuted = nextMuted;
	try {
		localStorage.setItem(FETCH_SFX_MUTE_KEY, nextMuted ? '1' : '0');
	} catch {
		/* ignore */
	}
	for (const listener of muteListeners) listener();
	if (nextMuted) {
		stopFetchLoop(true);
	}
}

export function toggleFetchSfxMute() {
	setFetchSfxMuted(!fetchMuted);
}

function startDribbleLoop() {
	if (fetchMuted) return;
	const loop = getLoopAudio();
	loop.volume = FETCH_VOLUME;
	loop.currentTime = 0;
	void loop.play().catch(() => {});
}

/** Call synchronously from Fetch latest click (browser autoplay policy). */
export function playFetchSoundsFromGesture() {
	if (fetchMuted) return;
	stopGoalTracks();
	fetchLoopActive = true;
	startDribbleLoop();
}

export function ensureFetchLoopPlaying() {
	if (fetchMuted || !fetchLoopActive || goalPlaying) return;
	const loop = loopAudio;
	if (loop && !loop.paused) return;
	startDribbleLoop();
}

export function subscribeGoalSoundEnd(listener: () => void): () => void {
	goalEndListeners.add(listener);
	return () => goalEndListeners.delete(listener);
}

export function stopFetchLoop(immediate = false) {
	fetchLoopActive = false;
	if (immediate || fetchMuted) {
		clearLoopFade();
		stopDribbleLoop();
		return;
	}
	fadeOutDribbleLoop();
}

/** Goal: low-volume bed (fbNRxK) + cheer (Eh7G2lAu8f4) — resolves when both finish. */
export function playGoalSound(): Promise<void> {
	if (fetchMuted) return Promise.resolve();

	stopFetchLoop();
	stopGoalTracks();

	return new Promise((resolve) => {
		goalSoundResolve = resolve;
		goalPlaying = true;
		goalTracksDone = 0;

		const bed = getGoalBedAudio();
		const cheer = getGoalCheerAudio();
		bed.volume = GOAL_BED_VOLUME;
		cheer.volume = GOAL_CHEER_VOLUME;
		bed.currentTime = 0;
		cheer.currentTime = 0;

		Promise.all([bed.play(), cheer.play()]).catch(() => {
			stopGoalTracks();
		});

		scheduleGoalAudioFadeOut();
	});
}
