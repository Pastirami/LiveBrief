// Bundled multi-case demo that mirrors the backend's AnalysisResult
// contract, one result per news topic. Each case carries full source
// articles so the desk can show originals, plus grouped claims,
// conflicts and a cautious suggested brief.

function claim(overrides) {
  return {
    field: "fact",
    value: "",
    time: null,
    location: null,
    subject: null,
    action: null,
    numbers: {},
    confidence: 70,
    status: "to_verify",
    risk: "medium",
    ...overrides,
  };
}

const CASES_RAW = [
  {
    case_id: "case-portkessa",
    topic: "Airstrike reported near Port Kessa harbour",
    sources: [
      {
        id: "pk-src-authority",
        name: "Kessa Port Authority",
        source_type: "Official statement",
        url: null,
        received_at: "06:42",
        text:
          "The Port Authority confirms an explosion struck the eastern warehouse district of Port Kessa at 06:15 this morning. Two dock workers were injured and taken to Harbour General Hospital. Fires in warehouses 4 and 5 were contained by 06:30. Cargo operations in the eastern basin are suspended until further notice while the damage is assessed.",
      },
      {
        id: "pk-src-harbourwatch",
        name: "Harbour Watch",
        source_type: "Local media",
        url: null,
        received_at: "06:55",
        text:
          "At least six people were injured after what witnesses describe as an airstrike hit Port Kessa's eastern warehouse row around 06:20, Harbour Watch has learned. Three residents of the Fisherman's Quarter beside the harbour told our reporter they heard a drone overhead moments before the explosion. Emergency crews remain at the warehouse district and the extent of the damage to the port is not yet clear.",
      },
      {
        id: "pk-src-defence",
        name: "National Defence Ministry",
        source_type: "Official statement",
        url: null,
        received_at: "07:10",
        text:
          "Preliminary assessment indicates a single projectile struck the Port Kessa warehouse district. The origin of the projectile has not been confirmed and analysis of the debris is ongoing. There are no confirmed fatalities at this time. The ministry urges the public not to share unverified footage.",
      },
      {
        id: "pk-src-wire",
        name: "International Wire Service",
        source_type: "News agency",
        url: null,
        received_at: "07:25",
        text:
          "An explosion hit the harbour of Port Kessa early Tuesday. The port authority reported two injured dock workers, while local media put the number of injured at six. The strike landed near the grain terminal, raising concern over export shipments from the region's largest bulk port. No group has claimed responsibility.",
      },
      {
        id: "pk-src-social",
        name: "Social Feed Roundup",
        source_type: "Unverified social media",
        url: null,
        received_at: "07:40",
        text:
          "Multiple videos circulating on social platforms show heavy smoke rising over the grain terminal area of Port Kessa. Several widely shared posts claim ten or more people were injured. None of these figures have been confirmed by officials, and two of the most-shared clips appear to be from an unrelated 2021 fire.",
      },
    ],
    claims: [
      claim({
        id: "pk-clm-1",
        group_key: "occurrence",
        group_label: "Incident occurrence",
        source_id: "pk-src-authority",
        source_name: "Kessa Port Authority",
        field: "event",
        value: "explosion confirmed",
        claim: "An explosion struck the eastern warehouse district at 06:15.",
        evidence:
          "The Port Authority confirms an explosion struck the eastern warehouse district of Port Kessa at 06:15 this morning.",
        time: "06:15",
        location: "eastern warehouse district",
        confidence: 92,
        risk: "low",
      }),
      claim({
        id: "pk-clm-2",
        group_key: "occurrence",
        group_label: "Incident occurrence",
        source_id: "pk-src-defence",
        source_name: "National Defence Ministry",
        field: "event",
        value: "single projectile",
        claim: "A single projectile struck the warehouse district.",
        evidence:
          "Preliminary assessment indicates a single projectile struck the Port Kessa warehouse district.",
        confidence: 84,
        risk: "medium",
      }),
      claim({
        id: "pk-clm-3",
        group_key: "injured",
        group_label: "Injured count",
        source_id: "pk-src-authority",
        source_name: "Kessa Port Authority",
        field: "injured",
        value: "2",
        claim: "Two dock workers were injured, according to the port authority.",
        evidence:
          "Two dock workers were injured and taken to Harbour General Hospital.",
        numbers: { injured: 2 },
        confidence: 88,
        risk: "high",
      }),
      claim({
        id: "pk-clm-4",
        group_key: "injured",
        group_label: "Injured count",
        source_id: "pk-src-harbourwatch",
        source_name: "Harbour Watch",
        field: "injured",
        value: "6",
        claim: "At least six people were injured, according to local media.",
        evidence:
          "At least six people were injured after what witnesses describe as an airstrike hit Port Kessa's eastern warehouse row around 06:20.",
        numbers: { injured: 6 },
        confidence: 61,
        risk: "high",
      }),
      claim({
        id: "pk-clm-5",
        group_key: "injured",
        group_label: "Injured count",
        source_id: "pk-src-social",
        source_name: "Social Feed Roundup",
        field: "injured",
        value: "10+ (unverified)",
        claim: "Social media posts claim ten or more people were injured.",
        evidence:
          "Several widely shared posts claim ten or more people were injured. None of these figures have been confirmed by officials.",
        numbers: { injured: 10 },
        confidence: 22,
        risk: "critical",
      }),
      claim({
        id: "pk-clm-6",
        group_key: "weapon",
        group_label: "Weapon and origin",
        source_id: "pk-src-harbourwatch",
        source_name: "Harbour Watch",
        field: "weapon",
        value: "drone (witnesses)",
        claim: "Witnesses report hearing a drone moments before the blast.",
        evidence:
          "Three residents of the Fisherman's Quarter beside the harbour told our reporter they heard a drone overhead moments before the explosion.",
        confidence: 48,
        risk: "critical",
      }),
      claim({
        id: "pk-clm-7",
        group_key: "weapon",
        group_label: "Weapon and origin",
        source_id: "pk-src-defence",
        source_name: "National Defence Ministry",
        field: "weapon",
        value: "origin unconfirmed",
        claim: "The origin of the projectile has not been confirmed.",
        evidence:
          "The origin of the projectile has not been confirmed and analysis of the debris is ongoing.",
        confidence: 90,
        risk: "medium",
      }),
      claim({
        id: "pk-clm-8",
        group_key: "fatalities",
        group_label: "Fatalities",
        source_id: "pk-src-defence",
        source_name: "National Defence Ministry",
        field: "fatalities",
        value: "none confirmed",
        claim: "There are no confirmed fatalities at this time.",
        evidence: "There are no confirmed fatalities at this time.",
        confidence: 86,
        risk: "high",
      }),
    ],
    groups: [
      {
        id: "pk-grp-occurrence",
        label: "Incident occurrence",
        status: "consistent",
        summary: "Officials and media agree an explosion struck the warehouse district.",
      },
      {
        id: "pk-grp-injured",
        label: "Injured count",
        status: "conflict",
        summary:
          "Figures diverge sharply: 2 (port authority), 6 (local media), 10+ (unverified social posts).",
      },
      {
        id: "pk-grp-weapon",
        label: "Weapon and origin",
        status: "conflict",
        summary:
          "Witnesses describe a drone; the defence ministry says the origin is unconfirmed.",
      },
      {
        id: "pk-grp-fatalities",
        label: "Fatalities",
        status: "consistent",
        summary: "No source reports confirmed fatalities.",
      },
    ],
    conflicts: [
      {
        id: "pk-cfl-injured",
        group_id: "pk-grp-injured",
        severity: "high",
        title: "Injured count is disputed",
        summary:
          "The port authority reports 2 injured, local media at least 6, and social posts claim 10+ without confirmation.",
        conflicting_values: ["2", "6", "10+ (unverified)"],
        recommendation:
          "Attribute every figure to its source and lead with the official count until hospitals confirm.",
      },
      {
        id: "pk-cfl-weapon",
        group_id: "pk-grp-weapon",
        severity: "critical",
        title: "Weapon and origin unverified",
        summary:
          "Witness accounts of a drone contradict the ministry's position that the origin is unconfirmed.",
        conflicting_values: ["drone (witnesses)", "origin unconfirmed"],
        recommendation:
          "Do not name a weapon or attacker until debris analysis is published.",
      },
    ],
    suggested_brief:
      "An explosion struck the eastern warehouse district of Port Kessa at around 06:15. The port authority reports two injured dock workers; local media puts the figure at six, and neither number is independently confirmed. The origin of the projectile remains unverified.",
  },

  {
    case_id: "case-veltria",
    topic: "Consumer prices surge across Veltria",
    sources: [
      {
        id: "vl-src-stats",
        name: "Veltria Statistics Office",
        source_type: "Official data release",
        url: null,
        received_at: "09:00",
        text:
          "Consumer prices rose 9.4 percent year-on-year in June, the fastest pace since 2011, the Statistics Office reported on Wednesday. Food prices climbed 14.2 percent, while energy rose 12.8 percent. Core inflation, which strips out food and energy, stood at 6.1 percent. The office noted that housing costs are sampled quarterly and were last updated in April.",
      },
      {
        id: "vl-src-business",
        name: "Veltria Business Daily",
        source_type: "Financial media",
        url: null,
        received_at: "09:30",
        text:
          "Independent basket tracking by three university economists suggests real inflation is running closer to 11 percent, Veltria Business Daily reports. The economists argue the official index understates housing costs, which their weekly rent survey shows rising at nearly twice the official pace. The Statistics Office declined to comment on the alternative estimate.",
      },
      {
        id: "vl-src-centralbank",
        name: "Central Bank of Veltria",
        source_type: "Official statement",
        url: null,
        received_at: "10:15",
        text:
          "Responding to June's 9.4 percent consumer price inflation reading, the Central Bank of Veltria said the Monetary Policy Committee will announce its rate decision on Thursday. In prepared remarks, Governor Ilse Maren said the bank is prepared to take decisive action to bring Veltria's inflation back to the 2 percent price target, which remains the committee's overriding objective.",
      },
      {
        id: "vl-src-analysts",
        name: "Analyst Consensus Note",
        source_type: "Analyst note",
        url: null,
        received_at: "10:40",
        text:
          "Market economists are split over how hard Veltria's central bank should lean against 9.4 percent consumer price inflation at Thursday's rate decision. Of fourteen desks surveyed, eight expect a 50 basis point hike and six expect 100 basis points. Swap markets price roughly 70 basis points. Several notes flag the independent 11 percent inflation estimate as a risk to the central bank's credibility if Thursday's move is seen as timid.",
      },
      {
        id: "vl-src-street",
        name: "Capital Street Survey",
        source_type: "Local media",
        url: null,
        received_at: "11:05",
        text:
          "Food price inflation is visible on every stall in the Veltrian capital: a bread loaf that cost 40 crowns in March now sells for 47 in the central markets, an 18 percent rise in three months, according to our weekly survey of consumer prices. Retailers interviewed blame diesel costs and a weak harvest. Two of five stall owners said they expect further price rises before autumn.",
      },
    ],
    claims: [
      claim({
        id: "vl-clm-1",
        group_key: "headline",
        group_label: "Headline inflation rate",
        source_id: "vl-src-stats",
        source_name: "Veltria Statistics Office",
        field: "cpi",
        value: "9.4%",
        claim: "Official consumer prices rose 9.4 percent year-on-year in June.",
        evidence:
          "Consumer prices rose 9.4 percent year-on-year in June, the fastest pace since 2011, the Statistics Office reported.",
        numbers: { cpi_yoy: 9.4 },
        confidence: 95,
        risk: "low",
      }),
      claim({
        id: "vl-clm-2",
        group_key: "headline",
        group_label: "Headline inflation rate",
        source_id: "vl-src-business",
        source_name: "Veltria Business Daily",
        field: "cpi",
        value: "≈11% (independent)",
        claim: "Independent tracking puts real inflation closer to 11 percent.",
        evidence:
          "Independent basket tracking by three university economists suggests real inflation is running closer to 11 percent.",
        numbers: { cpi_alt: 11 },
        confidence: 57,
        risk: "high",
      }),
      claim({
        id: "vl-clm-3",
        group_key: "food",
        group_label: "Food prices",
        source_id: "vl-src-stats",
        source_name: "Veltria Statistics Office",
        field: "food",
        value: "+14.2% yoy",
        claim: "Food prices climbed 14.2 percent year-on-year.",
        evidence: "Food prices climbed 14.2 percent, while energy rose 12.8 percent.",
        numbers: { food_yoy: 14.2 },
        confidence: 93,
        risk: "low",
      }),
      claim({
        id: "vl-clm-4",
        group_key: "food",
        group_label: "Food prices",
        source_id: "vl-src-street",
        source_name: "Capital Street Survey",
        field: "food",
        value: "bread +18% in 3 months",
        claim: "Bread prices in the capital rose 18 percent in three months.",
        evidence:
          "A bread loaf that cost 40 crowns in March now sells for 47 in the central markets, an 18 percent rise in three months, according to our weekly survey of consumer prices.",
        numbers: { bread_3m: 18 },
        confidence: 74,
        risk: "medium",
      }),
      claim({
        id: "vl-clm-5",
        group_key: "response",
        group_label: "Central bank response",
        source_id: "vl-src-centralbank",
        source_name: "Central Bank of Veltria",
        field: "policy",
        value: "decision Thursday",
        claim: "The central bank announces its rate decision on Thursday.",
        evidence:
          "Responding to June's 9.4 percent consumer price inflation reading, the Central Bank of Veltria said the Monetary Policy Committee will announce its rate decision on Thursday.",
        confidence: 96,
        risk: "low",
      }),
      claim({
        id: "vl-clm-6",
        group_key: "response",
        group_label: "Central bank response",
        source_id: "vl-src-analysts",
        source_name: "Analyst Consensus Note",
        field: "policy",
        value: "50bp vs 100bp split",
        claim: "Economists are split between a 50 and 100 basis point hike.",
        evidence:
          "Of fourteen desks surveyed, eight expect a 50 basis point hike and six expect 100 basis points.",
        confidence: 78,
        risk: "medium",
      }),
      claim({
        id: "vl-clm-7",
        group_key: "drivers",
        group_label: "Price drivers",
        source_id: "vl-src-street",
        source_name: "Capital Street Survey",
        field: "drivers",
        value: "diesel, weak harvest",
        claim: "Retailers blame diesel costs and a weak harvest for rising prices.",
        evidence: "Retailers interviewed blame diesel costs and a weak harvest.",
        confidence: 55,
        risk: "medium",
      }),
    ],
    groups: [
      {
        id: "vl-grp-headline",
        label: "Headline inflation rate",
        status: "conflict",
        summary:
          "The official 9.4 percent figure is challenged by an independent estimate near 11 percent.",
      },
      {
        id: "vl-grp-food",
        label: "Food prices",
        status: "consistent",
        summary: "Official data and the street survey both show food prices rising steeply.",
      },
      {
        id: "vl-grp-response",
        label: "Central bank response",
        status: "needs_review",
        summary: "A decision is due Thursday; the size of the expected hike is disputed.",
      },
      {
        id: "vl-grp-drivers",
        label: "Price drivers",
        status: "needs_review",
        summary: "Retailer explanations are anecdotal and single-sourced.",
      },
    ],
    conflicts: [
      {
        id: "vl-cfl-headline",
        group_id: "vl-grp-headline",
        severity: "high",
        title: "Inflation rate is contested",
        summary:
          "The Statistics Office reports 9.4 percent while independent economists estimate close to 11 percent.",
        conflicting_values: ["9.4%", "≈11% (independent)"],
        recommendation:
          "Report the official figure as the headline and attribute the independent estimate explicitly to its authors.",
      },
      {
        id: "vl-cfl-hike",
        group_id: "vl-grp-response",
        severity: "medium",
        title: "Expected hike size differs",
        summary: "Surveyed desks are split between 50 and 100 basis points.",
        conflicting_values: ["50bp", "100bp"],
        recommendation:
          "Present the range rather than a single expected number until Thursday's announcement.",
      },
    ],
    suggested_brief:
      "Official data shows Veltrian consumer prices rose 9.4 percent year-on-year in June, the fastest pace since 2011, with food up 14.2 percent. Independent economists estimate inflation nearer 11 percent, a figure the Statistics Office has not addressed. The central bank announces its rate decision on Thursday.",
  },

  {
    case_id: "case-corridor",
    topic: "Power failure blacks out the Northern Corridor",
    sources: [
      {
        id: "nc-src-gridco",
        name: "GridCo Operations",
        source_type: "Official statement",
        url: null,
        received_at: "14:05",
        text:
          "A fault at the Halden substation at 13:47 cut power to approximately 120,000 customers across the Northern Corridor. Crews have isolated the affected section and restoration is underway, beginning with hospitals and water infrastructure. GridCo will provide an update at 16:00.",
      },
      {
        id: "nc-src-herald",
        name: "Northern Herald",
        source_type: "Local media",
        url: null,
        received_at: "14:20",
        text:
          "Up to 200,000 people are without power across the Northern Corridor, the Northern Herald estimates based on outage maps and municipal reports. St. Anselm Hospital confirmed it is running on backup generators. Traffic lights are dark across the town centres of Halden and Virelund.",
      },
      {
        id: "nc-src-transit",
        name: "Corridor Transit Authority",
        source_type: "Official statement",
        url: null,
        received_at: "14:35",
        text:
          "Tram and commuter rail service is suspended on lines N1, N3 and N4 after the power failure at the Halden substation blacked out the Northern Corridor, the transit authority said. Replacement buses are being arranged on the busiest sections. The authority expects service to resume by early evening, subject to power grid restoration.",
      },
      {
        id: "nc-src-ministry",
        name: "Energy Ministry",
        source_type: "Official statement",
        url: null,
        received_at: "15:00",
        text:
          "There is no indication of a cyber incident in today's Northern Corridor outage, the Energy Ministry said. The cause of the substation fault remains under investigation. The ministry has asked GridCo for a preliminary report within 48 hours.",
      },
      {
        id: "nc-src-weather",
        name: "National Weather Service",
        source_type: "Official data release",
        url: null,
        received_at: "15:10",
        text:
          "The national lightning detection network recorded a cloud-to-ground strike within one kilometre of the Halden substation at 13:45, two minutes before the reported fault. Storm cells continue to move north-east and further strikes are possible through the evening.",
      },
    ],
    claims: [
      claim({
        id: "nc-clm-1",
        group_key: "occurrence",
        group_label: "Outage occurrence",
        source_id: "nc-src-gridco",
        source_name: "GridCo Operations",
        field: "event",
        value: "substation fault 13:47",
        claim: "A fault at the Halden substation cut power at 13:47.",
        evidence:
          "A fault at the Halden substation at 13:47 cut power to approximately 120,000 customers across the Northern Corridor.",
        time: "13:47",
        location: "Halden substation",
        confidence: 94,
        risk: "low",
      }),
      claim({
        id: "nc-clm-2",
        group_key: "scale",
        group_label: "Customers affected",
        source_id: "nc-src-gridco",
        source_name: "GridCo Operations",
        field: "scale",
        value: "≈120,000",
        claim: "Approximately 120,000 customers lost power, per the operator.",
        evidence:
          "A fault at the Halden substation at 13:47 cut power to approximately 120,000 customers.",
        numbers: { customers: 120000 },
        confidence: 87,
        risk: "medium",
      }),
      claim({
        id: "nc-clm-3",
        group_key: "scale",
        group_label: "Customers affected",
        source_id: "nc-src-herald",
        source_name: "Northern Herald",
        field: "scale",
        value: "up to 200,000",
        claim: "Up to 200,000 people are without power, local media estimates.",
        evidence:
          "Up to 200,000 people are without power across the Northern Corridor, the Northern Herald estimates based on outage maps.",
        numbers: { customers: 200000 },
        confidence: 52,
        risk: "high",
      }),
      claim({
        id: "nc-clm-4",
        group_key: "cause",
        group_label: "Cause of the fault",
        source_id: "nc-src-ministry",
        source_name: "Energy Ministry",
        field: "cause",
        value: "under investigation, no cyber indication",
        claim: "The cause is under investigation; no indication of a cyber incident.",
        evidence:
          "There is no indication of a cyber incident in today's Northern Corridor outage. The cause of the substation fault remains under investigation.",
        confidence: 89,
        risk: "medium",
      }),
      claim({
        id: "nc-clm-5",
        group_key: "cause",
        group_label: "Cause of the fault",
        source_id: "nc-src-weather",
        source_name: "National Weather Service",
        field: "cause",
        value: "lightning strike 13:45 nearby",
        claim: "A lightning strike hit within a kilometre of the substation at 13:45.",
        evidence:
          "The national lightning detection network recorded a cloud-to-ground strike within one kilometre of the Halden substation at 13:45.",
        time: "13:45",
        location: "near Halden substation",
        confidence: 81,
        risk: "medium",
      }),
      claim({
        id: "nc-clm-6",
        group_key: "transit",
        group_label: "Transit impact",
        source_id: "nc-src-transit",
        source_name: "Corridor Transit Authority",
        field: "transit",
        value: "3 lines suspended",
        claim: "Tram and commuter rail are suspended on lines N1, N3 and N4.",
        evidence:
          "Tram and commuter rail service is suspended on lines N1, N3 and N4 after the power failure at the Halden substation blacked out the Northern Corridor.",
        confidence: 92,
        risk: "low",
      }),
      claim({
        id: "nc-clm-7",
        group_key: "restoration",
        group_label: "Restoration timeline",
        source_id: "nc-src-transit",
        source_name: "Corridor Transit Authority",
        field: "restoration",
        value: "by early evening (transit)",
        claim: "Transit service is expected to resume by early evening.",
        evidence:
          "The authority expects service to resume by early evening, subject to power grid restoration.",
        confidence: 63,
        risk: "medium",
      }),
    ],
    groups: [
      {
        id: "nc-grp-occurrence",
        label: "Outage occurrence",
        status: "consistent",
        summary: "The operator confirms a substation fault at 13:47.",
      },
      {
        id: "nc-grp-scale",
        label: "Customers affected",
        status: "conflict",
        summary:
          "The operator counts about 120,000 customers; local media estimates up to 200,000 people.",
      },
      {
        id: "nc-grp-cause",
        label: "Cause of the fault",
        status: "needs_review",
        summary:
          "Officially under investigation; lightning data points to a nearby strike two minutes earlier.",
      },
      {
        id: "nc-grp-transit",
        label: "Transit impact",
        status: "consistent",
        summary: "Three lines suspended, replacement buses being arranged.",
      },
      {
        id: "nc-grp-restoration",
        label: "Restoration timeline",
        status: "needs_review",
        summary: "Only the transit authority has offered a timeline, and it is conditional.",
      },
    ],
    conflicts: [
      {
        id: "nc-cfl-scale",
        group_id: "nc-grp-scale",
        severity: "high",
        title: "Outage scale differs",
        summary:
          "120,000 customers (operator) versus up to 200,000 people (media estimate) — note the units differ.",
        conflicting_values: ["≈120,000 customers", "up to 200,000 people"],
        recommendation:
          "Use the operator's customer count and flag that media figures count people, not meters.",
      },
      {
        id: "nc-cfl-cause",
        group_id: "nc-grp-cause",
        severity: "medium",
        title: "Cause not yet established",
        summary:
          "Lightning data is suggestive but the operator and ministry have not confirmed a cause.",
        conflicting_values: ["under investigation", "lightning strike 13:45 nearby"],
        recommendation:
          "Report the lightning strike as recorded fact without asserting it caused the fault.",
      },
    ],
    suggested_brief:
      "A fault at the Halden substation cut power across the Northern Corridor at 13:47, affecting roughly 120,000 customers according to the operator; media estimates run higher. Tram and commuter rail are suspended on three lines. The cause is under investigation; a lightning strike was recorded nearby two minutes before the fault.",
  },
];

export const DEMO_CASES = CASES_RAW.map((raw) => ({
  ...raw,
  analysis_mode: "rule_based",
  groups: raw.groups.map((group) => ({
    ...group,
    claims: raw.claims.filter((c) => c.group_label === group.label),
  })),
  timeline: [...raw.claims].sort((a, b) =>
    (a.time || "99:99").localeCompare(b.time || "99:99")
  ),
}));

export const WIRE_SOURCES = DEMO_CASES.flatMap((c) =>
  c.sources.map((s) => ({ ...s, topic: c.topic }))
);
