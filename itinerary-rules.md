# limelii Itinerary Rules

Oct 30, 2026 · Lex

## How these rules are organized

Every itinerary follows the **Base rules**. Each itinerary type then adds only
what is different for it, so a rule lives in one place and never drifts between
versions.

| Rule set | Used for | Who builds it |
|---|---|---|
| Base rules | Every itinerary in limelii | Everyone |
| Curated experiences | Experiences limelii publishes in the app | limelii team |
| Special events | World Cup, marathon and other dated events | limelii team |
| Create page AI | Itineraries users generate themselves, single day or multiday | The AI, from a user request |
| Style rules | All written descriptions | Everyone |

## Base rules

These apply to every itinerary, whatever the type. They are written around the
moment someone actually uses one: standing on a corner with their phone,
deciding where to go next.

### Places

- Only real, currently open places. Verify anything uncertain; never invent a place or address.
- Local picks over tourist traps, unless the user asks for the classics.
- Each stop includes its name, address, neighborhood and a brief description.

### Getting around

- Each stop is within 0.7 miles walking of the next. If a route crosses boroughs, the walk must be realistic.
- Total walking stays around 1.5 miles. Four legs of 0.7 miles is almost 3 miles, which is a hike, not a stroll.
- The first stop is easy to reach by subway, and the last stop leaves people near a subway.

### Flow

- Stops follow a logical order the user can do start to finish.
- No repeating the same activity. A pottery class leads to food and dessert, not another pottery class.
- Keep the vibe consistent. No dive bar next to fine dining unless the user asks for high-low.
- Give it an arc: start light, build to the main stop, end somewhere people can linger.
- Make it safe to bail. The first two stops should feel complete on their own.

### Practical details

- One nearby backup for each stop, in case of a line, a closure or a full room.
- Flag stops that need a reservation; prefer walk-in friendly spots.
- Note when a plan is mostly outdoors, with a rainy day swap.
- Tag what applies: kid friendly, dog friendly, accessible, good for groups, cash only.
- Record a last verified date, so you know what to recheck.

## Curated experiences

These are the experiences limelii publishes. On top of the Base rules:

- 3 to 4 stops per experience.
- An identifiable name for the whole experience that captures its vibe.
- Vary budget, time of day and duration across the set.
- Budget tiers: `$` under $20 per person, `$$` $20 to $50, `$$$` over $50. Estimates exclude alcohol.
- Realistic timing: meals 45 to 90 minutes, drinks 30 to 60, museums and activities 60 to 120, about 2 to 6 hours in total.
- Stay inside the named neighborhood. If an experience crosses into another, say so.
- Mix stop types (cafés, bakeries, parks, shops, bars), so it feels like an afternoon in a neighborhood rather than restaurant hopping.

## Special events

For dated events such as the World Cup or the NYC Marathon. The event changes
the city, so logistics are part of the content. On top of the Base rules:

### Structure

- One experience per event moment: each match, each race day. Include the date and start time.
- Plan around the event's rhythm: before (fuel up, get a spot), during (where to be), after (where to celebrate or regroup).
- At least one stop where people actually experience the event, such as a true soccer bar with screens or a spot along the race course.
- The 0.7 mile rule applies within each cluster of stops, not between separate clusters.
- Every stop is open during the event and after it ends. For late events, confirm food stops are open past 11pm.
- Set an expiration date so the experience disappears after the event.

### Logistics

- Say how to get there given street closures and crowded subways.
- Tell people to arrive early where venues fill up, and flag cover charges.

### Culture

- Tie stops to the event, and check authenticity. Lagos TSQ is Nigerian, not Ghanaian.
- Mix stop types: cafés, bakeries, dessert shops, beer gardens and wine bars, not only bars and restaurants.

### World Cup

- Name each experience `[Team A] vs [Team B]` and include a match day column.
- Users pick a side. Location 1 and 2 are Team A's watch spot and food spot; location 3 and 4 are Team B's.
- Fan atmosphere first, cultural authenticity second. Fall back to a general sports bar only when no cultural spot with screens exists.
- Rotate watch spots instead of leaning on Football Factory: Smithfield Hall, Banter Bar, Carragher's, Kent Ale House, Black Horse Pub, The Winslow, The Churchill, Paddy Reilly's, Ryan's Daughter, Pig Beach.
- Descriptions give a short take on each team, then where each side's fans go.

See `worldcup-endpoints-guide.md` for how World Cup experiences are stored.

### Marathon

- Spectator spots by mile marker, with which side of the course to stand on, since crossing it is hard.
- A clear meetup spot after the finish for runners and their families.
- A post-race meal that can take a big group.

## Create page AI

For itineraries users generate themselves. People type vague things, so the AI
should default smartly and make choosing easy. On top of the Base rules:

### Single day

- Return 2 alternate options with 2 to 4 stops each, each with a catchy name and its vibe described.
- Make the two options actually different: different energy or neighborhood, not two versions of the same night. No stop appears in both.
- Default instead of asking. "Something fun tonight" gets a plausible answer plus a note, such as "Assumed East Village, want somewhere else?" Ask one question only when a guess would truly miss.
- Handle "right now": the first stop is open now, and the rest are open when the user will arrive.
- Factor in time of day, budget, group size and occasion.
- Scenario rules: tourists get iconic but not basic spots; large groups get roomy venues; solo users get bar seating and people watching; first dates start with a bridge stop (a walk or quick drink) before the main event.
- Work from home requests get laptop friendly spots; happy hour requests get places with real deals.
- Ambiguous requests like "I want a restaurant": ask whether they want just a spot with backups or a full night.
- Show a one line summary per option: total walk, rough duration, rough cost.
- Swaps replace only the stop asked about and keep the walking rule intact.
- Return routes as JSON so the app can render route cards.

### Multiday

- Trigger on "weekend," "3 days," "my trip," "visiting next week" or specific dates. A weekend means 2 days unless the user says otherwise. Cap trips at 7 days.
- Return one trip plan with an alternate option for each day, instead of two full trips.
- Each day is its own walkable cluster. The 0.7 mile rule applies within a day, not between days.
- One main neighborhood per day, different ones across days.
- 4 to 6 stops per day, with meals built in: coffee or breakfast, lunch, dinner, and activities between.
- No repeated places across the trip, and no overload of one type, such as three museum days in a row.
- Arrival and departure days are light. Assume a half day each unless the user gives times.
- Put the biggest day early and the easiest day late.
- Mind the calendar: many museums close on Mondays, some spots only serve brunch on weekends, some places are free on set days.
- If the user doesn't say, ask one question: where are you staying? Start each day near there. Assume and note everything else.
- Swaps work at two levels: replace one stop, or replace a whole day.
- JSON includes a `days` array, each day with a label, neighborhood and stops, so the app can show it as tabs.

## Style rules

These apply to every description, whatever the itinerary type.

- No dashes anywhere in descriptions.
- Descriptions are one or two short sentences per stop.
- Write like a well connected local, not a guidebook.

## Open questions

- [ ] Curated stop count: 3 to 4 (February) or 2 to 4 (April)? This doc uses 3 to 4.
- [ ] Can the app show backups, reservation flags and practical tags yet?
- [ ] Is 1.5 miles the right cap on total walking per day?
- [ ] What does the Create page JSON need to look like for multiday trips?
