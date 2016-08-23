/**
 * 以下のようなXMLノードのjQueryオブジェクトを引数に、transducer(センサまたは アクチュエータ)のインスタンスを作成する。
 * 
 * <transducer name='current temperature' id='temp' canActuate='false'
 * hasOwnNode='false' units='kelvin' unitScalar='0' minValue='270'
 * maxValue='320' resolution='0.1'> </transducer>
 */

function Transducer() {
	this.name = undefined;
	this.id = undefined;
	this.units = undefined;
	this.unitScaler = undefined;
	this.canActuate = undefined;
	this.hasOwnNode = undefined;
	this.typeName = undefined;
	this.manufacturer = undefined;
	this.partNumber = undefined;
	this.serialNumber = undefined;
	this.minValue = undefined;
	this.maxValue = undefined;
	this.resolution = undefined;
	this.precision = undefined;
	this.accuracy = undefined;
	this.sensorData = undefined;
	this.isDataDirty = false;
}

/**
 * {	"name": "二酸化窒素(NO2)"
 * 				"id": "no2",
 * 				"canActuate": false,
 * 				"units": "ppm",
 * 				"unitScalar": 0,
 * 				"minValue": 0,
 * 				"maxValue": 10;
 * 				"resolution": 0.001,
 * 				"value": {
 * 					"url": "http://www.k-erc.pref.kanagawa.jp/taiki/fujisawak.asp",
 * 					"path":"html:/html/body/table/tbody/tr[3]/td[2]/font[0]",
 * 					"update": "15 * * * *" //crontab記法でアップデート時刻を表記
 * 				}
 * 			}
 * @param jsonObject
 * @returns {___anonymous838_847}
 */
Transducer.fromJson = function(jsonObject) {
	var transducer = new Transducer();
	if (jsonObject) {
		transducer.name = jsonObject.name;
		transducer.id = jsonObject.id;
		transducer.units = jsonObject.units;
		transducer.unitScaler = parseInt(jsonObject.unitScaler);
		transducer.canActuate = jsonObject.canActuate;
		transducer.hasOwnNode = jsonObject.hasOwnNode;
		transducer.typeName = jsonObject.typedName;
		transducer.manufacturer = jsonObject.manufacturer;
		transducer.partNumber = jsonObject.partNumber;
		transducer.serialNumber = jsonObject.serialNumber;
		transducer.minValue = jsonObject.minValue;
		transducer.maxValue = jsonObject.maxValue;
		transducer.resolution = jsonObject.resolution;
		transducer.precision = jsonObject.precision;
		transducer.accuracy = jsonObject.accuracy;
	}
	return transducer;
};

Transducer.fromXML = function(jQueryObject){
	var transducer = new Transducer();
	if (jQueryObject) {
		transducer.name = jQueryObject.attr("name");
		transducer.id = jQueryObject.attr("id");
		transducer.units = jQueryObject.attr("units");
		transducer.unitScaler = parseInt(jQueryObject.attr("unitScaler"));
		transducer.canActuate = jQueryObject.attr("canActuate") == "true";
		transducer.hasOwnNode = jQueryObject.attr("hasOwnNode") == "true";
		transducer.typeName = jQueryObject.attr("transducerTypeName");
		transducer.manufacturer = jQueryObject.attr("manufacturer");
		transducer.partNumber = jQueryObject.attr("partNumber");
		transducer.serialNumber = jQueryObject.attr("serialNumber");
		transducer.minValue = parseFloat(jQueryObject.attr("minValue"));
		transducer.maxValue = parseFloat(jQueryObject.attr("maxValue"));
		transducer.resolution = parseFloat(jQueryObject.attr("resolution"));
		transducer.precision = parseFloat(jQueryObject.attr("precision"));
		transducer.accuracy = parseFloat(jQueryObject.attr("accuracy"));
	}
	return transducer;
};

/**
 * Sets current data of this transducer.
 * If the specified data has the timestamp equal to or older than 
 * the currently saved data, it's ignored.
 * 
 * @return true if data is updated with the specified one.
 */
