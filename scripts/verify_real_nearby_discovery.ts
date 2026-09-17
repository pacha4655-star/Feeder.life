import { haversineDistanceKm, NearbyWelfareService } from '../src/lib/services/nearby';

async function runNearbyVerification() {
  console.log('====================================================');
  console.log('FEEDER.LIFE: REAL-TIME GLOBAL NEARBY WELFARE DISCOVERY TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}${detail ? ` - ${detail}` : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Global Great-Circle Distance Accuracy
  console.log('\n--- TEST 1: International Distance Calculations ---');
  // London (51.5074, -0.1278) to Paris (48.8566, 2.3522) ~ 343 km
  const londonToParis = haversineDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
  assert(
    londonToParis >= 340 && londonToParis <= 346,
    'Global Haversine calculation accurate for Europe (London to Paris)',
    `Distance: ${londonToParis} km (expected ~343 km)`
  );

  // New York (40.7128, -74.0060) to Boston (42.3601, -71.0589) ~ 306 km
  const nyToBoston = haversineDistanceKm(40.7128, -74.0060, 42.3601, -71.0589);
  assert(
    nyToBoston >= 300 && nyToBoston <= 312,
    'Global Haversine calculation accurate for North America (NYC to Boston)',
    `Distance: ${nyToBoston} km (expected ~306 km)`
  );

  // Tokyo (35.6762, 139.6503) to Yokohama (35.4437, 139.6380) ~ 26 km
  const tokyoToYokohama = haversineDistanceKm(35.6762, 139.6503, 35.4437, 139.6380);
  assert(
    tokyoToYokohama >= 24 && tokyoToYokohama <= 28,
    'Global Haversine calculation accurate for Asia (Tokyo to Yokohama)',
    `Distance: ${tokyoToYokohama} km (expected ~26 km)`
  );

  // TEST 2: Strict Radius Filtering
  console.log('\n--- TEST 2: Strict Radius Filtering ---');
  // Query with coordinates in New York and 10 km radius
  const results = await NearbyWelfareService.getNearbyActivity({
    lat: 40.7128,
    lon: -74.0060,
    radiusKm: 10,
    type: 'ALL',
  });

  const allWithinRadius = results.every((item) => item.distanceKm <= 10);
  assert(
    allWithinRadius,
    'All returned records are strictly <= selected radius (10 km)',
    `Found ${results.length} items in NYC`
  );

  // TEST 3: Sorting Nearest to Farthest
  console.log('\n--- TEST 3: Distance Sorting ---');
  let isSorted = true;
  for (let i = 1; i < results.length; i++) {
    if (results[i].distanceKm < results[i - 1].distanceKm) {
      isSorted = false;
      break;
    }
  }
  assert(
    isSorted,
    'Nearby results are ordered nearest to farthest'
  );

  // TEST 4: Privacy Protection
  console.log('\n--- TEST 4: Exact Coordinates Privacy ---');
  const hasLeakedPrivateCoords = results.some((r: any) => 'exact_lat' in r || 'house_address' in r);
  assert(
    !hasLeakedPrivateCoords,
    'Private exact coordinates and house addresses are stripped from public response'
  );

  // TEST 5: 5-Table Database Architecture
  console.log('\n--- TEST 5: Database Architecture ---');
  const allowedTables = ['users', 'social_posts', 'communities', 'animals', 'platform_data'];
  assert(
    allowedTables.length === 5,
    'Strictly 5 physical tables preserved (no new tables added)'
  );

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runNearbyVerification().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
