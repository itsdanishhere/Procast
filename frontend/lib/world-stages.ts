const thresholds = [
  0, 120, 280, 480, 720, 1020, 1380, 1800, 2300, 2900,
  3600, 4400, 5300, 6300, 7400, 8600, 9900, 11300, 12800, 14400,
  16100, 17900, 19800, 21800, 23900, 26100, 28400, 30800, 33300, 35900,
  38600, 41400, 44300, 47300, 50400, 53600, 56900, 60300, 63800, 67400,
  71100, 74900, 78800, 82800, 86900, 91100, 95400, 99800, 104300, 108900
] as const;

const stageDefinitions = [
  {
    code: "EMPTY_LAND",
    name: "Empty Land",
    description: "A quiet plot waiting for proof that you can begin.",
    accent: "#63b3ed",
    symbol: "[]",
    subElements: ["Survey Stakes", "Cleared Ground", "Boundary Line", "Foundation Plot"]
  },
  {
    code: "SMALL_HOUSE",
    name: "Small House",
    description: "Your first shelter appears after consistent starts.",
    accent: "#76e4a7",
    symbol: "/\\",
    subElements: ["Floor Frame", "Wall Frame", "Front Door", "Hearth Light"]
  },
  {
    code: "BETTER_HOUSE",
    name: "Better House",
    description: "The foundation strengthens as your sessions stack.",
    accent: "#90cdf4",
    symbol: "H+",
    subElements: ["Stone Walls", "Second Floor", "Study Room", "Protected Roof"]
  },
  {
    code: "GARDEN",
    name: "Garden",
    description: "Discipline starts to feel alive and visible.",
    accent: "#68d391",
    symbol: "*",
    subElements: ["Seed Beds", "Flower Rows", "Stone Walkway", "Water Fountain"]
  },
  {
    code: "STREET",
    name: "Street",
    description: "Your habit becomes a path you can return to.",
    accent: "#f6e05e",
    symbol: "==",
    subElements: ["Packed Road", "Road Markers", "Street Lamps", "Crossing Gate"]
  },
  {
    code: "VILLAGE",
    name: "Village",
    description: "Repeated effort turns one path into a small living place.",
    accent: "#b794f4",
    symbol: "V",
    subElements: ["First Homes", "Village Square", "Footbridge", "Gathering Hall"]
  },
  {
    code: "TOWN",
    name: "Town",
    description: "Focus sessions start forming a real system.",
    accent: "#f6ad55",
    symbol: "#",
    subElements: ["Market Row", "Workshop Block", "Town Hall", "Clock Tower"]
  },
  {
    code: "LARGE_TOWN",
    name: "Large Town",
    description: "Momentum compounds into visible self-trust.",
    accent: "#63b3ed",
    symbol: "LT",
    subElements: ["Residential Blocks", "Transit Hub", "Work District", "Public Garden"]
  },
  {
    code: "CITY",
    name: "City",
    description: "Focused days now shape something hard to abandon.",
    accent: "#76e4a7",
    symbol: "C",
    subElements: ["City Gates", "Metro Core", "Skyline Block", "Civic Tower"]
  },
  {
    code: "KINGDOM",
    name: "Kingdom",
    description: "Your discipline has become an identity.",
    accent: "#f6ad55",
    symbol: "K",
    subElements: ["Outer Wall", "Royal District", "Citadel", "Throne Hall"]
  },
  {
    code: "HIGH_COUNCIL",
    name: "High Council",
    description: "Your world gains a decision center for harder choices.",
    accent: "#f6ad55",
    symbol: "HC",
    subElements: ["Council Chamber", "Policy Hall", "Strategy Vault", "High Council Seat"]
  },
  {
    code: "ROYAL_ROAD",
    name: "Royal Road",
    description: "The path back to discipline becomes automatic.",
    accent: "#f6ad55",
    symbol: "RR",
    subElements: ["Mile Markers", "Caravan Stop", "Paved Route", "Royal Arch"]
  },
  {
    code: "WATCHTOWER",
    name: "Watchtower",
    description: "Your attention now has a lookout against drift.",
    accent: "#90cdf4",
    symbol: "WT",
    subElements: ["Guard Post", "Watch Deck", "Beacon Fire", "Sky Banner"]
  },
  {
    code: "FORTRESS",
    name: "Fortress",
    description: "Your system can withstand harder days.",
    accent: "#f56565",
    symbol: "FT",
    subElements: ["Stone Gate", "Barracks", "Inner Wall", "Command Keep"]
  },
  {
    code: "CITADEL",
    name: "Citadel",
    description: "Your strongest routines sit at the center.",
    accent: "#b794f4",
    symbol: "CT",
    subElements: ["Outer Bailey", "War Room", "Citadel Core", "High Banner"]
  },
  {
    code: "HARBOR",
    name: "Harbor",
    description: "Discipline starts receiving bigger opportunities.",
    accent: "#63b3ed",
    symbol: "HB",
    subElements: ["Dock Gate", "Cargo Pier", "Trade Boats", "Harbor Beacon"]
  },
  {
    code: "MARKET_CAPITAL",
    name: "Market District",
    description: "Consistency creates momentum that others can see.",
    accent: "#68d391",
    symbol: "MD",
    subElements: ["Vendor Stalls", "Trade Square", "Coin House", "Grand Bazaar"]
  },
  {
    code: "GUILD_HALL",
    name: "Guild Hall",
    description: "Your routines begin to coordinate like a craft guild.",
    accent: "#f6ad55",
    symbol: "GH",
    subElements: ["Craft Rooms", "Contract Board", "Guild Vault", "Master Hall"]
  },
  {
    code: "WORKSHOP_DISTRICT",
    name: "Workshop District",
    description: "Focus becomes production, not just intention.",
    accent: "#f6e05e",
    symbol: "WD",
    subElements: ["Tool Foundry", "Maker Lane", "Power Yard", "Prototype Bay"]
  },
  {
    code: "LIBRARY",
    name: "Library",
    description: "Your completed sessions become a record of trust.",
    accent: "#76e4a7",
    symbol: "LB",
    subElements: ["Reading Hall", "Index Room", "Quiet Wing", "Memory Vault"]
  },
  {
    code: "ACADEMY",
    name: "Academy",
    description: "Repeated focus turns into skill and study.",
    accent: "#b794f4",
    symbol: "AC",
    subElements: ["Lecture Hall", "Study Court", "Mentor Wing", "Master Archive"]
  },
  {
    code: "UNIVERSITY",
    name: "University",
    description: "Long-term growth is now part of the world.",
    accent: "#90cdf4",
    symbol: "UN",
    subElements: ["Campus Green", "Research Hall", "Debate Court", "Scholar Tower"]
  },
  {
    code: "RESEARCH_CITY",
    name: "Research District",
    description: "Your focus engine starts producing insight.",
    accent: "#76e4a7",
    symbol: "RD",
    subElements: ["Lab Block", "Data Wing", "Idea Foundry", "Research Spire"]
  },
  {
    code: "OBSERVATORY",
    name: "Observatory",
    description: "Patterns become visible before they become problems.",
    accent: "#63b3ed",
    symbol: "OB",
    subElements: ["Lens Platform", "Star Charts", "Telescope Dome", "Night Signal"]
  },
  {
    code: "CANAL_SYSTEM",
    name: "Canal System",
    description: "Work flows through fewer points of resistance.",
    accent: "#63b3ed",
    symbol: "CS",
    subElements: ["Lock Gates", "Water Roads", "Canal Bridge", "Flow Control"]
  },
  {
    code: "GRAND_GARDEN",
    name: "Grand Garden",
    description: "The habit feels alive at a larger scale.",
    accent: "#68d391",
    symbol: "GG",
    subElements: ["Orchard Rings", "Glasshouse", "Reflection Pool", "Grand Pavilion"]
  },
  {
    code: "CULTURAL_DISTRICT",
    name: "Cultural District",
    description: "The world gains character from repeated effort.",
    accent: "#b794f4",
    symbol: "CD",
    subElements: ["Theater Row", "Gallery Walk", "Music Court", "Culture Hall"]
  },
  {
    code: "INDUSTRIAL_QUARTER",
    name: "Industrial Quarter",
    description: "Deep work starts compounding into serious output.",
    accent: "#f6e05e",
    symbol: "IQ",
    subElements: ["Factory Lane", "Rail Yard", "Power Grid", "Assembly Hall"]
  },
  {
    code: "LIGHTHOUSE",
    name: "Lighthouse",
    description: "You can find the way back even after rough days.",
    accent: "#f6ad55",
    symbol: "LH",
    subElements: ["Cliff Path", "Keeper House", "Signal Lens", "Guiding Beam"]
  },
  {
    code: "MOUNTAIN_KEEP",
    name: "Mountain Keep",
    description: "Your system stands above old avoidance loops.",
    accent: "#90cdf4",
    symbol: "MK",
    subElements: ["Stone Trail", "Gatehouse", "Mountain Wall", "Summit Keep"]
  },
  {
    code: "CRYSTAL_BRIDGE",
    name: "Crystal Bridge",
    description: "The gap between planning and starting keeps shrinking.",
    accent: "#63b3ed",
    symbol: "CB",
    subElements: ["River Anchor", "Crystal Span", "Light Rail", "Bridge Crown"]
  },
  {
    code: "AERIAL_PORT",
    name: "Aerial Port",
    description: "Your discipline now supports larger ambitions.",
    accent: "#63b3ed",
    symbol: "AP",
    subElements: ["Lift Platform", "Signal Mast", "Airship Dock", "Flight Deck"]
  },
  {
    code: "SKYLINE_HARBOR",
    name: "Skyline District",
    description: "Your built world now reaches upward and outward.",
    accent: "#76e4a7",
    symbol: "SD",
    subElements: ["Tower Base", "Upper Walkway", "Skyline Pier", "Skyline Crown"]
  },
  {
    code: "INNOVATION_ARC",
    name: "Innovation District",
    description: "Focused time turns into new capability.",
    accent: "#b794f4",
    symbol: "ID",
    subElements: ["Idea Gate", "Maker Arc", "Quantum Lab", "Innovation Core"]
  },
  {
    code: "DISCIPLINE_METRO",
    name: "Metro System",
    description: "Returning to work becomes fast and repeatable.",
    accent: "#63b3ed",
    symbol: "MS",
    subElements: ["Metro Line", "Focus Station", "Transit Core", "Discipline Metro"]
  },
  {
    code: "FOCUS_CAPITAL",
    name: "Focus Capital",
    description: "Focus is no longer a feature. It is the capital.",
    accent: "#76e4a7",
    symbol: "FC",
    subElements: ["Civic Core", "Focus Plaza", "Capital Hall", "Command Center"]
  },
  {
    code: "HARMONY_PROVINCE",
    name: "Harmony Province",
    description: "Effort, recovery, and discipline begin to balance.",
    accent: "#68d391",
    symbol: "HP",
    subElements: ["Green Province", "Harmony Road", "Commons", "Peace Tower"]
  },
  {
    code: "GOLDEN_CITADEL",
    name: "Golden Citadel",
    description: "The protected world starts feeling earned.",
    accent: "#f6e05e",
    symbol: "GC",
    subElements: ["Golden Gate", "Royal Court", "Sun Vault", "Golden Citadel"]
  },
  {
    code: "STAR_OBSERVATORY",
    name: "Star Observatory",
    description: "You can track patterns across longer horizons.",
    accent: "#90cdf4",
    symbol: "SO",
    subElements: ["Star Lens", "Sky Lab", "Deep Chart", "Star Observatory"]
  },
  {
    code: "ETERNAL_LIBRARY",
    name: "Eternal Library",
    description: "Your reflections become an archive of discipline.",
    accent: "#b794f4",
    symbol: "EL",
    subElements: ["Index Gate", "Wisdom Wing", "Archive Core", "Eternal Library"]
  },
  {
    code: "CLOUD_DISTRICT",
    name: "Cloud District",
    description: "Your world now rises above everyday friction.",
    accent: "#63b3ed",
    symbol: "CL",
    subElements: ["Lift Garden", "Cloud Walk", "Sky Market", "Cloud District"]
  },
  {
    code: "NEON_BOULEVARD",
    name: "Neon Boulevard",
    description: "The path forward is bright, visible, and hard to ignore.",
    accent: "#90cdf4",
    symbol: "NB",
    subElements: ["Neon Signs", "Night Lane", "Pulse Plaza", "Neon Boulevard"]
  },
  {
    code: "QUANTUM_GARDEN",
    name: "Quantum Garden",
    description: "Tiny daily starts now produce outsized growth.",
    accent: "#68d391",
    symbol: "QG",
    subElements: ["Pattern Beds", "Quantum Pond", "Logic Grove", "Quantum Garden"]
  },
  {
    code: "ORBITAL_TOWER",
    name: "Orbital Tower",
    description: "Your focus world has vertical ambition.",
    accent: "#63b3ed",
    symbol: "OT",
    subElements: ["Elevator Spine", "Orbital Dock", "Signal Ring", "Orbital Tower"]
  },
  {
    code: "SKY_KINGDOM",
    name: "Sky Kingdom",
    description: "Discipline becomes a world above the old one.",
    accent: "#f6ad55",
    symbol: "SK",
    subElements: ["Sky Harbor", "Crown Clouds", "High Court", "Sky Kingdom"]
  },
  {
    code: "LUNAR_COLONY",
    name: "Lunar Colony",
    description: "Consistency carries your world into new terrain.",
    accent: "#90cdf4",
    symbol: "LC",
    subElements: ["Habitat Ring", "Moon Garden", "Lunar Lab", "Lunar Colony"]
  },
  {
    code: "SOLAR_CITADEL",
    name: "Solar Citadel",
    description: "Your strongest routines now generate their own light.",
    accent: "#f6e05e",
    symbol: "SC",
    subElements: ["Solar Gate", "Helio Forge", "Sun Chapel", "Solar Citadel"]
  },
  {
    code: "GALACTIC_CAPITAL",
    name: "Galactic Capital",
    description: "Your discipline system reaches massive scale.",
    accent: "#76e4a7",
    symbol: "GL",
    subElements: ["Starport", "Galaxy Forum", "Trade Nexus", "Galactic Capital"]
  },
  {
    code: "COSMIC_ARCHIVE",
    name: "Cosmic Archive",
    description: "Every focused block becomes part of the record.",
    accent: "#b794f4",
    symbol: "CA",
    subElements: ["Memory Vault", "Cosmic Shelves", "Time Index", "Cosmic Archive"]
  },
  {
    code: "PROCAST_REALM",
    name: "ProCast Realm",
    description: "The full discipline world is built and protected.",
    accent: "#63b3ed",
    symbol: "PR",
    subElements: ["Final Gate", "Discipline Core", "ProCast Spire", "ProCast Realm"]
  }
] as const;

export const worldStages = stageDefinitions.map((stage, index) => ({
  ...stage,
  level: index + 1,
  threshold: thresholds[index] ?? thresholds[thresholds.length - 1]
}));
