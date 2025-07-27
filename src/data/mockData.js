// Mock data for the dashboard
export const mockEventCenter = {
  lat: 37.7749,
  lng: -122.4194,
  name: "Event Center",
  address: "San Francisco, CA",
};

// Utility function to generate crowd data around a specific location
export const generateCrowdDataAroundLocation = (centerLat, centerLng) => {
  const crowdData = [];

  // High density center point
  crowdData.push({
    lat: centerLat,
    lng: centerLng,
    density: 10,
    personCount: 50,
  });

  // High density points around center (0.0001 degree offset ≈ 11 meters)
  const highDensityOffsets = [
    [0.0001, 0.0001],
    [-0.0001, 0.0001],
    [0.0001, -0.0001],
    [-0.0001, -0.0001],
  ];
  highDensityOffsets.forEach(([latOffset, lngOffset], index) => {
    crowdData.push({
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      density: 9 - index,
      personCount: 45 - index * 5,
    });
  });

  // Medium density points (0.0005 degree offset ≈ 55 meters)
  const mediumDensityOffsets = [
    [0.0005, 0.0005],
    [-0.0005, 0.0005],
    [0.0005, -0.0005],
    [-0.0005, -0.0005],
    [0.0005, 0],
    [-0.0005, 0],
    [0, 0.0005],
    [0, -0.0005],
  ];
  mediumDensityOffsets.forEach(([latOffset, lngOffset], index) => {
    crowdData.push({
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      density: 6 - Math.floor(index / 2),
      personCount: 30 - index * 2,
    });
  });

  // Lower density points (0.001 degree offset ≈ 111 meters)
  const lowDensityOffsets = [
    [0.001, 0.001],
    [-0.001, 0.001],
    [0.001, -0.001],
    [-0.001, -0.001],
    [0.0015, 0],
    [-0.0015, 0],
    [0, 0.0015],
    [0, -0.0015],
  ];
  lowDensityOffsets.forEach(([latOffset, lngOffset], index) => {
    crowdData.push({
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      density: 3 - Math.floor(index / 4),
      personCount: 15 - index,
    });
  });

  return crowdData;
};

