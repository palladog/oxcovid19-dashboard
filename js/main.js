mapboxgl.accessToken = mapBoxToken; // From config.js

// Constants
const regionSelect = document.getElementById('region-select')
const dataSelect = document.getElementById('data-select')
const dataVariables = [
    { table: 'epidemiology', column: 'confirmed' },
    { table: 'epidemiology', column: 'dead' },
    { table: 'epidemiology', column: 'hospitalised' },
    { table: 'epidemiology', column: 'hospitalised_icu' },
    { table: 'epidemiology', column: 'quarantined' },
    { table: 'epidemiology', column: 'recovered' },
    { table: 'epidemiology', column: 'tested' }
]
const dateSelect = document.getElementById('date-select')

// Arguments
let country, region, table, column, date, xmin, ymin, xmax, ymax
let srid = 4326

// ChartJS
/*let lineChartOpts = {
    type: 'bar',
    data: {
        labels: ['Chart'],
        datasets: [{
            label: 'Chart',
            data: [3],
            backgroundColor: ['rgba(255, 99, 132, 0.2)'],
            borderColor: ['rgba(255, 99, 132, 1)'],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
}*/
//const lineChart = new Chart(document.getElementById('chart').getContext('2d'), lineChartOpts)

/*function renderChart (data) {
    //lineChartOpts.data.datasets[0].data = [4]
    
    lineChart.update()
}*/

/*function populateLineChart () {
    // lineChartOpts.data.datasets = []
    const selectedRegion = featureCollection.features.filter(obj => {
        return obj.adm_area_1 === region
    })

    console.log('SELECTED REGION: ', selectedRegion)

    /*let set = {
        label: featureCollection
    }*/

    // lineChartOpts.data.datasets.push(set)*/
//}

// Mapbox GL Initialization
let map = new mapboxgl.Map({ // Map initiatization
    container: 'map', // Container ID
    style: 'mapbox://styles/mapbox/light-v10', // Style URL
    center: [23, 63], // Starting position: Sweden
    antialias: true,
    zoom: 4 // Starting zoom
})

let featureCollection = {
    'type': 'FeatureCollection',
    'features': []
}

let hoveredRegionId = null

// Globals for the choropleth
let BREAKS = [0, 1000, 5000, 10000, 20000, 50000]
let COLORS = ['#8c510a', '#d8b365', '#f6e8c3', '#c7eae5', '#5ab4ac', '#01665e']

map.on('load', function () {
    map.addSource('regions', {
        type: 'geojson',
        data: featureCollection
    })

    map.addLayer({
        'id': 'region-fills',
        'type': 'fill',
        'source': 'regions',
        //'layout': {},
        'paint': {
            //'fill-color': '#627BC1',
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'value'],
                BREAKS[0], COLORS[0],
                BREAKS[1], COLORS[1],
                BREAKS[2], COLORS[2],
                BREAKS[3], COLORS[3],
                BREAKS[4], COLORS[4],
                BREAKS[5], COLORS[5]
            ],
            //'fill-outline-color': '#ffffff', NOT WORKING (despite antialias: true)
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.5
            ]
        }
    },
    'waterway-label'
    )

    map.addLayer({
        'id': 'region-borders',
        'type': 'line',
        'source': 'regions',
        'layout': {},
        'paint': {
            'line-color': '#000',
            'line-width': 2
        }
    })

    // Create popup for the hover popup
    let popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    })

    // When the user moves their mouse over the state-fill layer, we'll update the
    // feature state for the feature under the mouse.
    map.on('mousemove', 'region-fills', function (e) {
        // Region fills on hover
        if (e.features.length > 0) {
            if (hoveredRegionId !== null) {
                map.setFeatureState(
                    { source: 'regions', id: hoveredRegionId },
                    { hover: false }
                )
            }
            hoveredRegionId = e.features[0].id;

            map.setFeatureState(
                { source: 'regions', id: hoveredRegionId },
                { hover: true }
            )
        }

        // Feature module populates on hover
        //let features = map.queryRenderedFeatures(e.point)

        // Limit the number of properties we're displaying for
        // legibility and performance
        /*const displayProperties = [
            'country',
            'region',
            'date',
            'data',
            'value'
        ]

        let displayFeatures = features.map(function (feat) {
            var displayFeat = {}
            displayProperties.forEach(function (prop) {
                displayFeat[prop] = feat[prop];
            })

            return displayFeat;
        })

        console.log(displayFeatures)

        document.getElementById('features').innerHTML = JSON.stringify(
            displayFeatures,
            null,
            2
        )*/
    })

    // When the mouse leaves the state-fill layer, update the feature state of the
    // previously hovered feature.
    map.on('mouseleave', 'region-fills', function () {
        if (hoveredRegionId !== null) {
            map.setFeatureState(
                { source: 'regions', id: hoveredRegionId },
                { hover: false }
            )
        }
        
        hoveredRegionId = null;
    })
})

 
window.onload = async function () {
    country = 'Sweden' // Sets Sweden as default country

    await populateRegionSelect(country)

    // date = new Date().toISOString().slice(0, 10) // [PRODUCTION]
    date = '2021-04-13' // [DEVELOPMENT]
    document.getElementById('date-select').value = date

    populateDataSelect()
    table = 'epidemiology'
    column = 'confirmed'
    document.getElementById('data-select').value = table + '/' + column


    getBoundingBox()
    let mapData = await getMapData()
    queryResponseToFeatureCollection(mapData)
}

