/** Open the Culers Museum in the same tab, then fullscreen (gesture-friendly). */
export function openMuseumWindow() {
	const url = new URL('museum.html', window.location.href).href;
	window.location.assign(url);
	return null;
}
