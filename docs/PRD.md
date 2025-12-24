# Product Requirements Document (PRD)
## Reventure.app Clone - Real Estate Market Intelligence Platform

**Version:** 2.0  
**Date:** December 24, 2025  
**Product Owner:** Ariel Shapira  
**Status:** In Development

---

## Executive Summary

A comprehensive real estate market intelligence platform that replicates and enhances Reventure.app's functionality, providing ZIP code-level market analysis, trend visualization, and investment opportunity identification across the United States.

**Core Value Proposition:**
- FREE access to Zillow Research data (ZHVI, ZORI, Inventory, Sales)
- Interactive map visualization of market trends
- ZIP code-level granularity for precision analysis
- Foreclosure auction integration for Brevard County, FL
- ML-powered investment scoring

**Internal Valuation:** $300-400K annually (1 extra deal/quarter + 1 avoided loss + time savings)

---

## Product Vision

### What is Reventure.app?
Reventure.app is a real estate market analysis platform that visualizes housing market trends at the ZIP code level using an interactive map interface. It provides:

1. **Market Health Indicators:**
   - Home value trends (YoY changes)
   - Rent price trends
   - Inventory levels
   - Days on market
   - Price cut percentages
   - Sale-to-list ratios

2. **Visual Analytics:**
   - Color-coded ZIP code overlays (green = appreciating, red = depreciating)
   - Time-series charts for trend analysis
   - Comparative market analysis tools
   - Heat maps for key metrics

3. **Data Sources:**
   - Zillow Home Value Index (ZHVI)
   - Zillow Observed Rent Index (ZORI)
   - Inventory statistics
   - Sales velocity data
   - U.S. Census demographics

---

## Product Goals

### Primary Goals
1. **Market Intelligence:** Provide actionable insights for real estate investment decisions
2. **Data Accessibility:** Make enterprise-level data FREE and accessible
3. **Visual Clarity:** Enable instant understanding of market conditions
4. **Competitive Advantage:** Integrate with BrevardBidderAI for foreclosure opportunities

### Success Metrics
- **Coverage:** 30,000+ ZIP codes nationwide
- **Data Freshness:** Monthly updates (1st week of month)
- **Performance:** <2s map load time, <500ms interaction response
- **Accuracy:** 95%+ data accuracy vs Zillow official sources
- **Integration:** Seamless BrevardBidderAI data pipeline

---

## Technical Architecture

### Stack Overview
```
Frontend:    React 18 + Vite + TypeScript
Mapping:     Mapbox GL JS (or Leaflet as fallback)
Styling:     Tailwind CSS + shadcn/ui
Backend:     Node.js + Express (API layer)
Database:    Supabase (PostgreSQL)
Deployment:  Cloudflare Pages + GitHub Actions
Data:        Zillow Research CSVs (FREE downloads)
```

### Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Zillow Research FREE CSV Downloads (Monthly Updates)          │
│  ├── ZHVI (Home Values)      - 30,000+ ZIPs                   │
│  ├── ZORI (Rent Values)      - 15,000+ ZIPs                   │
│  ├── Inventory Data          - Active listings                 │
│  ├── Sales Count             - Monthly transactions            │
│  ├── Price Cuts              - % of listings reduced           │
│  ├── Days on Market          - Median DOM by ZIP               │
│  └── Sale-to-List Ratio      - Pricing accuracy                │
│                                                                 │
│  U.S. Census API (Free, Real-time)                            │
│  ├── Demographics            - Population, income, age         │
│  ├── Housing Units           - Total units by ZIP              │
│  └── Economic Indicators     - Employment, GDP                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   DATA PROCESSING LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CSV Parser (csv-parse)                                        │
│  ├── Validate data integrity                                   │
│  ├── Normalize column names                                    │
│  ├── Handle missing values                                     │
│  └── Type coercion                                             │
│                                                                 │
│  ETL Pipeline (Node.js)                                        │
│  ├── Extract: Download & parse CSVs                            │
│  ├── Transform: Calculate derivatives (YoY%, trends)           │
│  ├── Load: Insert into Supabase                               │
│  └── Scheduler: GitHub Actions cron (monthly)                  │
│                                                                 │
│  Data Enrichment                                               │
│  ├── ZIP code geocoding (lat/lng)                             │
│  ├── County/Metro area mapping                                │
│  ├── Neighborhood classification                              │
│  └── Market tier assignment (A/B/C/D)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER (Supabase)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tables:                                                        │
│  ├── zip_codes                                                 │
│  │   ├── zip, state, county, metro, lat, lng                  │
│  │   └── Indexes: (zip), (state, county)                      │
│  │                                                             │
│  ├── zhvi_monthly                                              │
│  │   ├── zip, date, value, yoy_pct, mom_pct                  │
│  │   └── Indexes: (zip, date), (date)                         │
│  │                                                             │
│  ├── zori_monthly                                              │
│  │   ├── zip, date, rent, yoy_pct, mom_pct                   │
│  │   └── Indexes: (zip, date), (date)                         │
│  │                                                             │
│  ├── market_metrics                                            │
│  │   ├── zip, date, inventory, sales, dom, price_cuts        │
│  │   └── sale_to_list_ratio, market_tier                      │
│  │                                                             │
│  ├── demographics                                              │
│  │   ├── zip, population, median_income, age_median          │
│  │   └── housing_units, vacancy_rate                          │
│  │                                                             │
│  └── market_scores (ML predictions)                            │
│      ├── zip, date, investment_score, appreciation_prob       │
│      └── risk_score, recommendation (BUY/HOLD/AVOID)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Express.js)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REST Endpoints:                                                │
│  ├── GET /api/zips                 - List all ZIPs             │
│  ├── GET /api/zips/:zip            - Get ZIP details           │
│  ├── GET /api/zips/:zip/trends     - Time series data          │
│  ├── GET /api/zips/:zip/metrics    - Current metrics           │
│  ├── GET /api/map/viewport         - Get ZIPs in bounds        │
│  ├── GET /api/search?q=query       - Search ZIPs/cities        │
│  └── GET /api/compare?zips=...     - Compare multiple ZIPs     │
│                                                                 │
│  Response Format (GeoJSON):                                     │
│  {                                                              │
│    "type": "FeatureCollection",                                │
│    "features": [{                                              │
│      "type": "Feature",                                        │
│      "properties": {                                           │
│        "zip": "32937",                                         │
│        "zhvi": 550000,                                         │
│        "zhvi_yoy": 8.5,                                        │
│        "zori": 2400,                                           │
│        "inventory": 45,                                        │
│        "dom": 32,                                              │
│        "market_tier": "A"                                      │
│      },                                                         │
│      "geometry": { "type": "Polygon", "coordinates": [...] }   │
│    }]                                                           │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER (React + Mapbox)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Map Component (Mapbox GL JS)                                  │
│  ├── ZIP code polygons (color-coded by YoY change)            │
│  ├── Hover tooltips (key metrics)                             │
│  ├── Click popups (detailed charts)                           │
│  ├── Legend (color scale explanation)                         │
│  └── Map controls (zoom, layer toggle)                        │
│                                                                 │
│  Chart Components (Recharts)                                   │
│  ├── Time series line charts (ZHVI/ZORI trends)               │
│  ├── Bar charts (inventory, sales)                            │
│  ├── Scatter plots (rent vs value)                            │
│  └── Comparison tables                                         │
│                                                                 │
│  UI Components (shadcn/ui)                                     │
│  ├── Search autocomplete                                       │
│  ├── Filter controls (state, metro, tier)                     │
│  ├── Date range picker                                        │
│  ├── Metric selector (ZHVI, ZORI, etc.)                       │
│  └── Export buttons (CSV, PDF)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Sources (FREE APIs)

### 1. Zillow Research Data
**URL:** https://www.zillow.com/research/data/  
**Cost:** FREE  
**Format:** CSV downloads  
**Update Frequency:** Monthly (1st week)  
**Coverage:** 30,000+ ZIPs nationwide

#### Available Datasets:

**A. ZHVI (Zillow Home Value Index)**
```
URL Pattern: https://files.zillowstatic.com/research/public_csvs/zhvi/{Geography}_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv

Geographies:
- Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv      (30,000+ ZIPs)
- City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv     (1,000+ cities)
- County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv   (3,000+ counties)
- Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv    (900+ metros)

Data Format:
RegionID, SizeRank, RegionName, RegionType, StateName, State, City, Metro, CountyName,
2000-01-31, 2000-02-29, 2000-03-31, ... (monthly values through present)

Example Row:
84654, 1, 10001, zip, New York, NY, New York, New York-Newark-Jersey City, New York County,
500000, 502000, 505000, ... 
```

**B. ZORI (Zillow Observed Rent Index)**
```
URL Pattern: https://files.zillowstatic.com/research/public_csvs/zori/{Geography}_zori_sm_month.csv

Files:
- Zip_zori_sm_month.csv                                    (15,000+ ZIPs)
- City_zori_sm_month.csv                                   (500+ cities)

Data Format: Same as ZHVI with monthly rent values
```

**C. Inventory Data**
```
URL: https://files.zillowstatic.com/research/public_csvs/invt_fs/Zip_invt_fs_uc_sfrcondo_sm_month.csv

Metrics: Count of active for-sale listings by ZIP
```

**D. Sales Count**
```
URL: https://files.zillowstatic.com/research/public_csvs/sales/Zip_sales_count_now_uc_sfrcondo_month.csv

Metrics: Number of homes sold per month by ZIP
```

**E. Price Cuts**
```
URL: https://files.zillowstatic.com/research/public_csvs/pct_reduced/Zip_pct_reduced_uc_sfrcondo_month.csv

Metrics: Percentage of listings with price reductions
```

**F. Days on Market**
```
URL: https://files.zillowstatic.com/research/public_csvs/median_dom/Zip_median_dom_uc_sfrcondo_month.csv

Metrics: Median days listings stay on market
```

**G. Sale-to-List Ratio**
```
URL: https://files.zillowstatic.com/research/public_csvs/median_sale_to_list/Zip_median_sale_to_list_uc_sfrcondo_month.csv

Metrics: Median ratio of sale price to list price (1.0 = sold at ask)
```

### 2. U.S. Census API
**URL:** https://api.census.gov/data  
**Cost:** FREE (API key required)  
**Format:** JSON  
**Update Frequency:** Annual (ACS 5-year estimates)

**Useful Endpoints:**
```
# American Community Survey 5-Year Data
GET https://api.census.gov/data/2021/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=zip%20code%20tabulation%20area:*

Variables:
- B01003_001E: Total population
- B19013_001E: Median household income
- B25001_001E: Total housing units
- B25002_003E: Vacant housing units
- B01002_001E: Median age

Response:
[
  ["NAME", "B01003_001E", "B19013_001E", "zip code tabulation area"],
  ["ZCTA5 32937", "25000", "78000", "32937"]
]
```

### 3. Mapbox (for map tiles & geocoding)
**URL:** https://www.mapbox.com/  
**Cost:** FREE tier (50,000 loads/month)  
**API Key Required:** Yes

**Endpoints:**
```
# ZIP code boundaries (GeoJSON)
GET https://api.mapbox.com/v4/mapbox.enterprise-boundaries-z6-uscb/{z}/{x}/{y}.vector.pbf

# Geocoding
GET https://api.mapbox.com/geocoding/v5/mapbox.places/{zip}.json?access_token={token}
```

---

## Feature Requirements

### F1: Interactive Map Visualization

**Priority:** P0 (Must-have)

**Description:** 
Primary interface for exploring market data. ZIP codes displayed as polygons with color-coded overlays representing market health.

**User Stories:**
- As an investor, I want to see at a glance which ZIPs are appreciating (green) vs depreciating (red)
- As a user, I want to hover over a ZIP to see key metrics without clicking
- As an analyst, I want to toggle between different metrics (ZHVI, ZORI, inventory)

**Technical Specifications:**
```javascript
// Map Component Structure
<MapContainer>
  <MapboxMap
    style="mapbox://styles/mapbox/light-v11"
    center={[-80.6081, 28.2639]} // Brevard County default
    zoom={10}
  >
    <ZipCodeLayer
      data={zipCodeGeoJSON}
      colorBy="zhvi_yoy" // or zori_yoy, inventory, etc.
      colorScale={[-10, -5, 0, 5, 10]} // % YoY change
      colors={['#d73027', '#fc8d59', '#ffffbf', '#91cf60', '#1a9850']}
      onClick={handleZipClick}
      onHover={handleZipHover}
    />
    
    <MapControls>
      <ZoomControls />
      <LayerToggle options={['ZHVI', 'ZORI', 'Inventory', 'DOM']} />
      <LegendControl colorScale={currentColorScale} />
    </MapControls>
  </MapboxMap>
  
  <HoverTooltip zip={hoveredZip} metrics={currentMetrics} />
  <ClickPopup zip={selectedZip} fullData={zipDetails} />
</MapContainer>
```

**Color Scales:**
```javascript
const COLOR_SCALES = {
  zhvi_yoy: {
    values: [-10, -5, 0, 5, 10],
    colors: ['#d73027', '#fc8d59', '#ffffbf', '#91cf60', '#1a9850'],
    label: 'YoY Home Value Change (%)'
  },
  inventory: {
    values: [0, 50, 100, 200, 500],
    colors: ['#1a9850', '#91cf60', '#ffffbf', '#fc8d59', '#d73027'],
    label: 'Active Listings Count'
  },
  dom: {
    values: [0, 30, 60, 90, 180],
    colors: ['#1a9850', '#91cf60', '#ffffbf', '#fc8d59', '#d73027'],
    label: 'Days on Market (Median)'
  }
};
```

**Performance Requirements:**
- Map render time: <2 seconds for 1,000 polygons
- Interaction response: <100ms for hover, <500ms for click
- Data refresh: Real-time on viewport change
- Memory usage: <200MB for full dataset in browser

**Acceptance Criteria:**
- [ ] Map loads within 2 seconds
- [ ] ZIP polygons render correctly with accurate boundaries
- [ ] Color coding updates in real-time when metric changes
- [ ] Hover tooltip displays within 100ms
- [ ] Click popup shows detailed charts
- [ ] Legend updates when switching metrics
- [ ] Map state persists in URL (shareable links)

---

### F2: ZIP Code Detail View

**Priority:** P0 (Must-have)

**Description:**
Comprehensive analytics dashboard for a single ZIP code showing trends, comparisons, and investment metrics.

**User Stories:**
- As an investor, I want to see 5-year trend charts for home values and rents
- As a user, I want to compare this ZIP to neighboring ZIPs
- As an analyst, I want to download the data as CSV

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ZIP 32937 - Satellite Beach, FL                               │
│  Brevard County │ Melbourne Metro                              │
├─────────────────────────────────────────────────────────────────┤
│  Key Metrics (Current Month)                                   │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐     │
│  │  ZHVI    │   ZORI   │ Inventory│   DOM    │ Price Cuts│     │
│  │ $550K    │  $2.4K   │   45     │   32     │   12%     │     │
│  │  ↑ 8.5%  │  ↑ 6.2%  │  ↓ 15%   │  ↓ 10%   │  ↑ 3%     │     │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘     │
├─────────────────────────────────────────────────────────────────┤
│  Time Series Charts (5 years)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  [Line Chart: ZHVI & ZORI over time]                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Bar Chart: Inventory & Sales over time]              │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Demographics (Census Data)                                    │
│  Population: 25,000 │ Med Income: $78K │ Med Age: 45          │
│  Housing Units: 12,000 │ Vacancy: 5.2%                         │
├─────────────────────────────────────────────────────────────────┤
│  Nearby ZIPs Comparison                                        │
│  ┌──────┬────────┬────────┬──────────┬──────────┐            │
│  │ ZIP  │  ZHVI  │  ZORI  │ Inventory│  YoY %   │            │
│  ├──────┼────────┼────────┼──────────┼──────────┤            │
│  │32937 │ $550K  │ $2.4K  │   45     │  +8.5%   │ ← Current  │
│  │32940 │ $485K  │ $2.1K  │   67     │  +6.2%   │            │
│  │32953 │ $420K  │ $1.9K  │   89     │  +5.8%   │            │
│  └──────┴────────┴────────┴──────────┴──────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
```jsx
function ZipDetailView({ zip }) {
  const { data, loading } = useZipData(zip);
  
  return (
    <div className="zip-detail">
      <ZipHeader zip={zip} data={data} />
      
      <MetricsGrid>
        <MetricCard
          label="ZHVI"
          value={formatCurrency(data.zhvi)}
          change={data.zhvi_yoy}
          trend="up"
        />
        {/* ... other metrics */}
      </MetricsGrid>
      
      <ChartsSection>
        <TimeSeriesChart
          data={data.timeSeries}
          series={['zhvi', 'zori']}
          dateRange={last5Years}
        />
        <BarChart
          data={data.timeSeries}
          series={['inventory', 'sales']}
        />
      </ChartsSection>
      
      <DemographicsSection data={data.demographics} />
      
      <ComparisonTable
        currentZip={zip}
        nearbyZips={data.nearby}
      />
      
      <ActionButtons>
        <ExportButton format="CSV" data={data} />
        <ExportButton format="PDF" data={data} />
        <ShareButton url={window.location.href} />
      </ActionButtons>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] All metrics display with correct formatting
- [ ] Charts render within 1 second
- [ ] Demographics load from Census API
- [ ] Nearby ZIPs table shows 5-10 closest ZIPs
- [ ] Export to CSV works correctly
- [ ] Share URL copies to clipboard

---

### F3: Search & Filter

**Priority:** P0 (Must-have)

**Description:**
Fast, intelligent search for ZIPs, cities, counties with autocomplete and filters.

**User Stories:**
- As a user, I want to search for "Satellite Beach" and see all relevant ZIPs
- As an investor, I want to filter ZIPs by appreciation rate (>5% YoY)
- As an analyst, I want to filter by multiple criteria (state + appreciation + inventory)

**Search Implementation:**
```javascript
// Search API endpoint
GET /api/search?q={query}&filters={filters}

