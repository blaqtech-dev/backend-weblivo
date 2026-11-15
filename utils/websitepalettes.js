
const PALETTES = {
  modern: [
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
  ],

  minimal: [
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
  ],

  luxury: [
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
  ],

  creative: [
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
  ],
};

function getWebsitePalette(designStyle = "Modern", previousTheme = null) {
  const style = String(designStyle).toLowerCase();

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
