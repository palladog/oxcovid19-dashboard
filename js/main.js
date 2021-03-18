// THOUGHTS
// * Might be best to place all the map stuff in functions,
//   and add the geojson back to the postGis... function. 
//   If it is, you can add the map functions in a .then() in the axios
//   fetch so that they can access the geojson object too

mapboxgl.accessToken = mapBoxToken; // From config.js
var map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/light-v10', // style URL
    center: [15, 63], // starting position Sweden [lng, lat]
    zoom: 4 // starting zoom
});

let geojson = {
    // The initial GeoJSON object
    'type': 'FeatureCollection',
    'features': []
};

function postGISQueryToGeoJSONObject (queryResponse) {
    // https://gist.github.com/samgiles/2299524

    /* let geojson = {
        // The initial GeoJSON object
        'type': 'FeatureCollection',
        'features': []
    };*/
    let prop = null;

    for (let i = 0; i < queryResponse.length; i++) {
        // For each queryResponse item, create a feature
        let feature = {
            'type': 'Feature',
            'id': i+1,
            'geometry': queryResponse[i].geometry
        };

        for (prop in queryResponse[i]) {
            // For each property in queryResponse, add to GeoJSON object feature as a property
            if (prop !== 'geometry' && queryResponse[i].hasOwnProperty(prop)) {
                feature[prop] = queryResponse[i][prop];
            }
        }

        // Push the feature into the GeoJSON object feature array
        geojson.features.push(feature)
    }

    // Returns the FeatureCollection GeoJSON object
    return geojson;
}

axios.get('https://data.splitgraph.com/splitgraph/oxcovid19/latest/-/rest/administrative_division?and=(countrycode.eq.SWE,adm_level.eq.1)&select=country%2Cadm_area_1%2Cgeometry')
    .then(response => {
        console.log(response.data);

        let geoJson = postGISQueryToGeoJSONObject(response.data)
        console.log(geoJson);
        return geoJson
    })
    .catch(error => console.error(error));

/* Hover effect 
* https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
*/
var hoveredStateId = null;

map.on('load', function () {
    map.addSource('states', {
        'type': 'geojson',
        'data': geojson
    });

    // The feature-state dependent fill-opacity expression will render the hover effect
    // when a feature's hover state is set to true.
    map.addLayer({
        'id': 'state-fills',
        'type': 'fill',
        'source': 'states',
        'layout': {},
        'paint': {
            'fill-color': '#627BC1',
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.5
            ]
        }
    });

    map.addLayer({
        'id': 'state-borders',
        'type': 'line',
        'source': 'states',
        'layout': {},
        'paint': {
            'line-color': '#627BC1',
            'line-width': 2
        }
    });

    // When the user moves their mouse over the state-fill layer, we'll update the
    // feature state for the feature under the mouse.
    map.on('mousemove', 'state-fills', function (e) {
        if (e.features.length > 0) {
            if (hoveredStateId) {
                map.setFeatureState(
                    { source: 'states', id: hoveredStateId },
                    { hover: false }
                );
            }
            hoveredStateId = e.features[0].id;
            map.setFeatureState(
                { source: 'states', id: hoveredStateId },
                { hover: true }
            );
        }
    });

    // When the mouse leaves the state-fill layer, update the feature state of the
    // previously hovered feature.
    map.on('mouseleave', 'state-fills', function () {
        if (hoveredStateId) {
            map.setFeatureState(
                { source: 'states', id: hoveredStateId },
                { hover: false }
            );
        }
        hoveredStateId = null;
    });
});

/* given a query in the form "lng, lat" or "lat, lng" returns the matching
* geographic coordinate(s) as search results in carmen geojson format,
* https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
*/
var coordinatesGeocoder = function (query) {
    // match anything which looks like a decimal degrees coordinate pair
    var matches = query.match(
    /^[ ]*(?:Lat: )?(-?\d+\.?\d*)[, ]+(?:Lng: )?(-?\d+\.?\d*)[ ]*$/i
    );
    if (!matches) {
        return null;
    }
     
    function coordinateFeature(lng, lat) {
        return {
            center: [lng, lat],
            geometry: {
                type: 'Point',
                coordinates: [lng, lat]
            },
            place_name: 'Lat: ' + lat + ' Lng: ' + lng,
            place_type: ['coordinate'],
            properties: {},
            type: 'Feature'
        };
    }
        
    var coord1 = Number(matches[1]);
    var coord2 = Number(matches[2]);
    var geocodes = [];
        
    if (coord1 < -90 || coord1 > 90) {
        // must be lng, lat
        geocodes.push(coordinateFeature(coord1, coord2));
    }
        
    if (coord2 < -90 || coord2 > 90) {
        // must be lat, lng
        geocodes.push(coordinateFeature(coord2, coord1));
    }
        
    if (geocodes.length === 0) {
        // else could be either lng, lat or lat, lng
        geocodes.push(coordinateFeature(coord1, coord2));
        geocodes.push(coordinateFeature(coord2, coord1));
    }
        
    return geocodes;
};
     
map.addControl(
    new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        localGeocoder: coordinatesGeocoder,
        zoom: 4,
        placeholder: 'Try: -40, 170',
        mapboxgl: mapboxgl
    })
);