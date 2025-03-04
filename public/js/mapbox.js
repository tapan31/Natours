export const displayMap = (locations) => {
  // 2) Initializing the Map
  let map = L.map('map', {
    zoomControl: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
  });

  // 3) Adding the Tile Layer (Map Background)
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    },
  ).addTo(map);

  /* L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map); */

  // Creating custom marker
  const customMarker = L.divIcon({
    className: 'marker',
    iconSize: [32, 40], // Must match the width & height in CSS
    iconAnchor: [16, 40], // Anchor point of the icon
    popupAnchor: [0, -35], // Position of popup relative to the icon
  });

  // 4) Plotting locations on the map
  const points = [];
  locations.forEach((loc) => {
    points.push([loc.coordinates[1], loc.coordinates[0]]);
    // Adding a marker on the map for each location and binding a popup
    const marker = L.marker([loc.coordinates[1], loc.coordinates[0]], {
      icon: customMarker,
    })
      .addTo(map)
      .bindPopup(
        `<p style="font-weight: 500; font-size: 12px">Day ${loc.day}: ${loc.description}</p>`,
        {
          autoClose: false,
          closeOnClick: false, // Prevent popups from closing when clicking another marker
        },
      );

    // Delay opening popups to ensure they render properly
    setTimeout(() => {
      marker.openPopup();
    }, 100);
  });

  // 5) Adjusting map view to fit all markers
  const bounds = L.latLngBounds(points).pad(0.4);
  map.fitBounds(bounds);
};

// map.scrollWheelZoom.disable();
