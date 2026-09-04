import { useBarca } from '../store/BarcaState';
import { formatDateTime } from '../lib/api';
import { playFetchSoundsFromGesture } from '../lib/fetchSfx';

export function FetchButton({ compact = false }: { compact?: boolean }) {
	const { fetching, fetchLatest, fetchError, data } = useBarca();

	return (
		<div className={`fetch-wrap ${compact ? 'compact' : ''}`}>
			<button
				type="button"
				className={`btn-fetch ${fetching ? 'is-fetching' : ''}`}
				onClick={() => {
					playFetchSoundsFromGesture();
					void fetchLatest();
				}}
				disabled={fetching}
			>
				<span className={`fetch-icon ${fetching ? 'spin' : ''}`}>⟳</span>
				{fetching ? 'Fetching…' : 'Fetch latest'}
			</button>
			{data?.fetchedAt && (
				<span className="fetch-meta">
					Updated {formatDateTime(data.fetchedAt)} IST
				</span>
			)}
			{fetchError && <span className="fetch-error">{fetchError}</span>}
		</div>
	);
}
