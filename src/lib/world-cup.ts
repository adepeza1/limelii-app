// Shared World Cup helpers used by the Discover banner and the experience
// detail view. Team names come from the "[Team A] vs [Team B]" experience
// title; the first half of an experience's stops belong to Team A, the
// second half to Team B (the positional convention from the upload sheet).

// Team name (as written in the title) → ISO 3166-1 alpha-2 code for
// flagcdn.com. Keys are lowercase; lookup is case-insensitive.
export const FLAG_CODES: Record<string, string> = {
  algeria: "dz", argentina: "ar", australia: "au", austria: "at",
  belgium: "be", "bosnia & herzegovina": "ba", "bosnia and herzegovina": "ba",
  brazil: "br", cameroon: "cm", canada: "ca", "cape verde": "cv",
  chile: "cl", colombia: "co", "costa rica": "cr", croatia: "hr",
  curacao: "cw", "curaçao": "cw", czechia: "cz", "czech republic": "cz",
  denmark: "dk", "dr congo": "cd", ecuador: "ec", egypt: "eg",
  england: "gb-eng", france: "fr", germany: "de", ghana: "gh",
  greece: "gr", haiti: "ht", honduras: "hn", iran: "ir",
  iraq: "iq", italy: "it", "ivory coast": "ci", jamaica: "jm",
  japan: "jp", jordan: "jo", mexico: "mx", morocco: "ma",
  netherlands: "nl", "new zealand": "nz", nigeria: "ng", norway: "no",
  panama: "pa", paraguay: "py", peru: "pe", poland: "pl",
  portugal: "pt", qatar: "qa", "saudi arabia": "sa", scotland: "gb-sct",
  senegal: "sn", serbia: "rs", "south africa": "za", "south korea": "kr",
  spain: "es", sweden: "se", switzerland: "ch", tunisia: "tn",
  turkey: "tr", turkiye: "tr", "türkiye": "tr", ukraine: "ua",
  "united states": "us", uruguay: "uy", usa: "us", uzbekistan: "uz",
  wales: "gb-wls",
};

export function flagUrl(code: string): string {
  return `https://flagcdn.com/h240/${code}.png`;
}

// Look up a team's flag code by name (case-insensitive). Returns undefined
// if the team isn't mapped, in which case the badge renders without a flag.
export function flagForTeam(team: string): string | undefined {
  return FLAG_CODES[team.trim().toLowerCase()];
}

// Map an upload-sheet `stop_type` to the label shown at the top of a stop.
// Unknown / empty types return null (no label).
export function stopTypeLabel(stopType: string | null | undefined): string | null {
  switch ((stopType ?? "").trim().toLowerCase()) {
    case "pre_game":
    case "pregame":
    case "pre-game":
      return "Pregame";
    case "watch":
      return "Watch here";
    case "afters":
    case "after":
      return "Afters";
    default:
      return null;
  }
}

export interface Matchup {
  teamA: string;
  teamB: string;
  codeA?: string;
  codeB?: string;
}

// Split "Team A vs Team B" into its two teams + their flag codes. Returns
// null if the title isn't a "X vs Y" matchup.
export function parseMatchup(title: string): Matchup | null {
  const parts = title.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  const teamA = parts[0].trim();
  const teamB = parts[1].trim();
  if (!teamA || !teamB) return null;
  return {
    teamA,
    teamB,
    codeA: FLAG_CODES[teamA.toLowerCase()],
    codeB: FLAG_CODES[teamB.toLowerCase()],
  };
}

// Which team a stop belongs to, by position: first half of the stops are
// Team A, the rest are Team B.
export function teamForStop(
  index: number,
  total: number,
  m: Matchup
): { name: string; code?: string } {
  const half = Math.ceil(total / 2);
  return index < half
    ? { name: m.teamA, code: m.codeA }
    : { name: m.teamB, code: m.codeB };
}