Transducer.prototype.setSensorData = function(sensorData){
	if(this.sensorData && sensorData.timestamp <= this.sensorData.timestamp){
		return false;
	}
	
	this.sensorData = sensorData;
	this.isDataDirty = true;
	return true;
};

Transducer.prototype.getSensorData = function(){
	return this.sensorData;
};

Transducer.prototype.toString = function() {
	var transducerString =  "Transducer[name=" + this.name + ", id=" + this.id ;
	var parameters = ["units", "unitScaler", "canActuate", "hasOwnNode", "typeName", "manufacturer", "partNumber", "serialNumber", "minValue", "maxValue", "resolution", "precision", "accuracy"];
	parameters.forEach(function(param){
		if(this[param]){
			transducerString += ", "+param+"="+this[param];
		}
	});
	
	if(this.sensorData){
		transducerString += ", sensorData="+this.sensorData.toString();
	}
	
	transducerString += "]";
	
	return transducerString;
/*
return "[Transducer name=" + this.name + ", id=" + this.id + 
		(this.units ? ", units="+this.units : "")+
		(this.unitScaler ? ", unitScaler="+this.unitScaler : "")+

		+ this.units + ", unitScaler=" + this.unitScaler + ", canActuate="
			+ this.canActuate + ", hasOwnNode=" + this.hasOwnNode
			+ ", typeName=" + this.typeName + ", manufacturer="
			+ this.manufacturer + ", partNumber=" + this.partNumber
			+ ", serialNumber=" + this.serialNumber + ", minValue="
			+ this.minValue + ", maxValue=" + this.maxValue + ", resolution="
			+ this.resolution + ", precision=" + this.resolution
			+ ", precision=" + this.precision + ", accuracy=" + this.accuracy;
			+ (this.sensorData ? ", sensorData="+this.sensorData.toValueString() : "")
			+ "]";
			*/
};

/**
 * 			{	"name": "二酸化硫黄(SO2)"
 * 				"id": "so2",
 * 				"canActuate": false,
 * 				"units": "ppm",
 * 				"unitScalar": 0,
 * 				"minValue": 0,
 * 				"maxValue": 10;
 * 				"resolution": 0.001,
 * 				"value": {
 * 					"path":"html:/html/body/table/tbody/tr[3]/td[1]/font[0]",
 * 				}
 * 			}
 */
Transducer.prototype.toJsonString = function(){
	return '{'
	+ (this.name? '"name":"'+this.name+'"' : "")
	+ (this.id? ',\n'+'"id":"'+this.id+'"' : "")
	+ (this.units? ',\n'+'"units":"'+this.units+'"' : "")
	+ (this.unitScaler? ',\n'+'"unitScaler":"'+this.unitScaler+'"' : "")
	+ (this.canActuate? ',\n'+'"canActuate":"'+this.canActuate+'"' : "")
	+ (this.hasOwnNode? ',\n'+'"hasOwnNode":"'+this.hasOwnNode+'"' : "")
	+ (this.typeName? ',\n'+'"typeName":"'+this.typeName+'"' : "")
	+ (this.manufacturer? ',\n'+'"manufacturer":"'+this.manufacturer+'"' : "")
	+ (this.partNumber? ',\n'+'"partNumber":"'+this.partNumber+'"' : "")
	+ (this.serialNumber? ',\n'+'"serialNumber":"'+this.serialNumber+'"' : "")
	+ (this.minValue? ',\n'+'"minValue":"'+this.minValue+'"' : "")
	+ (this.maxValue? ',\n'+'"maxValue":"'+this.maxValue+'"' : "")
	+ (this.resolution? ',\n'+'"resolution":"'+this.resolution+'"' : "")
	+ (this.precision? ',\n'+'"precision":"'+this.precision+'"' : "")
	+ (this.accuracy? ',\n'+'"accuracy":"'+this.accuracy+'"' : "")
	+ '}';
};

