export type OnThisDayEvent = {
	/** Month-day key, e.g. "05-06" for 6 May */
	md: string;
	year: number;
	title: string;
	blurb: string;
	tag: string;
};

/** Curated Barça moments keyed by month-day (local calendar). */
export const ON_THIS_DAY: OnThisDayEvent[] = [
	{ md: '01-14', year: 2018, title: 'Copas del Rey night', blurb: 'Barça lifted another Copa — the club’s cup DNA never sleeps in January.', tag: 'Domestic' },
	{ md: '02-16', year: 2017, title: 'Paris heartbreak… then hope', blurb: 'The 4–0 at Parc des Princes set up football’s wildest remountada three weeks later.', tag: 'UCL' },
	{ md: '03-08', year: 2017, title: 'La Remontada', blurb: '6–1 vs PSG. Neymar, Suárez, Sergi Roberto in the 95th — Camp Nou suspended gravity.', tag: 'UCL' },
	{ md: '03-12', year: 2019, title: 'Anfield awaits', blurb: 'A 3–0 first-leg lead vs Liverpool still haunts European nights — and fuels every comeback belief.', tag: 'UCL' },
	{ md: '04-16', year: 2011, title: 'Real Madrid, Bernabéu', blurb: 'Messi’s Clásico masterclasses in April became folklore — small spaces, endless goals.', tag: 'El Clásico' },
	{ md: '04-27', year: 2011, title: 'Wembley road opens', blurb: 'Barça’s 2011 UCL run was peak tiki-taka — Xavi & Iniesta conducting Europe.', tag: 'UCL' },
	{ md: '05-06', year: 2009, title: 'Iniesta at Stamford Bridge', blurb: '93rd minute. Chelsea frozen. “Iniesta… Gol!” — Rome was suddenly possible.', tag: 'UCL' },
	{ md: '05-13', year: 2012, title: 'League clinchers', blurb: 'May title parties became a Blaugrana tradition under Guardiola and beyond.', tag: 'La Liga' },
	{ md: '05-25', year: 2013, title: 'Tito’s league', blurb: 'Vilanova’s side sealed La Liga — courage after Guardiola’s exit.', tag: 'La Liga' },
	{ md: '05-27', year: 2009, title: 'Rome — first Guardiola UCL', blurb: '2–0 vs Man United. Messi floating. Eto’o ruthless. A new football language.', tag: 'UCL' },
	{ md: '05-28', year: 2011, title: 'Wembley 2011', blurb: '3–1 vs United. Pedro, Messi, Villa. Peak Barça on England’s biggest stage.', tag: 'UCL' },
	{ md: '06-06', year: 2015, title: 'Berlin — the treble again', blurb: '3–1 vs Juventus. MSN. Luis Enrique’s Barça completed another historic treble.', tag: 'UCL' },
	{ md: '06-11', year: 2010, title: 'World Cup core', blurb: 'Barça’s spine carried Spain — Xavi, Iniesta, Puyol, Busquets as a club language.', tag: 'La Masia' },
	{ md: '07-17', year: 2010, title: 'World champions DNA', blurb: 'The Blaugrana imprint on Spain’s 2010 triumph still defines La Masia mythology.', tag: 'La Masia' },
	{ md: '08-28', year: 2009, title: 'UEFA Super Cup', blurb: 'Guardiola’s machine kept collecting silverware — August meant more trophies.', tag: 'Europe' },
	{ md: '09-01', year: 2008, title: 'Guardiola era begins', blurb: 'Pep took the first team — and rewrote how Europe thought about possession.', tag: 'Club' },
	{ md: '09-05', year: 2018, title: 'Season grind resumes', blurb: 'Early September always means La Liga rhythm — Camp Nou nights back under the lights.', tag: 'La Liga' },
	{ md: '09-11', year: 2009, title: 'Sextuple season', blurb: 'The 2009 sextuple run made every autumn fixture feel historic.', tag: 'Club' },
	{ md: '09-17', year: 2013, title: 'Messi magic nights', blurb: 'September hat-tricks became routine for Leo — defenders never adjusted.', tag: 'La Liga' },
	{ md: '10-07', year: 2012, title: 'Clásico fireworks', blurb: 'Autumn Clásicos under the lights — Madrid rivalry at full volume.', tag: 'El Clásico' },
	{ md: '10-19', year: 2011, title: 'Athletic thrashings', blurb: 'Barça’s 2011–12 league form crushed Bilbao and everyone else in between.', tag: 'La Liga' },
	{ md: '10-28', year: 2009, title: 'Bernabéu applause', blurb: 'Ronaldinho once received Madrid’s ovation — Clásico nights create legends.', tag: 'El Clásico' },
	{ md: '11-05', year: 2013, title: 'Milan rematch lore', blurb: 'European Novembers at Camp Nou — nights when 3–0 deficits still felt reverseable.', tag: 'UCL' },
	{ md: '11-25', year: 2017, title: 'Juventus dismantled', blurb: '3–0 at home vs Juve — Messi, Suárez, and a stadium that smelled blood.', tag: 'UCL' },
	{ md: '12-10', year: 2011, title: 'Group-stage coronations', blurb: 'December often meant first place sealed — then focus shifted to knockout destiny.', tag: 'UCL' },
	{ md: '12-18', year: 2011, title: 'Club World Cup', blurb: 'Barça as world champions again — Messi floating above every final.', tag: 'Club' },
	{ md: '12-22', year: 2010, title: 'Winter title marches', blurb: 'Christmas tables with Barça on top became the expected gift for Culés.', tag: 'La Liga' },
];

function mdKey(d: Date) {
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${m}-${day}`;
}

function dayOfYear(d: Date) {
	const start = new Date(d.getFullYear(), 0, 0);
	return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

function eventDayOfYear(md: string, year: number) {
	const [mm, dd] = md.split('-').map(Number);
	return dayOfYear(new Date(year, mm - 1, dd));
}

/** Exact day first; else nearest event within ±10 days; else a seasonal pick. */
export function pickOnThisDay(now = new Date()): { event: OnThisDayEvent; exact: boolean } {
	const key = mdKey(now);
	const exactMatches = ON_THIS_DAY.filter((e) => e.md === key);
	if (exactMatches.length) {
		const event = exactMatches[Math.floor(Math.random() * exactMatches.length)]!;
		return { event, exact: true };
	}

	const today = dayOfYear(now);
	let best: OnThisDayEvent | null = null;
	let bestDist = Infinity;
	for (const e of ON_THIS_DAY) {
		const dist = Math.abs(eventDayOfYear(e.md, now.getFullYear()) - today);
		const wrap = Math.min(dist, 365 - dist);
		if (wrap < bestDist) {
			bestDist = wrap;
			best = e;
		}
	}

	return {
		event: best ?? ON_THIS_DAY[0]!,
		exact: false,
	};
}

export function formatOnThisDayLabel(event: OnThisDayEvent, exact: boolean) {
	const [mm, dd] = event.md.split('-').map(Number);
	const when = new Date(event.year, mm - 1, dd).toLocaleDateString('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
	return exact ? when : `Near today · ${when}`;
}
