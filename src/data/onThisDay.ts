export type OnThisDayPhoto = {
	src: string;
	caption: string;
};

export type OnThisDayMoment = {
	time: string;
	text: string;
};

export type OnThisDayEvent = {
	md: string;
	year: number;
	title: string;
	blurb: string;
	tag: string;
	incident: string;
	whyItMatters: string;
	context: string;
	timeline: OnThisDayMoment[];
	aftermath: string;
	scoreline?: string;
	venue?: string;
	competition?: string;
	photos: OnThisDayPhoto[];
};

/** Curated Barça moments keyed by month-day (local calendar). */
export const ON_THIS_DAY: OnThisDayEvent[] = [
	{
		md: '01-14',
		year: 2018,
		title: 'Copa rhythm in winter',
		blurb: 'January Copa nights kept Barça’s domestic DNA sharp when Europe waited.',
		tag: 'Domestic',
		incident:
			'Mid-January Copa del Rey ties under Ernesto Valverde — midweek floodlights, rotated XIs, and the habit of treating every competition as identity.',
		whyItMatters:
			'The Copa is where academy kids debut and veterans stay sharp. Those January nights feed the club’s doctrine that Barça’s football should win on every front, not only in Europe.',
		context:
			'The 2017–18 season found Barça leading La Liga but still hunting the Copa. January meant congested calendars: league leaders could not treat domestic cups as decoration. Camp Nou midweeks in winter became laboratories for squad depth — Yerry Mina’s debut window, fringe players earning minutes, and a reminder that the treble dream always passes through January.',
		timeline: [
			{ time: 'Jan 4', text: 'Copa round of 16 first leg vs Celta: Barça win 5–0 at Camp Nou — a statement before the serious winter grind.' },
			{ time: 'Jan 11', text: 'Return leg in Vigo: 1–1 draw closes the tie 6–1 on aggregate; rotation keeps legs fresh for Madrid and Europe.' },
			{ time: 'Jan 14', text: 'League focus returns — the squad carries Copa momentum into La Liga’s cold stretch.' },
		],
		aftermath:
			'Barça reached the Copa semi-finals that spring before falling to Espanyol. The January rhythm nonetheless proved Valverde could manage a deep squad without losing domestic edge — a template later treble-chasing sides would need.',
		competition: 'Copa del Rey',
		venue: 'Camp Nou',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou under midweek floodlights — where January Copa ties keep the domestic engine warm.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi-era Barça treated every competition as a stage for the same football identity.' },
			{ src: '/backgrounds/stadium/san-mames.jpg', caption: 'Away legs in winter — Athletic’s cathedral and other hostile grounds test squad depth.' },
		],
	},
	{
		md: '02-16',
		year: 2017,
		title: 'Paris heartbreak… then hope',
		blurb: 'The 4–0 at Parc des Princes set up football’s wildest remontada three weeks later.',
		tag: 'UCL',
		incident:
			'14 February 2017: PSG dismantled Barça 4–0 at Parc des Princes. Cavani, Di María (×2), and Draxler scored; the tie looked dead.',
		whyItMatters:
			'Without that humiliation there is no Remontada mythology. Defeat became fuel — Culés learned again that Barça’s European story includes resurrection.',
		context:
			'Unai Emery’s PSG had spent heavily and played with fury. Barça arrived in Paris with a depleted defence — no Samuel Umtiti, no Aleix Vidal — and were torn apart on the counter. Di María’s two goals and Draxler’s blistering finish made the second leg feel like a formality. Camp Nou went quiet; pundits wrote obituaries for MSN’s European reign.',
		timeline: [
			{ time: "3'", text: 'Draxler finishes a swift move — PSG lead inside three minutes.' },
			{ time: "40'", text: 'Di María curls a second; Barça’s high line is punished again.' },
			{ time: "47'", text: 'Cavani heads a third before half-time — tie effectively over in one night.' },
			{ time: "72'", text: 'Di María completes the 4–0; Parc des Princes erupts, Barcelona heads drop.' },
		],
		aftermath:
			'Three weeks later Camp Nou would rewrite the script 6–1. But this night mattered: it exposed structural fragility, galvanised the squad, and gave the Remontada its necessary prelude of despair.',
		scoreline: 'PSG 4–0 Barcelona (agg. 4–0)',
		venue: 'Parc des Princes, Paris',
		competition: 'UEFA Champions League · Round of 16 · 1st leg',
		photos: [
			{ src: '/backgrounds/stadium/metropolitano.jpg', caption: 'Parc des Princes atmosphere — the night PSG put four past Barça and the tie looked finished.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bar%C3%A7a_6_-_PSG_1%3B_Dimecres_8_de_mar%C3%A7_de_2017_-_33340360945.jpg', caption: 'Three weeks later the same tie would produce the Remontada — but first came Paris.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou would have to become a miracle factory; this defeat made that legend possible.' },
		],
	},
	{
		md: '03-08',
		year: 2017,
		title: 'La Remontada',
		blurb: '6–1 vs PSG. Neymar, Suárez, Sergi Roberto in the 95th — Camp Nou suspended gravity.',
		tag: 'UCL',
		incident:
			'8 March 2017: Barça overturned a 4–0 first-leg deficit, winning 6–1. Neymar’s free-kick and Sergi Roberto’s 95th-minute winner sealed the greatest comeback in Champions League history.',
		whyItMatters:
			'It is the club’s modern miracle — proof that Camp Nou can rewrite mathematics. Every later comeback chant still borrows that night’s oxygen.',
		context:
			'Needing three goals to force extra time and four to win outright, Luis Enrique’s side faced a PSG team that had added Ángel Di María and seemed content to defend a lead. Camp Nou’s crowd — roughly 96,000 — turned the night into pressure physics. Kurzawa’s own goal and Messi’s penalty swung momentum; Cavani’s 62nd-minute strike looked like the killer until Neymar authored the impossible final quarter-hour.',
		timeline: [
			{ time: "3'", text: 'Suárez pounces on a loose ball — 1–0, belief flickers early.' },
			{ time: "40'", text: 'Kurzawa turns Rakitić’s cross into his own net — 2–0 at half-time, noise building.' },
			{ time: "50'", text: 'Messi buries a penalty after Neymar is fouled — 3–0, tie level on away goals.' },
			{ time: "62'", text: 'Cavani volleys home — 3–1, PSG ahead again; Camp Nou holds its breath.' },
			{ time: "88'", text: 'Neymar’s curling free-kick finds the top corner — 4–1, one goal from history.' },
			{ time: "90+1'", text: 'Neymar converts a controversial penalty — 5–1, aggregate 5–5, away goals favour PSG.' },
			{ time: "95'", text: 'Sergi Roberto, Barça’s right-back, stabs Neymar’s cross home — 6–1, Camp Nou detonates.' },
		],
		aftermath:
			'Barça fell to Juventus in the quarter-finals, but the Remontada entered eternal club lore. Neymar’s departure to PSG later that summer only sharpened the irony — he had authored Barça’s last great European miracle against the club he would join.',
		scoreline: 'Barcelona 6–1 PSG (agg. 6–5)',
		venue: 'Camp Nou, Barcelona',
		competition: 'UEFA Champions League · Round of 16 · 2nd leg',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bar%C3%A7a_6_-_PSG_1%3B_Dimecres_8_de_mar%C3%A7_de_2017_-_33340360945.jpg', caption: 'Camp Nou on 8 March 2017 — the night of the 6–1 Remontada against PSG.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Roughly 96,000 voices turned a 4–0 deficit into the greatest Champions League comeback.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s penalty made it 3–0; Neymar and Sergi Roberto wrote the final act.' },
		],
	},
	{
		md: '03-12',
		year: 2019,
		title: 'Anfield awaits',
		blurb: 'A 3–0 first-leg lead vs Liverpool still haunts European nights — and fuels every comeback belief.',
		tag: 'UCL',
		incident:
			'Barça took a commanding 3–0 first-leg lead into Anfield — then watched a 4–0 second leg erase it in May 2019’s semi-final.',
		whyItMatters:
			'It sits beside the Remontada as a warning: leads are not trophies. The wound hardened a generation of Culés about European nights and concentration.',
		context:
			'After the Remontada high, Barça learned the inverse lesson. The 2018–19 semi-final path paired Ernesto Valverde’s ageing core with Liverpool’s heavy-metal press. A Camp Nou first leg looked like mastery — Suárez and Messi punished Liverpool’s high line — but the away-goals cushion bred complacency. Anfield in May became the antidote to every comeback fantasy.',
		timeline: [
			{ time: 'May 1', text: 'First leg at Camp Nou: Suárez (26′), Messi (90′ pen), Dembélé (90+2′) — Barça lead 3–0.' },
			{ time: 'Context', text: 'Pundits declare the tie over; Liverpool need a Remontada of their own.' },
			{ time: 'May 7', text: 'Anfield: Origi (7′, 79′), Wijnaldum (54′, 56′) — Liverpool win 4–0, aggregate 4–3.' },
			{ time: 'May 7', text: 'Barcelona eliminated without a single shot on target in the second half at Anfield.' },
		],
		aftermath:
			'Valverde’s European record never recovered. The collapse became shorthand for defensive drift and mental softness — the mirror image of 2017’s miracle, teaching Culés that Camp Nou magic cuts both ways.',
		scoreline: 'Barcelona 3–0 Liverpool · Liverpool 4–0 Barcelona (agg. 4–3)',
		venue: 'Camp Nou · Anfield',
		competition: 'UEFA Champions League · Semi-final',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou first leg — Suárez and Messi built a 3–0 lead that felt unassailable.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s late penalty made it 3–0; the cushion would prove a trap.' },
			{ src: '/backgrounds/stadium/san-mames.jpg', caption: 'European away nights demand ruthlessness — Anfield punished any drop in intensity.' },
		],
	},
	{
		md: '04-16',
		year: 2011,
		title: 'Clásico spring',
		blurb: 'Messi’s Clásico masterclasses in April became folklore — small spaces, endless goals.',
		tag: 'El Clásico',
		incident:
			'Spring Clásicos in the Guardiola years often decided league destinies. Messi found pockets Madrid could not close; Xavi and Iniesta conducted the chaos.',
		whyItMatters:
			'El Clásico is how Barça measures itself against Spain’s other giant. Those April nights turned rivalry into a language of dominance, not just fixtures.',
		context:
			'The 2010–11 season’s title race hinged on direct confrontations. Real Madrid under Mourinho had amassed a record points haul, but Guardiola’s Barça owned the big nights. April Clásicos at the Bernabéu became Messi exhibitions — low centre of gravity, impossible angles — while Xavi and Iniesta recycled possession until Madrid’s press broke.',
		timeline: [
			{ time: 'Apr 16', text: 'La Liga Clásico at Bernabéu: Messi scores twice in a 2–0 win — decisive for the title race.' },
			{ time: 'Apr 16', text: 'Pedro and Villa stretch Madrid’s back line; Alves and Abidal provide width.' },
			{ time: 'Apr 27', text: 'Champions League semi first leg: Messi brace again at Bernabéu — 2–0, path to Wembley opens.' },
		],
		aftermath:
			'Barça won La Liga and the Champions League that season — the April Clásicos were the hinge. Madrid’s project under Mourinho would eventually respond, but 2011 belonged to Messi’s spring.',
		scoreline: 'Real Madrid 0–2 Barcelona (La Liga · Apr 2011)',
		venue: 'Santiago Bernabéu, Madrid',
		competition: 'La Liga · El Clásico',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/4/43/El_Cl%C3%A1sico_game.jpg', caption: 'El Clásico under the lights — where spring league titles are often decided.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s April masterclasses at the Bernabéu became the rivalry’s modern benchmark.' },
			{ src: '/backgrounds/stadium/metropolitano.jpg', caption: 'Madrid’s fortress — conquered repeatedly in Guardiola’s peak years.' },
		],
	},
	{
		md: '04-27',
		year: 2011,
		title: 'Wembley road opens',
		blurb: 'Barça’s 2011 UCL run was peak tiki-taka — Xavi & Iniesta conducting Europe.',
		tag: 'UCL',
		incident:
			'27 April 2011: Messi scored twice at the Bernabéu in the Champions League semi-final first leg — 2–0, and Wembley beckoned.',
		whyItMatters:
			'2011 is the high watermark of Barça’s European idea: midfield as weapon, pressing as morality. Every modern rebuild still references that template.',
		context:
			'Guardiola’s side entered the semi-final against Mourinho’s Madrid carrying league momentum. The first leg at the Bernabéu was billed as war; Barça played seminar football instead. Messi’s two goals — the second followed by his iconic Calma celebration — silenced Madrid and sent Culés dreaming of Wembley.',
		timeline: [
			{ time: "27'", text: 'Messi finishes a Busquets–Xavi combination — 0–1, Barça seize control.' },
			{ time: "54'", text: 'Messi cuts inside from the right and curls a second — 0–2, Calma.' },
			{ time: 'May 3', text: 'Camp Nou second leg ends 1–1 (Pedro, Marcelo) — aggregate 3–1, final booked.' },
		],
		aftermath:
			'A month later Barça dismantled Manchester United 3–1 at Wembley. The April Bernabéu brace was the gateway — proof that peak Barça could win anywhere, against anyone, on the biggest stage.',
		scoreline: 'Real Madrid 0–2 Barcelona (agg. 1–3)',
		venue: 'Santiago Bernabéu, Madrid',
		competition: 'UEFA Champions League · Semi-final · 1st leg',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Wembley_London_Final_UEFA_Champions_League_2011.jpg/1280px-Wembley_London_Final_UEFA_Champions_League_2011.jpg', caption: 'Wembley awaited — the destination Guardiola’s side earned at the Bernabéu.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s brace at the Bernabéu opened the road to London.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/4/43/El_Cl%C3%A1sico_game.jpg', caption: 'Champions League Clásico — Madrid’s European dream ended in April.' },
		],
	},
	{
		md: '05-06',
		year: 2009,
		title: 'Iniesta at Stamford Bridge',
		blurb: '93rd minute. Chelsea frozen. “Iniesta… Gol!” — Rome was suddenly possible.',
		tag: 'UCL',
		incident:
			'6 May 2009, Stamford Bridge: Andrés Iniesta smashed a 93rd-minute equaliser — Barça reached the final on away goals after a brutal semi-final.',
		whyItMatters:
			'Without that strike there is no Rome 2009 treble peak. One hit of a left foot became La Masia immortality — composure under the loudest pressure Europe offers.',
		context:
			'Guus Hiddink’s Chelsea had ground out a 0–0 at Camp Nou. At Stamford Bridge, Michael Essien’s thunderbolt (9′) and Eric Abidal’s red card (66′) looked enough. Barça played with ten men, Iniesta’s only shot on target all night — a curling left-foot volley from Messi’s cut-back — stole the tie on away goals.',
		timeline: [
			{ time: "9'", text: 'Essien volleys Chelsea ahead from a Malouda cross — 1–0 Chelsea.' },
			{ time: "66'", text: 'Abidal sent off for a last-man foul on Nicolas Anelka — Barça down to ten.' },
			{ time: "93'", text: 'Iniesta meets Messi’s pass first time — 1–1, away goals send Barça to Rome.' },
			{ time: 'Context', text: 'Drogba’s post-whistle fury at Tom Henning Øvrebø becomes part of the lore.' },
		],
		aftermath:
			'Three weeks later Barça beat Manchester United 2–0 in Rome to complete the first Guardiola treble. Iniesta’s Stamford Bridge moment is the hinge — La Masia composure under existential pressure.',
		scoreline: 'Chelsea 1–1 Barcelona (agg. 1–1, Barça on away goals)',
		venue: 'Stamford Bridge, London',
		competition: 'UEFA Champions League · Semi-final · 2nd leg',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Rooney_defended_by_Iniesta%2C_Busquets%2C_UEFA_Champions_League_Final_2009.jpg', caption: 'Iniesta and Busquets — midfield nerve that survived Stamford Bridge and conquered Rome.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Pep_Guardiola%2C_2009_UEFA_Champions_League_Final.jpg', caption: 'Guardiola’s first European crown was unlocked by one Iniesta strike in London.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou held its breath across the channel until Iniesta’s 93rd-minute equaliser.' },
		],
	},
	{
		md: '05-13',
		year: 2012,
		title: 'League clinchers',
		blurb: 'May title parties became a Blaugrana tradition under Guardiola and beyond.',
		tag: 'La Liga',
		incident:
			'11 May 2012: Barça sealed La Liga with a 4–1 derby win over Espanyol at Camp Nou — champagne maths in mid-May.',
		whyItMatters:
			'Domestic titles are the club’s weekly proof of superiority. Those clinching nights fund the myth that Barça’s football should also win the hard leagues.',
		context:
			'Guardiola’s final season was emotionally charged — elimination by Chelsea in Europe, Madrid’s Copa triumph, yet the league remained Blaugrana property. The derby clincher against Espanyol turned Camp Nou into a street party: Titles won at home, against neighbours, carry extra sweetness.',
		timeline: [
			{ time: "11'", text: 'Iniesta opens the scoring — party starts early.' },
			{ time: "28'", text: 'Lionel Messi doubles the lead — his 68th league goal of a record season.' },
			{ time: "51'", text: 'Jordi Alba makes it 3–0; title mathematically secured.' },
			{ time: "73'", text: 'Pedro seals 4–1; Camp Nou erupts in Guardiola’s penultimate league match.' },
		],
		aftermath:
			'It was Guardiola’s fourth La Liga in four years — domestic dominance even as Europe slipped away. May clinchers became the emotional punctuation of seasons Culés expect as birthright.',
		scoreline: 'Barcelona 4–1 Espanyol',
		venue: 'Camp Nou, Barcelona',
		competition: 'La Liga · Title clincher',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou title parties — where May maths turn into scarves and song.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s 68-goal league season peaked with derby-day champagne.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Pep_Guardiola%2C_2009_UEFA_Champions_League_Final.jpg', caption: 'Guardiola’s final league title — domestic identity intact until the last.' },
		],
	},
	{
		md: '05-25',
		year: 2013,
		title: 'Tito’s league',
		blurb: 'Vilanova’s side sealed La Liga — courage after Guardiola’s exit.',
		tag: 'La Liga',
		incident:
			'Tito Vilanova’s 2012–13 side took the league with 100 points — a season played under illness and enormous expectation after Pep’s departure.',
		whyItMatters:
			'It proved the project was bigger than one coach. Continuity of idea — not just star names — is a Barça doctrine Culés still demand.',
		context:
			'When Guardiola left in 2012, sceptics asked whether tiki-taka could survive without its architect. Tito Vilanova, Pep’s assistant and a La Masia man, answered with the highest points tally in Spanish league history to that point. The title was clinched in May against Atlético — football as inheritance, not interruption.',
		timeline: [
			{ time: 'May 11', text: 'Barça beat Atlético Madrid 4–2 at Camp Nou — league title confirmed with games to spare.' },
			{ time: 'Season', text: '100 points, 115 goals — statistical dominance without Guardiola on the bench.' },
			{ time: 'Context', text: 'Tito battled illness throughout; the title carries human weight beyond tactics.' },
		],
		aftermath:
			'Tito resigned in July 2013 due to health; he passed away that December. The 100-point league remains his monument — proof that Barça’s idea outlived any single coach.',
		scoreline: 'Barcelona 4–2 Atlético Madrid (title clincher)',
		venue: 'Camp Nou, Barcelona',
		competition: 'La Liga · 2012–13 champions (100 pts)',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou, May 2013 — where Tito Vilanova’s side sealed a 100-point league.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Josep_Guardiola_-_coach_of_Bar%C3%A7a_B.JPG', caption: 'From Pep’s bench to Tito’s touchline — continuity of the La Masia project.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s goals powered a league win that proved the system survived Guardiola’s exit.' },
		],
	},
	{
		md: '05-27',
		year: 2009,
		title: 'Rome — first Guardiola UCL',
		blurb: '2–0 vs Man United. Messi floating. Eto’o ruthless. A new football language.',
		tag: 'UCL',
		incident:
			'27 May 2009, Stadio Olimpico: Barça beat Manchester United 2–0. Eto’o (10′) and Messi (70′) scored; Guardiola’s first European crown arrived.',
		whyItMatters:
			'Rome announced a new European order. Possession became spectacle, La Masia became product, and “Més que un club” got a Champions League accent.',
		context:
			'Guardiola’s first season culminated in Rome against Sir Alex Ferguson’s holders. United had beaten Barça in 2008; revenge was clinical. Eto’o stole in early, Messi headed a second — the first of many European final goals — and Barça’s pressing-possession model was crowned on the continent.',
		timeline: [
			{ time: "10'", text: 'Eto’o pounces on a loose ball after Henry’s effort — 1–0 Barça.' },
			{ time: "70'", text: 'Messi heads Xavi’s cross over Edwin van der Sar — 2–0, game settled.' },
			{ time: 'Full time', text: 'Puyol lifts the trophy; Guardiola completes the treble in his debut season.' },
		],
		aftermath:
			'Rome launched the sextuple chase — Super Cup, Club World Cup, and another league title followed. European football had a new reference point: Barça’s midfield as weapon, La Masia as export.',
		scoreline: 'Barcelona 2–0 Manchester United',
		venue: 'Stadio Olimpico, Rome',
		competition: 'UEFA Champions League · Final',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Pep_Guardiola%2C_2009_UEFA_Champions_League_Final.jpg', caption: 'Pep Guardiola at the Stadio Olimpico — first Champions League crown, first treble.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Rooney_defended_by_Iniesta%2C_Busquets%2C_UEFA_Champions_League_Final_2009.jpg', caption: 'Iniesta and Busquets smother Rooney — Rome was won in midfield first.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s headed second goal announced a decade of European final brilliance.' },
		],
	},
	{
		md: '05-28',
		year: 2011,
		title: 'Wembley 2011',
		blurb: '3–1 vs United. Pedro, Messi, Villa. Peak Barça on England’s biggest stage.',
		tag: 'UCL',
		incident:
			'28 May 2011: Barça dismantled Manchester United 3–1 at Wembley. Pedro, Messi and Villa scored; Sir Alex Ferguson called them the best he had faced.',
		whyItMatters:
			'Peak tiki-taka on the biggest stage. For Culés it is the aesthetic high point — football as control, beauty, and ruthlessness in one kit.',
		context:
			'Two years after Rome, Guardiola’s side returned to a Champions League final against the same opponent — and played at a higher octave. Xavi and Iniesta completed 569 passes between them; Messi scored from nowhere; Villa’s late third was punctuation. Ferguson’s “Iniesta, Xavi, Messi — wow” quote sealed the mythology.',
		timeline: [
			{ time: "27'", text: 'Pedro finishes a Xavi through-ball — 1–0, Barça’s rhythm established.' },
			{ time: "34'", text: 'Wayne Rooney equalises against the run of play — 1–1 at half-time.' },
			{ time: "54'", text: 'Messi curls home from the edge of the box — 2–1, control restored.' },
			{ time: "69'", text: 'David Villa’s left-foot volley — 3–1, trophy secured.' },
		],
		aftermath:
			'The 2011 final is the aesthetic benchmark — possession as domination, not decoration. Madrid would respond with counter-attacking titles, but Wembley remains the night Culés point to when arguing what Barça should look like.',
		scoreline: 'Barcelona 3–1 Manchester United',
		venue: 'Wembley Stadium, London',
		competition: 'UEFA Champions League · Final',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Wembley_London_Final_UEFA_Champions_League_2011.jpg/1280px-Wembley_London_Final_UEFA_Champions_League_2011.jpg', caption: 'Wembley Stadium, 28 May 2011 — peak tiki-taka on England’s biggest stage.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Bar%C3%A7a_vs._Man_Utd_UEFA_Champions_League_Final_2011.jpg/1280px-Bar%C3%A7a_vs._Man_Utd_UEFA_Champions_League_Final_2011.jpg', caption: 'Barça vs Manchester United — Pedro, Messi, and Villa sealed a second UCL in three years.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s second-half winner turned a tense final into a coronation.' },
		],
	},
	{
		md: '06-06',
		year: 2015,
		title: 'Berlin — the treble again',
		blurb: '3–1 vs Juventus. MSN. Luis Enrique’s Barça completed another historic treble.',
		tag: 'UCL',
		incident:
			'6 June 2015, Berlin: Barça beat Juventus 3–1. Rakitić, Suárez and Neymar scored as MSN sealed a second treble era.',
		whyItMatters:
			'Berlin proved the club could reinvent greatness after Pep. Different coach, same hunger — Culés saw that dynasty DNA survived transitions.',
		context:
			'Luis Enrique’s first season rebuilt around MSN after a trophyless 2013–14. Juventus arrived in Berlin as Serie A champions with a formidable defence; Barça went ahead inside four minutes through Rakitić, conceded an Alvaro Morata equaliser, then let Suárez and Neymar decide it. The treble — league, Copa, Champions League — echoed Guardiola’s 2009 without copying it.',
		timeline: [
			{ time: "4'", text: 'Rakitić volleys in from a Messi cut-back — 1–0, fast start.' },
			{ time: "55'", text: 'Morata equalises for Juventus — 1–1, final in the balance.' },
			{ time: "68'", text: 'Suárez pounces on a Buffon parry — 2–1, MSN shift gear.' },
			{ time: "90+7'", text: 'Neymar races clear and finishes — 3–1, treble sealed in stoppage time.' },
		],
		aftermath:
			'Berlin closed the MSN era’s highest chapter. The club would win another league-Copa double in 2016, but the 2015 treble remains proof that Barça’s competitive ceiling could be reached with different coaches and new attacking tridents.',
		scoreline: 'Barcelona 3–1 Juventus',
		venue: 'Olympiastadion, Berlin',
		competition: 'UEFA Champions League · Final',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Berlin crowned a treble built on Camp Nou’s MSN engine.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s assist for Rakitić opened the scoring inside four minutes.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bar%C3%A7a_6_-_PSG_1%3B_Dimecres_8_de_mar%C3%A7_de_2017_-_33340360945.jpg', caption: 'Neymar’s stoppage-time third mirrored the flair that defined the 2015 side.' },
		],
	},
	{
		md: '06-11',
		year: 2010,
		title: 'World Cup core',
		blurb: 'Barça’s spine carried Spain — Xavi, Iniesta, Puyol, Busquets as a club language.',
		tag: 'La Masia',
		incident:
			'South Africa 2010 opened with Spain’s squad built around Barça’s spine — the tournament’s rhythm was Camp Nou exported to a national shirt.',
		whyItMatters:
			'It is the loudest proof that La Masia is not only a club academy — it became a football culture the world copied.',
		context:
			'When the World Cup kicked off on 11 June 2010, Spain brought seven Barça starters’ DNA to South Africa: Casillas was Madrid, but the midfield — Xavi, Iniesta, Busquets — and Puyol’s leadership were Blaugrana. Vicente del Bosque’s system was Guardiola’s possession religion in red.',
		timeline: [
			{ time: 'Jun 11', text: 'World Cup opens in South Africa — Spain arrive as favourites with Barça’s engine room.' },
			{ time: 'Group', text: 'Shock 0–1 loss to Switzerland; Spain reset around Xavi-Iniesta tempo.' },
			{ time: 'Knockouts', text: 'Puyol’s header vs Germany, Iniesta’s final winner — both Barça authors.' },
		],
		aftermath:
			'Spain’s World Cup win validated La Masia as a national project. Clubs worldwide copied the model; Culés claimed the trophy as shared history — club method becoming country triumph.',
		competition: 'FIFA World Cup 2010 · South Africa',
		venue: 'South Africa',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/FIFA_World_Cup_2010_Spain_with_cup.jpg/1280px-FIFA_World_Cup_2010_Spain_with_cup.jpg', caption: 'Spain lift the 2010 World Cup — Xavi, Iniesta, Puyol, and Busquets at the core.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Rooney_defended_by_Iniesta%2C_Busquets%2C_UEFA_Champions_League_Final_2009.jpg', caption: 'The Iniesta–Busquets pivot that conquered Europe now carried Spain.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou’s football language exported to the world stage.' },
		],
	},
	{
		md: '07-17',
		year: 2010,
		title: 'World champions DNA',
		blurb: 'The Blaugrana imprint on Spain’s 2010 triumph still defines La Masia mythology.',
		tag: 'La Masia',
		incident:
			'11 July 2010: Iniesta’s extra-time winner vs Netherlands made Spain world champions — with Barça’s spine at the heart of the side.',
		whyItMatters:
			'Culés claim that goal as shared history. Club method became country triumph — the ultimate “Més que un club” receipt.',
		context:
			'The Johannesburg final was brutal — Nigel de Jong’s chest stamp on Alonso, Arjen Robben’s missed one-on-one. Spain’s patience wore Holland down. In the 116th minute, Andrés Iniesta — wearing Dani Jarque’s memorial undershirt — volleyed home Cesc Fàbregas’s pass. Seven Barça players had started the final; the goal was La Masia’s signature.',
		timeline: [
			{ time: "116'", text: 'Iniesta controls Fàbregas’s pass and fires past Stekelenburg — 1–0 Spain.' },
			{ time: 'Full time', text: 'Spain’s first World Cup; Iniesta collapses in tears wearing Jarque’s tribute.' },
			{ time: 'Context', text: 'Xavi named best player of the tournament; Busquets and Puyol central to every phase.' },
		],
		aftermath:
			'Spain added Euro 2012 with Barça still supplying the spine. The 2010 triumph remains the academy’s loudest advertisement — proof that La Masia graduates could define an era for club and country simultaneously.',
		scoreline: 'Spain 1–0 Netherlands (aet)',
		venue: 'Soccer City, Johannesburg',
		competition: 'FIFA World Cup 2010 · Final',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/FIFA_World_Cup_2010_Spain_with_cup.jpg/1280px-FIFA_World_Cup_2010_Spain_with_cup.jpg', caption: 'Spain with the World Cup — Iniesta’s extra-time winner in Johannesburg.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Rooney_defended_by_Iniesta%2C_Busquets%2C_UEFA_Champions_League_Final_2009.jpg', caption: 'Iniesta — La Masia graduate, World Cup final hero.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou celebrated as though the trophy belonged to Catalonia too.' },
		],
	},
	{
		md: '08-28',
		year: 2009,
		title: 'UEFA Super Cup',
		blurb: 'Pedro’s extra-time winner in Monaco — another trophy in the sextuple chase.',
		tag: 'Europe',
		incident:
			'28 August 2009: Barça beat Shakhtar Donetsk 1–0 after extra time in Monaco. Pedro Rodríguez scored in the 115th minute.',
		whyItMatters:
			'The sextuple season taught Culés that Barça’s ceiling was not one competition. Ambition became seasonal inventory.',
		context:
			'Less than three months after Rome, Guardiola’s holders faced Europa League champions Shakhtar at Stade Louis II. Shakhtar’s Brazilian-heavy side sat deep; Pedro — another La Masia graduate — broke the deadlock deep in extra time. It was trophy two of six in the calendar year.',
		timeline: [
			{ time: '90', text: 'Regular time ends 0–0 — Shakhtar’s discipline frustrates Barça.' },
			{ time: "115'", text: 'Pedro finishes from a Messi pass — 1–0, Super Cup secured.' },
			{ time: 'Context', text: 'Third piece of silverware after Liga and Champions League — sextuple clock ticking.' },
		],
		aftermath:
			'Barça would add the Club World Cup in December and retain La Liga. Monaco’s Super Cup became a footnote in the sextuple story — but Pedro’s emergence foreshadowed a squad depth that defined 2009.',
		scoreline: 'Barcelona 1–0 Shakhtar Donetsk (aet)',
		venue: 'Stade Louis II, Monaco',
		competition: 'UEFA Super Cup',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Monaco005.jpg/1280px-Monaco005.jpg', caption: 'Stade Louis II, Monaco — where Pedro’s 115th-minute goal won the 2009 Super Cup.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Pep_Guardiola%2C_2009_UEFA_Champions_League_Final.jpg', caption: 'Guardiola collecting silverware — Rome was only the beginning of 2009.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Barcelona_fans_on_August_19%2C_2009.jpg', caption: 'Culés celebrating a trophy-laden summer and autumn in 2009.' },
		],
	},
	{
		md: '09-01',
		year: 2008,
		title: 'Guardiola era begins',
		blurb: 'Pep took the first team — and rewrote how Europe thought about possession.',
		tag: 'Club',
		incident:
			'Summer 2008: Pep Guardiola was appointed first-team coach. He cleared stars, promoted La Masia, and installed a pressing-possession religion.',
		whyItMatters:
			'Everything modern Culés argue about — academy trust, positional play, high press — still orbits that appointment. It is year zero of contemporary Barça.',
		context:
			'After a trophyless 2007–08 season, Joan Laporta turned to Guardiola — no senior top-flight head-coaching experience, but architect of Barça B’s promotion. Ronaldinho and Deco left; Xavi, Iniesta, and Messi became the axis. By September the squad was learning juego de posición; by May they would treble.',
		timeline: [
			{ time: 'Jun 8', text: 'Club announces Guardiola as first-team coach — shock appointment, insider trust.' },
			{ time: 'Jul', text: 'Pre-season: Eto’o stays, Ronaldinho departs; tactical reset in Catalonia.' },
			{ time: 'Sep 1', text: 'Season underway — league and Europe await Pep’s revolution.' },
		],
		aftermath:
			'Guardiola’s 2008–12 reign won 14 trophies and changed global football. Every subsequent Barça coach is measured against the ideology seeded in that September.',
		competition: 'Club · Managerial appointment',
		venue: 'Camp Nou',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Josep_Guardiola_-_coach_of_Bar%C3%A7a_B.JPG', caption: 'Guardiola as Barça B coach — the promotion that changed world football.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Pep_Guardiola%2C_2009_UEFA_Champions_League_Final.jpg', caption: 'Within a year Pep would lift the Champions League in Rome.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou — laboratory for the pressing-possession era.' },
		],
	},
	{
		md: '09-05',
		year: 2009,
		title: 'Sextuple autumn opens',
		blurb: 'After Rome and Monaco, early September meant defending everything at once.',
		tag: 'Club',
		incident:
			'Early September 2009: Guardiola’s holders juggled La Liga defence, European privilege, and a calendar already heavy with silverware — chasing history’s sextuple.',
		whyItMatters:
			'This is when “winning everything” stopped being a slogan and became logistics. Culés still measure seasons against that impossible standard.',
		context:
			'By 5 September 2009 Barça had already won the 2008–09 Champions League (Rome, 27 May: 2–0 vs Manchester United, Eto’o 10′, Messi 70′), the UEFA Super Cup (Monaco, 28 August: Pedro 115′ vs Shakhtar 1–0 aet), and arrived as league champions. Early autumn meant defending La Liga while carrying Europe’s holders’ burden — and eyeing the Club World Cup in December to complete six trophies in one calendar year.',
		timeline: [
			{ time: 'May 27', text: 'Rome final: 2–0 vs Man Utd — treble secured, sextuple dream born.' },
			{ time: 'Aug 28', text: 'Monaco Super Cup: Pedro 115′, 1–0 vs Shakhtar — trophy two post-Rome.' },
			{ time: 'Aug 29', text: 'La Liga opener: Sporting Gijón 0–3 Barça — league defence begins.' },
			{ time: 'Sep 5', text: 'International break pause — squad rests while six-trophy maths hangs over every fixture.' },
			{ time: 'Dec', text: 'Club World Cup awaits — the sixth trophy on the horizon.' },
		],
		aftermath:
			'Barça completed the sextuple in December 2009 — the only club to hold six major trophies in one calendar year. Early September was the calm before the autumn grind that would make history.',
		competition: '2009 sextuple campaign',
		venue: 'Camp Nou · Europe',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Barcelona_fans_on_August_19%2C_2009.jpg', caption: 'Barcelona fans, August 2009 — treble holders entering the sextuple chase.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Monaco005.jpg/1280px-Monaco005.jpg', caption: 'Monaco Super Cup — Pedro’s winner added European silver before autumn.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Pep_Guardiola%2C_2009_UEFA_Champions_League_Final.jpg', caption: 'Guardiola’s Rome triumph set the sextuple clock running.' },
		],
	},
	{
		md: '09-11',
		year: 2009,
		title: 'Sextuple season',
		blurb: 'The 2009 sextuple run made every autumn fixture feel historic.',
		tag: 'Club',
		incident:
			'Autumn 2009 fixtures carried the weight of a side chasing six trophies — every league point felt like history under construction.',
		whyItMatters:
			'The sextuple remains the club’s completeness myth. It tells Culés what the ceiling looks like when academy, coach, and stars align.',
		context:
			'After Rome and Monaco, September and October 2009 became a victory lap with obligations. Messi, Xavi, and Iniesta rotated but rarely relaxed; league opponents raised their game against the European champions; the Club World Cup in Abu Dhabi loomed. Every Camp Nou week felt like another chapter in an unprecedented calendar.',
		timeline: [
			{ time: 'Sep 19', text: '5–0 vs Sporting at Camp Nou — statement win in the sextuple season.' },
			{ time: 'Sep 29', text: 'Champions League group stage opens — holders begin European defence.' },
			{ time: 'Oct', text: 'La Liga lead maintained; squad depth tested by congested calendar.' },
			{ time: 'Dec 19', text: 'Club World Cup final vs Estudiantes — sixth trophy decided in Abu Dhabi.' },
		],
		aftermath:
			'The sextuple was completed with Pedro’s extra-time winner in the Club World Cup final. No club has matched the inventory; autumn 2009 remains the standard for seasonal ambition.',
		competition: '2009 sextuple campaign',
		venue: 'Camp Nou',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Barcelona_fans_on_August_19%2C_2009.jpg', caption: 'Autumn 2009 — every fixture carried sextuple weight.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou hosted a side chasing six trophies in one calendar year.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s form in the sextuple season set the template for decade-long dominance.' },
		],
	},
	{
		md: '09-17',
		year: 2013,
		title: 'Messi magic nights',
		blurb: 'September hat-tricks became routine for Leo — defenders never adjusted.',
		tag: 'La Liga',
		incident:
			'September 2013: Messi scored hat-tricks for fun — including four goals vs Real Sociedad as the league season ignited.',
		whyItMatters:
			'Messi’s September form set the emotional weather for whole seasons. Culés learned to expect miracles as Tuesday’s weather report.',
		context:
			'The 2013–14 season opened with Neymar arrived and Messi in assassin mode. September fixtures became exhibitions: Ajax in the Champions League, Sociedad in the league — opponents knew the plan and still could not stop him. Hat-tricks felt like calendar appointments.',
		timeline: [
			{ time: 'Sep 18', text: 'Champions League: Barça 4–0 Ajax at Camp Nou — Messi scores twice, Neymar debuts in Europe.' },
			{ time: 'Sep 21', text: 'La Liga: Barça 4–1 Real Sociedad — Messi hat-trick (42′, 58′, 86′ pen).' },
			{ time: 'Sep 24', text: 'Barça 3–0 Almería — Messi continues scoring streak; September belongs to Leo.' },
		],
		aftermath:
			'Messi finished the season with 41 league goals despite injury interruptions. September 2013 reminded Europe that the Ballon d’Or race was often decided before winter.',
		scoreline: 'Barcelona 4–1 Real Sociedad (Messi hat-trick)',
		venue: 'Camp Nou, Barcelona',
		competition: 'La Liga · Sep 2013',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi — September hat-tricks as routine as kick-off.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou, September 2013 — four goals vs Real Sociedad in one night.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/4/43/El_Cl%C3%A1sico_game.jpg', caption: 'League nights under floodlights — where Messi set seasonal tone.' },
		],
	},
	{
		md: '10-07',
		year: 2012,
		title: 'Clásico fireworks',
		blurb: 'Autumn Clásicos under the lights — Madrid rivalry at full volume.',
		tag: 'El Clásico',
		incident:
			'October Clásicos under floodlights turned league tables into theatre — goals, cards, and noise that travelled beyond Spain.',
		whyItMatters:
			'These nights define the rivalry’s modern volume. For Culés, autumn Clásicos are identity checks — who we are when Madrid is watching.',
		context:
			'The Mourinho–Guardiola/Vilanova era turned every Clásico into geopolitics. October fixtures often collided with European form — Madrid’s counter vs Barça’s press, Sergio Ramos vs Gerard Piqué, Messi vs Cristiano Ronaldo. Camp Nou and Bernabéu traded blows that decided titles and tempers.',
		timeline: [
			{ time: 'Oct 7', text: '2012–13 season building — Madrid and Barça neck-and-neck in October tables.' },
			{ time: 'Dec 1', text: 'Camp Nou Clásico ends 2–2 — Ramos equaliser deep in stoppage time, controversy everywhere.' },
			{ time: 'Context', text: 'Autumn form in Europe and league sets up winter Clásico wars.' },
		],
		aftermath:
			'Barça won the 2012–13 league under Tito but Madrid took the Copa del Rey at Mestalla — the rivalry’s autumn intensity foreshadowed spring silverware splits.',
		competition: 'La Liga · El Clásico era',
		venue: 'Camp Nou · Bernabéu',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/4/43/El_Cl%C3%A1sico_game.jpg', caption: 'El Clásico under floodlights — autumn identity checks for both giants.' },
			{ src: '/backgrounds/stadium/metropolitano.jpg', caption: 'Madrid’s side of the rivalry — Bernabéu noise across the autumn calendar.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou hosts the return fixture — where Barça answer Madrid’s volume.' },
		],
	},
	{
		md: '10-19',
		year: 2011,
		title: 'Athletic thrashings',
		blurb: 'Barça’s 2011–12 league form crushed Bilbao and everyone else in between.',
		tag: 'La Liga',
		incident:
			'Peak Guardiola league sides used autumn to stretch gaps — Athletic and others buried under positional overloads.',
		whyItMatters:
			'Domestic cruelty was part of the aesthetic. Dominance in October built the belief that Barça should look inevitable, not merely competitive.',
		context:
			'The 2011–12 campaign was Guardiola’s last complete season — Messi scored 73 goals in all competitions. Athletic Bilbao’s high press at San Mamés usually troubled visitors; Barça answered with geometric passing and ruthless finishing. October was when the league gap became psychological.',
		timeline: [
			{ time: 'Nov 26', text: 'Barça 4–0 Athletic at Camp Nou — Messi brace, domination complete.' },
			{ time: 'Oct 19', text: 'Mid-autumn European week — squad depth keeps league leaders fresh.' },
			{ time: 'Season', text: 'Real Madrid break points record but Barça win Copa and retain European prestige.' },
		],
		aftermath:
			'Guardiola left in May 2012 having set impossible domestic standards. Athletic thrashings became shorthand for how positional play dismantled even the bravest pressing sides.',
		scoreline: 'Barcelona 4–0 Athletic Bilbao',
		venue: 'Camp Nou · San Mamés',
		competition: 'La Liga · 2011–12',
		photos: [
			{ src: '/backgrounds/stadium/san-mames.jpg', caption: 'San Mamés — Athletic’s cathedral, often overrun by Guardiola’s positional overloads.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou return fixtures — where 4–0 scorelines became routine.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s 73-goal 2011–12 season crushed league defences every week.' },
		],
	},
	{
		md: '10-28',
		year: 2005,
		title: 'Bernabéu applause',
		blurb: 'Ronaldinho once received Madrid’s ovation — Clásico nights create legends.',
		tag: 'El Clásico',
		incident:
			'19 November 2005: Ronaldinho destroyed Real Madrid 3–0 at the Bernabéu and received a standing ovation from Madrid fans.',
		whyItMatters:
			'Respect from the enemy is rare currency. That ovation became proof that Barça’s beauty could silence even the Bernabéu — a Culé bedtime story forever.',
		context:
			'The 2005–06 season was Ronaldinho at apex — Ballon d’Or form, samba hips, and passes that embarrassed galaxies. Madrid’s Galácticos era was fading; Barça under Rijkaard played the future. At the Bernabéu, Ronaldinho scored twice — the second after dribbling past Sergio Ramos and Iván Helguera — and Madrid supporters rose to applaud.',
		timeline: [
			{ time: "25'", text: 'Ronaldinho opens with a low finish — 0–1, Bernabéu unsettled.' },
			{ time: "59'", text: 'Samuel Eto’o doubles the lead — Madrid crumbling.' },
			{ time: "73'", text: 'Ronaldinho’s second — nutmegs, curl, silence then applause from Madrid fans.' },
			{ time: 'Full time', text: '3–0 Barça; standing ovation for Ronaldinho — Clásico immortality.' },
		],
		aftermath:
			'Barça won the Champions League that season — Ronaldinho’s Bernabéu performance became the aesthetic proof that beauty could conquer Madrid on their own turf. Messi would later inherit that Clásico magic.',
		scoreline: 'Real Madrid 0–3 Barcelona',
		venue: 'Santiago Bernabéu, Madrid',
		competition: 'La Liga · El Clásico',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/4/43/El_Cl%C3%A1sico_game.jpg', caption: 'El Clásico at the Bernabéu — where Ronaldinho earned Madrid’s rare standing ovation.' },
			{ src: '/backgrounds/stadium/metropolitano.jpg', caption: 'Madrid’s fortress silenced by samba — November 2005.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou celebrated a night when even rivals applauded Barça’s genius.' },
		],
	},
	{
		md: '11-05',
		year: 2013,
		title: 'Milan rematch lore',
		blurb: 'European Novembers at Camp Nou — nights when 3–0 deficits still felt reversible.',
		tag: 'UCL',
		incident:
			'12 March 2013: Barça overturned a 2–0 first-leg deficit with a 4–0 win over AC Milan at Camp Nou — Messi scored twice.',
		whyItMatters:
			'It feeds the Remontada instinct: Camp Nou as a place where European ties bend. Belief is a competitive advantage Barça markets to itself.',
		context:
			'Sandwiched between the 2011 Wembley peak and 2017’s PSG miracle, the Milan night proved Camp Nou could still rewrite European ties. Massimiliano Allegri’s Milan led 2–0 from San Siro; Barça needed four. Messi’s first-half brace levelled the tie before David Villa and Jordi Alba completed the rout.',
		timeline: [
			{ time: 'Feb 20', text: 'San Siro first leg: Milan 2–0 Barça — Boateng and M’Baye Niang score.' },
			{ time: "5'", text: 'Camp Nou: Messi volleys in — immediate belief.' },
			{ time: "39'", text: 'Messi free-kick — 2–0, tie level on aggregate.' },
			{ time: "50'", text: 'Villa makes it 3–0; Alba seals 4–0 — Milan eliminated.' },
		],
		aftermath:
			'Barça fell to Bayern Munich 7–0 on aggregate in the next round — humiliation followed triumph. But the Milan remountada remains a precursor to 2017: Camp Nou as European resurrection ground.',
		scoreline: 'Barcelona 4–0 AC Milan (agg. 4–2)',
		venue: 'Camp Nou, Barcelona',
		competition: 'UEFA Champions League · Round of 16 · 2nd leg',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou, March 2013 — 4–0 vs Milan, another European comeback.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s brace inside 40 minutes turned a 2–0 deficit into belief.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bar%C3%A7a_6_-_PSG_1%3B_Dimecres_8_de_mar%C3%A7_de_2017_-_33340360945.jpg', caption: 'The Milan night foreshadowed the Remontada — Camp Nou rewriting European maths.' },
		],
	},
	{
		md: '11-25',
		year: 2017,
		title: 'Juventus dismantled',
		blurb: '3–0 at home vs Juve — Messi, Suárez, and a stadium that smelled blood.',
		tag: 'UCL',
		incident:
			'12 April 2017: Barça beat Juventus 3–0 at Camp Nou in the Champions League quarter-final first leg — Messi, Rakitić, and Suárez scored.',
		whyItMatters:
			'Beating elite Italian defences at home reaffirmed European hierarchy dreams after Pep. Culés need these nights to believe the shirt still scares aristocrats.',
		context:
			'After the Remontada euphoria, Barça faced Juventus’ organised block in the quarter-finals. The first leg at Camp Nou was MSN at full throttle — Messi’s left-foot rocket, Rakitić’s tap-in, Suárez’s header — 3–0 and dreams of another European final. The second leg in Turin would tell a different story.',
		timeline: [
			{ time: "7'", text: 'Messi curls a left-foot shot inside the far post — 1–0, tone set.' },
			{ time: "25'", text: 'Rakitić finishes a rebound — 2–0, Juve wobble.' },
			{ time: "65'", text: 'Suárez heads in from a corner — 3–0, tie seemingly secure.' },
			{ time: 'Apr 18', text: 'Turin second leg: Juventus win 3–0 — Barça eliminated on away goals.' },
		],
		aftermath:
			'The Turin collapse tempered Remontada euphoria — another European lead squandered. But the Camp Nou first leg remains a showcase of MSN cutting through Italian organisation at its best.',
		scoreline: 'Barcelona 3–0 Juventus (1st leg)',
		venue: 'Camp Nou, Barcelona',
		competition: 'UEFA Champions League · Quarter-final · 1st leg',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou, April 2017 — MSN dismantled Juventus 3–0 in the quarter-finals.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s early rocket set the tone against Buffon and Juve’s defence.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Bar%C3%A7a_6_-_PSG_1%3B_Dimecres_8_de_mar%C3%A7_de_2017_-_33340360945.jpg', caption: 'Spring 2017 — European nights still belonged to Camp Nou, even if Turin awaited.' },
		],
	},
	{
		md: '12-10',
		year: 2011,
		title: 'Group-stage coronations',
		blurb: 'December often meant first place sealed — then focus shifted to knockout destiny.',
		tag: 'UCL',
		incident:
			'December 2011 group finales confirmed Barça top of their Champions League group — minds already on knockouts.',
		whyItMatters:
			'Barça’s European self-image is knockout football. Sealing groups early is how the club protects energy for the nights that write history.',
		context:
			'Guardiola’s final European campaign navigated a group containing AC Milan and BATE Borisov. December fixtures at Camp Nou became coronations — top spot secured, rotation possible, knockout paths mapped. The club’s European identity treats the group stage as prologue.',
		timeline: [
			{ time: 'Nov 23', text: 'Camp Nou: Barça 4–0 BATE — Messi four goals, group control absolute.' },
			{ time: 'Dec 7', text: 'San Siro: Barça 3–2 Milan — top spot confirmed despite tight scoreline.' },
			{ time: 'Spring', text: 'Knockout path opens toward Milan remontada and Bayern humiliation.' },
		],
		aftermath:
			'The 2011–12 European campaign ended traumatically against Chelsea and Bayern, but December group wins preserved the habit: Barça expect to top groups, then write history in spring.',
		competition: 'UEFA Champions League · Group stage',
		venue: 'Camp Nou',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou December nights — group titles sealed under European floodlights.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s four-goal night vs BATE — December group-stage coronation.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Wembley_London_Final_UEFA_Champions_League_2011.jpg/1280px-Wembley_London_Final_UEFA_Champions_League_2011.jpg', caption: 'Group stages feed knockout destiny — Wembley 2011 started with winter qualification.' },
		],
	},
	{
		md: '12-18',
		year: 2011,
		title: 'Club World Cup',
		blurb: 'Barça as world champions again — Messi floating above every final.',
		tag: 'Club',
		incident:
			'18 December 2011: Barça beat Santos 4–0 in the Club World Cup final in Yokohama. Messi scored twice; Xavi and Fàbregas added the others.',
		whyItMatters:
			'World champion status completes the set. Culés treat it as proof the project conquered every map football draws.',
		context:
			'Two years after the 2009 sextuple included the Club World Cup, Guardiola’s side returned to global supremacy in Japan. Santos brought Neymar — still a teenager — but Barça treated the final as exhibition: Messi’s dribbles, Xavi’s assist, Cesc’s finish. World champion badges sit beside European crowns in the club’s completeness myth.',
		timeline: [
			{ time: "14'", text: 'Xavi opens from Messi’s pass — 1–0, control immediate.' },
			{ time: "37'", text: 'Messi dribbles through and finishes — 2–0, vintage Leo.' },
			{ time: "42'", text: 'Cesc makes it 3–0 before half-time — game over.' },
			{ time: "83'", text: 'Messi’s second seals 4–0 — world champions again.' },
		],
		aftermath:
			'The 2011 Club World Cup was Guardiola’s last global trophy. Neymar would join Barça eighteen months later — a subplot to a night that confirmed Blaugrana football as world standard.',
		scoreline: 'Barcelona 4–0 Santos',
		venue: 'International Stadium Yokohama, Japan',
		competition: 'FIFA Club World Cup · Final',
		photos: [
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi — two goals in Yokohama as Barça became world champions again.' },
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'World champions carry Camp Nou’s football to every continent.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Pep_Guardiola%2C_2009_UEFA_Champions_League_Final.jpg', caption: 'Guardiola’s trophy cabinet — European and world titles in one era.' },
		],
	},
	{
		md: '12-22',
		year: 2010,
		title: 'Winter title marches',
		blurb: 'Christmas tables with Barça on top became the expected gift for Culés.',
		tag: 'La Liga',
		incident:
			'Late December 2010: Barça sat top of La Liga — Christmas as checkpoint on the road to another title under Guardiola.',
		whyItMatters:
			'Being top at Christmas became a cultural expectation. When it fails, the anxiety is not only points — it is identity.',
		context:
			'The 2010–11 season was Guardiola’s third league campaign — Madrid under Mourinho chased but Barça’s December lead was comfortable. A 5–1 Copa win over Espanyol on 22 December typified the mood: festive fixtures, derby dominance, league summit. Christmas tables with Barça first became Culé tradition.',
		timeline: [
			{ time: 'Dec 22', text: 'Copa del Rey: Barça 5–1 Espanyol — festive derby demolition.' },
			{ time: 'Dec', text: 'La Liga: Barça clear at Christmas — Guardiola’s third title push on track.' },
			{ time: 'Spring', text: 'April Clásico and Wembley final follow — December lead becomes treble.' },
		],
		aftermath:
			'Barça won La Liga and the Champions League in 2011 — the December cushion funded spring’s European glory. Winter leadership remains a barometer Culés watch every season.',
		scoreline: 'Barcelona 5–1 Espanyol (Copa · Dec 2010)',
		venue: 'Camp Nou, Barcelona',
		competition: 'La Liga · Copa del Rey · Dec 2010',
		photos: [
			{ src: '/backgrounds/stadium/camp-nou.jpg', caption: 'Camp Nou at Christmas — derby wins and league summits as seasonal ritual.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Barcelona_fans_on_August_19%2C_2009.jpg', caption: 'Culés expect to open presents with Barça top of the table.' },
			{ src: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Lass_Messi.jpg', caption: 'Messi’s December form — setting up another spring of trophies.' },
		],
	},
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

/** Event-related photos for the full-screen archive modal. */
export function photosForOnThisDay(event: OnThisDayEvent): OnThisDayPhoto[] {
	return event.photos;
}

export function eventKey(event: OnThisDayEvent) {
	return `${event.md}-${event.year}-${event.title}`;
}
