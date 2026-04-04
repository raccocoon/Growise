export const mockUser = {
  name: "Ahmad Bin Sarawak",
  email: "ahmad@growbuddy.my",
  avatar: "AB",
  location: "Kuching, Sarawak",
  farmCount: 2,
  joinDate: "Jan 2024",
};

export const mockStats = [
  { label: "Active Crops", value: "12", change: "+3 this month", icon: "Sprout" as const },
  { label: "Harvest Ready", value: "4", change: "2 this week", icon: "Apple" as const },
  { label: "Soil Health", value: "85%", change: "Good condition", icon: "Leaf" as const },
  { label: "Weather Alert", value: "1", change: "Rain expected", icon: "CloudRain" as const },
];

export const mockCrops = [
  { id: 1, name: "Kangkung", emoji: "🥬", stage: "Growing", progress: 65, daysLeft: 12, health: "Good", plantedDate: "2024-02-15", area: "Plot A" },
  { id: 2, name: "Bayam", emoji: "🌿", stage: "Flowering", progress: 80, daysLeft: 7, health: "Excellent", plantedDate: "2024-02-01", area: "Plot B" },
  { id: 3, name: "Sawi", emoji: "🥗", stage: "Seedling", progress: 25, daysLeft: 28, health: "Good", plantedDate: "2024-03-01", area: "Plot A" },
  { id: 4, name: "Cili Padi", emoji: "🌶️", stage: "Fruiting", progress: 90, daysLeft: 3, health: "Fair", plantedDate: "2024-01-10", area: "Plot C" },
  { id: 5, name: "Terung", emoji: "🍆", stage: "Growing", progress: 50, daysLeft: 18, health: "Good", plantedDate: "2024-02-20", area: "Plot B" },
];

export const mockHarvestedCrops = [
  { id: 101, name: "Timun", emoji: "🥒", harvestDate: "2024-02-28", yield: "15 kg", area: "Plot A" },
  { id: 102, name: "Tomato", emoji: "🍅", harvestDate: "2024-02-20", yield: "8 kg", area: "Plot C" },
];

export const mockWeather = [
  { day: "Mon", temp: 32, condition: "Sunny", icon: "Sun", humidity: 75 },
  { day: "Tue", temp: 30, condition: "Cloudy", icon: "Cloud", humidity: 80 },
  { day: "Wed", temp: 28, condition: "Rain", icon: "CloudRain", humidity: 90 },
  { day: "Thu", temp: 31, condition: "Partly Cloudy", icon: "CloudSun", humidity: 78 },
  { day: "Fri", temp: 33, condition: "Sunny", icon: "Sun", humidity: 70 },
  { day: "Sat", temp: 29, condition: "Rain", icon: "CloudRain", humidity: 88 },
];

export const mockRecommendations = [
  { id: 1, name: "Kangkung", emoji: "🥬", confidence: 95, growTime: "25-30 days", waterNeed: "High", difficulty: "Easy", season: "Year-round", tags: ["Fast Growing", "Beginner Friendly", "High Demand"] },
  { id: 2, name: "Bayam Merah", emoji: "🌿", confidence: 88, growTime: "21-28 days", waterNeed: "Medium", difficulty: "Easy", season: "Year-round", tags: ["Nutritious", "Fast Growing"] },
  { id: 3, name: "Sawi", emoji: "🥗", confidence: 82, growTime: "30-40 days", waterNeed: "Medium", difficulty: "Easy", season: "Year-round", tags: ["Popular", "Market Ready"] },
  { id: 4, name: "Cili Padi", emoji: "🌶️", confidence: 75, growTime: "60-90 days", waterNeed: "Low", difficulty: "Medium", season: "Dry Season", tags: ["High Value", "Spicy"] },
  { id: 5, name: "Terung", emoji: "🍆", confidence: 70, growTime: "70-85 days", waterNeed: "Medium", difficulty: "Medium", season: "Year-round", tags: ["Versatile", "Good Yield"] },
];

