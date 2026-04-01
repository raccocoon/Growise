# GrowBuddy - Smart Agricultural Advisory System
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** March 31, 2026  
**Product Manager:** AI Development Team  
**Target Market:** Sarawak, Malaysian Farmers  

---

## 1. Executive Summary

GrowBuddy is an AI-powered agricultural advisory system designed specifically for farmers in Sarawak, Malaysia. The platform provides intelligent recommendations for crop selection, planting schedules, fertilizer application, pesticide management, and harvest timing based on local weather conditions, soil data, and advanced AI models.

### Key Value Propositions
- **Localized Intelligence**: Tailored for Sarawak's unique climate and agricultural conditions
- **AI-Powered Recommendations**: Leverages multiple AI models (OpenRouter, Gemini) with fallback mechanisms
- **Comprehensive Farm Management**: End-to-end solution from planting to harvest
- **Weather-Integrated**: Real-time 30-day weather forecasting for optimal decision making
- **Sustainable Practices**: Support for both conventional and organic farming methods

---

## 2. Product Vision

**To empower Sarawak farmers with intelligent, data-driven agricultural insights that increase productivity, reduce costs, and promote sustainable farming practices.**

---

## 3. Target Users

### Primary Users
1. **Small to Medium-Scale Farmers** (1-10 hectares)
   - Age: 25-65 years
   - Tech proficiency: Basic to intermediate
   - Primary concern: Crop yield optimization and cost reduction

2. **Agricultural Cooperatives**
   - Managing multiple farms
   - Need for centralized monitoring and recommendations
   - Focus on collective productivity improvement

### Secondary Users
1. **Agricultural Extension Officers**
   - Government advisors supporting local farmers
   - Need for data-backed recommendations

2. **Agri-Business Consultants**
   - Professional advisors requiring reliable data sources

---

## 4. Core Features

### 4.1 User Authentication & Profile Management
- **Secure Authentication**: Supabase-based user management
- **Farm Profiles**: Multiple farm locations with GPS coordinates
- **Land Size Tracking**: Support for various units (hectares, acres, sqft)
- **Farming Method Preference**: Conventional vs. Organic selection

### 4.2 AI-Powered Crop Recommendations
- **Intelligent Crop Selection**: Based on soil type, climate, and market preferences
- **Multi-Model AI Integration**: 
  - Primary: OpenRouter models (Llama 3.3 70B, Llama 3.2 3B)
  - Fallback: Gemini 2.5 Flash API
  - Emergency: Preset recommendation data
- **Personalized Advice**: Tailored to farmer's experience level and resources

### 4.3 Advanced Weather Integration
- **30-Day Forecast**: Detailed weather predictions for Sarawak regions
- **Risk Assessment**: Weather-based pest and disease risk evaluation
- **Optimal Timing**: Best planting, spraying, and harvesting windows
- **Confidence Scoring**: Reliability indicators for all recommendations

### 4.4 Planting Schedule Management
- **Optimal Planting Dates**: AI-recommended timing based on weather patterns
- **Step-by-Step Guides**: Detailed planting instructions for each crop
- **Growth Tracking**: Monitor crop development through various stages
- **Active Crop Management**: Real-time status of all planted crops

### 4.5 Fertilizer Management
- **Smart Fertilizer Scheduling**: Optimal application timing and quantities
- **Crisis Mode Support**: Emergency fertilization for stressed crops
- **Method-Specific Recommendations**: Different advice for organic vs. conventional
- **Cost Optimization**: Efficient use of fertilizer resources

### 4.6 Pesticide & Pest Management
- **Risk-Based Recommendations**: 
  - Fungal risk assessment (humidity + rain probability)
  - Mite risk evaluation (temperature + humidity)
  - Insect risk analysis (temperature + rain patterns)
- **Spray Window Optimization**: 
  - Weather condition validation (rain < 50%, wind < 15 km/h, temp 22-34°C)
  - **Spray Cooldown System**: Prevents over-application
    - Fungal: 7-day cooldown
    - Mite: 4-day cooldown  
    - Insect: 5-day cooldown
    - Multiple risks: Uses shortest cooldown period
- **Product Recommendations**: Specific advice for organic vs. conventional methods
- **Monthly Situation Analysis**: Comprehensive 30-day spray opportunity overview

### 4.7 Harvest Planning
- **Optimal Harvest Timing**: AI-predicted maturity dates
- **Yield Estimation**: Expected harvest quantities
- **Quality Factors**: Weather impact on crop quality
- **Post-Harvest Advice**: Storage and handling recommendations

### 4.8 Crisis Management
- **Emergency Response**: Rapid recommendations for extreme weather events
- **Recovery Guidance**: Steps to take after weather damage
- **Risk Mitigation**: Proactive measures for weather threats

---

## 5. Technical Architecture

### 5.1 Backend Technology Stack
- **Framework**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **AI Services**: 
  - OpenRouter API (Llama models)
  - Google Gemini 2.5 Flash API
- **Weather Data**: Custom weather service integration
- **Authentication**: Supabase Auth

### 5.2 Frontend Technology
- **Framework**: Vanilla JavaScript with HTML5/CSS3
- **UI Components**: Custom-built responsive design
- **Real-time Updates**: Dynamic content rendering
- **Mobile Responsive**: Optimized for mobile and desktop access

