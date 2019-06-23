var $ = require('jquery');
require('jsrender')($);

export default class Translation {
  constructor() {
    this.supportedLocales = ["en","de"]
    this.fallbackLocale = "en"
    this.currentLocale = this.currentLocaleOrFallback(); 
    this.setHelpers();
  }
  
  setHelpers(){
    $.views.helpers("t",this.get.bind(this));
    $.views.helpers("sf",this.stringFormat);
  }

  currentLocaleOrFallback(){
    return navigator.languages.map(l=>l.split("-")[0]).find(l=>this.supportedLocales.includes(l)) || this.fallbackLocale;
  }

  async setCurrentLocaleTranslations(){
    const url = `/locales/${this.currentLocale}.json`;
    const response = await fetch(url);
    this.currentLocaleTranslations = await response.json();
  }

  get(key){
    return this.currentLocaleTranslations[key] || "";
  }

  stringFormat(source,...params){
    return params.reduce((memo,n,i)=>{
      return memo.replace(new RegExp("\\{" + i + "\\}", "g"), n);
    },source);
  }

  stringFormatWithKey(key,...params){
    return this.stringFormat(this.get(key),...params);
  }
}