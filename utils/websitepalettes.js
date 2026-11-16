
const PALETTES = {
  modern: [
    // Original palettes
    {
      name: "Navy Blue",
      primaryColor: "#243B64",
      secondaryColor: "#EEF3FA",
    },
    {
      name: "Forest Green",
      primaryColor: "#173B35",
      secondaryColor: "#F1F5ED",
    },
    {
      name: "Charcoal",
      primaryColor: "#30343B",
      secondaryColor: "#F0F1F2",
    },
    {
      name: "Deep Teal",
      primaryColor: "#155E63",
      secondaryColor: "#EAF5F4",
    },

    // New palettes
    {
      name: "Midnight Blue",
      primaryColor: "#243B53",
      secondaryColor: "#EDF3F8",
    },
    {
      name: "Ocean Teal",
      primaryColor: "#1F6175",
      secondaryColor: "#EAF4F5",
    },
    {
      name: "Warm Terracotta",
      primaryColor: "#914737",
      secondaryColor: "#F9EFEB",
    },
    {
      name: "Deep Aubergine",
      primaryColor: "#514064",
      secondaryColor: "#F2EEF6",
    },
  ],

  minimal: [
    // Original palettes
    {
      name: "Soft Charcoal",
      primaryColor: "#343A40",
      secondaryColor: "#F4F5F6",
    },
    {
      name: "Slate Blue",
      primaryColor: "#40536D",
      secondaryColor: "#F0F3F7",
    },
    {
      name: "Olive Green",
      primaryColor: "#53634A",
      secondaryColor: "#F2F4EC",
    },

    // New palettes
    {
      name: "Warm Cocoa",
      primaryColor: "#654B3E",
      secondaryColor: "#F6F0E9",
    },
    {
      name: "Quiet Sage",
      primaryColor: "#42615A",
      secondaryColor: "#EDF3EF",
    },
    {
      name: "Dusty Blue",
      primaryColor: "#45627A",
      secondaryColor: "#EFF3F7",
    },
    {
      name: "Soft Sand",
      primaryColor: "#79634B",
      secondaryColor: "#F7F1E8",
    },
  ],

  luxury: [
    // Original palettes
    {
      name: "Burgundy",
      primaryColor: "#713B48",
      secondaryColor: "#F8ECEE",
    },
    {
      name: "Deep Plum",
      primaryColor: "#513B59",
      secondaryColor: "#F3EDF5",
    },
    {
      name: "Dark Emerald",
      primaryColor: "#174B3E",
      secondaryColor: "#EAF3EE",
    },
    {
      name: "Midnight Navy",
      primaryColor: "#202F4A",
      secondaryColor: "#EEF1F6",
    },

    // New palettes
    {
      name: "Rich Espresso",
      primaryColor: "#49352D",
      secondaryColor: "#F5EDE5",
    },
    {
      name: "Rosewood",
      primaryColor: "#783C51",
      secondaryColor: "#F8EDF0",
    },
    {
      name: "Imperial Gold",
      primaryColor: "#75551C",
      secondaryColor: "#F7F0DE",
    },
    {
      name: "Royal Sapphire",
      primaryColor: "#263C68",
      secondaryColor: "#EDF1F8",
    },
  ],

  creative: [
    // Original palettes
    {
      name: "Deep Teal",
      primaryColor: "#176B70",
      secondaryColor: "#E8F5F4",
    },
    {
      name: "Indigo",
      primaryColor: "#493F82",
      secondaryColor: "#F0EEFA",
    },
    {
      name: "Terracotta",
      primaryColor: "#A34F3E",
      secondaryColor: "#FAEFEB",
    },
    {
      name: "Deep Green",
      primaryColor: "#285943",
      secondaryColor: "#EDF4ED",
    },

    // New palettes
    {
      name: "Cobalt Dream",
      primaryColor: "#304F91",
      secondaryColor: "#EDF1FA",
    },
    {
      name: "Golden Earth",
      primaryColor: "#75551C",
      secondaryColor: "#F7F0DE",
    },
    {
      name: "Coral Bloom",
      primaryColor: "#A44754",
      secondaryColor: "#FBEDEF",
    },
    {
      name: "Violet Garden",
      primaryColor: "#60447C",
      secondaryColor: "#F3EEF8",
    },
  ],
};

function getWebsitePalette(designStyle = "Modern", previousTheme = null) {
  const style = String(designStyle).toLowerCase().trim();

  const availablePalettes =
    PALETTES[style] || PALETTES.modern;

  // Exclude the previous palette during regeneration.
  const availableChoices = availablePalettes.filter((palette) => {
    if (!previousTheme) return true;

    return (
      palette.primaryColor.toLowerCase() !==
        String(previousTheme.primaryColor || "").toLowerCase() ||
      palette.secondaryColor.toLowerCase() !==
        String(previousTheme.secondaryColor || "").toLowerCase()
    );
  });

  // Randomly select from the remaining curated palettes.
  const choices = availableChoices.length
    ? availableChoices
    : availablePalettes;

  const selectedIndex = Math.floor(Math.random() * choices.length);

  return choices[selectedIndex];
}

module.exports = {
  getWebsitePalette,
};
