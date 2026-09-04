import { useState } from 'react';
import { RESHAD_AVATAR_FALLBACK } from '../lib/avatars';

type Props = {
	url?: string;
	fallback?: string;
	fallbackAvatar?: string;
	className?: string;
	fallbackClassName?: string;
};

export function ProfileAvatar({
	url,
	fallback = 'RR',
	fallbackAvatar = RESHAD_AVATAR_FALLBACK,
	className = '',
	fallbackClassName = '',
}: Props) {
	const [failed, setFailed] = useState(false);
	const src = url?.trim() || fallbackAvatar;

	if (failed) {
		return <span className={fallbackClassName || `${className} is-fallback`}>{fallback}</span>;
	}

	return (
		<img
			src={src}
			alt=""
			className={className}
			loading="lazy"
			decoding="async"
			referrerPolicy="no-referrer"
			onError={() => setFailed(true)}
		/>
	);
}
