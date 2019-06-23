import GoingElectric from './repository/going_electric.js';
import StationTariffs from './repository/station_tariffs.js';
import Translation from './component/translation.js';
import ThemeLoader from './component/theme_loader.js';
import Map from './component/map.js';
import Sidebar from './component/sidebar.js';
import LocationSearch from './component/location_search.js';
import loadGoogleMapsApi from "load-google-maps-api"

var $ = require('jquery');
require('jsrender')($);

class App {

  constructor() {
    this.deptsLoaded = 0;
    this.deptCount = 2;
    this.fallBackLocation = {
      longitude: 11.6174228,
      latitude: 47.5399148
    };
  }

  async initialize(){
    this.deptsLoaded++;
    if(this.deptsLoaded < this.deptCount) return;
    
    // First Load translations
    this.translation = new Translation();
    await this.translation.setCurrentLocaleTranslations();

    // Static content is needed for almost everything else
    this.loadStaticContent();

    new ThemeLoader(this.translation).setCurrentTheme();

    this.goingElectric = new GoingElectric();
    this.stationTariffs = new StationTariffs();
    this.map = new Map();
    this.sidebar = new Sidebar(this.translation);
    this.locationSearch = new LocationSearch();

    this.currentStationTariffs = null;
    this.currentStation = null;

    if (!navigator.geolocation) {
      this.showFallbackLocation();
    }

    this.map.onBoundsChanged(this.showStationsAtLocation.bind(this));
    this.sidebar.onSelectedChargePointChanged(this.selectedChargePointChanged.bind(this));
    this.sidebar.onOptionsChanged(this.optionsChanged.bind(this));
    this.locationSearch.onResultSelected(coords=>this.map.centerLocation(coords));
    this.getCurrentLocation();
    
    this.sidebar.open("settings");

    this.stationTariffs.check();
  }

  loadStaticContent(){
    $("#search").html($.templates("#locationSearchTempl").render());
    $("#pricesContent").html($.templates("#pricesContentTempl").render());
    $("#settingsContent").html($.templates("#settingsTempl").render());
    $("#infoContent").html($.templates("#infoTempl").render());
    $("#pleaseZoom").html($.templates("#pleaseZoomTempl").render());
  }

  getCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
      pos => this.map.centerLocation(pos.coords), 
      () => this.showFallbackLocation());
  }

  showFallbackLocation() {
    this.map.centerLocation(this.fallBackLocation,8);
  }

  toggleLoading(value){
    $("#loadingIndicator").toggle(value);
  }

  async showStationsAtLocation(bounds) {
    const options = this.sidebar.chargingOptions();

    const isBigArea = this.map.isBigArea(options.onlyHPC);

    $("#pleaseZoom").toggle(isBigArea);
    if(isBigArea){
      this.map.clearMarkers();
      return;
    }

    this.toggleLoading(true);
    try {
      const stations = await this.goingElectric.getStations(bounds.northEast, bounds.southWest,options);
      this.map.clearMarkers();
      stations.forEach(st => this.map.addStation(st, this.stationSelected.bind(this)));
    }
    catch(ex){
      this.showAlert(this.translation.get("errorStationsUnavailable"))
      console.error(ex);
    }
    this.toggleLoading(false);
  }

  async stationSelected(model) {
    this.log('send', 'event', 'Station', 'show');
    this.toggleLoading(true);
    try{
      this.currentStation = await this.goingElectric.getStationDetails(model.id)
      const options = this.sidebar.chargingOptions();
      this.currentStationTariffs = await this.stationTariffs.getTariffsOfStation(this.currentStation,options);
      this.sidebar.showStation(this.currentStation,options);
      this.selectedChargePointChanged();
    }
    catch(ex){
      this.showAlert(this.translation.get("errorPricesUnavailable"));
      console.error(ex);
    }
    
    this.toggleLoading(false);
  }

  selectedChargePointChanged(){
    const options = this.sidebar.chargingOptions();
    const selectedCP = this.currentStation.chargePoints.find(c=>c.id == options.chargePointId);
    if(selectedCP == null) return;

    const prices = this.currentStationTariffs.reduce((memo,tariff)=>{
      const chargePointPrice = tariff.chargePointPrices.find(cpp=>
        cpp.power == selectedCP.power && cpp.plug == selectedCP.plug);

      if(chargePointPrice) memo.push({ price: chargePointPrice.price, tariff: tariff });
      return memo;
    },[]);

    this.sidebar.updateStationPrice(this.currentStation,prices,options);
  }

  optionsChanged(){
    this.showStationsAtLocation(this.map.getBounds());
  }

  showAlert(message) {
    $("#snackbar").text(message);
    $("#snackbar").show();
    
    setTimeout(()=>$("#snackbar").hide(), 5000);
  }

  log(){
    if(typeof(ga) == "undefined") return;
    ga.apply(null,arguments);
  }
}

var app = new App();
$(document).ready(()=>app.initialize());
loadGoogleMapsApi({key: process.env.GOOGLE_CLOUD_API_KEY,libraries: ["places"]}).then(()=>app.initialize());