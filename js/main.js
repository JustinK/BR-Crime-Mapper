String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};
function initializeMap() {
  initializeDatePicker();

  var mapOptions = {
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false
  };
  var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  var customStyles = [
    {
        "featureType": "landscape",
        "stylers": [
            {
                "hue": "#FFBB00"
            },
            {
                "saturation": 43.400000000000006
            },
            {
                "lightness": 37.599999999999994
            }, 
            {
                "gamma": 1
            }
        ]
    },
    {
        "featureType": "road.highway",
        "stylers": [
            {
                "hue": "#FFC200"
            },
            {
                "saturation": -61.8
            },
            {
                "lightness": 45.599999999999994
            },
            {
                "gamma": 1
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "stylers": [
            {
                "hue": "#FF0300"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 51.19999999999999
            },
            {
                "gamma": 1
            }
        ]
    },
    {
        "featureType": "road.local",
        "stylers": [
            {
                "hue": "#FF0300"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 52
            },
            {
                "gamma": 1
            }
        ]
    },
    {
        "featureType": "water",
        "stylers": [
            {
                "hue": "#0078FF"
            },
            {
                "saturation": -13.200000000000003
            },
            {
                "lightness": 2.4000000000000057
            },
            {
                "gamma": 1
            }
        ]
    },
    {
        "featureType": "poi",
        "stylers": [
            {
                "hue": "#00FF6A"
            },
            {
                "saturation": -1.0989010989011234
            },
            {
                "lightness": 11.200000000000017
            },
            {
                "gamma": 1
            }
        ]
    }
  ];
  map.set('styles', customStyles);
  
  var defaultBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(30.35717298822407, -91.2189121240234),
      new google.maps.LatLng(30.528847119783435, -90.9442539208984));

  map.fitBounds(defaultBounds);

  // Create the search box and link it to the UI element.
  var input = /** @type {HTMLInputElement} */(
      document.getElementById('pac-input'));
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  var searchBox = new google.maps.places.SearchBox(/** @type {HTMLInputElement} */(input));

  // [START region_getplaces]
  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, 'places_changed', function() {
    refreshResults(searchBox, map);
  });
  // Bias the SearchBox results towards places that are within the bounds of the
  // current map's viewport.
  google.maps.event.addListener(map, 'bounds_changed', function() {
    var bounds = map.getBounds();
    searchBox.setBounds(bounds);
  });
  google.maps.event.addListener(map, 'idle', function(ev){
    
    var bounds = map.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();
    console.log(ne + ', ' + sw);
  });

  $( "#refreshButton" ).on( "click", function() {
    refreshResults(searchBox, map);
  });

}

