import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Coordinates for cities in the dataset
const CITY_COORDS = {
  'London': [-0.118, 51.509],
  'Sydney': [151.209, -33.868],
  'Montreal': [-73.567, 45.501],
  'Tokyo': [139.691, 35.689],
  'Toronto': [-79.383, 43.653],
  'New York': [-74.006, 40.712],
  'San Sebastian': [-1.975, 43.318],
  'San Sebastián': [-1.975, 43.318],
  'Chicago': [-87.629, 41.878],
  'Copenhagen': [12.568, 55.676],
  'Glasgow': [-4.251, 55.864],
  'Galway': [-9.053, 53.274],
  'Rome': [12.496, 41.902],
  'Worcester': [-2.220, 52.192],
  'Munich': [11.576, 48.137],
  'Cardiff': [-3.179, 51.481],
  'Brisbane': [153.025, -27.469],
  'Belgrade': [20.457, 44.804],
  'Singapore': [103.820, 1.352],
  'Paris': [2.347, 48.859],
  'The Hague': [4.316, 52.070],
  'Nottingham': [-1.150, 52.954],
  'Salzburg': [13.045, 47.800],
  'Les Deux Alpes': [6.124, 45.015],
  'Bathurst': [149.577, -33.420],
  'Dublin': [-6.266, 53.333],
  'Auckland': [174.763, -36.848],
  'Subotica': [19.666, 46.100],
  'Hong Kong': [114.177, 22.302],
  'Gdansk': [18.646, 54.352],
  'Los Angeles': [-118.243, 34.052],
  'Seville': [-5.984, 37.389],
  'Melbourne': [144.963, -37.814],
  'Taghazout': [-9.714, 30.543],
  'Brooklyn': [-73.950, 40.678],
  'Atlanta': [-84.388, 33.749],
  'Lisbon': [-9.139, 38.722],
  'Dunedin': [170.501, -45.879],
  'Exeter': [-3.533, 50.718],
  'Gold Coast': [153.431, -28.017],
  'San Francisco': [-122.419, 37.774],
  'Calgary': [-114.065, 51.044],
  'Bristol': [-2.597, 51.454],
  'Santiago': [-70.669, -33.448],
  'Leeds': [-1.549, 53.800],
  'Dubai': [55.296, 25.204],
  'Cambridge': [0.120, 52.205],
  'Amsterdam': [4.900, 52.372],
  'Rotterdam': [4.477, 51.924],
  'Reading': [-0.978, 51.454],
  'Marrakech': [-7.989, 31.629],
  'Sheffield': [-1.470, 53.380],
  'Liverpool': [-2.978, 53.408],
  'Bangalore': [77.594, 12.971],
  'Malaga': [-4.421, 36.721],
  'Brighton': [-0.137, 50.822],
  'Frankfurt': [8.682, 50.110],
  'Istanbul': [28.978, 41.013],
  'Bilbao': [-2.935, 43.263],
  'Edinburgh': [-3.188, 55.953],
  'Mexico City': [-99.133, 19.432],
  'Queenstown': [168.662, -45.031],
  'Las Vegas': [-115.137, 36.175],
  'Cairns': [145.777, -16.920],
  'Adelaide': [138.601, -34.929],
  'Warsaw': [21.012, 52.229],
  'Cork': [-8.472, 51.897],
  'Belfast': [-5.930, 54.597],
  'Manchester': [-2.237, 53.481],
  'Oxford': [-1.257, 51.752],
  'Vienna': [16.373, 48.208],
  'Perth': [115.860, -31.952],
  'Osaka': [135.502, 34.694],
  'Gateshead': [-1.600, 54.962],
  'Hokkaido': [142.869, 43.064],
  'Mumbai': [72.878, 19.076],
  'Cairo': [31.235, 30.044],
  'Luxor': [32.639, 25.687],
  'Courchevel': [6.634, 45.414],
  'Nantes': [-1.553, 47.218],
  'Ghent': [3.717, 51.054],
  'Winnipeg': [-97.138, 49.895],
  'Val d\'Isère': [6.982, 45.448],
  'Nozawa Onsen': [138.437, 36.917],
  'Canary Islands': [-15.500, 28.000],
  'Maspalomas': [-15.587, 27.762],
  'Swindon': [-1.787, 51.559],
  'Newport': [-3.000, 51.588],
  'Coventry': [-1.510, 52.408],
  'Swansea': [-3.944, 51.621],
  'Hove': [-0.174, 50.832],
  'Doncaster': [-1.133, 53.522],
  'Collingwood': [144.996, -37.804],
  'Steamboat Springs': [-106.831, 40.484],
  'Lake Tahoe': [-120.044, 39.096],
  'Asheville': [-82.551, 35.595],
  'Decatur': [-86.983, 34.606],
  'Quebec': [-71.208, 46.813],
  'Kawasaki': [139.717, 35.530],
  'Yokkaichi': [136.616, 34.965],
  'Yamanashi': [138.568, 35.664],
  'Le Mans': [0.199, 47.995],
  'Fremantle': [115.748, -32.056],
  'Ipswich': [1.144, 52.059],
  'Ireland': [-8.000, 53.000],
  'Canada': [-96.000, 56.000],
  'Australia': [133.775, -25.274],
  'New Zealand': [172.000, -41.000],
  'Netherlands': [5.291, 52.132],
  'France': [2.349, 46.227],
  'England': [-1.174, 52.356],
  'Wales': [-3.784, 52.130],
  'Mexico': [-102.552, 23.634],
  'Egypt': [30.802, 26.820],
  'Mogadishu': [45.318, 2.046],
  'Porthcawl': [-3.700, 51.479],
  'Muriwai': [174.464, -36.798],
  'Glenorchy': [168.374, -45.033],
  'Koh Lanta': [99.050, 7.636],
  'Solden': [11.006, 46.968],
  'Madarao': [138.215, 36.872],
  'Truckee': [-120.182, 39.327],
  'Peak District': [-1.800, 53.350],
  'Smiths Lake NSW': [152.534, -32.377],
  'Seal Rocks NSW': [152.531, -32.434],
  'Te Anau': [167.719, -45.415],
  'Cwmbran': [-3.022, 51.654],
  'Casnewydd': [-3.000, 51.588],
  'Ontario': [-85.000, 50.000],
  'Bearsted': [0.556, 51.276],
  'Leybourne': [0.418, 51.295],
  'Arnold': [-1.129, 53.004],
  'Rijswijk': [4.322, 52.040],
  'Delft': [4.360, 52.012],
  'Maidstone': [0.521, 51.272],
  'Yeovil': [-2.637, 50.942],
  'Hereford': [-2.716, 52.056],
  'Wigan': [-2.634, 53.545],
  'Retford': [-0.946, 53.322],
  'Thetford': [0.747, 52.415],
  'Faversham': [0.889, 51.315],
  'Reigate': [-0.205, 51.237],
  'Hitchin': [-0.284, 51.946],
  'Whalley': [-2.430, 53.826],
  'East Meon': [-1.072, 51.006],
  'Yapton': [-0.640, 50.832],
  'Earls Colne': [0.680, 51.917],
  'Kent': [0.520, 51.270],
  'Suffolk': [1.160, 52.190],
  'Yorkshire': [-1.560, 53.960],
  'Collingwood': [144.996, -37.804],
  'New Jersey': [-74.406, 40.058],
}

