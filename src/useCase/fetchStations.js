
import StationTariffs from '../repository/station_tariffs'
import GoingElectric from '../repository/going_electric'
const haversine = require('haversine')

export default class FetchStations {

  constructor(){
    this.deduplicateThreshold = 20;
  }

  async list(northEast, southWest,options){

    let goingElectric = new GoingElectric().getStations(northEast, southWest,options);
    let internalStations = new StationTariffs().getStations(northEast, southWest,options);

    const [goingElectricResult, internalResult] = await Promise.all([goingElectric, internalStations]);

    return this.deduplicate(goingElectricResult, internalResult);
  }

  deduplicate(goingElectricResult, internalResult){
    const deduplicatedResult = internalResult.filter(station=>
      !goingElectricResult.some(geStation=>haversine(geStation,station,{unit: 'meter'}) < this.deduplicateThreshold)
    );

    return goingElectricResult.concat(deduplicatedResult);
  }

  async detail(model, options) {
    switch(model.dataAdapter){
      case "going_electric":
        return await (new GoingElectric()).getStationDetails(model.id, options);
      case "chargeprice":
        return model;
    }
  }
}