// Mock data for the dashboard
export const mockEventCenter = {
  lat: 37.7749,
  lng: -122.4194,
  name: "Event Center",
  address: "San Francisco, CA"
};

// Mock crowd density data points
export const mockCrowdData = [
  // High density areas
  { lat: 37.7749, lng: -122.4194, density: 10 }, // Event center
  { lat: 37.7750, lng: -122.4195, density: 9 },
  { lat: 37.7748, lng: -122.4193, density: 8 },
  { lat: 37.7751, lng: -122.4196, density: 7 },
  
  // Medium density areas
  { lat: 37.7755, lng: -122.4200, density: 6 },
  { lat: 37.7745, lng: -122.4190, density: 5 },
  { lat: 37.7760, lng: -122.4210, density: 4 },
  { lat: 37.7740, lng: -122.4180, density: 4 },
  
  // Lower density areas
  { lat: 37.7765, lng: -122.4220, density: 3 },
  { lat: 37.7735, lng: -122.4170, density: 2 },
  { lat: 37.7770, lng: -122.4230, density: 2 },
  { lat: 37.7730, lng: -122.4160, density: 1 },
  
  // Scattered points
  { lat: 37.7775, lng: -122.4240, density: 1 },
  { lat: 37.7725, lng: -122.4150, density: 1 },
  { lat: 37.7780, lng: -122.4250, density: 2 },
  { lat: 37.7720, lng: -122.4140, density: 2 }
];

// Mock responder data
export const mockResponderData = [
  {
    id: 'resp_001',
    name: 'Unit Alpha-1',
    type: 'police',
    lat: 37.7752,
    lng: -122.4198,
    status: 'Active',
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'resp_002',
    name: 'Medic Team 1',
    type: 'medical',
    lat: 37.7746,
    lng: -122.4188,
    status: 'Responding',
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'resp_003',
    name: 'Fire Unit 7',
    type: 'fire',
    lat: 37.7758,
    lng: -122.4205,
    status: 'Standby',
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'resp_004',
    name: 'Security Team A',
    type: 'security',
    lat: 37.7742,
    lng: -122.4185,
    status: 'Patrol',
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'resp_005',
    name: 'Unit Bravo-2',
    type: 'police',
    lat: 37.7765,
    lng: -122.4215,
    status: 'Active',
    lastUpdate: new Date().toISOString()
  }
];

// Mock zone data
export const mockZones = [
  {
    id: 'zone_001',
    name: 'Main Stage Area',
    lat: 37.7749,
    lng: -122.4194,
    radius: 150,
    capacity: 5000,
    currentCount: 4200,
    density: 'High',
    color: '#FF4444',
    alertLevel: 'Warning'
  },
  {
    id: 'zone_002',
    name: 'Food Court',
    lat: 37.7755,
    lng: -122.4200,
    radius: 100,
    capacity: 2000,
    currentCount: 1200,
    density: 'Medium',
    color: '#FFAA44',
    alertLevel: 'Normal'
  },
  {
    id: 'zone_003',
    name: 'Entrance Gate A',
    lat: 37.7745,
    lng: -122.4190,
    radius: 80,
    capacity: 1500,
    currentCount: 800,
    density: 'Medium',
    color: '#FFAA44',
    alertLevel: 'Normal'
  },
  {
    id: 'zone_004',
    name: 'Parking Area',
    lat: 37.7760,
    lng: -122.4210,
    radius: 200,
    capacity: 3000,
    currentCount: 900,
    density: 'Low',
    color: '#44AA44',
    alertLevel: 'Normal'
  },
  {
    id: 'zone_005',
    name: 'Emergency Exit B',
    lat: 37.7740,
    lng: -122.4180,
    radius: 60,
    capacity: 800,
    currentCount: 650,
    density: 'High',
    color: '#FF4444',
    alertLevel: 'Critical'
  }
];

// Mock alert data
export const mockAlerts = [
  {
    id: 'alert_001',
    zone: 'Main Stage Area',
    type: 'Crowd Density',
    severity: 'High',
    message: 'Crowd density approaching maximum capacity',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    status: 'Active'
  },
  {
    id: 'alert_002',
    zone: 'Emergency Exit B',
    type: 'Blocked Exit',
    severity: 'Critical',
    message: 'Emergency exit partially blocked by crowd',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    status: 'Active'
  },
  {
    id: 'alert_003',
    zone: 'Food Court',
    type: 'Medical',
    severity: 'Medium',
    message: 'Medical assistance requested',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    status: 'Resolved'
  }
];

// Function to generate random crowd data updates
export const generateRandomCrowdUpdate = () => {
  return mockCrowdData.map(point => ({
    ...point,
    density: Math.max(1, point.density + (Math.random() - 0.5) * 2)
  }));
};

// Function to generate random responder updates
export const generateRandomResponderUpdate = () => {
  return mockResponderData.map(responder => ({
    ...responder,
    lat: responder.lat + (Math.random() - 0.5) * 0.001,
    lng: responder.lng + (Math.random() - 0.5) * 0.001,
    lastUpdate: new Date().toISOString()
  }));
};

// Function to simulate zone capacity changes
export const generateZoneUpdate = () => {
  return mockZones.map(zone => {
    const change = Math.floor((Math.random() - 0.5) * 200);
    const newCount = Math.max(0, Math.min(zone.capacity, zone.currentCount + change));
    const densityRatio = newCount / zone.capacity;
    
    let density, color, alertLevel;
    if (densityRatio > 0.8) {
      density = 'High';
      color = '#FF4444';
      alertLevel = densityRatio > 0.9 ? 'Critical' : 'Warning';
    } else if (densityRatio > 0.5) {
      density = 'Medium';
      color = '#FFAA44';
      alertLevel = 'Normal';
    } else {
      density = 'Low';
      color = '#44AA44';
      alertLevel = 'Normal';
    }
    
    return {
      ...zone,
      currentCount: newCount,
      density,
      color,
      alertLevel
    };
  });
};

// Firestore collection structure for reference
export const firestoreCollections = {
  crowdData: 'CrowdDensity',
  responders: 'Responders',
  zones: 'EventZones',
  alerts: 'SecurityAlerts',
  events: 'Events'
};

// Sample Firestore document structures
export const sampleFirestoreDocuments = {
  crowdDensity: {
    lat: 37.7749,
    lng: -122.4194,
    density: 8,
    timestamp: new Date().toISOString(),
    eventId: 'event_001',
    zoneId: 'zone_001'
  },
  responder: {
    name: 'Unit Alpha-1',
    type: 'police',
    lat: 37.7752,
    lng: -122.4198,
    status: 'Active',
    lastUpdate: new Date().toISOString(),
    eventId: 'event_001'
  },
  zone: {
    name: 'Main Stage Area',
    lat: 37.7749,
    lng: -122.4194,
    radius: 150,
    capacity: 5000,
    currentCount: 4200,
    density: 'High',
    color: '#FF4444',
    alertLevel: 'Warning',
    eventId: 'event_001'
  },
  alert: {
    zone: 'Main Stage Area',
    type: 'Crowd Density',
    severity: 'High',
    message: 'Crowd density approaching maximum capacity',
    timestamp: new Date().toISOString(),
    status: 'Active',
    eventId: 'event_001'
  }
};
