import { useId } from 'react';

export function InstagramIcon({ className = '' }: { className?: string }) {
	const gradId = useId();
	return (
		<svg className={className} viewBox="0 0 24 24" aria-hidden fill="none">
			<defs>
				<linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#feda75" />
					<stop offset="25%" stopColor="#fa7e1e" />
					<stop offset="50%" stopColor="#d62976" />
					<stop offset="75%" stopColor="#962fbf" />
					<stop offset="100%" stopColor="#4f5bd5" />
				</linearGradient>
			</defs>
			<rect x="2" y="2" width="20" height="20" rx="6" stroke={`url(#${gradId})`} strokeWidth="2" />
			<circle cx="12" cy="12" r="4.5" stroke={`url(#${gradId})`} strokeWidth="2" />
			<circle cx="17.5" cy="6.5" r="1.2" fill={`url(#${gradId})`} />
		</svg>
	);
}
