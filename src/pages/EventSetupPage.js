import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import './EventSetupPage.css';

const EventSetupPage = () => {
  const [step, setStep] = useState(1);
  const [eventName, setEventName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationMethod, setLocationMethod] = useState('manual'); // 'manual' or 'map'

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { user } = useAuth();
  const { createEvent } = useEvent();
  const navigate = useNavigate();

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
        },
        (error) => {
          console.warn('Error getting current location:', error);
          // Default to San Francisco if location access is denied
          setCurrentLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      setCurrentLocation({ lat: 37.7749, lng: -122.4194 });
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (showMap && currentLocation && window.google && mapRef.current) {
      initializeMap();
    }
  }, [showMap, currentLocation]);

  const initializeMap = () => {
    const map = new window.google.maps.Map(mapRef.current, {
      center: selectedLocation || currentLocation,
      zoom: 15,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    googleMapRef.current = map;

    // Add click listener to map
    map.addListener('click', (event) => {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };

      setSelectedLocation(location);

      // Update marker
      if (markerRef.current) {
        markerRef.current.setPosition(location);
      } else {
        markerRef.current = new window.google.maps.Marker({
          position: location,
          map: map,
          title: 'Event Location',
          draggable: true
        });

        markerRef.current.addListener('dragend', (event) => {
          const newLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          setSelectedLocation(newLocation);
          reverseGeocode(newLocation);
        });
      }

      reverseGeocode(location);
    });

    // Add existing marker if location is selected
    if (selectedLocation) {
      markerRef.current = new window.google.maps.Marker({
        position: selectedLocation,
        map: map,
        title: 'Event Location',
        draggable: true
      });
    }
  };

  const reverseGeocode = (location) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: location }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const result = results[0];
        setAddress(result.formatted_address);

        // Try to extract a more user-friendly location name
        const components = result.address_components;
        let name = '';

        // Look for establishment, point_of_interest, or locality
        for (let component of components) {
          if (component.types.includes('establishment') ||
              component.types.includes('point_of_interest')) {
            name = component.long_name;
            break;
          }
          if (component.types.includes('locality') && !name) {
            name = component.long_name;
          }
        }

        if (name && !locationName) {
          setLocationName(name);
        }
      }
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!eventName.trim()) {
        setError('Please enter an event name');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      if (locationMethod === 'manual') {
        if (!locationName.trim() || !address.trim()) {
          setError('Please enter both location name and address');
          return;
        }
        // Geocode the address
        geocodeAddress();
      } else {
        if (!selectedLocation) {
          setError('Please select a location on the map');
          return;
        }
        createEventAndNavigate();
      }
    }
  };

  const geocodeAddress = () => {
    setLoading(true);
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address: address }, (results, status) => {
      setLoading(false);
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        setSelectedLocation({
          lat: location.lat(),
          lng: location.lng()
        });
        createEventAndNavigate();
      } else {
        setError('Could not find the specified address. Please try again or use the map selector.');
      }
    });
  };

  const createEventAndNavigate = () => {
    try {
      const eventData = {
        eventName: eventName.trim(),
        locationName: locationName.trim(),
        address: address.trim(),
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng
      };

      createEvent(eventData);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create event. Please try again.');
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setError('');
    }
  };

  const toggleLocationMethod = (method) => {
    setLocationMethod(method);
    setError('');
    if (method === 'map') {
      setShowMap(true);
    } else {
      setShowMap(false);
    }
  };

  return (
    <div className="event-setup-page">
      <div className="event-setup-container">
        {/* Header */}
        <div className="setup-header">
          <h1>🎯 Event Setup</h1>
          <p>Let's set up your event monitoring</p>
          <div className="user-welcome">
            Welcome, <strong>{user?.name}</strong>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Event Details</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Location</div>
          </div>
        </div>

        {/* Step Content */}
        <div className="setup-content">
          {step === 1 && (
            <div className="step-content">
              <h2>Event Information</h2>
              <p>Enter the basic details about your event</p>

              <div className="form-group">
                <label htmlFor="eventName">Event Name *</label>
                <input
                  type="text"
                  id="eventName"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Summer Music Festival 2024"
                  className="form-input"
                />
              </div>

              <div className="event-preview">
                <h3>Preview</h3>
                <div className="preview-card">
                  <div className="preview-icon">🎪</div>
                  <div className="preview-details">
                    <div className="preview-name">
                      {eventName || 'Your Event Name'}
                    </div>
                    <div className="preview-meta">
                      Created by {user?.name} • {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h2>Event Location</h2>
              <p>Choose how you'd like to set your event location</p>

              {/* Location Method Selection */}
              <div className="location-method-selector">
                <button
                  type="button"
                  className={`method-btn ${locationMethod === 'manual' ? 'active' : ''}`}
                  onClick={() => toggleLocationMethod('manual')}
                >
                  <span className="method-icon">📝</span>
                  <span className="method-label">Enter Manually</span>
                  <span className="method-desc">Type address details</span>
                </button>

                <button
                  type="button"
                  className={`method-btn ${locationMethod === 'map' ? 'active' : ''}`}
                  onClick={() => toggleLocationMethod('map')}
                >
                  <span className="method-icon">🗺️</span>
                  <span className="method-label">Select on Map</span>
                  <span className="method-desc">Click to choose location</span>
                </button>
              </div>

              {/* Manual Entry Form */}
              {locationMethod === 'manual' && (
                <div className="manual-location-form">
                  <div className="form-group">
                    <label htmlFor="locationName">Location Name *</label>
                    <input
                      type="text"
                      id="locationName"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Central Park, Convention Center"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Address *</label>
                    <input
                      type="text"
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Main Street, City, State, ZIP"
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Map Selector */}
              {locationMethod === 'map' && (
                <div className="map-location-selector">
                  <div className="map-instructions">
                    <p>📍 Click on the map to select your event location</p>
                    {selectedLocation && (
                      <div className="selected-location-info">
                        <strong>Selected:</strong> {address || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
                      </div>
                    )}
                  </div>

                  <div className="map-container">
                    <div ref={mapRef} className="google-map"></div>
                  </div>

                  {selectedLocation && (
                    <div className="location-details-form">
                      <div className="form-group">
                        <label htmlFor="mapLocationName">Location Name</label>
                        <input
                          type="text"
                          id="mapLocationName"
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          placeholder="Enter a name for this location"
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Location Preview */}
              {(selectedLocation || (locationName && address)) && (
                <div className="location-preview">
                  <h3>Location Preview</h3>
                  <div className="preview-card">
                    <div className="preview-icon">📍</div>
                    <div className="preview-details">
                      <div className="preview-name">
                        {locationName || 'Selected Location'}
                      </div>
                      <div className="preview-address">
                        {address || `${selectedLocation?.lat.toFixed(4)}, ${selectedLocation?.lng.toFixed(4)}`}
                      </div>
                      {selectedLocation && (
                        <div className="preview-coordinates">
                          Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="setup-navigation">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="nav-button secondary"
            >
              ← Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className={`nav-button primary ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : step === 2 ? (
              'Create Event →'
            ) : (
              'Next →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventSetupPage;