/**
 * Generate a metainfo xml string
 * 
 * <transducer name='temperature' id='temp' canActuate='false' units='kelvin' unitScalar='0' minValue='270' maxValue='320' resolution='0.1'>
 * </transducer>
 */
Transducer.prototype.toMetaString = function(){
	return "<transducer " +
	(this.name ? "name='"+this.name+"' " : "") +
	(this.id ? "id='"+this.id+"' " : "") +
	(this.units ? "units='"+this.units+"' " : "") +
	(this.unitScaler ? "unitScaler='"+this.unitScaler+"' " : "") +
	(this.canActuate ? "canActuate='"+this.canActuate+"' " : "") +
	(this.hasOwnNode ? "hasOwnNode='"+this.hasOwnNode+"' " : "") +
	(this.typeName ? "typeName='"+this.typeName+"' " : "") +
	(this.manufacturer ? "manufacturer='"+this.manufacturer+"' " : "") +
	(this.partNumber ? "partNumber='"+this.partNumber+"' " : "") +
	(this.serialNumber ? "serialNumber='"+this.serialNumber+"' " : "") +
	(this.minValue ? "minValue='"+this.minValue+"' " : "") +
	(this.maxValue ? "maxValue='"+this.maxValue+"' " : "") +
	(this.resolution ? "resolution='"+this.resolution+"' " : "") +
	(this.precision ? "precision='"+this.precision+"' " : "") +
	(this.accuracy ? "accuracy='"+this.accuracy+"' " : "") +
	"/>";
};

Transducer.prototype.toDataString = function(){
	if(this.sensorData){
		return this.sensorData.toXMLString();
	}else{
		return null;
	}
};

/**
 * A human friendly identifier to distinguish between various possible
 * transducers within a device
 */
Transducer.prototype.getName = function() {
	return this.name;
};

/**
 * A unique identifier for the transducer used within the XML packet to
 * enumerate different transducers within a single packet The tuple (UUID X,
 * transducer id Y) MUST be unique such that a publish operation to a data value
 * node X_data with the transducer id Y unambiguously refers to one and only one
 * transducer.
 */
Transducer.prototype.getId = function() {
	return this.id;
};

/**
 * Unit of measure (see below)
 */
Transducer.prototype.getUnits = function() {
	return this.units;
};

/**
 * The scale of the unit as a power of 10 (i.e. n for 10 ** n)
 */
Transducer.prototype.getUnitScaler = function() {
	return this.unitScaler;
};

/**
 * Indicates whether the transducer can be actuated
 */
Transducer.prototype.isActuator = function() {
	return this.canActuate;
};

/**
 * Indicates whether the transducer data has its own node or whether it is part
 * of the generic data value node
 */
Transducer.prototype.hasOwnNode = function() {
	return this.hasOwnNode;
};

/**
 * A human readable indication of the type of transducer
 */
Transducer.prototype.getTypeName = function() {
	return this.typeName;
};

/**
 * Manufacturer of the transducer
 */
Transducer.prototype.getManufacturer = function() {
	return this.manufacturer;
};
;

/**
 * Manufacturer's part number of the transducer
 */
Transducer.prototype.getPartNumber = function() {
	return this.partNumber;
};

/**
 * Manufacturer's serial number of the transducer
 */
Transducer.prototype.getSerialNumber = function() {
	return this.serialNumber;
};

/**
 * The expected minimum value for this transducer
 */
Transducer.prototype.getMinValue = function() {
	return this.minValue;
};

/**
 * The expected maximum value for this transducer
 */
Transducer.prototype.getMaxValue = function() {
	return this.maxValue;
};

/**
 * The resolution of the values reported by this transducer
 */
Transducer.prototype.getResolution = function() {
	return this.resolution;
};

/**
 * The accuracy of the values reported by this transducer
 */
Transducer.prototype.getAccuracy = function() {
	return this.accuracy;
};

/**
 * The precision of the values reported by this transducer
 */
Transducer.prototype.getPrecision = function() {
	return this.precision;
};

