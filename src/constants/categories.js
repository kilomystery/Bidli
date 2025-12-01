export const CATEGORIES = [
  { id: "vintage", label: "Moda Vintage", numericId: 1 },
  { id: "sneakers", label: "Sneakers", numericId: 2 },
  { id: "accessori", label: "Accessori & Orologi", numericId: 3 },
  { id: "retro-tech", label: "Elettronica & Retro-tech", numericId: 4 },
  { id: "gaming", label: "Videogiochi & Console", numericId: 5 },
  { id: "collectibles", label: "Collezionismo", numericId: 6 },
  { id: "home-vintage", label: "Casa & Design Vintage", numericId: 7 },
  { id: "motori", label: "Motori", numericId: 8 },
  { id: "pre-loved", label: "Pre-loved", numericId: 9 },
];

// Helper function to convert string category ID to numeric ID
export const getCategoryNumericId = (stringId) => {
  const category = CATEGORIES.find(cat => cat.id === stringId);
  return category ? category.numericId : 1; // Default to "vintage" if not found
};

// Helper function to get category label by numeric ID
export const getCategoryLabel = (numericId) => {
  const category = CATEGORIES.find(cat => cat.numericId === numericId);
  return category ? category.label : "Moda Vintage"; // Default label
};