# Fort Nelson Wildfire (2024) Impact Pilot Study

Satellite-based wildfire burn severity assessment using Sentinel-2 imagery and Google Earth Engine.

![Burn Severity Map](maps/Burn_Severity_Map_Fort_Nelson.png)

---

## About This Project
This project was completed independently to gain hands-on experience with GIS and remote sensing tools. It focuses on measuring vegetation change before and after a wildfire using the differenced Normalized Burn Ratio (dNBR).

In addition to Google Earth Engine, QGIS was used to clean, refine, and format exported map outputs for presentation.

---

## What I Did
- Prepared and clipped fire perimeter data for the Fort Nelson wildfire (May 10, 2024)
- Generated cloud- and snow-masked Sentinel-2 image composites
- Calculated NBR and dNBR indices
- Classified burn severity using published USGS dNBR thresholds
- Summarized affected area by burn severity class
- Exported key map products and refined cartographic layouts in QGIS

---

## Data & Tools Used
- Sentinel-2 Surface Reflectance (COPERNICUS/S2_SR_HARMONIZED)
- Fire perimeter shapefiles
- Google Earth Engine (JavaScript API)
- QGIS 3.40.13

---

## Repository Contents
- `gee.script.js` — Complete Google Earth Engine analysis script
- `maps/` — Exported and finalized map outputs
- `BurnSeverity_Area_Percent_Summary.csv` — Area and percentage statistics by severity class
- `2024 Fort Nelson Wildfire Pilot Study.pdf` — Technical report
- `fort_nelson_shapefiles/` — Fire perimeter shapefiles

---

## How to Run
Copy `gee.script.js` into the Google Earth Engine Code Editor, load the Fort Nelson fire perimeter shapefiles as assets, and run the script.

---

## What I Learned
- How burn severity indices respond to vegetation loss and post-fire regrowth
- Practical cloud, shadow, and snow masking using Sentinel-2 SCL data
- Trade-offs involved in selecting pre- and post-fire temporal windows
- How classification thresholds influence burn severity mapping results
- How to structure and present a geospatial analysis as a public portfolio project
- How to use QGIS to finalize and customize map outputs for presentation

