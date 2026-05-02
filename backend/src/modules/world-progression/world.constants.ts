const thresholds = [
  0, 120, 280, 480, 720, 1020, 1380, 1800, 2300, 2900,
  3600, 4400, 5300, 6300, 7400, 8600, 9900, 11300, 12800, 14400,
  16100, 17900, 19800, 21800, 23900, 26100, 28400, 30800, 33300, 35900,
  38600, 41400, 44300, 47300, 50400, 53600, 56900, 60300, 63800, 67400,
  71100, 74900, 78800, 82800, 86900, 91100, 95400, 99800, 104300, 108900
] as const;

const stageDefinitions = [
  {
    stage: "EMPTY_LAND",
    label: "Empty Land",
    subElements: ["Survey Stakes", "Cleared Ground", "Boundary Line", "Foundation Plot"]
  },
  {
    stage: "SMALL_HOUSE",
    label: "Small House",
    subElements: ["Floor Frame", "Wall Frame", "Front Door", "Hearth Light"]
  },
  {
    stage: "BETTER_HOUSE",
    label: "Better House",
    subElements: ["Stone Walls", "Second Floor", "Study Room", "Protected Roof"]
  },
  {
    stage: "GARDEN",
    label: "Garden",
    subElements: ["Seed Beds", "Flower Rows", "Stone Walkway", "Water Fountain"]
  },
  {
    stage: "STREET",
    label: "Street",
    subElements: ["Packed Road", "Road Markers", "Street Lamps", "Crossing Gate"]
  },
  {
    stage: "VILLAGE",
    label: "Village",
    subElements: ["First Homes", "Village Square", "Footbridge", "Gathering Hall"]
  },
  {
    stage: "TOWN",
    label: "Town",
    subElements: ["Market Row", "Workshop Block", "Town Hall", "Clock Tower"]
  },
  {
    stage: "LARGE_TOWN",
    label: "Large Town",
    subElements: ["Residential Blocks", "Transit Hub", "Work District", "Public Garden"]
  },
  {
    stage: "CITY",
    label: "City",
    subElements: ["City Gates", "Metro Core", "Skyline Block", "Civic Tower"]
  },
  {
    stage: "KINGDOM",
    label: "Kingdom",
    subElements: ["Outer Wall", "Royal District", "Citadel", "Throne Hall"]
  },
  {
    stage: "HIGH_COUNCIL",
    label: "High Council",
    subElements: ["Council Chamber", "Policy Hall", "Strategy Vault", "High Council Seat"]
  },
  {
    stage: "ROYAL_ROAD",
    label: "Royal Road",
    subElements: ["Mile Markers", "Caravan Stop", "Paved Route", "Royal Arch"]
  },
  {
    stage: "WATCHTOWER",
    label: "Watchtower",
    subElements: ["Guard Post", "Watch Deck", "Beacon Fire", "Sky Banner"]
  },
  {
    stage: "FORTRESS",
    label: "Fortress",
    subElements: ["Stone Gate", "Barracks", "Inner Wall", "Command Keep"]
  },
  {
    stage: "CITADEL",
    label: "Citadel",
    subElements: ["Outer Bailey", "War Room", "Citadel Core", "High Banner"]
  },
  {
    stage: "HARBOR",
    label: "Harbor",
    subElements: ["Dock Gate", "Cargo Pier", "Trade Boats", "Harbor Beacon"]
  },
  {
    stage: "MARKET_CAPITAL",
    label: "Market District",
    subElements: ["Vendor Stalls", "Trade Square", "Coin House", "Grand Bazaar"]
  },
  {
    stage: "GUILD_HALL",
    label: "Guild Hall",
    subElements: ["Craft Rooms", "Contract Board", "Guild Vault", "Master Hall"]
  },
  {
    stage: "WORKSHOP_DISTRICT",
    label: "Workshop District",
    subElements: ["Tool Foundry", "Maker Lane", "Power Yard", "Prototype Bay"]
  },
  {
    stage: "LIBRARY",
    label: "Library",
    subElements: ["Reading Hall", "Index Room", "Quiet Wing", "Memory Vault"]
  },
  {
    stage: "ACADEMY",
    label: "Academy",
    subElements: ["Lecture Hall", "Study Court", "Mentor Wing", "Master Archive"]
  },
  {
    stage: "UNIVERSITY",
    label: "University",
    subElements: ["Campus Green", "Research Hall", "Debate Court", "Scholar Tower"]
  },
  {
    stage: "RESEARCH_CITY",
    label: "Research District",
    subElements: ["Lab Block", "Data Wing", "Idea Foundry", "Research Spire"]
  },
  {
    stage: "OBSERVATORY",
    label: "Observatory",
    subElements: ["Lens Platform", "Star Charts", "Telescope Dome", "Night Signal"]
  },
  {
    stage: "CANAL_SYSTEM",
    label: "Canal System",
    subElements: ["Lock Gates", "Water Roads", "Canal Bridge", "Flow Control"]
  },
  {
    stage: "GRAND_GARDEN",
    label: "Grand Garden",
    subElements: ["Orchard Rings", "Glasshouse", "Reflection Pool", "Grand Pavilion"]
  },
  {
    stage: "CULTURAL_DISTRICT",
    label: "Cultural District",
    subElements: ["Theater Row", "Gallery Walk", "Music Court", "Culture Hall"]
  },
  {
    stage: "INDUSTRIAL_QUARTER",
    label: "Industrial Quarter",
    subElements: ["Factory Lane", "Rail Yard", "Power Grid", "Assembly Hall"]
  },
  {
    stage: "LIGHTHOUSE",
    label: "Lighthouse",
    subElements: ["Cliff Path", "Keeper House", "Signal Lens", "Guiding Beam"]
  },
  {
    stage: "MOUNTAIN_KEEP",
    label: "Mountain Keep",
    subElements: ["Stone Trail", "Gatehouse", "Mountain Wall", "Summit Keep"]
  },
  {
    stage: "CRYSTAL_BRIDGE",
    label: "Crystal Bridge",
    subElements: ["River Anchor", "Crystal Span", "Light Rail", "Bridge Crown"]
  },
  {
    stage: "AERIAL_PORT",
    label: "Aerial Port",
    subElements: ["Lift Platform", "Signal Mast", "Airship Dock", "Flight Deck"]
  },
  {
    stage: "SKYLINE_HARBOR",
    label: "Skyline District",
    subElements: ["Tower Base", "Upper Walkway", "Skyline Pier", "Skyline Crown"]
  },
  {
    stage: "INNOVATION_ARC",
    label: "Innovation District",
    subElements: ["Idea Gate", "Maker Arc", "Quantum Lab", "Innovation Core"]
  },
  {
    stage: "DISCIPLINE_METRO",
    label: "Metro System",
    subElements: ["Metro Line", "Focus Station", "Transit Core", "Discipline Metro"]
  },
  {
    stage: "FOCUS_CAPITAL",
    label: "Focus Capital",
    subElements: ["Civic Core", "Focus Plaza", "Capital Hall", "Command Center"]
  },
  {
    stage: "HARMONY_PROVINCE",
    label: "Harmony Province",
    subElements: ["Green Province", "Harmony Road", "Commons", "Peace Tower"]
  },
  {
    stage: "GOLDEN_CITADEL",
    label: "Golden Citadel",
    subElements: ["Golden Gate", "Royal Court", "Sun Vault", "Golden Citadel"]
  },
  {
    stage: "STAR_OBSERVATORY",
    label: "Star Observatory",
    subElements: ["Star Lens", "Sky Lab", "Deep Chart", "Star Observatory"]
  },
  {
    stage: "ETERNAL_LIBRARY",
    label: "Eternal Library",
    subElements: ["Index Gate", "Wisdom Wing", "Archive Core", "Eternal Library"]
  },
  {
    stage: "CLOUD_DISTRICT",
    label: "Cloud District",
    subElements: ["Lift Garden", "Cloud Walk", "Sky Market", "Cloud District"]
  },
  {
    stage: "NEON_BOULEVARD",
    label: "Neon Boulevard",
    subElements: ["Neon Signs", "Night Lane", "Pulse Plaza", "Neon Boulevard"]
  },
  {
    stage: "QUANTUM_GARDEN",
    label: "Quantum Garden",
    subElements: ["Pattern Beds", "Quantum Pond", "Logic Grove", "Quantum Garden"]
  },
  {
    stage: "ORBITAL_TOWER",
    label: "Orbital Tower",
    subElements: ["Elevator Spine", "Orbital Dock", "Signal Ring", "Orbital Tower"]
  },
  {
    stage: "SKY_KINGDOM",
    label: "Sky Kingdom",
    subElements: ["Sky Harbor", "Crown Clouds", "High Court", "Sky Kingdom"]
  },
  {
    stage: "LUNAR_COLONY",
    label: "Lunar Colony",
    subElements: ["Habitat Ring", "Moon Garden", "Lunar Lab", "Lunar Colony"]
  },
  {
    stage: "SOLAR_CITADEL",
    label: "Solar Citadel",
    subElements: ["Solar Gate", "Helio Forge", "Sun Chapel", "Solar Citadel"]
  },
  {
    stage: "GALACTIC_CAPITAL",
    label: "Galactic Capital",
    subElements: ["Starport", "Galaxy Forum", "Trade Nexus", "Galactic Capital"]
  },
  {
    stage: "COSMIC_ARCHIVE",
    label: "Cosmic Archive",
    subElements: ["Memory Vault", "Cosmic Shelves", "Time Index", "Cosmic Archive"]
  },
  {
    stage: "PROCAST_REALM",
    label: "ProCast Realm",
    subElements: ["Final Gate", "Discipline Core", "ProCast Spire", "ProCast Realm"]
  }
] as const;

export const worldStages = stageDefinitions.map((stage, index) => ({
  ...stage,
  level: index + 1,
  threshold: thresholds[index] ?? thresholds[thresholds.length - 1]
}));

export const worldSubstageMarks = [25, 50, 75, 100] as const;
export type WorldStageCode = (typeof stageDefinitions)[number]["stage"];

export function stageForXp(xp: number) {
  const current = [...worldStages].reverse().find((stage) => xp >= stage.threshold) ?? worldStages[0];

  return current;
}

export function stageIndex(stage: string) {
  return worldStages.findIndex((item) => item.stage === stage);
}

export function stageAt(index: number) {
  return worldStages[Math.max(0, Math.min(worldStages.length - 1, index))];
}
