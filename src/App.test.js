import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Google Maps API
global.google = {
  maps: {
    Map: jest.fn(() => ({
      setCenter: jest.fn(),
      setZoom: jest.fn(),
      addListener: jest.fn(),
    })),
    LatLng: jest.fn(),
    Marker: jest.fn(() => ({
      setMap: jest.fn(),
    })),
    InfoWindow: jest.fn(() => ({
      open: jest.fn(),
      close: jest.fn(),
    })),
    visualization: {
      HeatmapLayer: jest.fn(() => ({
        setMap: jest.fn(),
        setData: jest.fn(),
      })),
    },
    Polygon: jest.fn(() => ({
      setMap: jest.fn(),
    })),
    event: {
      addListener: jest.fn(),
    },
  },
};

// Mock the Loader
jest.mock('@googlemaps/js-api-loader', () => ({
  Loader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(global.google),
  })),
}));

test('renders Drishti navigation', () => {
  render(<App />);
  const drishtiElement = screen.getByText(/Drishti/i);
  expect(drishtiElement).toBeInTheDocument();
});

test('renders navigation items', () => {
  render(<App />);
  const dashboardLink = screen.getByText(/Live Dashboard/i);
  const analyticsLink = screen.getByText(/Analytics/i);
  const predictionsLink = screen.getByText(/AI Predictions/i);
  const settingsLink = screen.getByText(/Settings/i);

  expect(dashboardLink).toBeInTheDocument();
  expect(analyticsLink).toBeInTheDocument();
  expect(predictionsLink).toBeInTheDocument();
  expect(settingsLink).toBeInTheDocument();
});

test('app layout structure exists', () => {
  render(<App />);

  const appLayout = document.querySelector('.app-layout');
  const navigation = document.querySelector('.dashboard-navigation');
  const mainContent = document.querySelector('.app-main');

  expect(appLayout).toBeInTheDocument();
  expect(navigation).toBeInTheDocument();
  expect(mainContent).toBeInTheDocument();
});
