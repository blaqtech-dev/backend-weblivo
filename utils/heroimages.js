
const HERO_IMAGES = {
  restaurant:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/restaurant.jpg",

  beauty:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/beauty.jpg",

  fashion:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/fashion.jpg",

  photography:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/photography.jpg",

  cleaning:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/cleaning.jpg",

  education:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/education.jpg",

  consulting:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/consulting.jpg",

  "real-estate":
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/real-estate.jpg",

  hospitality:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/hospitality.jpg",

  travel:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/travel.jpg",

  fitness:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/fitness.jpg",

  healthcare:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/healthcare.jpg",

  technology:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/technology.jpg",

  construction:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/construction.jpg",

  interior:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/interior.jpg",

  automotive:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/automative.jpg",

  events:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/events.jpg",

  agriculture:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/agriculture.jpg",

  retail:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/retail.jpg",

  professional:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/professional.jpg",

  pets:
    "https://ciczxuzfjbggbfhnhrys.supabase.co/storage/v1/object/public/website-images/default-hero-images/pets.jpg",
};

const BUSINESS_IMAGE_MAP = {
  "Beauty and Salon": "beauty",
  "Restaurant and Food": "restaurant",
  "Fashion and Clothing": "fashion",
  Photography: "photography",
  "Cleaning Services": "cleaning",
  "Education and Tutoring": "education",
  Consulting: "consulting",
  "Real Estate and Property": "real-estate",
  "Hotels and Hospitality": "hospitality",
  "Travel and Tourism": "travel",
  "Fitness and Gym": "fitness",
  "Healthcare and Medical": "healthcare",
  "Technology and Software": "technology",
  "Construction and Architecture": "construction",
  "Interior Design": "interior",
  "Automotive and Car Services": "automotive",
  "Events and Entertainment": "events",
  "Agriculture and Farming": "agriculture",
  "Supermarket and Retail": "retail",
  "Legal Services": "professional",
  "Finance and Accounting": "professional",
  "Beauty Products and Cosmetics": "beauty",
  "Bakery and Cake Shops": "restaurant",
  "Logistics and Delivery": "automotive",
  "Transportation Services": "automotive",
  "Marketing and Advertising": "professional",
  "Digital Services": "technology",
  "Graphic Design": "photography",
  "Printing and Publishing": "professional",
  "Home Improvement and Repairs": "interior",
  "Plumbing and Electrical Services": "construction",
  "Wedding and Event Planning": "events",
  "Catering Services": "restaurant",
  "Jewelry and Accessories": "fashion",
  "Furniture and Home Decor": "interior",
  "Pet Care and Veterinary": "pets",
  "Personal Services": "professional",
  "Nonprofit and Charity": "professional",
  "Religious Organizations": "professional",
  Other: "professional",
};

function getHeroImage(businessType) {
  const imageKey = BUSINESS_IMAGE_MAP[businessType] || "professional";

  return HERO_IMAGES[imageKey] || HERO_IMAGES.professional;
}

module.exports = { getHeroImage };