function initializeDatePicker(){
  function cb(start, end) {
    $('#reportRange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
  }
  cb(moment().subtract(29, 'days'), moment());

  $('#reportRange').daterangepicker({
      
    'minDate': '01/01/2011',
    'maxDate': moment(),
    'startDate': moment().subtract(29, 'days'),
    'endDate': moment(),
    ranges: {
       'Last 7 Days': [moment().subtract(6, 'days'), moment()],
       'Last 30 Days': [moment().subtract(29, 'days'), moment()],
       'This Month': [moment().startOf('month'), moment().endOf('month')],
       'This Year': [moment().startOf('year'), moment()],
       'Last Year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
       'Last 2 Years': [moment().subtract(2, 'year').startOf('year'), moment()],
       'Last 3 Years': [moment().subtract(3, 'year').startOf('year'), moment()]
    }
  }, cb);
}

var markers = [];
var circles = [];
var crimes = [];

function refreshResults(searchBox, map){

  var places = searchBox.getPlaces();
  if (places.length == 0) {
      return;
  }
    clearMapComponents();

    markers = [];
    circles = [];
    crimes = [];

    
    var selectedLat = places[0].geometry.location.lat();
    var selectedLong = places[0].geometry.location.lng();

    var selectedCrimeTypes = [];
    var selectedCrimeTypes = $('#crimeTypeSelect').val();
    var formattedArray = [];
    $.each(selectedCrimeTypes, function(index, value){

      formattedArray.push("'" + value + "'");
    });

    var formattedCrimeTypes = formattedArray.join(',');

    var crimeRadius = $('#radiusSelect').val();
    //alert(crimeRadius);
    var picker = $('#reportRange').data('daterangepicker');
    var apiDateFormat = 'YYYY-MM-DDThh:mm:ss';
    var startDate = picker.startDate.format(apiDateFormat);
    var endDate = picker.endDate.format(apiDateFormat);
    var requestUrl = "https://data.brla.gov/resource/5rji-ddnu.json?$where=(within_circle(geolocation,%20" + selectedLat + ",%20" + selectedLong + ",%20"+crimeRadius+") AND crime in("+formattedCrimeTypes+") AND offense_date between '"+startDate+"' and '"+endDate+"')";
    
    console.log(requestUrl);

    $.ajax({
      url: requestUrl
    }).done(function(data) {
      drawCrimes(crimes, map, data, selectedCrimeTypes, places, picker);
    });

    setMapComponents(map, places, crimeRadius);
}

function clearMapComponents(places){
  
    for (var i = 0, marker; marker = markers[i]; i++) {
      marker.setMap(null);
    }
    for (var i = 0, circle; circle = circles[i]; i++) {
      circle.setMap(null);
    }
}
function setMapBounds(map, place){
  var bounds = new google.maps.LatLngBounds();
  bounds.extend(place.geometry.location);
  map.fitBounds(bounds);
  map.setZoom(14);
}

function drawCrimes(crimes, map, data, selectedCrimeTypes, places, picker){

  for (var i = 0, crime; crime = data[i]; i++) {
        crimes.push(crime);
        var crimePosition = new google.maps.LatLng(crime.geolocation.coordinates[1], crime.geolocation.coordinates[0]);
        //console.log(crimePosition);
        var marker = new google.maps.Marker({
            map: map,
            icon: {
                path: fontawesome.markers.MAP_MARKER,
                scale: 0.5,
                strokeWeight: 0.2,
                strokeColor: 'black',
                strokeOpacity: 1,
                fillColor: getIconColor(crime.crime),
                fillOpacity: 0.9,
            },
            title: crime.crime,
            position: crimePosition,
            crime:crime
        });
        initializeInfoWindow(crime, marker, map);
        markers.push(marker);
        //console.log(crime.crime);
      }
      var displayCrimeFormat = [];

      $.each(selectedCrimeTypes, function(index, value){

        displayCrimeFormat.push('<i style="color:'+getIconColor(value)+'" class="mdi-maps-place"></i> ' + value.toProperCase());
      });
      var displayCrimeFormat = displayCrimeFormat.join(',');

      var displayDateFormat = 'MMMM Do YYYY';
      $("#reportHeader").html(crimes.length + " crimes ( " + displayCrimeFormat + " ) reported near <strong>" + places[0].name + '</strong> between ' + picker.startDate.format(displayDateFormat) + ' and ' + picker.endDate.format(displayDateFormat));
}
function getIconColor(crimeType){
  var crimeColors = {
    "ASSAULT": '#536DFE', //
    "BATTERY": '#7B1FA2',
    "BUSINESS ROBBERY" : '#FCC107',
    "CRIMINAL DAMAGE TO PROPERTY": '#CDDC39',
    "FIREARM": '#00BCD4',
    "HOMICIDE": '#D32F2F',
    "INDIVIDUAL ROBBERY": '#8BC34A',
    "NARCOTICS": '#FFEB3B',
    "NON_RESIDENTIAL BURGLARY": '#388E3C',
    "NUISANCE": '#9E9E9E',
    "RESIDENTIAL BURGLARY": '#388E3C',
    "ROBBERY": '#FF5772',
    "THEFT": '#FFCCBC',
    "VEHICLE BURGLARY": '#455A64',
    "VICE": '#512DA8'
  }

  return crimeColors[crimeType];
}

function initializeInfoWindow(crime, marker, map){
  var infoWindow = new google.maps.InfoWindow();
  var crimeDate = moment(crime.offense_date).format('MMMM Do YYYY');
  var content = '<h4>' + crime.crime + '</h4>' +
                '<p><strong>Offense: </strong>' + crime.offense_desc + ' ' + crime.offense + '</p>' +
                '<p><strong>Status: </strong>' + crime.a_c + '</p>' +
                '<p><strong>Date: </strong>' + crimeDate + '</p>' +
                '<p><strong>Address: </strong>' + crime.address +'</p>';
  google.maps.event.addListener(marker, 'click', (function(marker,content,infoWindow){
    return function(){
      infoWindow.setContent(content);
      infoWindow.open(map, marker);
    }
  })(marker,content,infoWindow));
}
function setMapComponents(map, places, crimeRadius){
  for (var i = 0, place; place = places[i]; i++) {
      var image = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };
      //console.log(place.icon);

      // Create a marker for each place.
      var marker = new google.maps.Marker({
        map: map,
        icon: image,
        title: place.name,
        position: place.geometry.location
      });
      // Add circle overlay and bind to marker
      var circle = new google.maps.Circle({
        map: map,
        radius: parseInt(crimeRadius),    // 2 miles in metres
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        //fillColor: '#FF0000',
        fillOpacity: 0.01,
        center: place.geometry.location
      });
        //circle.bindTo('center', marker, 'position');
      circles.push(circle);
      markers.push(marker);

      console.log('Selected place: ' + place.geometry.location);
      console.log('Selected name: ' + place.name);
      
      setMapBounds(map, place);

    }
}

google.maps.event.addDomListener(window, 'load', initializeMap);