// Hardcoded crowd data for Bengaluru, Karnataka
export const generateBengaluruCrowdData = () => {
  // Bengaluru coordinates: 12.9716° N, 77.5946° E
  const bengaluruCenter = { lat: 12.9716, lng: 77.5946 };

  const crowdData = [];

  // High density areas around major landmarks in Bengaluru

  // MG Road area (commercial hub)
  crowdData.push(
    { lat: 12.9758, lng: 77.6087, density: 9, personCount: 45 },
    { lat: 12.976, lng: 77.609, density: 8, personCount: 40 },
    { lat: 12.9756, lng: 77.6085, density: 8, personCount: 38 },
  );

  // Brigade Road (shopping area)
  crowdData.push(
    { lat: 12.974, lng: 77.6095, density: 9, personCount: 42 },
    { lat: 12.9742, lng: 77.6098, density: 7, personCount: 35 },
    { lat: 12.9738, lng: 77.6092, density: 8, personCount: 39 },
  );

  // Cubbon Park area
  crowdData.push(
    { lat: 12.9763, lng: 77.5905, density: 6, personCount: 30 },
    { lat: 12.9765, lng: 77.5908, density: 5, personCount: 25 },
    { lat: 12.976, lng: 77.5902, density: 6, personCount: 28 },
  );

  // Vidhana Soudha area (government district)
  crowdData.push(
    { lat: 12.9794, lng: 77.5912, density: 7, personCount: 35 },
    { lat: 12.9796, lng: 77.5915, density: 6, personCount: 30 },
    { lat: 12.9792, lng: 77.5909, density: 6, personCount: 32 },
  );

  // Commercial Street
  crowdData.push(
    { lat: 12.9833, lng: 77.6092, density: 8, personCount: 40 },
    { lat: 12.9835, lng: 77.6095, density: 7, personCount: 35 },
    { lat: 12.9831, lng: 77.6089, density: 7, personCount: 33 },
  );

  // UB City Mall area
  crowdData.push(
    { lat: 12.9718, lng: 77.6142, density: 8, personCount: 38 },
    { lat: 12.972, lng: 77.6145, density: 7, personCount: 34 },
    { lat: 12.9716, lng: 77.6139, density: 6, personCount: 30 },
  );

  // Chinnaswamy Stadium area
  crowdData.push(
    { lat: 12.9791, lng: 77.5999, density: 9, personCount: 45 },
    { lat: 12.9793, lng: 77.6002, density: 8, personCount: 40 },
    { lat: 12.9789, lng: 77.5996, density: 7, personCount: 35 },
  );

  // Bangalore Palace area
  crowdData.push(
    { lat: 12.998, lng: 77.5926, density: 5, personCount: 25 },
    { lat: 12.9982, lng: 77.5929, density: 4, personCount: 20 },
    { lat: 12.9978, lng: 77.5923, density: 5, personCount: 23 },
  );

  // Electronic City (IT hub)
  crowdData.push(
    { lat: 12.8458, lng: 77.6603, density: 7, personCount: 35 },
    { lat: 12.846, lng: 77.6606, density: 6, personCount: 30 },
    { lat: 12.8456, lng: 77.66, density: 6, personCount: 28 },
  );

  // Koramangala (trendy area)
  crowdData.push(
    { lat: 12.9279, lng: 77.6271, density: 8, personCount: 40 },
    { lat: 12.9281, lng: 77.6274, density: 7, personCount: 35 },
    { lat: 12.9277, lng: 77.6268, density: 7, personCount: 33 },
  );

  // Medium density residential areas
  const residentialAreas = [
    { lat: 12.9352, lng: 77.6245 }, // BTM Layout
    { lat: 12.9165, lng: 77.6101 }, // Jayanagar
    { lat: 13.0067, lng: 77.5818 }, // Rajajinagar
    { lat: 12.9698, lng: 77.7499 }, // Whitefield
    { lat: 12.9237, lng: 77.4977 }, // Vijayanagar
    { lat: 13.0358, lng: 77.597 }, // Yelahanka
  ];

  residentialAreas.forEach((area, index) => {
    crowdData.push({
      lat: area.lat,
      lng: area.lng,
      density: 4 + (index % 3),
      personCount: 20 + (index % 3) * 5,
    });
  });

  // Low density suburban areas
  const suburbanAreas = [
    { lat: 12.8944, lng: 77.612 }, // Banashankari
    { lat: 13.0797, lng: 77.5912 }, // Banaswadi
    { lat: 12.8456, lng: 77.5982 }, // Begur
    { lat: 13.1073, lng: 77.585 }, // Devanahalli
  ];

  suburbanAreas.forEach((area, index) => {
    crowdData.push({
      lat: area.lat,
      lng: area.lng,
      density: 2 + (index % 2),
      personCount: 10 + (index % 2) * 5,
    });
  });

  return crowdData;
};

// Bengaluru-specific zone generation function
export const generateBengaluruZones = () => {
  return [
    {
      id: "zone_001",
      name: "MG Road Commercial Hub",
      lat: 12.9758,
      lng: 77.6087,
      radius: 200,
      capacity: 8000,
      currentCount: 6500,
      density: "High",
      color: "#FF4444",
      alertLevel: "Warning",
    },
    {
      id: "zone_002",
      name: "Brigade Road Shopping District",
      lat: 12.974,
      lng: 77.6095,
      radius: 180,
      capacity: 6000,
      currentCount: 4200,
      density: "High",
      color: "#FF4444",
      alertLevel: "Warning",
    },
    {
      id: "zone_003",
      name: "Cubbon Park Area",
      lat: 12.9763,
      lng: 77.5905,
      radius: 300,
      capacity: 5000,
      currentCount: 2800,
      density: "Medium",
      color: "#FFAA44",
      alertLevel: "Normal",
    },
    {
      id: "zone_004",
      name: "Vidhana Soudha Government District",
      lat: 12.9794,
      lng: 77.5912,
      radius: 150,
      capacity: 3000,
      currentCount: 2100,
      density: "Medium",
      color: "#FFAA44",
      alertLevel: "Normal",
    },
    {
      id: "zone_005",
      name: "Commercial Street Market",
      lat: 12.9833,
      lng: 77.6092,
      radius: 120,
      capacity: 4000,
      currentCount: 3200,
      density: "High",
      color: "#FF4444",
      alertLevel: "Critical",
    },
    {
      id: "zone_006",
      name: "UB City Mall Complex",
      lat: 12.9718,
      lng: 77.6142,
      radius: 100,
      capacity: 3500,
      currentCount: 2650,
      density: "Medium",
      color: "#FFAA44",
      alertLevel: "Normal",
    },
    {
      id: "zone_007",
      name: "Chinnaswamy Stadium",
      lat: 12.9791,
      lng: 77.5999,
      radius: 250,
      capacity: 10000,
      currentCount: 8500,
      density: "High",
      color: "#FF4444",
      alertLevel: "Critical",
    },
    {
      id: "zone_008",
      name: "Koramangala Social Hub",
      lat: 12.9279,
      lng: 77.6271,
      radius: 150,
      capacity: 4500,
      currentCount: 3600,
      density: "High",
      color: "#FF4444",
      alertLevel: "Warning",
    },
  ];
};

