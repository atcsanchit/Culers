/** Direct X profile image — used when cached fetch payload has no avatarUrl yet */
export const RESHAD_AVATAR_FALLBACK =
	'https://pbs.twimg.com/profile_images/2044154717287395330/YrkGrPCT_400x400.jpg';

export const FABRIZIO_AVATAR_FALLBACK =
	'https://pbs.twimg.com/profile_images/1741753635158024192/j0m8Ucvv_400x400.jpg';

export function upsizeTwitterAvatar(url?: string) {
	if (!url) return RESHAD_AVATAR_FALLBACK;
	return url.replace(/_(normal|bigger|mini)\.(jpg|jpeg|png|webp)$/i, '_400x400.$2');
}
