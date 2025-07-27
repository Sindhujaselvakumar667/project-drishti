import React, { createContext, useContext, useState, useEffect } from "react";

const EventContext = createContext();

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
};

export const EventProvider = ({ children }) => {
  const [eventData, setEventData] = useState(null);
  const [isEventSetup, setIsEventSetup] = useState(false);

  // Check for existing event data on app load
  useEffect(() => {
    const savedEvent = localStorage.getItem("drishti_event");
    if (savedEvent) {
      try {
        const event = JSON.parse(savedEvent);
        setEventData(event);
        setIsEventSetup(true);
      } catch (error) {
        console.error("Error parsing saved event data:", error);
        localStorage.removeItem("drishti_event");
      }
    }
  }, []);

  // Function to resolve location name from coordinates using reverse geocoding
  const resolveLocationName = async (coordinates) => {
    if (!window.google || !coordinates) return null;

    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: coordinates }, (results, status) => {
        if (status === "OK" && results[0]) {
          const result = results[0];

          // Try to extract a user-friendly location name
          const components = result.address_components;
          let name = "";

          // Look for establishment, point_of_interest, or locality
          for (let component of components) {
            if (
              component.types.includes("establishment") ||
              component.types.includes("point_of_interest")
            ) {
              name = component.long_name;
              break;
            }
            if (component.types.includes("locality") && !name) {
              name = component.long_name;
            }
            if (
              component.types.includes("administrative_area_level_1") &&
              !name
            ) {
              name = component.long_name;
            }
          }

          resolve({
            name: name || "Unknown Location",
            address: result.formatted_address,
          });
        } else {
          resolve(null);
        }
      });
    });
  };

  // Function to update event with resolved location info
  const updateEventLocationInfo = async () => {
    if (
      !eventData?.location?.coordinates ||
      (eventData.location.name && eventData.location.name.trim())
    ) {
      return; // Already has name or no coordinates
    }

    try {
      const locationInfo = await resolveLocationName(
        eventData.location.coordinates,
      );
      if (locationInfo) {
        const updatedEvent = {
          ...eventData,
          location: {
            ...eventData.location,
            name: locationInfo.name,
            address: locationInfo.address,
          },
          updatedAt: new Date().toISOString(),
        };

        setEventData(updatedEvent);
        localStorage.setItem("drishti_event", JSON.stringify(updatedEvent));
      }
    } catch (error) {
      console.warn("Could not resolve location name:", error);
    }
  };

  // Auto-resolve location names when Google Maps is available
  useEffect(() => {
    if (
      eventData?.location?.coordinates &&
      window.google &&
      (!eventData.location.name || !eventData.location.name.trim())
    ) {
      // Wait a bit for Google Maps to fully load
      const timer = setTimeout(() => {
        updateEventLocationInfo();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [eventData]);

  const createEvent = (eventInfo) => {
    const event = {
      id: `event_${Date.now()}`,
      name: eventInfo.eventName,
      location: {
        name: eventInfo.locationName,
        address: eventInfo.address,
        coordinates: {
          lat: eventInfo.latitude,
          lng: eventInfo.longitude,
        },
      },
      createdAt: new Date().toISOString(),
      status: "active",
    };

    setEventData(event);
    setIsEventSetup(true);
    localStorage.setItem("drishti_event", JSON.stringify(event));

    return event;
  };

  const updateEvent = (updates) => {
    if (!eventData) return null;

    const updatedEvent = {
      ...eventData,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setEventData(updatedEvent);
    localStorage.setItem("drishti_event", JSON.stringify(updatedEvent));

    return updatedEvent;
  };

  const clearEvent = () => {
    setEventData(null);
    setIsEventSetup(false);
    localStorage.removeItem("drishti_event");
  };

  const getEventLocation = () => {
    return eventData?.location || null;
  };

  const getEventName = () => {
    return eventData?.name || "Unnamed Event";
  };

  const getEventCenter = () => {
    const location = eventData?.location;
    if (!location) return "Location not set";

    // Prioritize location name, then address, then formatted coordinates
    if (location.name && location.name.trim()) {
      return location.name;
    }

    if (location.address && location.address.trim()) {
      return location.address;
    }

    // If we have coordinates, always show them formatted nicely
    if (location.coordinates) {
      const { lat, lng } = location.coordinates;
      const latDir = lat >= 0 ? "N" : "S";
      const lngDir = lng >= 0 ? "E" : "W";
      const formattedCoords = `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;

      // If Google Maps is available, try to resolve location name asynchronously
      if (window.google && (!location.name || !location.name.trim())) {
        updateEventLocationInfo();
      }

      return formattedCoords;
    }

    return "Location coordinates not available";
  };

  const value = {
    eventData,
    isEventSetup,
    createEvent,
    updateEvent,
    clearEvent,
    getEventLocation,
    getEventName,
    getEventCenter,
    updateEventLocationInfo,
  };

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
};

export default EventContext;
