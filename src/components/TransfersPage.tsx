import { useEffect, useMemo, useState } from 'react';
import { useBarca } from '../store/BarcaState';
import { fetchTransfers, formatDateTime } from '../lib/api';
import { FetchButton } from './FetchButton';
import { PlayerAvatar } from './PlayerAvatar';
import { ProfileAvatar } from './ProfileAvatar';
import { TweetMedia } from './TweetMedia';
import { highlightTweetText } from './TweetQuoteHero';
import { FABRIZIO_AVATAR_FALLBACK, RESHAD_AVATAR_FALLBACK } from '../lib/avatars';
import type { Player, SquadMarketValue, TransferDeal, TransferRumor, TransferRumorHeat, TransferRumorLean, TransfersHub } from '../types';

type Section = 'in' | 'out' | 'rumors' | 'records' | 'values';

function formatWhen(iso?: string) {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const mins = Math.round((Date.now() - d.getTime()) / 60_000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.round(mins / 60);
	if (hours < 36) return `${hours}h ago`;
	return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function rumorAvatar(item: TransferRumor) {
	if (item.handle === 'FabrizioRomano') return { url: FABRIZIO_AVATAR_FALLBACK, initials: 'FR' };
	if (item.handle === 'ReshadRahman') return { url: RESHAD_AVATAR_FALLBACK, initials: 'RR' };
	return { url: '', initials: 'TR' };
}

function DealTable({ deals, clubLabel }: { deals: TransferDeal[]; clubLabel: string }) {
	if (!deals.length) return <p className="muted">No moves listed for this window yet.</p>;
	return (
		<div className="transfer-table-wrap">
			<table className="transfer-table">
				<thead>
					<tr>
						<th>Player</th>
						<th>{clubLabel}</th>
						<th>Type</th>
						<th>Fee</th>
						<th>Date</th>
					</tr>
				</thead>
				<tbody>
					{deals.map((d) => (
						<tr key={`${d.direction}-${d.player}-${d.date}-${d.club}`}>
							<td>
								<strong>{d.player}</strong>
								<span className="muted">
									{d.position}
									{d.window !== 'unknown' ? ` · ${d.window}` : ''}
								</span>
							</td>
							<td>{d.club}</td>
							<td>{d.type}</td>
							<td>{d.fee}</td>
							<td>{d.date}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function rumorByline(item: TransferRumor) {
	if (item.handle === 'FabrizioRomano') return { name: 'Fabrizio Romano', handle: 'FabrizioRomano' };
	if (item.handle === 'ReshadRahman') return { name: 'Reshad Rahman', handle: 'ReshadRahman' };
	return { name: item.source, handle: item.handle ?? 'transfer' };
}

function RumorCard({ item }: { item: TransferRumor }) {
	const avatar = rumorAvatar(item);
	const byline = rumorByline(item);
	const media = item.media ?? [];

	return (
		<article className="twitter-card transfer-rumor-card">
			<header className="tweet-card-head">
				<ProfileAvatar
					url=""
					fallback={avatar.initials}
					fallbackAvatar={avatar.url}
					className="tweet-card-avatar"
					fallbackClassName="tweet-card-avatar-fallback"
				/>
				<div>
					<strong>{byline.name}</strong>
					<span>@{byline.handle}</span>
				</div>
				{item.pubDate && <time dateTime={item.pubDate}>{formatWhen(item.pubDate)}</time>}
			</header>
			<div className="transfer-rumor-chips">
				<span className={`rumor-heat rumor-heat-${item.heat}`}>{item.heatLabel}</span>
				{item.lean !== 'other' && (
					<span className={`rumor-lean rumor-lean-${item.lean}`}>{item.lean === 'in' ? 'In' : 'Out'}</span>
				)}
			</div>
			<p className="tweet-text">{highlightTweetText(item.text)}</p>
			{media.length > 0 && <TweetMedia media={media} link={item.url} />}
			<div className="tweet-card-foot">
				<a href={item.url} target="_blank" rel="noreferrer" className="tweet-link">
					View on X →
				</a>
			</div>
		</article>
	);
}

export function TransfersPage() {
	const { data, openPlayerStats, setTab } = useBarca();
	const [hub, setHub] = useState<TransfersHub | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [section, setSection] = useState<Section>('in');
	const [rumorFilter, setRumorFilter] = useState<'all' | TransferRumorHeat | TransferRumorLean>('all');

	useEffect(() => {
		if (data?.transfers) {
			setHub(data.transfers);
			setError(null);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);
		void fetchTransfers()
			.then((next) => {
				if (!cancelled) setHub(next);
			})
			.catch(() => {
				if (!cancelled) setError('Could not load the transfer centre.');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [data?.fetchedAt, data?.transfers]);

	const rumorRows = useMemo(
		() =>
			(hub?.rumors ?? []).map((r) => ({
				...r,
				text: r.text || r.title,
				heat: r.heat ?? 'watch',
				heatLabel: r.heatLabel ?? 'Watch',
				lean: r.lean ?? 'other',
			})),
		[hub?.rumors],
	);

	const rumorList = useMemo(() => {
		if (rumorFilter === 'all') return rumorRows;
		if (rumorFilter === 'in' || rumorFilter === 'out') return rumorRows.filter((r) => r.lean === rumorFilter);
		return rumorRows.filter((r) => r.heat === rumorFilter);
	}, [rumorRows, rumorFilter]);

	const rumorCounts = useMemo(() => {
		return {
			all: rumorRows.length,
			hwg: rumorRows.filter((r) => r.heat === 'here-we-go').length,
			hot: rumorRows.filter((r) => r.heat === 'hot').length,
			in: rumorRows.filter((r) => r.lean === 'in').length,
			out: rumorRows.filter((r) => r.lean === 'out').length,
		};
	}, [rumorRows]);

	const squadByName = useMemo(() => {
		const map = new Map<string, Player>();
		for (const p of data?.squad.players ?? []) {
			map.set(p.name.toLowerCase(), p);
		}
		return map;
	}, [data?.squad.players]);

	const openValue = (row: SquadMarketValue, el: HTMLElement) => {
		const rect = el.getBoundingClientRect();
		const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		const fromSquad =
			[...squadByName.values()].find(
				(p) => p.sofaId === row.sofaId || p.name.toLowerCase() === row.name.toLowerCase(),
			) ?? squadByName.get(row.name.toLowerCase());
		openPlayerStats(
			fromSquad ?? {
				id: `espn-${row.sofaId}`,
				name: row.name,
				position: row.position,
				number: row.number,
				nationality: row.nationality,
				photo: '',
				birthDate: '',
				sofaId: row.sofaId,
			},
			origin,
			{ mode: 'career', initialTab: 'career' },
		);
	};

	return (
		<section className="transfers-page">
			<div className="section-head">
				<h2>Transfers</h2>
				<p>
					Barça in, out, rumors, club-record fees, and current squad values — TransferRoom public intel plus
					the live season sheet.
				</p>
			</div>

			{loading && <p className="muted loading-msg">Loading TransferRoom and the {hub?.season ?? 'current'} window…</p>}
			{error && <p className="fetch-error">{error}</p>}

			{!loading && !hub && error && (
				<div className="empty-state">
					<p>Try again after a moment.</p>
					<FetchButton />
				</div>
			)}

			{hub && (
				<>
					<div className="transfer-hero glass-panel">
						<div>
							<span className="panel-label">Window</span>
							<h3>{hub.season}</h3>
							<p className="muted">{hub.windowNote}</p>
						</div>
						<div className="transfer-hero-stats">
							<div>
								<strong>{hub.arrivals.length}</strong>
								<span>In</span>
							</div>
							<div>
								<strong>{hub.departures.length}</strong>
								<span>Out</span>
							</div>
							<div>
								<strong>{hub.squadValueTotalLabel}</strong>
								<span>Squad value</span>
							</div>
						</div>
						<div className="transfer-hero-links">
							<a href={hub.links.home} target="_blank" rel="noreferrer">
								TransferRoom
							</a>
							<a href={hub.links.tracker} target="_blank" rel="noreferrer">
								Window tracker
							</a>
							<a href={hub.links.xtv} target="_blank" rel="noreferrer">
								xTV
							</a>
							<a href={hub.links.blog} target="_blank" rel="noreferrer">
								Blog
							</a>
							<a href={hub.seasonPage} target="_blank" rel="noreferrer">
								Season sheet
							</a>
						</div>
					</div>

					<div className="filter-pills squad-hub-tabs">
						{(
							[
								['in', `In (${hub.arrivals.length})`],
								['out', `Out (${hub.departures.length})`],
								['rumors', `Rumors (${hub.rumors.length})`],
								['records', 'Club records'],
								['values', 'Player values'],
							] as const
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								className={section === id ? 'active' : ''}
								onClick={() => setSection(id)}
							>
								{label}
							</button>
						))}
					</div>

					{section === 'in' && (
						<div className="home-block glass-panel">
							<span className="panel-label">Arrivals</span>
							<h3>In — {hub.season}</h3>
							<DealTable deals={hub.arrivals} clubLabel="From" />
						</div>
					)}

					{section === 'out' && (
						<div className="home-block glass-panel">
							<span className="panel-label">Departures</span>
							<h3>Out — {hub.season}</h3>
							<DealTable deals={hub.departures} clubLabel="To" />
						</div>
					)}

					{section === 'rumors' && (
						<div className="home-block glass-panel">
							<span className="panel-label">Rumors</span>
							<h3>Barça deal talk</h3>
							<p className="muted">
								Fabrizio and Reshad tweets that are actually about moves — Here We Go, bids, medicals — not
								quotes or mottos. Fetch latest also folds in the Football News feed so this tab does not go empty
								when X rate-limits the second pull.
							</p>
							<div className="transfer-rumor-filters filter-pills">
								{(
									[
										['all', `All (${rumorCounts.all})`],
										['here-we-go', `Here we go (${rumorCounts.hwg})`],
										['hot', `Close (${rumorCounts.hot})`],
										['in', `In (${rumorCounts.in})`],
										['out', `Out (${rumorCounts.out})`],
									] as const
								).map(([id, label]) => (
									<button
										key={id}
										type="button"
										className={rumorFilter === id ? 'active' : ''}
										onClick={() => setRumorFilter(id)}
									>
										{label}
									</button>
								))}
							</div>
							{rumorList.length ? (
								<div className="transfer-rumor-grid">
									{rumorList.map((item) => (
										<RumorCard key={item.url} item={item} />
									))}
								</div>
							) : (
								<p className="muted">
									{hub.rumors.length
										? 'Nothing in this filter. Try All or Here we go.'
										: 'No Barça transfer talk in the latest pull. Hit Fetch latest, or open Football News for the full Fabrizio feed.'}{' '}
									{!hub.rumors.length && (
										<button type="button" className="link-btn" onClick={() => setTab('football-news')}>
											Football News →
										</button>
									)}
								</p>
							)}
						</div>
					)}

					{section === 'records' && (
						<div className="transfer-records-grid">
							<div className="home-block glass-panel">
								<span className="panel-label">Paid</span>
								<h3>Club-record arrivals</h3>
								<ol className="transfer-record-list">
									{hub.recordsIn.map((r) => (
										<li key={`in-${r.player}-${r.year}`}>
											<strong>{r.player}</strong>
											<span>
												{r.fee} · {r.club} · {r.year}
											</span>
										</li>
									))}
								</ol>
							</div>
							<div className="home-block glass-panel">
								<span className="panel-label">Received</span>
								<h3>Club-record sales</h3>
								<ol className="transfer-record-list">
									{hub.recordsOut.map((r) => (
										<li key={`out-${r.player}-${r.year}`}>
											<strong>{r.player}</strong>
											<span>
												{r.fee} · {r.club} · {r.year}
											</span>
										</li>
									))}
								</ol>
							</div>
						</div>
					)}

					{section === 'values' && (
						<div className="home-block glass-panel">
							<span className="panel-label">Squad value</span>
							<h3>Current player values · {hub.squadValueTotalLabel}</h3>
							<p className="muted">
								TransferRoom Expected Transfer Value (xTV) sits behind club API login. Public ESPN / Google
								Sports feeds do not publish first-team market values.
							</p>
							<div className="transfer-value-grid">
								{hub.values.map((row) => {
									const squad = [...squadByName.values()].find(
										(p) => p.sofaId === row.sofaId || p.name.toLowerCase() === row.name.toLowerCase(),
									);
									return (
										<button
											key={row.sofaId}
											type="button"
											className="squad-hub-card"
											onClick={(e) => openValue(row, e.currentTarget)}
										>
											<PlayerAvatar
												player={
													squad ?? {
														id: `espn-${row.sofaId}`,
														name: row.name,
														position: row.position,
														number: row.number,
														nationality: row.nationality,
														photo: '',
														birthDate: '',
														sofaId: row.sofaId,
													}
												}
												size="lg"
											/>
											<div>
												{row.number && <span className="num">#{row.number}</span>}
												<strong>{row.name}</strong>
												<span className="muted">{row.position}</span>
												<span className="transfer-value-chip">{row.valueLabel}</span>
											</div>
										</button>
									);
								})}
							</div>
						</div>
					)}

					<p className="muted fetch-meta">
						Updated {formatDateTime(hub.fetchedAt)} IST · {hub.sources.join(' · ')}
					</p>
				</>
			)}
		</section>
	);
}
