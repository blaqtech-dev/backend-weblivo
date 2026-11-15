
const ALLOWED_SECTION_TYPES = [
  "hero",
  "about",
  "services",
  "features",
  "testimonials",
  "gallery",
  "contact",
  "footer",
];

const ALLOWED_DESIGN_STYLES = [
  "Modern",
  "Minimal",
  "Luxury",
  "Creative",
];

const ALLOWED_SECTION_LAYOUTS = [
  "default",
  "centered",
  "split",
  "grid",
  "list",
  "image-left",
  "image-right",
  "image-background",
  "cards",
  "minimal",
];

const ALLOWED_HERO_LAYOUTS = [
  "split",
  "centered",
  "image-background",
  "image-left",
  "image-right",
];

const ALLOWED_IMAGE_POSITIONS = [
  "left",
  "right",
  "center",
  "background",
];

const isValidColor = (color) => {
  return typeof color === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(color);
};

const isValidOptionalString = (value, maxLength = 1000) => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.length <= maxLength)
  );
};

function validateImage(image) {
  if (image === undefined || image === null) {
    return true;
  }

  if (typeof image !== "object" || Array.isArray(image)) {
    return false;
  }

  return (
    typeof image.url === "string" &&
    image.url.length <= 2000 &&
    isValidOptionalString(image.alt, 200)
  );
}

function validateWebsiteData(data) {
  const errors = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      valid: false,
      errors: ["Website data must be a valid object."],
    };
  }

  // Basic website information
  if (
    typeof data.siteName !== "string" ||
    !data.siteName.trim() ||
    data.siteName.length > 100
  ) {
    errors.push("A valid website name is required.");
  }

  if (
    typeof data.description !== "string" ||
    !data.description.trim() ||
    data.description.length > 2000
  ) {
    errors.push("A valid website description is required.");
  }

  if (!ALLOWED_DESIGN_STYLES.includes(data.designStyle)) {
    errors.push("Invalid website design style.");
  }

  // Website theme
  if (!data.theme || typeof data.theme !== "object") {
    errors.push("Website theme is required.");
  } else {
    if (!isValidColor(data.theme.primaryColor)) {
      errors.push("Invalid primary color.");
    }

    if (!isValidColor(data.theme.secondaryColor)) {
      errors.push("Invalid secondary color.");
    }
  }

  // Header configuration
  if (data.header !== undefined) {
    if (
      !data.header ||
      typeof data.header !== "object" ||
      Array.isArray(data.header)
    ) {
      errors.push("Invalid header configuration.");
    } else {
      if (
        data.header.logoPosition !== undefined &&
        !["left", "right", "center"].includes(
          data.header.logoPosition
        )
      ) {
        errors.push("Invalid logo position.");
      }

      if (
        data.header.logo !== undefined &&
        !validateImage(data.header.logo)
      ) {
        errors.push("Invalid header logo.");
      }

      if (
        data.header.layout !== undefined &&
        !["standard", "centered", "minimal"].includes(
          data.header.layout
        )
      ) {
        errors.push("Invalid header layout.");
      }
    }
  }

  // Website sections
  if (!Array.isArray(data.sections)) {
    errors.push("Website sections must be an array.");
  } else {
    if (data.sections.length < 1 || data.sections.length > 12) {
      errors.push("Website must contain between 1 and 12 sections.");
    }

    data.sections.forEach((section, index) => {
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        errors.push(`Section ${index + 1} is invalid.`);
        return;
      }

      if (!ALLOWED_SECTION_TYPES.includes(section.type)) {
        errors.push(`Section ${index + 1} has an invalid section type.`);
      }

      if (
        typeof section.heading !== "string" ||
        !section.heading.trim() ||
        section.heading.length > 150
      ) {
        errors.push(`Section ${index + 1} has an invalid heading.`);
      }

      if (!isValidOptionalString(section.subheading, 300)) {
        errors.push(`Section ${index + 1} has an invalid subheading.`);
      }

      if (!isValidOptionalString(section.content, 2000)) {
        errors.push(`Section ${index + 1} has invalid content.`);
      }

      if (
        section.layout !== undefined &&
        !ALLOWED_SECTION_LAYOUTS.includes(section.layout)
      ) {
        errors.push(`Section ${index + 1} has an invalid layout.`);
      }

    if (
  section.imagePosition !== undefined &&
  section.imagePosition !== null &&
  !ALLOWED_IMAGE_POSITIONS.includes(section.imagePosition)
) {
  errors.push(
    `Section ${index + 1} has an invalid image position: "${section.imagePosition}". Allowed values: ${ALLOWED_IMAGE_POSITIONS.join(", ")}.`
  );
}

      if (
        section.image !== undefined &&
        !validateImage(section.image)
      ) {
        errors.push(`Section ${index + 1} has an invalid image.`);
      }

      if (
        section.type === "hero" &&
        section.layout !== undefined &&
        !ALLOWED_HERO_LAYOUTS.includes(section.layout)
      ) {
        errors.push(`Hero section ${index + 1} has an invalid layout.`);
      }

      if (section.items !== undefined) {
        if (
          !Array.isArray(section.items) ||
          section.items.length > 12
        ) {
          errors.push(`Section ${index + 1} has invalid items.`);
        } else {
          section.items.forEach((item, itemIndex) => {
            if (
              !item ||
              typeof item !== "object" ||
              Array.isArray(item)
            ) {
              errors.push(
                `Section ${index + 1}, item ${itemIndex + 1} is invalid.`
              );
              return;
            }

            if (!isValidOptionalString(item.title, 150)) {
              errors.push(
                `Section ${index + 1}, item ${itemIndex + 1} has an invalid title.`
              );
            }

            if (!isValidOptionalString(item.description, 1000)) {
              errors.push(
                `Section ${index + 1}, item ${itemIndex + 1} has an invalid description.`
              );
            }

            if (
              item.image !== undefined &&
              !validateImage(item.image)
            ) {
              errors.push(
                `Section ${index + 1}, item ${itemIndex + 1} has an invalid image.`
              );
            }
          });
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateWebsiteData,
  ALLOWED_SECTION_TYPES,
  ALLOWED_DESIGN_STYLES,
  ALLOWED_SECTION_LAYOUTS,
  ALLOWED_HERO_LAYOUTS,
  ALLOWED_IMAGE_POSITIONS,
};