// Default mock crowd density data points (for fallback)
export const mockCrowdData = generateCrowdDataAroundLocation(
  37.7749,
  -122.4194,
);

// Bengaluru-specific responder generation function
export const generateBengaluruResponders = () => {
  return [
    {
      id: "resp_001",
      name: "Cubbon Park Police Station",
      type: "police",
      lat: 12.9748,
      lng: 77.5921,
      status: "Active",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2286-4555",
    },
    {
      id: "resp_002",
      name: "Victoria Hospital Ambulance",
      type: "medical",
      lat: 12.9695,
      lng: 77.5884,
      status: "Responding",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2670-1150",
    },
    {
      id: "resp_003",
      name: "MG Road Fire Station",
      type: "fire",
      lat: 12.9758,
      lng: 77.6087,
      status: "Standby",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2558-0101",
    },
    {
      id: "resp_004",
      name: "Brigade Road Security Team",
      type: "security",
      lat: 12.974,
      lng: 77.6095,
      status: "Patrol",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2559-9999",
    },
    {
      id: "resp_005",
      name: "Commercial Street Police",
      type: "police",
      lat: 12.9833,
      lng: 77.6092,
      status: "Active",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2286-4666",
    },
    {
      id: "resp_006",
      name: "Malleshwaram Fire Station",
      type: "fire",
      lat: 12.9954,
      lng: 77.5748,
      status: "Standby",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2334-0101",
    },
    {
      id: "resp_007",
      name: "Koramangala Medical Team",
      type: "medical",
      lat: 12.9279,
      lng: 77.6271,
      status: "Active",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2553-9999",
    },
    {
      id: "resp_008",
      name: "Electronic City Security",
      type: "security",
      lat: 12.8458,
      lng: 77.6603,
      status: "Patrol",
      lastUpdate: new Date().toISOString(),
      contact: "+91-80-2782-5555",
    },
  ];
};

// Utility function to generate responder data around a specific location
export const generateRespondersAroundLocation = (centerLat, centerLng) => {
  const responderTypes = ["police", "medical", "fire", "security"];
  const statuses = ["Active", "Responding", "Standby", "Patrol"];
  const names = [
    "Unit Alpha-1",
    "Medic Team 1",
    "Fire Unit 7",
    "Security Team A",
    "Unit Bravo-2",
  ];

  return [
    {
      id: "resp_001",
      name: names[0],
      type: "police",
      lat: centerLat + 0.0003,
      lng: centerLng + 0.0004,
      status: "Active",
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "resp_002",
      name: names[1],
      type: "medical",
      lat: centerLat - 0.0003,
      lng: centerLng - 0.0006,
      status: "Responding",
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "resp_003",
      name: names[2],
      type: "fire",
      lat: centerLat + 0.0009,
      lng: centerLng + 0.0011,
      status: "Standby",
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "resp_004",
      name: names[3],
      type: "security",
      lat: centerLat - 0.0007,
      lng: centerLng - 0.0009,
      status: "Patrol",
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "resp_005",
      name: names[4],
      type: "police",
      lat: centerLat + 0.0016,
      lng: centerLng + 0.0021,
      status: "Active",
      lastUpdate: new Date().toISOString(),
    },
  ];
};

// Default mock responder data (for fallback)
export const mockResponderData = generateRespondersAroundLocation(
  37.7749,
  -122.4194,
);