// Query examples:
/api/search?q=satellite beach
/api/search?q=32937
/api/search?q=brevard county
/api/search?q=florida

// With filters:
/api/search?q=florida&zhvi_yoy_min=5&inventory_max=100&dom_max=60

Response:
{
  "results": [
    {
      "type": "zip",
      "zip": "32937",
      "name": "Satellite Beach, FL",
      "county": "Brevard County",
      "state": "FL",
      "zhvi": 550000,
      "zhvi_yoy": 8.5,
      "score": 0.95
    }
  ],
  "total": 1,
  "query": "satellite beach"
}
```

**Filter Controls:**
```jsx
function SearchFilters() {
  return (
    <FilterPanel>
      <SearchInput
        placeholder="Search ZIP, city, or county..."
        onSearch={handleSearch}
        autocomplete={true}
      />
      
      <FilterGroup label="Location">
        <StateSelect multiple />
        <MetroSelect multiple />
      </FilterGroup>
      
      <FilterGroup label="Market Metrics">
        <RangeSlider
          label="ZHVI YoY %"
          min={-20}
          max={20}
          step={1}
          value={zhviYoyRange}
        />
        <RangeSlider
          label="Inventory"
          min={0}
          max={1000}
          value={inventoryRange}
        />
        <RangeSlider
          label="Days on Market"
          min={0}
          max={180}
          value={domRange}
        />
      </FilterGroup>
      
      <FilterGroup label="Demographics">
        <RangeSlider
          label="Median Income"
          min={0}
          max={200000}
          step={5000}
        />
        <RangeSlider
          label="Population"
          min={0}
          max={100000}
        />
      </FilterGroup>
      
      <FilterActions>
        <Button onClick={applyFilters}>Apply</Button>
        <Button variant="ghost" onClick={resetFilters}>Reset</Button>
      </FilterActions>
    </FilterPanel>
  );
}
```

**Performance:**
- Search response time: <200ms
- Autocomplete suggestions: <100ms
- Filter application: <500ms
- Results pagination: 50 per page

**Acceptance Criteria:**
- [ ] Search returns relevant results within 200ms
- [ ] Autocomplete works for ZIPs, cities, counties
- [ ] Filters combine correctly (AND logic)
- [ ] Results update map viewport automatically
- [ ] Filter state persists in URL

---

### F4: Comparison Tool

**Priority:** P1 (Should-have)

**Description:**
Side-by-side comparison of up to 5 ZIPs with synchronized charts.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Compare ZIPs                                   [+ Add ZIP]     │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│    32937    │    32940    │    32953    │                     │
│ Satellite   │  Melbourne  │   Merritt   │                     │
│    Beach    │             │   Island    │                     │
├─────────────┼─────────────┼─────────────┼─────────────────────┤
│ ZHVI        │             │             │                     │
│   $550K     │   $485K     │   $420K     │                     │
│   ↑ 8.5%    │   ↑ 6.2%    │   ↑ 5.8%    │                     │
├─────────────┼─────────────┼─────────────┼─────────────────────┤
│ ZORI        │             │             │                     │
│   $2.4K     │   $2.1K     │   $1.9K     │                     │
│   ↑ 6.2%    │   ↑ 5.5%    │   ↑ 4.8%    │                     │
├─────────────┴─────────────┴─────────────┴─────────────────────┤
│  Time Series Comparison (Synchronized Zoom)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  [Multi-line chart: All ZIPs on same axes]             │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Support up to 5 ZIPs simultaneously
- [ ] Charts synchronize zoom/pan
- [ ] Export comparison as PDF/CSV
- [ ] Share comparison URL

---

### F5: BrevardBidderAI Integration

**Priority:** P1 (Should-have for Brevard focus)

**Description:**
Overlay foreclosure auction data from BrevardBidderAI on the map for Brevard County ZIPs.

**Features:**
- Foreclosure property markers on map
- Click to see BrevardBidderAI analysis (BID/REVIEW/SKIP)
- Link to full BrevardBidderAI report
- Highlight "hot zones" (high foreclosure + high appreciation)

**Data Integration:**
```javascript
// Query Supabase for Brevard foreclosure data
const { data: foreclosures } = await supabase
  .from('auction_results')
  .select('*')
  .eq('county', 'Brevard')
  .gte('auction_date', '2024-01-01')
  .order('auction_date', { ascending: false });

