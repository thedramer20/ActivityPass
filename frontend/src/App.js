import './App.css';
import { useEffect, useState } from 'react';

function App() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch activities list from backend (proxy in dev)
    fetch('/api/activities/')
      .then(r => r.json())
      .then(data => {
        setActivities(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>ActivityPass</h1>
        <p>AI-assisted student activity management platform for ZJNU.</p>
      </header>
      <main style={{padding: '1rem', maxWidth: 900, margin: '0 auto'}}>
        {loading && <p>Loading activities...</p>}
        {error && <p style={{color: 'salmon'}}>Error: {error}</p>}
        {!loading && !error && (
          <ul style={{listStyle: 'none', padding: 0}}>
            {activities.map(a => (
              <li key={a.id} style={{border: '1px solid #333', marginBottom: '0.75rem', padding: '0.75rem', borderRadius: 6}}>
                <h3 style={{margin: '0 0 0.25rem'}}>{a.title}</h3>
                <p style={{margin: '0 0 0.5rem', fontSize: '0.9rem'}}>{a.description || 'No description yet.'}</p>
                <small>Starts: {a.start_datetime} | Ends: {a.end_datetime}</small>
              </li>
            ))}
            {activities.length === 0 && <li>No activities found.</li>}
          </ul>
        )}
      </main>
    </div>
  );
}

export default App;
