import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import Login from "./components/Login";

// Mock Firebase modules
jest.mock("./firebase", () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue("mock-token"),
  onMessageListener: jest.fn().mockResolvedValue({}),
  isNotificationSupported: jest.fn().mockReturnValue(true),
  getStoredFCMToken: jest.fn().mockReturnValue("mock-token"),
  saveFCMTokenToBackend: jest.fn().mockResolvedValue(true),
  triggerEmergencyVibration: jest.fn(),
  playEmergencySound: jest.fn(),
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, "vibrate", {
  writable: true,
  value: jest.fn(),
});

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

// Mock service worker
Object.defineProperty(navigator, "serviceWorker", {
  writable: true,
  value: {
    addEventListener: jest.fn(),
    register: jest.fn().mockResolvedValue({}),
  },
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

describe("Emergency Responder PWA", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test("shows login screen when not authenticated", () => {
    render(<App />);

    expect(screen.getByText("Emergency Responder")).toBeInTheDocument();
    expect(
      screen.getByText("Drishti Emergency Response System"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username or User ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  test("renders app header with responder information after login", async () => {
    // Mock successful login
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "responder-user") {
        return JSON.stringify({
          name: "Officer John Smith",
          badge: "ID-4567",
          location: "Zone A - Sector 12",
          status: "Available",
        });
      }
      if (key === "responder-login-time") {
        return Date.now().toString();
      }
      return null;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Officer John Smith")).toBeInTheDocument();
      expect(screen.getByText(/Badge: ID-4567/)).toBeInTheDocument();
      expect(screen.getByText(/Zone A - Sector 12/)).toBeInTheDocument();
    });
  });

  test("displays online status indicator after login", async () => {
    // Mock successful login
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "responder-user") {
        return JSON.stringify({
          name: "Officer John Smith",
          badge: "ID-4567",
          location: "Zone A - Sector 12",
          status: "Available",
        });
      }
      if (key === "responder-login-time") {
        return Date.now().toString();
      }
      return null;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Online")).toBeInTheDocument();
    });
  });

  test("shows notification status information after login", async () => {
    // Mock successful login
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "responder-user") {
        return JSON.stringify({
          name: "Officer John Smith",
          badge: "ID-4567",
          location: "Zone A - Sector 12",
          status: "Available",
        });
      }
      if (key === "responder-login-time") {
        return Date.now().toString();
      }
      return null;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Notification Status")).toBeInTheDocument();
      expect(
        screen.getByText("Push notifications enabled"),
      ).toBeInTheDocument();
      expect(screen.getByText("Vibration alerts enabled")).toBeInTheDocument();
    });
  });

  test("renders test emergency alert button after login", async () => {
    // Mock successful login
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "responder-user") {
        return JSON.stringify({
          name: "Officer John Smith",
          badge: "ID-4567",
          location: "Zone A - Sector 12",
          status: "Available",
        });
      }
      if (key === "responder-login-time") {
        return Date.now().toString();
      }
      return null;
    });

    render(<App />);

    await waitFor(() => {
      const testButton = screen.getByText("🧪 Test Emergency Alert");
      expect(testButton).toBeInTheDocument();
    });
  });

  test("triggers emergency alert when test button is clicked", async () => {
    const {
      triggerEmergencyVibration,
      playEmergencySound,
    } = require("./firebase");

    render(<App />);

    const testButton = screen.getByText("🧪 Test Emergency Alert");
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText("🚨 Emergency in Zone A")).toBeInTheDocument();
    });

    expect(triggerEmergencyVibration).toHaveBeenCalled();
    expect(playEmergencySound).toHaveBeenCalled();
  });

  test("displays emergency alert overlay with correct content", async () => {
    render(<App />);

    const testButton = screen.getByText("🧪 Test Emergency Alert");
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText("🚨 Emergency in Zone A")).toBeInTheDocument();
      expect(
        screen.getByText(/Fire reported at Building 42/),
      ).toBeInTheDocument();
      expect(screen.getByText("🚨 Respond Now")).toBeInTheDocument();
      expect(screen.getByText("✓ Acknowledge")).toBeInTheDocument();
    });
  });

  test("dismisses emergency alert when close button is clicked", async () => {
    render(<App />);

    // Trigger emergency alert
    const testButton = screen.getByText("🧪 Test Emergency Alert");
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText("🚨 Emergency in Zone A")).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByLabelText("Dismiss alert");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByText("🚨 Emergency in Zone A"),
      ).not.toBeInTheDocument();
    });
  });

  test("handles respond button click", async () => {
    // Mock window.alert
    window.alert = jest.fn();

    render(<App />);

    // Trigger emergency alert
    const testButton = screen.getByText("🧪 Test Emergency Alert");
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText("🚨 Respond Now")).toBeInTheDocument();
    });

    // Click respond button
    const respondButton = screen.getByText("🚨 Respond Now");
    fireEvent.click(respondButton);

    expect(window.alert).toHaveBeenCalledWith(
      "Emergency response initiated. Dispatching...",
    );
  });

  describe("Login Component", () => {
    test("renders login form with all fields", () => {
      const mockOnLogin = jest.fn();
      render(<Login onLogin={mockOnLogin} isLoading={false} />);

      expect(screen.getByLabelText("Username or User ID")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Use Demo Login (John Smith)"),
      ).toBeInTheDocument();
    });

    test("validates required fields", async () => {
      const mockOnLogin = jest.fn();
      render(<Login onLogin={mockOnLogin} isLoading={false} />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Username or User ID is required"),
        ).toBeInTheDocument();
        expect(screen.getByText("Password is required")).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    test("validates password length", async () => {
      const mockOnLogin = jest.fn();
      render(<Login onLogin={mockOnLogin} isLoading={false} />);

      const usernameInput = screen.getByLabelText("Username or User ID");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(usernameInput, { target: { value: "john.smith" } });
      fireEvent.change(passwordInput, { target: { value: "123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Password must be at least 6 characters"),
        ).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    test("successful login with valid credentials", async () => {
      const mockOnLogin = jest.fn();
      render(<Login onLogin={mockOnLogin} isLoading={false} />);

      const usernameInput = screen.getByLabelText("Username or User ID");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(usernameInput, { target: { value: "john.smith" } });
      fireEvent.change(passwordInput, { target: { value: "responder123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(
          expect.objectContaining({
            username: "john.smith",
            name: "Officer John Smith",
            badge: "ID-4567",
            location: "Zone A - Sector 12",
            status: "Available",
          }),
        );
      });
    });

    test("shows error for invalid credentials", async () => {
      const mockOnLogin = jest.fn();
      render(<Login onLogin={mockOnLogin} isLoading={false} />);

      const usernameInput = screen.getByLabelText("Username or User ID");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(usernameInput, { target: { value: "invalid.user" } });
      fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Invalid username or password. Please try again."),
        ).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    test("demo login button works", () => {
      const mockOnLogin = jest.fn();
      render(<Login onLogin={mockOnLogin} isLoading={false} />);

      const demoButton = screen.getByText("Use Demo Login (John Smith)");
      fireEvent.click(demoButton);

      const usernameInput = screen.getByLabelText("Username or User ID");
      const passwordInput = screen.getByLabelText("Password");

      expect(usernameInput.value).toBe("john.smith");
      expect(passwordInput.value).toBe("responder123");
    });

    test("password visibility toggle works", () => {
      const mockOnLogin = jest.fn();
      render(<Login onLogin={mockOnLogin} isLoading={false} />);

      const passwordInput = screen.getByLabelText("Password");
      const toggleButton = screen.getByLabelText("Show password");

      expect(passwordInput.type).toBe("password");

      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe("text");

      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe("password");
    });
  });

  test("handles acknowledge button click", async () => {
    render(<App />);

    // Trigger emergency alert
    const testButton = screen.getByText("🧪 Test Emergency Alert");
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText("✓ Acknowledge")).toBeInTheDocument();
    });

    // Click acknowledge button
    const acknowledgeButton = screen.getByText("✓ Acknowledge");
    fireEvent.click(acknowledgeButton);

    await waitFor(() => {
      expect(
        screen.queryByText("🚨 Emergency in Zone A"),
      ).not.toBeInTheDocument();
    });
  });

  test("displays app information section", () => {
    render(<App />);

    expect(screen.getByText("App Information")).toBeInTheDocument();
    expect(screen.getByText(/Version:/)).toBeInTheDocument();
    expect(screen.getByText(/PWA Status:/)).toBeInTheDocument();
    expect(screen.getByText(/Service Worker:/)).toBeInTheDocument();
  });

  test("shows install button when app is installable", () => {
    // Mock beforeinstallprompt event
    const mockEvent = {
      preventDefault: jest.fn(),
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    };

    render(<App />);

    // Simulate beforeinstallprompt event
    const event = new CustomEvent("beforeinstallprompt");
    Object.assign(event, mockEvent);
    window.dispatchEvent(event);

    // Install button should appear
    expect(screen.getByText("📱 Install App")).toBeInTheDocument();
  });

  test("handles offline mode", () => {
    render(<App />);

    // Simulate going offline
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });

    const event = new Event("offline");
    window.dispatchEvent(event);

    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  test("handles online mode", () => {
    // Start offline
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });

    render(<App />);

    // Go online
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });

    const event = new Event("online");
    window.dispatchEvent(event);

    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  test("renders footer with correct information", () => {
    render(<App />);

    expect(
      screen.getByText(/© 2024 Drishti Emergency Response System/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Emergency Responder PWA v1.0.0/),
    ).toBeInTheDocument();
  });
});