export const mockCalendarEvents = [
  { id: 1, date: "2026-03-30", title: "Plant Kangkung", type: "planting", time: "7:00 AM" },
  { id: 2, date: "2026-03-30", title: "Fertilize Bayam", type: "fertilizing", time: "8:00 AM" },
  { id: 3, date: "2026-03-31", title: "Harvest Cili Padi", type: "harvest", time: "6:00 AM" },
  { id: 4, date: "2026-04-01", title: "Spray Pesticide", type: "pesticide", time: "9:00 AM" },
  { id: 5, date: "2026-04-02", title: "Plant new Sawi batch", type: "planting", time: "7:30 AM" },
  { id: 6, date: "2026-04-05", title: "Apply Pesticide", type: "pesticide", time: "10:00 AM" },
  { id: 7, date: "2026-04-07", title: "Fertilize all crops", type: "fertilizing", time: "7:00 AM" },
  { id: 8, date: "2026-04-10", title: "Harvest Bayam", type: "harvest", time: "6:30 AM" },
];

export const mockWeeklyActions = [
  { id: 1, task: "Water Kangkung & Bayam", done: true, priority: "high" },
  { id: 2, task: "Apply organic fertilizer to Plot B", done: false, priority: "medium" },
  { id: 3, task: "Check for pests on Cili Padi", done: false, priority: "high" },
  { id: 4, task: "Prepare soil for new Sawi batch", done: false, priority: "low" },
  { id: 5, task: "Harvest ripe Cili Padi", done: true, priority: "high" },
];

export const mockFarms = [
  { id: 1, name: "Kampung Sungai Farm", location: "Kuching, Sarawak", size: "0.5 hectare", soilType: "Alluvial", plots: 3 },
  { id: 2, name: "Sibu Riverside Plot", location: "Sibu, Sarawak", size: "0.3 hectare", soilType: "Peat", plots: 2 },
];

export const mockMapLocations = [
  {
    lat: 1.5535, lng: 110.3593, name: "Kuching", soilType: "Alluvial",
    avgTemp: 30, totalRainfall: 120, avgHumidity: 85, farmingScore: 78, farmingScoreLabel: "Good",
    floodRisk: "Medium", droughtRisk: "Low", plantingWindow: "3–5 days from now",
    crops: ["Kangkung", "Bayam", "Sawi"],
  },
  {
    lat: 2.3, lng: 111.85, name: "Sibu", soilType: "Peat",
    avgTemp: 29, totalRainfall: 95, avgHumidity: 83, farmingScore: 65, farmingScoreLabel: "Moderate",
    floodRisk: "High", droughtRisk: "Low", plantingWindow: "5–7 days from now",
    crops: ["Sago", "Pepper", "Rubber"],
  },
  {
    lat: 2.45, lng: 111.0, name: "Sarikei", soilType: "Clay Loam",
    avgTemp: 28, totalRainfall: 70, avgHumidity: 80, farmingScore: 82, farmingScoreLabel: "Good",
    floodRisk: "Low", droughtRisk: "Low", plantingWindow: "1–3 days from now",
    crops: ["Pepper", "Cocoa", "Fruits"],
  },
  {
    lat: 4.3995, lng: 114.0089, name: "Miri", soilType: "Loam",
    avgTemp: 29, totalRainfall: 85, avgHumidity: 82, farmingScore: 72, farmingScoreLabel: "Good",
    floodRisk: "Medium", droughtRisk: "Low", plantingWindow: "2–4 days from now",
    crops: ["Pineapple", "Corn", "Tapioca"],
  },
];

export const mockChatMessages = [
  { id: 1, sender: "bot", text: "Hello! I'm your GrowBuddy AI assistant. 🌱 How can I help you with your farming today?" },
  { id: 2, sender: "user", text: "When should I water my Kangkung?" },
  { id: 3, sender: "bot", text: "Kangkung thrives with consistent moisture! Water twice daily — early morning (6-7 AM) and late afternoon (5-6 PM). In Sarawak's heat, ensure soil stays moist but not waterlogged. 💧" },
];

export const eventTypeColors: Record<string, string> = {
  watering: "bg-blue-50 text-blue-700",
  fertilizing: "bg-amber-50 text-amber-700",
  harvest: "bg-green-50 text-green-700",
  inspection: "bg-purple-50 text-purple-700",
  planting: "bg-emerald-50 text-emerald-700",
};

export const eventTypeBadgeColors: Record<string, string> = {
  watering: "bg-blue-500 text-white",
  fertilizing: "bg-amber-500 text-white",
  harvest: "bg-green-500 text-white",
  inspection: "bg-purple-500 text-white",
  planting: "bg-emerald-500 text-white",
};
