import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

function App() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const snapshot = await getDocs(collection(db, "SecurityAlerts"));
      setAlerts(snapshot.docs.map(doc => doc.data()));
    };
    fetchAlerts();
  }, []);

  const writeTestAlert = async () => {
    await addDoc(collection(db, "SecurityAlerts"), {
      zone: "Test Zone",
      type: "Panic",
      summary: "This is a test alert.",
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div>
      <h1>Project Drishti Alerts</h1>
      <button onClick={writeTestAlert}>Add Test Alert</button>
      <ul>
        {alerts.map((alert, idx) => (
          <li key={idx}>{alert.zone}: {alert.type}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
