/** Local background ambience — chants ↔ second anthem with crossfade. */
export const BARCA_CHANT_SRC = '/audio/barca-chants.ogg';
export const BARCA_ANTHEM_SRC = '/audio/barca-anthem.ogg';
export const BARCA_BACKGROUND_PLAYLIST = [BARCA_CHANT_SRC, BARCA_ANTHEM_SRC] as const;

/** @deprecated YouTube IDs kept for the download script only. */
export const BARCA_CHANT_VIDEO_ID = '9JdugskAcS0';
export const BARCA_SECOND_ANTHEM_VIDEO_ID = 'ZM7aiHU_UZY';
/** @deprecated Use BARCA_CHANT_SRC */
export const BARCA_ANTHEM_VIDEO_ID = BARCA_CHANT_VIDEO_ID;

export const BARCA_ANTHEM_MUTE_KEY = 'culers-anthem-muted';

const AMBIENT_VOLUME = 0.08;
/** Source chants peak ~9dB below anthem — normalize perceived loudness. */
const CHANT_GAIN = 2.85;
const CROSSFADE_SEC = 2.5;
const FADE_IN_SEC = 1.2;

function volumeForSrc(src: string): number {
	if (src === BARCA_CHANT_SRC) return Math.min(1, AMBIENT_VOLUME * CHANT_GAIN);
	return AMBIENT_VOLUME;
}

function volumeForIndex(index: number): number {
	return volumeForSrc(BARCA_BACKGROUND_PLAYLIST[index]!);
}

let primary: HTMLAudioElement | null = null;
let secondary: HTMLAudioElement | null = null;
let playlistIndex = 0;
let crossfading = false;
let fadeInTimer: ReturnType<typeof setInterval> | null = null;
let muted = readMuted();
const muteListeners = new Set<() => void>();

function readMuted(): boolean {
	try {
		return localStorage.getItem(BARCA_ANTHEM_MUTE_KEY) === '1';
	} catch {
		return false;
	}
}

function notifyMute() {
	for (const listener of muteListeners) listener();
}

function makeTrack(src: string): HTMLAudioElement {
	const el = new Audio(src);
	el.preload = 'auto';
	el.volume = 0;
	return el;
}

function clearFadeInTimer() {
	if (fadeInTimer) {
		clearInterval(fadeInTimer);
		fadeInTimer = null;
	}
}

function fadeVolume(el: HTMLAudioElement, from: number, to: number, durationSec: number, onDone?: () => void) {
	clearFadeInTimer();
	const steps = Math.max(12, Math.round(durationSec * 30));
	const stepMs = (durationSec * 1000) / steps;
	let step = 0;
	fadeInTimer = setInterval(() => {
		step++;
		const t = Math.min(1, step / steps);
		el.volume = from + (to - from) * t;
		if (t >= 1) {
			clearFadeInTimer();
			onDone?.();
		}
	}, stepMs);
}

function nextPlaylistIndex(index: number) {
	return (index + 1) % BARCA_BACKGROUND_PLAYLIST.length;
}

function beginCrossfade() {
	if (!primary || crossfading || muted || document.hidden) return;
	const duration = primary.duration;
	if (!Number.isFinite(duration) || duration <= CROSSFADE_SEC) return;

	crossfading = true;
	const outgoing = primary;
	const incomingIndex = nextPlaylistIndex(playlistIndex);
	const incoming = secondary ?? makeTrack(BARCA_BACKGROUND_PLAYLIST[incomingIndex]!);
	secondary = incoming;

	incoming.src = BARCA_BACKGROUND_PLAYLIST[incomingIndex]!;
	incoming.currentTime = 0;
	incoming.volume = 0;

	const startCrossfadePlayback = () => {
		void incoming.play().catch(() => {
			crossfading = false;
		});

		const steps = Math.max(12, Math.round(CROSSFADE_SEC * 30));
		const stepMs = (CROSSFADE_SEC * 1000) / steps;
		let step = 0;
		const timer = setInterval(() => {
			step++;
			const t = Math.min(1, step / steps);
			if (!muted) {
				const outVol = volumeForIndex(playlistIndex);
				const inVol = volumeForIndex(incomingIndex);
				outgoing.volume = outVol * (1 - t);
				incoming.volume = inVol * t;
			}
			if (t >= 1) {
				clearInterval(timer);
				outgoing.pause();
				outgoing.currentTime = 0;
				outgoing.volume = 0;
				primary = incoming;
				secondary = outgoing;
				playlistIndex = incomingIndex;
				crossfading = false;
			}
		}, stepMs);
	};

	if (incoming.readyState >= HTMLMediaElement.HAVE_METADATA) {
		startCrossfadePlayback();
	} else {
		incoming.addEventListener('canplay', startCrossfadePlayback, { once: true });
		void incoming.load();
	}
}

