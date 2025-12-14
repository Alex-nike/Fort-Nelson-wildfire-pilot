// ============================================================
// Initial perimeter and temporal window
// ============================================================


//Import the fire perimeter data as an asset then use this to get the fire perimeter
var firePerimeter = FirePerimData.union().geometry();

// Fire date (main burn date)
var FIRE_DATE = ee.Date('2024-05-10');

// Pre- and post-fire windows
// Pre: 40–20 days before fire (snow avoidance)
// Post: Fire date to ~2 months after
var PRE_START  = FIRE_DATE.advance(-40, 'day');
var PRE_END    = FIRE_DATE.advance(-20, 'day');
var POST_START = FIRE_DATE;
var POST_END   = FIRE_DATE.advance(61, 'day');


// ============================================================
// Loading in Sentiel 2 data
// ============================================================

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

// Pre-fire image collection
var preFireCollection = s2
  .filterBounds(firePerimeter)
  .filterDate(PRE_START, PRE_END)
  .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 20));

// Post-fire image collection
var postFireCollection = s2
  .filterBounds(firePerimeter)
  .filterDate(POST_START, POST_END)
  .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 20));


// ============================================================
// Cloud Masking
// ============================================================

// Valid SCL classes to retain
// 2  = Dark features
// 4  = Vegetation
// 5  = Bare soil
// 6  = Water
// 7  = Unclassified
// 11 = Snow / Ice
function maskBySCL(image) {
  var scl = image.select('SCL');

  var validMask = scl.eq(2)
    .or(scl.eq(4))
    .or(scl.eq(5))
    .or(scl.eq(6))
    .or(scl.eq(7))
    .or(scl.eq(11));

  return image.updateMask(validMask);
}


var preFireMasked  = preFireCollection.map(maskBySCL);
var postFireMasked = postFireCollection.map(maskBySCL);


// ============================================================
// Composite generation and fire perimeter layer
// ============================================================

// Median composites
var preComposite = preFireMasked.median().clip(firePerimeter);
var postComposite = postFireMasked.median().clip(firePerimeter);


Map.centerObject(firePerimeter, 10);

// Fire perimeter
Map.addLayer(firePerimeter, { color: 'red' }, 'Fire Perimeter');



// ============================================================
// NBR and dNBR calculation
// ============================================================

var preImage  = preComposite.toFloat();
var postImage = postComposite.toFloat();

// NBR calculation function
function calculateNBR(image) {
  var nir   = image.select('B8');
  var swir2 = image.select('B12');
  return nir.subtract(swir2)
            .divide(nir.add(swir2))
            .rename('NBR');
}


var nbrPre  = calculateNBR(preImage);
var nbrPost = calculateNBR(postImage);


var dNBR = nbrPre.subtract(nbrPost)
  .rename('dNBR')
  .clip(firePerimeter);


// ============================================================
// Pre, post and dNBR layers 
// ============================================================


//Low values are no vegitation and brown, high values are high vegitation and dark green
var nbrVis = {
  min: -0.5,
  max: 1,
  palette: ['654321', 'f7fcb9', '006400']
};

//Blue if regrowth and red if burned, white if no change
var dNbrVis = {
  min: -0.5,
  max: 0.8,
  palette: ['0000FF', '00FFFF', 'FFFFFF', 'FFFF00', 'FFA500', 'FF0000']
};

Map.addLayer(nbrPre,  nbrVis,  'NBR Pre-Fire');
Map.addLayer(nbrPost, nbrVis,  'NBR Post-Fire');
Map.addLayer(dNBR,    dNbrVis, 'dNBR');


// ============================================================
// Burn severity calculations and layer
// ============================================================

var burnSeverity = dNBR.expression(
  "d < -0.500 ? 0" +
  ": d < -0.251 ? 1" +
  ": d < -0.101 ? 2" +
  ": d <  0.100 ? 3" +
  ": d <  0.270 ? 4" +
  ": d <  0.440 ? 5" +
  ": d <  0.660 ? 6" +
  ": 7",
  { d: dNBR }
).rename('severity')
 .clip(firePerimeter);

// Severity palette
var severityPalette = [
  '#006400', // High Regrowth, Dark green
  '#7FFF00', // Low Regrowth, Light green
  '#FFFFCC', // Unburned, light Yellow
  '#FFFF00', // Low Severity, yellow
  '#FEC965', // Moderate-Low, orange
  '#FD8D3C', // Moderate-High, orange red
  '#B10026', // High Severity, red
  '#4B0000'  // Extreme Severity, dark red
];

Map.addLayer(
  burnSeverity,
  { min: 0, max: 7, palette: severityPalette },
  'Burn Severity'
);


// ============================================================
// Legend
// ============================================================

var severityLabels = [
  'High Regrowth',
  'Low Regrowth',
  'Unburned',
  'Low Severity',
  'Moderate-Low Severity',
  'Moderate-High Severity',
  'High Severity',
  'Extreme Severity'
];

var legend = ui.Panel({
  style: { position: 'bottom-left', padding: '8px' }
});

legend.add(ui.Label({
  value: 'Burn Severity Legend',
  style: { fontWeight: 'bold', fontSize: '14px' }
}));

severityPalette.forEach(function(color, i) {
  legend.add(
    ui.Panel([
      ui.Label('', {
        backgroundColor: color,
        padding: '12px',
        margin: '0 8px 4px 0'
      }),
      ui.Label(severityLabels[i])
    ], ui.Panel.Layout.Flow('horizontal'))
  );
});

Map.add(legend);


// ============================================================
// Area calculations per servirty class
// ============================================================

// Severity classes 0–7
var severityClasses = ee.List.sequence(0, 7);

// Area calculation per class
function computeAreaByClass(classValue) {
  classValue = ee.Number(classValue);

  var areaImage = burnSeverity.eq(classValue)
    .multiply(ee.Image.pixelArea())
    .rename('area_m2');

  var areaStats = areaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: firePerimeter,
    scale: 10,
    maxPixels: 1e13
  });

  return ee.Feature(null, {
    severity_class: classValue,
    area_m2: ee.Number(areaStats.get('area_m2'))
  });
}

// Build feature collection
var areaBySeverity = ee.FeatureCollection(
  severityClasses.map(computeAreaByClass)
);

// Total fire area (km²)
var totalAreaKm2 = areaBySeverity
  .aggregate_sum('area_m2')
  .divide(1e6);


// Add km² and percent of total
var areaStatsFinal = areaBySeverity.map(function(feature) {
  var areaKm2 = ee.Number(feature.get('area_m2')).divide(1e6);
  var percent = ee.Algorithms.If(
    totalAreaKm2.gt(0),
    areaKm2.divide(totalAreaKm2).multiply(100),
    0
  );

  return feature.set({
    area_km2: areaKm2,
    percent_of_fire: percent
  });
});


// ============================================================
// Severity labelling ready for export
// ============================================================

var severityLabelDict = ee.Dictionary({
  0: 'High Regrowth',
  1: 'Low Regrowth',
  2: 'Unburned',
  3: 'Low Severity',
  4: 'Moderate-Low Severity',
  5: 'Moderate-High Severity',
  6: 'High Severity',
  7: 'Extreme Severity'
});

var areaStatsLabeled = areaStatsFinal.map(function(feature) {
  var cls = ee.Number(feature.get('severity_class'));
  return feature.set('severity_label', severityLabelDict.get(cls));
});
