require('jsrender')($);

import ManageMyTariffs from './manage_my_tariffs';
import MyVehicle from './my_vehicle';
import Currency from './currency';
import AppInstall from './app_install';
import StationPrices from './station_prices';

export default class Sidebar {

  constructor(depts) {
    this.depts = depts;
    this.translation= depts.translation();
    this.analytics = depts.analytics();
    this.manageMyTariffs = new ManageMyTariffs(this,depts);
    this.appInstall = new AppInstall(this.analytics);
    this.myVehicle = new MyVehicle(this,this.depts);
    this.currency = new Currency(this,this.depts);
    this.stationPrices = new StationPrices(this,this.depts);
    this.loaded = false;
    this.component = $("#sidebar");

    this.sidebarContent = {
      "settings": {
        header: this.translation.get("settingsHeader"),
        contentId: "settingsContent"
      },
      "info": {
        header: this.translation.get("infoHeader"),
        contentId: "infoContent"
      },
      "prices": {
        header: this.translation.get("pricesHeader"),
        contentId: "pricesContent"
      },
      "manageMyTariffs": {
        header: this.translation.get("manageMyTariffsHeader"),
        contentId: "manageMyTariffsContent",
        onClosed: ()=>this.optionsChanged(),
        onOpen: ()=>this.manageMyTariffs.render()
      }
    };

    this.currentSidebarContentKey = null;
    
    this.close();
    this.hideAllSidebarContent();
    this.registerConverters();

    this.loaded = true;
  }

  registerConverters(){
    $.views.converters({
      dec: val => val.toFixed(2),
      perc: val => `${(val*100).toFixed(0)}%`,
      int: val=>val.toFixed(0),
      time: val => {
        const h = Math.floor(val / 60);
        const min = Math.floor(val % 60);
        return this.translation.stringFormatWithKey("timeFormat",h,min);
      },
      upper: val => val.toUpperCase()
    });
    $.views.helpers("c",(converter,param)=>$.views.converters[converter](param));
  }

  chargingOptions(){
    const settingsModel = this.settingsView.getModel();
    return {
      duration: 0,
      kwh: 0,
      minPower: settingsModel.minPower,
      onlyFree: settingsModel.onlyFree,
      openNow: settingsModel.openNow,
      carACPhases: 3,
      providerCustomerTariffs: settingsModel.providerCustomerTariffs,
      onlyShowMyTariffs: settingsModel.onlyShowMyTariffs,
      allowUnbalancedLoad: !this.translation.showUnbalancedLoad() || settingsModel.allowUnbalancedLoad,
      onlyTariffsWithoutMonthlyFees: settingsModel.onlyTariffsWithoutMonthlyFees,
      batteryRange: this.stationPrices.getBatteryRange(),
      myTariffs: this.manageMyTariffs.getMyTariffs(),
      myVehicle: this.myVehicle.getVehicle(),
      displayedCurrency: this.currency.getDisplayedCurrency(),
      startTime: this.stationPrices.getStartTime(),
      chargePoint: this.stationPrices.getCurrentChargePoint()
    }
  }

  showStation(station){
    this.stationPrices.showStation(station, this.chargingOptions());

    this.open("prices");    
  }

  updateStationPrice(station,prices,options){
    this.stationPrices.updateStationPrice(station,prices,options)
  }

  onOptionsChanged(callback){
    this.optionsChangedCallback = callback;
  }

  optionsChanged(){
    if(this.optionsChangedCallback) this.optionsChangedCallback();
  }

  open(contentKey) {
    this.analytics.log('send', 'event', 'Sidebar', 'open', contentKey); 

    this.component.show();

    const content = this.sidebarContent[contentKey];
    $("#sidebarHeader").text(content.header)

    if (this.currentSidebarContentKey) {
      const oldContent = this.sidebarContent[this.currentSidebarContentKey];
      $(`#${oldContent.contentId}`).hide();
      if(oldContent.onClosed) oldContent.onClosed();
    }
    $(`#${content.contentId}`).show();
    this.currentSidebarContentKey = contentKey;
    if(content.onOpen) content.onOpen();
  }

  close() {
    this.component.hide();
  }

  hideAllSidebarContent() {
    for (var key in this.sidebarContent) {
      const content = this.sidebarContent[key];
      $(`#${content.contentId}`).hide();
    }
  }
}