function onPrimaryTimeUpdate() {
	if (!primary || crossfading) return;
	const remaining = primary.duration - primary.currentTime;
	if (Number.isFinite(remaining) && remaining > 0 && remaining <= CROSSFADE_SEC) {
		beginCrossfade();
	}
}

function getPrimary(): HTMLAudioElement {
	if (!primary) {
		primary = makeTrack(BARCA_BACKGROUND_PLAYLIST[0]!);
		primary.addEventListener('timeupdate', onPrimaryTimeUpdate);
		primary.addEventListener('ended', () => {
			if (!crossfading) beginCrossfade();
		});
	}
	return primary;
}

export function isAnthemMuted(): boolean {
	return muted;
}

export function subscribeAnthemMute(listener: () => void): () => void {
	muteListeners.add(listener);
	return () => muteListeners.delete(listener);
}

export function setAnthemMuted(nextMuted: boolean) {
	muted = nextMuted;
	try {
		localStorage.setItem(BARCA_ANTHEM_MUTE_KEY, nextMuted ? '1' : '0');
	} catch {
		/* ignore */
	}
	notifyMute();
}

export function toggleAnthemMute() {
	const next = !muted;
	setAnthemMuted(next);
	if (next) {
		void pauseBarcaAnthem();
	} else {
		void ensureBarcaAnthemPlaying();
	}
}

async function playIfAllowed() {
	if (muted || document.hidden) return;
	const el = getPrimary();
	const target = volumeForIndex(playlistIndex);
	if (el.paused) {
		el.volume = 0;
		await el.play().catch(() => {});
		fadeVolume(el, 0, target, FADE_IN_SEC);
	} else if (el.volume < target * 0.5) {
		fadeVolume(el, el.volume, target, FADE_IN_SEC);
	}
}

export async function initBarcaAnthem() {
	try {
		await playIfAllowed();
	} catch {
		/* autoplay may be blocked until user interacts */
	}
}

export async function ensureBarcaAnthemPlaying() {
	try {
		await playIfAllowed();
	} catch {
		/* ignore */
	}
}

/** @deprecated Fetch uses fetchSfx.ts — kept for compatibility. */
export async function playBarcaAnthem(_mode: 'run' | 'goal' = 'run') {
	await ensureBarcaAnthemPlaying();
}

export async function pauseBarcaAnthem() {
	clearFadeInTimer();
	primary?.pause();
	secondary?.pause();
}

export async function stopBarcaAnthem() {
	await pauseBarcaAnthem();
}

let unlockBound = false;

/** First click anywhere unlocks autoplay when the browser blocks it. */
export function bindAnthemUnlockOnGesture() {
	if (unlockBound) return;
	unlockBound = true;

	const unlock = () => {
		if (!muted) void ensureBarcaAnthemPlaying();
	};

	document.addEventListener('pointerdown', unlock, { passive: true });
	document.addEventListener('keydown', unlock);

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			void pauseBarcaAnthem();
			return;
		}
		if (!muted) void ensureBarcaAnthemPlaying();
	});
}
