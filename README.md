# 🌱 GrowBuddy 2.0
### Smart Agricultural Advisory System for Malaysia

> Helping Malaysian farmers make better decisions — from soil detection to AI-powered crop recommendations.

---

## 📖 Project Overview

GrowBuddy 2.0 is a smart agricultural advisory system built for Malaysian farmers — from smallholder growers in Sarawak to commercial plantation operators. It combines **real-time weather data**, **automatic soil detection**, **interactive farm mapping**, and **AI-powered crop recommendations** to help farmers make better decisions throughout the growing cycle.

### The Problem It Solves
- Farmers don't know which crop suits their specific land and current weather conditions
- First-time growers have no guidance on how and when to actually plant
- Generic farming apps ignore Malaysia's unique conditions: peat soil, high humidity, and flood patterns
- No system provides location-specific planting, spraying, and harvest timing based on live weather

### Key Features

**🗺️ Farm Setup & Soil Detection**
- Draw your farm polygon on an interactive map → system auto-detects soil type via SoilGrids API
- Classifies soil: Sandy, Clay, Clay Loam, Silt Loam, or Loam

**🌤️ Live Weather Engine**
- 6-day real forecast via Open-Meteo API + custom ARIMA forecasting model
- Auto-computed risk scores: flood risk, drought risk, and farming score

**🤖 AI Crop Recommendation**
- Primary: OpenRouter (multi-model) → Fallback: Google Gemini Flash → Hardcoded presets
- Returns top crop picks with full planting guide tailored to your soil, weather, and land size

**📊 Map Visualization**
- Split-panel UI: AI chatbot on the left, data dashboard on the right
- NASA NDVI/MODIS satellite heatmap for vegetation health

### UN SDGs Addressed
| SDG | How |
|-----|-----|
| 🌾 SDG 2 — Zero Hunger | Prevent weather-related crop loss through better planning |
| 🌍 SDG 13 — Climate Action | Build farmer resilience against extreme weather |
| ♻️ SDG 12 — Responsible Consumption | Optimize water and fertilizer use, reduce waste |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+ and npm
- Python 3.10+
- Supabase account (free tier works)
- API keys: OpenRouter, Google Gemini, Open-Meteo (free), SoilGrids (free)

---

### Backend (FastAPI)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/growbuddy.git
cd growbuddy/backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Activate virtual environment
venv\Scripts\activate
```

> ⚠️ If step 3 fails, run this first then activate again:
> ```bash
> python -m venv venv
> venv\Scripts\activate
> ```

```bash
# 4. Run the server
uvicorn main:app --reload --port 8000
```

Create a `.env` file in `/backend`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key
```

---

### Frontend (React)

Open a **new terminal**, then:

```bash
cd frontend

# 1. Install Leaflet map packages
npm install react-leaflet@^4.2.1 @react-leaflet/core@^2.1.0

# 2. Install all dependencies
npm i

# 3. Start dev server
npm run dev
```

Create a `.env.local` file in `/frontend`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

App runs at **http://localhost:5173**

---

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Enable Email Auth under **Authentication > Providers**
3. Run the SQL migrations in `/backend/migrations/`
4. Copy your Project URL and anon key into the `.env` files above

---

## 🛠️ Technologies Used

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend | React 18 + TypeScript | Component-based UI with type safety |
| Styling | Tailwind CSS | Utility-first responsive styling |
| Map | Leaflet.js + leaflet-draw | Interactive farm boundary drawing |
| Geo Util | Turf.js | Client-side centroid computation from polygon |
| Backend | Python + FastAPI | Async REST API |
| Database | Supabase (PostgreSQL) | Auth, user profiles, farm data |
| AI Primary | OpenRouter | Multi-model AI with fallback routing |
| AI Fallback | Google Gemini Flash | Secondary AI if OpenRouter is unavailable |
| Weather | Open-Meteo API | Free 6-day forecast by lat/lng |
| Forecasting | ARIMA Model | Custom time-series extended forecast |
| Soil Data | SoilGrids API | Automated soil classification by coordinate |
| Satellite | NASA NDVI/MODIS | Vegetation health heatmap |
| Backend Deploy | Render | Cloud hosting for FastAPI |
| Frontend Deploy | Vercel | Edge hosting for React |

---

## 🚀 Future Roadmap

### Phase 1 — Short-term (1–3 months)
- [ ] 30-day planting calendar with task scheduling (watering, spraying, harvest)
- [ ] Push notifications and task reminders
- [ ] Multi-farm management from one account
- [ ] Bahasa Malaysia language support
- [ ] Offline mode for low-connectivity areas

### Phase 2 — Medium-term (3–6 months)
- [ ] Fine-tuned AI on Malaysian crop data (sawit, durian, pepper, padi)
- [ ] RAG pipeline for Department of Agriculture documents
- [ ] Historical harvest comparison and yield analytics
- [ ] DOSM commodity pricing data integration
- [ ] Expand coverage beyond Sarawak to all Malaysian states

### Phase 3 — Enterprise (6–12 months)
- [ ] AgroLens Pro — enterprise spatial intelligence for commercial plantations
- [ ] Sawit specialist mode with industry-grade analytics
- [ ] Drone/satellite integration for automated crop health monitoring
- [ ] API access for third-party agri-tech integrations
- [ ] Multi-tenant architecture for cooperatives and government bodies

### Phase 4 — ML & Research
- [ ] Upgrade ARIMA to LSTM-based deep learning for weather forecasting
- [ ] Crop yield prediction model on Malaysian historical data
- [ ] Disease detection via computer vision (photo upload)
- [ ] Federated learning across farms for privacy-preserving recommendations

---

> Built for Malaysian farmers. Powered by AI. 🌾