// Utility function to generate zones around a specific location
export const generateZonesAroundLocation = (centerLat, centerLng) => {
  return [
    {
      id: "zone_001",
      name: "Main Stage Area",
      lat: centerLat,
      lng: centerLng,
      radius: 150,
      capacity: 5000,
      currentCount: 4200,
      density: "High",
      color: "#FF4444",
      alertLevel: "Warning",
    },
    {
      id: "zone_002",
      name: "Food Court",
      lat: centerLat + 0.0006,
      lng: centerLng + 0.0006,
      radius: 100,
      capacity: 2000,
      currentCount: 1200,
      density: "Medium",
      color: "#FFAA44",
      alertLevel: "Normal",
    },
    {
      id: "zone_003",
      name: "Entrance Gate A",
      lat: centerLat - 0.0004,
      lng: centerLng - 0.0004,
      radius: 80,
      capacity: 1500,
      currentCount: 800,
      density: "Medium",
      color: "#FFAA44",
      alertLevel: "Normal",
    },
    {
      id: "zone_004",
      name: "Parking Area",
      lat: centerLat + 0.0011,
      lng: centerLng + 0.0016,
      radius: 200,
      capacity: 3000,
      currentCount: 900,
      density: "Low",
      color: "#44AA44",
      alertLevel: "Normal",
    },
    {
      id: "zone_005",
      name: "Emergency Exit B",
      lat: centerLat - 0.0009,
      lng: centerLng - 0.0014,
      radius: 60,
      capacity: 800,
      currentCount: 650,
      density: "High",
      color: "#FF4444",
      alertLevel: "Critical",
    },
  ];
};

// Default mock zone data (for fallback)
export const mockZones = generateZonesAroundLocation(37.7749, -122.4194);

// Mock alert data
export const mockAlerts = [
  {
    id: "alert_001",
    zone: "Main Stage Area",
    type: "Crowd Density",
    severity: "High",
    message: "Crowd density approaching maximum capacity",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    status: "Active",
  },
  {
    id: "alert_002",
    zone: "Emergency Exit B",
    type: "Blocked Exit",
    severity: "Critical",
    message: "Emergency exit partially blocked by crowd",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    status: "Active",
  },
  {
    id: "alert_003",
    zone: "Food Court",
    type: "Medical",
    severity: "Medium",
    message: "Medical assistance requested",
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    status: "Resolved",
  },
];

// Function to generate random crowd data updates
export const generateRandomCrowdUpdate = () => {
  return mockCrowdData.map((point) => ({
    ...point,
    density: Math.max(1, point.density + (Math.random() - 0.5) * 2),
  }));
};

// Function to generate random responder updates
export const generateRandomResponderUpdate = () => {
  return mockResponderData.map((responder) => ({
    ...responder,
    lat: responder.lat + (Math.random() - 0.5) * 0.001,
    lng: responder.lng + (Math.random() - 0.5) * 0.001,
    lastUpdate: new Date().toISOString(),
  }));
};

// Function to simulate zone capacity changes
export const generateZoneUpdate = () => {
  return mockZones.map((zone) => {
    const change = Math.floor((Math.random() - 0.5) * 200);
    const newCount = Math.max(
      0,
      Math.min(zone.capacity, zone.currentCount + change),
    );
    const densityRatio = newCount / zone.capacity;

    let density, color, alertLevel;
    if (densityRatio > 0.8) {
      density = "High";
      color = "#FF4444";
      alertLevel = densityRatio > 0.9 ? "Critical" : "Warning";
    } else if (densityRatio > 0.5) {
      density = "Medium";
      color = "#FFAA44";
      alertLevel = "Normal";
    } else {
      density = "Low";
      color = "#44AA44";
      alertLevel = "Normal";
    }

    return {
      ...zone,
      currentCount: newCount,
      density,
      color,
      alertLevel,
    };
  });
};

// Firestore collection structure for reference
export const firestoreCollections = {
  crowdData: "CrowdDensity",
  responders: "Responders",
  zones: "EventZones",
  alerts: "SecurityAlerts",
  events: "Events",
};

// Sample Firestore document structures
export const sampleFirestoreDocuments = {
  crowdDensity: {
    lat: 37.7749,
    lng: -122.4194,
    density: 8,
    timestamp: new Date().toISOString(),
    eventId: "event_001",
    zoneId: "zone_001",
  },
  responder: {
    name: "Unit Alpha-1",
    type: "police",
    lat: 37.7752,
    lng: -122.4198,
    status: "Active",
    lastUpdate: new Date().toISOString(),
    eventId: "event_001",
  },
  zone: {
    name: "Main Stage Area",
    lat: 37.7749,
    lng: -122.4194,
    radius: 150,
    capacity: 5000,
    currentCount: 4200,
    density: "High",
    color: "#FF4444",
    alertLevel: "Warning",
    eventId: "event_001",
  },
  alert: {
    zone: "Main Stage Area",
    type: "Crowd Density",
    severity: "High",
    message: "Crowd density approaching maximum capacity",
    timestamp: new Date().toISOString(),
    status: "Active",
    eventId: "event_001",
  },
};
