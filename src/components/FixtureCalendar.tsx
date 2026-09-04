import { useMemo, useState } from 'react';
import type { Fixture } from '../types';
import { resultLabel, formatTime, formatCalendarDate, formatMonthYear } from '../lib/api';

type Props = {
	fixtures: Fixture[];
	selectedDate: string | null;
	onSelectDate: (date: string | null) => void;
	onSelectFixture: (id: string) => void;
};

export function FixtureCalendar({ fixtures, selectedDate, onSelectDate, onSelectFixture }: Props) {
	const [monthOffset, setMonthOffset] = useState(0);

	const { monthLabel, weeks, fixtureByDate } = useMemo(() => {
		const now = new Date();
		const view = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
		const year = view.getFullYear();
		const month = view.getMonth();
		const firstDow = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		const byDate = new Map<string, Fixture[]>();
		for (const f of fixtures) {
			if (!f.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) continue;
			(byDate.get(f.date) ?? byDate.set(f.date, []).get(f.date)!).push(f);
		}

		const cells: Array<{ date: string | null; day: number | null; fixtures: Fixture[] }> = [];
		for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null, fixtures: [] });
		for (let d = 1; d <= daysInMonth; d++) {
			const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			cells.push({ date, day: d, fixtures: byDate.get(date) ?? [] });
		}
		while (cells.length % 7 !== 0) cells.push({ date: null, day: null, fixtures: [] });

		const weeks: typeof cells[] = [];
		for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

		return {
			monthLabel: formatMonthYear(year, month),
			weeks,
			fixtureByDate: byDate,
		};
	}, [fixtures, monthOffset]);

	const selectedFixtures = selectedDate ? (fixtureByDate.get(selectedDate) ?? []) : [];

	return (
		<div className="fixture-calendar">
			<div className="cal-head">
				<button type="button" className="btn-ghost" onClick={() => setMonthOffset((m) => m - 1)}>
					←
				</button>
				<h3>{monthLabel}</h3>
				<button type="button" className="btn-ghost" onClick={() => setMonthOffset((m) => m + 1)}>
					→
				</button>
			</div>
			<div className="cal-grid">
				{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
					<div key={d} className="cal-dow">
						{d}
					</div>
				))}
				{weeks.flat().map((cell, i) => {
					if (!cell.date) return <div key={`empty-${i}`} className="cal-cell empty" />;
					const hasMatch = cell.fixtures.length > 0;
					const isSelected = selectedDate === cell.date;
					const today = new Date().toISOString().slice(0, 10) === cell.date;
					return (
						<button
							key={cell.date}
							type="button"
							className={`cal-cell ${hasMatch ? 'has-match' : ''} ${isSelected ? 'selected' : ''} ${today ? 'today' : ''}`}
							onClick={() => onSelectDate(isSelected ? null : cell.date)}
						>
							<span className="cal-day">{cell.day}</span>
							{hasMatch && (
								<span className="cal-dots">
									{cell.fixtures.map((f) => (
										<span
											key={f.id}
											className={`cal-dot ${f.competition.includes('Champions') ? 'ucl' : 'laliga'} ${resultLabel(f) ?? 'upcoming'}`}
											title={`${f.competition}: vs ${f.opponent}`}
										/>
									))}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{selectedDate && (
				<div className="cal-day-detail">
					<h4>{formatCalendarDate(selectedDate)}</h4>
					{selectedFixtures.length === 0 ? (
						<p className="muted">No Barça fixture this day.</p>
					) : (
						selectedFixtures.map((f) => (
							<button key={f.id} type="button" className="cal-fixture-row" onClick={() => onSelectFixture(f.id)}>
								<span className={`comp-badge ${f.competition.includes('Champions') ? 'ucl' : 'laliga'}`}>
									{f.competition.includes('Champions') ? 'UCL' : 'LAL'}
								</span>
								<span>{f.isHome ? 'vs' : '@'} {f.opponent}</span>
								<span className="muted">{formatTime(f.time, f.date)}</span>
								{f.homeScore != null && (
									<span className="score-cell">
										{f.isHome ? f.homeScore : f.awayScore}–{f.isHome ? f.awayScore : f.homeScore}
									</span>
								)}
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
}