### 5.3 Data Sources
- **Weather APIs**: Real-time and forecast data
- **Soil Databases**: Regional soil composition information
- **AI Models**: Multiple machine learning models for predictions
- **User Data**: Farm profiles, planting logs, and historical data

---

## 6. Key Differentiators

### 6.1 Spray Frequency Control System
- **Industry-First**: Prevents pesticide over-application through intelligent cooldown periods
- **Risk-Specific Cooldowns**: Different protection periods for different pest types
- **Multi-Risk Handling**: Automatically uses shortest cooldown when multiple risks present
- **Clear User Communication**: Detailed explanations for skipped spray opportunities

### 6.2 Multi-Model AI Redundancy
- **Triple AI Protection**: OpenRouter → Gemini → Preset data fallback chain
- **High Reliability**: 99.9% uptime for recommendation services
- **Model Diversity**: Different AI approaches for varied problem types

### 6.3 Sarawak-Specific Intelligence
- **Local Weather Patterns**: Tailored for Borneo climate
- **Regional Crop Knowledge**: Native and popular crop varieties
- **Cultural Considerations**: Local farming practices and preferences

---

## 7. Success Metrics

### 7.1 User Engagement
- **Daily Active Users**: Target 500+ farmers within 6 months
- **Feature Adoption**: 80% of users utilizing spray scheduling features
- **User Retention**: 75% monthly retention rate

### 7.2 Agricultural Impact
- **Yield Improvement**: 15-20% increase in crop yields for active users
- **Cost Reduction**: 10-15% reduction in pesticide/fertilizer costs
- **Efficiency Gains**: 25% improvement in farm operation efficiency

### 7.3 Technical Performance
- **API Response Time**: <2 seconds for all recommendations
- **System Uptime**: 99.9% availability
- **AI Accuracy**: 85%+ accuracy in weather-based predictions

---

## 8. User Stories

### 8.1 Crop Planning
**As a farmer, I want to know which crops will grow best on my land so that I can maximize my yield and minimize risks.**

### 8.2 Spray Management  
**As a farmer, I want to know exactly when to spray pesticides so that I can protect my crops effectively without wasting money or harming the environment.**

### 8.3 Weather Adaptation
**As a farmer, I want to receive weather-based recommendations so that I can plan my farming activities around optimal conditions.**

### 8.4 Harvest Optimization
**As a farmer, I want to know the best time to harvest my crops so that I can achieve maximum quality and market value.**

---

## 9. Risk Assessment & Mitigation

### 9.1 Technical Risks
- **AI Service Downtime**: Mitigated by triple fallback system
- **Weather Data Accuracy**: Multiple weather data sources with confidence scoring
- **Scalability Issues**: Cloud-based architecture with auto-scaling

### 9.2 Business Risks
- **User Adoption**: Comprehensive onboarding and support
- **Market Competition**: Focus on Sarawak-specific features and local partnerships
- **Regulatory Compliance**: Adherence to agricultural and data protection regulations

### 9.3 Operational Risks
- **Data Quality**: Regular validation and cleaning processes
- **User Support**: Multi-channel support system (chat, email, phone)
- **Training Requirements**: Comprehensive documentation and tutorials

---

## 10. Development Roadmap

### Phase 1: Core Platform (Completed)
- ✅ User authentication and profiles
- ✅ Basic crop recommendations
- ✅ Weather integration
- ✅ Planting and harvest guidance

### Phase 2: Advanced Features (Completed)
- ✅ Spray frequency control system
- ✅ Multi-model AI integration
- ✅ Advanced pesticide management
- ✅ Fertilizer optimization

### Phase 3: Enhancement (Future)
- 📋 Mobile application development
- 📋 IoT sensor integration
- 📋 Market price integration
- 📋 Community features

### Phase 4: Scale (Future)
- 📋 Expansion to other Malaysian states
- 📋 International market adaptation
- 📋 Advanced analytics dashboard
- 📋 Enterprise features

---

## 11. Compliance & Security

### 11.1 Data Protection
- **GDPR Compliance**: User data protection and privacy
- **Local Regulations**: Compliance with Malaysian data protection laws
- **Secure Storage**: Encrypted data storage and transmission

### 11.2 Agricultural Standards
- **Organic Certification**: Support for organic farming standards
- **Safety Guidelines**: Pesticide and fertilizer safety recommendations
- **Environmental Protection**: Sustainable farming practice promotion

---

## 12. Support & Documentation

### 12.1 User Support
- **24/7 Availability**: Automated support systems
- **Multi-Language**: English and Bahasa Malaysia support
- **Training Materials**: Video tutorials and comprehensive guides

### 12.2 Technical Documentation
- **API Documentation**: Complete developer resources
- **Integration Guides**: Third-party system integration
- **Best Practices**: Farming optimization recommendations

---

## 13. Conclusion

GrowBuddy represents a significant advancement in agricultural technology for Sarawak farmers. By combining AI-powered intelligence with local agricultural knowledge, the platform addresses critical needs in crop planning, resource optimization, and risk management.

The innovative spray frequency control system, multi-model AI redundancy, and comprehensive farm management features position GrowBuddy as a leader in smart agricultural solutions for tropical climates.

With a clear development roadmap, strong technical foundation, and focus on user success, GrowBuddy is poised to transform agricultural practices in Sarawak and serve as a model for similar systems worldwide.

---

**Document Status:** Final  
**Next Review:** June 30, 2026  
**Approval:** Pending Stakeholder Review