// Renders the chart upon region change
regionSelect.addEventListener('change', async function () {
    region = this.value
    let data = await getRegionData()
    console.log(region)
    populateLineChart()
    //renderChart()
})

// Updates the map upon data change
dataSelect.addEventListener('change', async function () {
    let string = this.value.split('/')
    table = string[0]
    column = string[1]

    let mapData = await getMapData()
    queryResponseToFeatureCollection(mapData)
    // TODO: refresh the chart
})

// Updates the map upon date change
dateSelect.addEventListener('change', async function () {
    date = this.value
    console.log(date)

    let mapData = await getMapData()
    queryResponseToFeatureCollection(mapData)
    // TODO: refresh the chart
})

// Updates the map on move
map.on('moveend', async function () {
    getBoundingBox()
    let mapData = await getMapData()
    queryResponseToFeatureCollection(mapData)
})


// Queries the API to get regions
async function populateRegionSelect (country) {
    let url = `${BASE_URL}/api/v1/getallregions?country=${country}`

    let res = await axios.get(url)

    let options = res.data.map(el => el.adm_area_1)

    // Create a disabled, selected "Choose a region" option
    let element = document.createElement('option')
    element.textContent = 'Choose a region...'
    element.value = ''
    element.setAttribute('disabled', 'true')
    element.setAttribute('selected', 'true')
    regionSelect.appendChild(element)

    // Create an option element for every response object
    for (let i = 0; i < options.length; i++) {
        let opt = options[i]
        let el = document.createElement('option')
        el.textContent = opt
        el.value = opt
        regionSelect.appendChild(el)
    }
}

// Populates data select element with options from JS array
function populateDataSelect () {
    const options = dataVariables

    for (let i = 0; i < options.length; i++) {
        let opt = options[i].table + '/' + options[i].column
        let el = document.createElement('option')
        el.textContent = opt
        el.value = opt
        dataSelect.appendChild(el)
    }
}

// Gets the coordinates of the current bounding box
function getBoundingBox () {
    let boundingBox = map.getBounds()
    xmin = parseFloat(boundingBox._sw.lng)
    ymin = parseFloat(boundingBox._sw.lat)
    xmax = parseFloat(boundingBox._ne.lng)
    ymax = parseFloat(boundingBox._ne.lat)

    //console.log(`${xmin}, ${ymin}, ${xmax}, ${ymax}`)
}

// Creates a feature for each array object and replaces featureCollection
function queryResponseToFeatureCollection (queryResponse) {
    let prop = null;
    featureCollection.features = []

    for (let i = 0; i < queryResponse.length; i++) {
        // For each queryResponse item, create a feature

        let feature = {
            'type': 'Feature',
            'id': i + 1,
            'country': queryResponse[i].country,
            'region': queryResponse[i].adm_area_1,
            'geometry': JSON.parse(queryResponse[i].geometry),
            'date': queryResponse[i].date,
            'data': queryResponse[i].data,
            'value': parseFloat(queryResponse[i].value)
        }

        for (prop in queryResponse[i]) {
            // For each property in queryResponse, add to featureCollection as a property
            if (prop !== 'geometry' && queryResponse[i].hasOwnProperty(prop)) {
                if (prop == 'value') {
                    feature[prop] = parseFloat(queryResponse[i][prop])
                } else {
                    feature[prop] = queryResponse[i][prop]
                }
            }
        }

        // Push the feature into the featureCollection object feature array
        featureCollection.features.push(feature)
    }

    // Returns the featureCollection object
    console.log(featureCollection)
    return featureCollection
}

/*function formatNumber(num) {
    return parseFloat(num).toFixed(2).replace(/\.00$/, '');
}*/

// Fetches values of one table column for all regions within the bounding box
async function getMapData () {
    let url = `${BASE_URL}/api/v1/getmapdata?xmin=${xmin}&ymin=${ymin}&xmax=${xmax}&ymax=${ymax}&srid=${srid}&table=${table}&column=${column}&date=${date}`
    console.log(url)
    let res = await axios.get(url)
    console.log(res.data)
    return res.data
}

// Populates the region select element with options from the API
async function getRegionData () {
    let url = `${BASE_URL}/api/v1/getregiondata?table=${table}&column=${column}&date=${date}&region=${region}`

    let res = await axios.get(url)
    return res.data
}

/*async function getBoundingBoxRegions () { // Fetches an array of regions within the current bounding box
    let url = `http:localhost:8080/api/v1/getboundingbox/?xmin=${xmin}&ymin=${ymin}&xmax=${xmax}&ymax=${ymax}&srid=${srid}`

    axios.get(url)
        .then(res => {
            console.log('=== getBoundingBoxRegions response ===')
            console.log(res.data)

            return res.data
        }).catch(e => console.error(e))
}*/


/*axios.get(url)
    .then(res => {
        console.log('RESPONSE DATA')
        console.log(res.data)

        let collection = queryResponseToFeatureCollection(res.data)
        console.log('COLLECTION OBJECT')
        console.log(collection)
    })
    .catch(e => console.error(e))*/

