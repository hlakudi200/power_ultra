import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const ContactMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      // Johannesburg coordinates
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [28.0473, -26.2041], // Johannesburg
        zoom: 12,
      });

      // Add marker for gym location
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([28.0473, -26.2041])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Power Ultra Gym</strong><br>Johannesburg, South Africa'))
        .addTo(map.current);

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      setIsMapInitialized(true);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="w-full h-full">
      {!isMapInitialized ? (
        <div className="bg-card border-2 border-border rounded-lg p-6 h-full flex flex-col justify-center">
          <h3 className="text-xl font-bold text-foreground mb-4">Enter Mapbox Token</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Get your free token at{' '}
            <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              mapbox.com
            </a>
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
              <Input
                id="mapbox-token"
                type="text"
                placeholder="pk.eyJ1..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button onClick={initializeMap} className="w-full">
              Load Map
            </Button>
          </div>
        </div>
      ) : (
        <div ref={mapContainer} className="w-full h-full rounded-lg" />
      )}
    </div>
  );
};

export default ContactMap;