export default function WorldMap({ data }) {
  const [tooltip, setTooltip] = useState(null)
  const [zoom, setZoom] = useState(1)

  // Aggregate beers by city, track unknowns
  const cityMap = {}
  let unknownBeers = 0
  let unknownPosts = 0
  for (const entry of data) {
    const city = entry.city
    const coords = city ? CITY_COORDS[city] : null
    if (!city || !coords) {
      unknownBeers += entry.beers.length
      unknownPosts += 1
      continue
    }
    if (!cityMap[city]) cityMap[city] = { city, coords, beers: 0, posts: 0 }
    cityMap[city].beers += entry.beers.length
    cityMap[city].posts += 1
  }

  const cities = Object.values(cityMap).sort((a, b) => b.beers - a.beers)
  // Place "Unknown" bubble in the South Pacific (empty ocean)
  const unknownCity = { city: '❓ Unknown', coords: [-150, -40], beers: unknownBeers, posts: unknownPosts, unknown: true }
  const maxBeers = cities[0]?.beers ?? 1

  function bubbleRadius(beers) {
    // Divide everything by zoom so all bubbles shrink proportionally as you zoom in
    return Math.max(2, Math.sqrt(beers / maxBeers) * 10) / zoom
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        background: 'rgba(251,191,36,0.04)',
        border: '1px solid rgba(251,191,36,0.12)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <ComposableMap
          projectionConfig={{ scale: 140, center: [10, 10] }}
          style={{ width: '100%', height: 'auto' }}
        >
          <ZoomableGroup maxZoom={40} onMoveEnd={({ zoom: z }) => setZoom(z)}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: '#2a1a06', stroke: '#4a2a0a', strokeWidth: 0.4 / zoom, outline: 'none' },
                      hover: { fill: '#3a2208', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {[...cities, unknownCity].map(({ city, coords, beers, posts, unknown }) => (
              <Marker key={city} coordinates={coords}>
                <circle
                  r={bubbleRadius(beers)}
                  fill={unknown ? 'rgba(120,83,9,0.45)' : 'rgba(251,191,36,0.55)'}
                  stroke={unknown ? '#b45309' : '#fbbf24'}
                  strokeWidth={1 / zoom}
                  strokeDasharray={unknown ? `${3 / zoom} ${2 / zoom}` : undefined}
                  style={{ cursor: 'pointer', transition: 'r 0.3s' }}
                  onMouseEnter={() => setTooltip({ city, beers, posts })}
                  onMouseLeave={() => setTooltip(null)}
                />
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1c0f02',
          border: '1px solid rgba(251,191,36,0.35)',
          borderRadius: '10px',
          padding: '10px 18px',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 100,
        }}>
          <div style={{ color: '#fbbf24', fontWeight: 700 }}>{tooltip.city}</div>
          <div style={{ color: '#92400e', fontSize: '0.8rem' }}>
            {tooltip.beers} beers · {tooltip.posts} posts
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
        {cities.slice(0, 6).map(({ city, beers }) => (
          <div key={city} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#92400e' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'rgba(251,191,36,0.6)', border: '1px solid #fbbf24', flexShrink: 0,
            }} />
            {city} ({beers})
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#78350f' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'rgba(120,83,9,0.45)', border: '1px dashed #b45309', flexShrink: 0,
          }} />
          Unknown ({unknownBeers})
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#4a2a0a', marginTop: '8px' }}>
        Hover bubbles to inspect · scroll/pinch to zoom
      </p>
    </div>
  )
}