// Overlay on map
<ForeClosureLayer
  data={foreclosures}
  colorBy="recommendation" // BID=green, REVIEW=yellow, SKIP=red
  onClick={showBrevardBidderReport}
/>
```

**Acceptance Criteria:**
- [ ] Foreclosure markers display on Brevard ZIPs
- [ ] Click opens BrevardBidderAI report
- [ ] Filter foreclosures by recommendation
- [ ] Show foreclosure density heat map

---

## Data Schema

### Supabase Database Tables

```sql
-- ZIP Codes (master table)
CREATE TABLE zip_codes (
  zip VARCHAR(5) PRIMARY KEY,
  city VARCHAR(100),
  county VARCHAR(100),
  state VARCHAR(2),
  metro VARCHAR(100),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_zip_state ON zip_codes(state);
CREATE INDEX idx_zip_county ON zip_codes(county);

-- ZHVI (Home Values)
CREATE TABLE zhvi_monthly (
  id BIGSERIAL PRIMARY KEY,
  zip VARCHAR(5) REFERENCES zip_codes(zip),
  date DATE NOT NULL,
  value INTEGER, -- home value in dollars
  yoy_pct DECIMAL(5, 2), -- year-over-year % change
  mom_pct DECIMAL(5, 2), -- month-over-month % change
  UNIQUE(zip, date)
);
CREATE INDEX idx_zhvi_zip_date ON zhvi_monthly(zip, date DESC);

-- ZORI (Rent Values)
CREATE TABLE zori_monthly (
  id BIGSERIAL PRIMARY KEY,
  zip VARCHAR(5) REFERENCES zip_codes(zip),
  date DATE NOT NULL,
  rent INTEGER, -- monthly rent in dollars
  yoy_pct DECIMAL(5, 2),
  mom_pct DECIMAL(5, 2),
  UNIQUE(zip, date)
);
CREATE INDEX idx_zori_zip_date ON zori_monthly(zip, date DESC);

-- Market Metrics
CREATE TABLE market_metrics (
  id BIGSERIAL PRIMARY KEY,
  zip VARCHAR(5) REFERENCES zip_codes(zip),
  date DATE NOT NULL,
  inventory INTEGER, -- active listings
  sales INTEGER, -- homes sold
  dom INTEGER, -- days on market (median)
  price_cuts_pct DECIMAL(5, 2), -- % of listings with price cuts
  sale_to_list_ratio DECIMAL(5, 4), -- median sale price / list price
  UNIQUE(zip, date)
);
CREATE INDEX idx_metrics_zip_date ON market_metrics(zip, date DESC);

-- Demographics (from Census)
CREATE TABLE demographics (
  zip VARCHAR(5) PRIMARY KEY REFERENCES zip_codes(zip),
  year INTEGER NOT NULL,
  population INTEGER,
  median_income INTEGER,
  median_age DECIMAL(4, 1),
  housing_units INTEGER,
  vacant_units INTEGER,
  vacancy_rate DECIMAL(5, 2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Market Scores (ML predictions)
CREATE TABLE market_scores (
  id BIGSERIAL PRIMARY KEY,
  zip VARCHAR(5) REFERENCES zip_codes(zip),
  date DATE NOT NULL,
  investment_score INTEGER, -- 0-100 composite score
  appreciation_prob DECIMAL(5, 2), -- probability of 5%+ appreciation
  risk_score INTEGER, -- 0-100 (lower = safer)
  recommendation VARCHAR(20), -- BUY, HOLD, AVOID
  features JSONB, -- ML model features used
  model_version VARCHAR(20),
  UNIQUE(zip, date)
);
CREATE INDEX idx_scores_zip_date ON market_scores(zip, date DESC);
```

---

## Implementation Phases

### Phase 1: Data Pipeline (Week 1)
**Goal:** Establish automated data ingestion from Zillow CSVs to Supabase

**Tasks:**
- [ ] Set up Supabase project and tables
- [ ] Implement CSV download scripts (fetch_zillow_data.js)
- [ ] Build ETL pipeline (parse, transform, load)
- [ ] Create GitHub Actions workflow for monthly updates
- [ ] Validate data integrity (100% of ZIPs have values)

**Deliverables:**
- Working Supabase database with 30,000+ ZIPs
- Automated monthly data refresh
- Data validation report

---

### Phase 2: API Layer (Week 2)
**Goal:** Build Express.js API for frontend consumption

**Tasks:**
- [ ] Set up Express server with TypeScript
- [ ] Implement REST endpoints (/api/zips, /api/zips/:zip, etc.)
- [ ] Add query optimization (caching, indexes)
- [ ] Build GeoJSON response formatting
- [ ] Add rate limiting and error handling
- [ ] Deploy to Cloudflare Workers

**Deliverables:**
- Functional API with <500ms response times
- OpenAPI/Swagger documentation
- Deployed and accessible API

---

### Phase 3: Map Interface (Week 3)
**Goal:** Interactive map with ZIP code visualization

**Tasks:**
- [ ] Initialize Vite + React project
- [ ] Integrate Mapbox GL JS
- [ ] Fetch and render ZIP polygons
- [ ] Implement color coding by metric
- [ ] Add hover tooltips
- [ ] Add click popups with charts
- [ ] Optimize rendering for 1,000+ polygons

**Deliverables:**
- Working map interface
- <2s load time, <100ms interaction
- Deployed to Cloudflare Pages

---

### Phase 4: Charts & Analytics (Week 4)
**Goal:** Rich data visualization and analysis tools

**Tasks:**
- [ ] Integrate Recharts library
- [ ] Build time series chart component
- [ ] Build comparison table component
- [ ] Add export functionality (CSV, PDF)
- [ ] Implement ZIP detail view
- [ ] Add Census demographics

**Deliverables:**
- Complete ZIP detail dashboard
- Working export features
- Demographics integration

---

### Phase 5: Search & Polish (Week 5)
**Goal:** Search, filters, and production readiness

**Tasks:**
- [ ] Build search API with autocomplete
- [ ] Implement filter controls
- [ ] Add URL state management (shareable links)
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Analytics (Plausible or GA4)

**Deliverables:**
- Production-ready application
- <200ms search response
- SEO-optimized pages

---

## Success Metrics

### Technical Metrics
- **Performance:**
  - Map load time: <2 seconds
  - API response time: <500ms (p95)
  - Search latency: <200ms
  - Interaction response: <100ms

- **Data Quality:**
  - ZIP coverage: 30,000+ (95%+ of US population)
  - Data freshness: <7 days from Zillow update
  - Accuracy: 99.5%+ match with Zillow official data

- **Reliability:**
  - Uptime: 99.9%
  - Error rate: <0.1%
  - Data pipeline success: 100%

### Business Metrics
- **Usage:**
  - Monthly active users: Track adoption
  - Searches per session: Engagement indicator
  - ZIPs analyzed per user: Feature usage

- **Value Delivered:**
  - Deals identified: Extra deals per quarter
  - Losses avoided: Flagged risky investments
  - Time saved: Manual research hours eliminated

---

## Risks & Mitigations

### Risk 1: Zillow changes CSV URLs/format
**Impact:** HIGH  
**Probability:** MEDIUM  
**Mitigation:**
- Monitor Zillow research page for announcements
- Implement URL validation in pipeline
- Alert on download failures
- Maintain historical data copies

### Risk 2: Mapbox rate limits exceeded
**Impact:** MEDIUM  
**Probability:** LOW  
**Mitigation:**
- Monitor usage dashboard
- Implement tile caching
- Consider self-hosted tiles for high-volume ZIPs
- Fallback to Leaflet + OpenStreetMap if needed

### Risk 3: Census API downtime
**Impact:** LOW  
**Probability:** LOW  
**Mitigation:**
- Cache Census data locally (updates annually)
- Graceful degradation (skip demographics if API down)

### Risk 4: Performance issues with large datasets
**Impact:** MEDIUM  
**Probability:** MEDIUM  
**Mitigation:**
- Implement viewport-based loading (only render visible ZIPs)
- Use PostGIS for spatial queries
- Add Redis caching layer
- Consider vector tiles for map

---

## Future Enhancements (Post-MVP)

### V2 Features
1. **Predictive Analytics:**
   - ML model for appreciation forecasting
   - Risk scoring algorithm
   - Investment opportunity ranking

2. **Alerts & Notifications:**
   - Email alerts for target ZIPs crossing thresholds
   - Slack integration for team notifications
   - RSS feed of market updates

3. **Portfolio Tracking:**
   - Save favorite ZIPs
   - Track owned properties
   - Performance dashboards

4. **Advanced Comparisons:**
   - Multi-metro comparisons
   - Historical playback (animate trends)
   - Custom market definitions

5. **API Access:**
   - Public API for developers
   - Webhook support
   - Rate-limited free tier + paid plans

### V3 Features
1. **Rental Analysis:**
   - Cash flow calculator
   - Cap rate mapping
   - STR/MTR viability scoring

2. **Zoning & Permits:**
   - Zoning overlay data
   - Building permit trends
   - Development pipeline tracking

3. **School Districts:**
   - School rating overlays
   - District boundaries
   - Correlation with home values

4. **Mobile App:**
   - iOS/Android native apps
   - Offline mode
   - Location-based alerts

---

## Appendix

### A. Zillow CSV Column Definitions

**ZHVI Files:**
```
RegionID:      Unique identifier for region
SizeRank:      1 = largest by population
RegionName:    ZIP code, city name, or county name
RegionType:    "zip", "city", "county", "msa"
StateName:     Full state name
State:         2-letter state code
City:          City name (for ZIP codes)
Metro:         Metropolitan area
CountyName:    County name
2000-01-31:    ZHVI value for January 2000 (in dollars)
...            (monthly columns through present)
2025-11-30:    ZHVI value for November 2025
```

**Derived Metrics (calculated):**
```
YoY %:  (Current - 12 months ago) / 12 months ago * 100
MoM %:  (Current - Last month) / Last month * 100
```

### B. Color Scale Guidelines

**Home Values (ZHVI YoY %):**
```
< -10%:  Dark Red (#d73027)   - Severe depreciation
-10 to -5%: Light Red (#fc8d59)  - Moderate depreciation
-5% to 0%:  Yellow (#fee090)     - Slight depreciation
0% to 5%:   Light Green (#e0f3f8) - Slight appreciation
5% to 10%:  Green (#91bfdb)      - Moderate appreciation
> 10%:      Dark Green (#4575b4)  - Strong appreciation
```

### C. Performance Benchmarks

**Target Response Times:**
```
GET /api/zips                  : 100ms
GET /api/zips/:zip             : 50ms
GET /api/zips/:zip/trends      : 200ms
GET /api/map/viewport          : 300ms (1,000 ZIPs)
GET /api/search?q=query        : 150ms
```

**Database Query Optimization:**
- Use materialized views for common aggregations
- Partition large tables by date (monthly)
- Index all foreign keys
- Use EXPLAIN ANALYZE to validate query plans

### D. Deployment Checklist

**Pre-deployment:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Data validation report reviewed
- [ ] Backup strategy implemented

**Deployment:**
- [ ] Deploy database schema to Supabase
- [ ] Run initial data load (Zillow CSVs)
- [ ] Deploy API to Cloudflare Workers
- [ ] Deploy frontend to Cloudflare Pages
- [ ] Configure custom domain & SSL
- [ ] Set up monitoring (Sentry, Plausible)

**Post-deployment:**
- [ ] Smoke test all critical paths
- [ ] Verify data freshness
- [ ] Check analytics integration
- [ ] Monitor error rates for 24 hours

---

## Contact & Resources

**Project Owner:** Ariel Shapira  
**GitHub Repos:**
- Frontend: TBD
- Backend API: TBD
- Data Pipeline: breverdbidder/reventure-clone-v2

**External Resources:**
- Zillow Research: https://www.zillow.com/research/data/
- Census API: https://www.census.gov/data/developers/data-sets.html
- Mapbox Docs: https://docs.mapbox.com/
- Supabase Docs: https://supabase.com/docs

**Reference Implementations:**
- Reventure.app: https://www.reventure.app/map
- PropertyOnion: Inspiration for KPIs
- BrevardBidderAI: Integration partner

---

**Document Status:** COMPLETE  
**Last Updated:** December 24, 2025  
**Version:** 2.0
