/**
 * BOSHサービス(HTTP-XMPPブリッジ)のURLとXMPPサーバホスト名、ノード名を
 * 指定して、デバイスを作成する。ノード名には_dataや_metaを除いた部分を 指定する。
 * とる引数の数によって挙動が異なる。
 * 引数が2つの場合:
 *      nodeNameとclientを引数にとり、デバイスが生成された時にDeviceを解決しに行く
 * その他:
 *      各情報を手動で設定
 */
function Device(arg1, arg2, arg3, arg4, arg5, arg6) {
     switch (arguments.length) {
          case 2:
              /**
               * @param arg1 (nodeName) XMPP node name of this device. required
               * @param arg2 (client) connected sox client.
               */
              this.initWithClient(arg1, arg2);
              break;
          default:
              /**
                * @param arg1 (nodeName) XMPP node name of this device. required
                * @param arg2 (name) name of this device. ignored for remote device
                * @param arg3 (type) type of this device. ignored for remote device
                * @param arg4 (accessModel) access model of this device. value must be one of open, authorize, whitelist, presence, and roster. ignored for remote device
                * @param arg5 (publishModel) publish model of this device. value must be one of open, publishers, or subscribers. ignored for remote device
                * @param arg6 (transducers) array of transducers of this device. ignored for remote device 
               */
              this.init(arg1, arg2, arg3, arg4, arg5, arg6);
              break;
     }
}

Device.prototype.init = function (nodeName, name, type, accessModel, publishModel, transducers) {
	/**
	 * profiles of this device included in SoX specification
	 */
	this.nodeName = nodeName;
	this.name = name;
	this.type = type;
	this.accessModel = accessModel;
	this.publishModel = publishModel;

	/**
	 * runtime information that won't be included in meta data
	 */
	if(transducers){
		this.transducers = $.extend(true, {}, transducers);
	}else{
		this.transducers = new Array(); // array of transducers
	}
	this.soxEventListener = null;

	this.dataSubid = "";
	this.metaSubid = "";
	this.dataSubscribed = false;
	this.metaSubscribed = false;
};

Device.prototype.initWithClient = function (nodeName, client) {
    if (client.isConnected()){
    	/**
    	 * profiles of this device included in SoX specification
    	 */
    	this.nodeName = nodeName;
        this.client = client;
    	this.name = undefined;
    	this.type = undefined;
    	this.accessModel = undefined;
    	this.publishModel = undefined;
    
    	/**
    	 * runtime information that won't be included in meta data
    	 */
    	this.transducers = new Array(); // array of transducers
    
    	this.soxEventListener = null;
    
    	this.dataSubid = "";
    	this.metaSubid = "";
    	this.dataSubscribed = false;
    	this.metaSubscribed = false;
    
        client.resolveDevice(this);
    } else {
        init(nodeName, client);
    }
};

/**
{
    "device": {
        "name": "東京都の今日の天気",
        "type": "outdoor weather",
        "nodeName": "東京都の今日の天気",
        "transducers": [
            {
                "name": "weather_img",
                "id": "weather_img",
                "units": "png"
            },
            {
                "name": "weather",
                "id": "weather"
            },
            {
                "name": "max_temp",
                "id": "max_temp",
                "units": "celcius"
            },
            {
                "name": "min_temp",
                "id": "min_temp",
                "units": "celcius"
            },
            {
                "name": "latitude",
                "id": "latitude"
            },
            {
                "name": "longitude",
                "id": "longitude"
            }
        ]
    }
}
 * 
 * @param jsonObject
 * @returns {___anonymous1506_1515}
 */
Device.fromJson = function(jsonObject) {
	var device = new Device();
	device.name = jsonObject.device.name;
	device.type = jsonObject.device.type;
	if(jsonObject.device.nodeName){
		device.nodeName = jsonObject.device.nodeName;
	}else{
		device.nodeName = jsonObject.device.name;
	}

	for(var i=0; i < jsonObject.device.transducers.length; i++){
		var transducer = Transducer.fromJson(jsonObject.device.transducers[i]);
		if (device.getTransducer(transducer.id)) {
			continue;
		}
		device.transducers.push(transducer);
		//console.log("Created " + transducer.toString());
	}

	return device;
};

/**
 *  <ANYTAG>
 *		<device name='SSLabMote' type='indoor weather'>
 *			<transducer 	name="temperature" 
 *							id="temp" canActuate="false" 
 *							units="kelvin" 
 *							unitScalar="0" 
 *							minValue="270" 
 *							maxValue="320" 
 *							resolution="0.1">
 *			</transducer>
 *			<transducer 	name="humidity" 
 *							id="humid" 
 *							canActuate="false" 
 *							units="percent" 
 *							unitScalar="0" 
 *							minValue="0" 
 *							maxValue="100" 
 *							resolution="0.1">
 *			</transducer>
 *		</device>
 *	</ANYTAG>
 * @param jQueryObject
 * @returns device instance
 */
Device.fromXML = function(jQueryObject){
	var deviceElement = $(jQueryObject).find('device');
	var device = new Device();
	device.name = $(deviceElement).attr('name');
	device.type = $(deviceElement).attr('type');

	var transducerElements = $(deviceElement).find("transducer");
	for (var i = 0; i < transducerElements.length; i++) {
		var transducer = Transducer.fromXML(transducerElements.eq(i));
		if (device.getTransducer(transducer.id)) {
			continue;
		}
		device.transducers.push(transducer);
		//console.log("Created " + transducer.toString());
	}

	return device;
};

Device.prototype.toString = function() {
	var deviceString = "Device[nodeName="+this.nodeName+", name="+this.name+", type="+this.type+", accessModel="+this.accessModel+", publishModel="+this.publishModel+", transducers=";
	var transducerString = "[";
	if(this.transducers){
		this.transducers.forEach(function(transducer){
			transducerString += transducer.toString();
		});
	}
	transducerString += "]";
	return deviceString+transducerString;
};

/**
 * 	{	"name": "藤沢市役所大気汚染常時監視センサ",
 * 		"type": "outdoor weather",
 * 		"nodeName": "sample", //optional
 * 		"transducers": [
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
 * 			},{	"name": "二酸化窒素(NO2)"
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
 * 		]
 * 	}
 * 
 * @param jsonObject
 * @returns {___anonymous1506_1515}
 */
Device.prototype.toJsonString = function(){
	var jsonString = '{' 
	+ (this.name? '"name":"'+this.name+'",\n' : "")
	+ (this.type? '"type":"'+this.type+'",\n' : "")
	+ (this.nodeName? '"nodeName":"'+this.nodeName+'",\n' : "")
	+ '"transducers": [\n';
	
	for(var i=0; i < this.transducers.length; i++){
		var transducerJsonString = this.transducers[i].toJsonString();
		jsonString += transducerJsonString;
		if(i < this.transducers.length-1){
			jsonString += ',';
		}
		jsonString += '\n';
	}
	jsonString += ']\n'; //end of transducers
	jsonString += '}';   //end of device
	return jsonString;
};

/**
 * Generate a metainfo xml string
 * 
 * <transducer name='temperature' id='temp' canActuate='false' units='kelvin' unitScalar='0' minValue='270' maxValue='320' resolution='0.1'>
 * </transducer>
 * <transducer name='humidity' id='humid' canActuate='false' units='percent' unitScalar='0' minValue='0' maxValue='100' resolution='0.1'>
 * </transducer>
 */
Device.prototype.toMetaString = function(){
	var metaString = "";
	for(var i=0; i < this.transducers.length; i++){
		metaString += (this.transducers[i].toMetaString()+"\n");
	}
	
	return metaString;
};

Device.prototype.toDataString = function(){
	var dataString = "";

	for(var i=0; i < this.transducers.length; i++){
		var data = this.transducers[i].getSensorData();
		if(data){
			dataString += (data.toXMLString()+"\n");
		}
	}
	
	return dataString;
};

/**
 * Checks if any transducer has unpublished sensor value
 */
Device.prototype.isDataDirty = function(){
	for(var i=0; i < this.transducers.length; i++){
		if(this.transducers[i].isDataDirty){
			return true;
		}
	}
	
	return false;
};

Device.prototype.setDataDirty = function(flag){
	for(var i=0; i < this.transducers.length; i++){
		this.transducers[i].isDataDirty = flag;
	}	
};

/**
 * Checks if any transducer has unpublished sensor value
 */
Device.prototype.isMetaDirty = function(){
	for(var i=0; i < this.transducers.length; i++){
		if(this.transducers[i].isMetaDirty){
			return true;
		}
	}
	
	return false;
};

Device.prototype.setMetaDirty = function(flag){
	for(var i=0; i < this.transducers.length; i++){
		this.transducers[i].isMetaDirty = flag;
	}	
};


/**
 * Returns the name of this device
 */
Device.prototype.getName = function() {
	return this.name;
};

/**
 * Returns the type of this device
 */
Device.prototype.getType = function() {
	return this.type;
};

Device.prototype.addTransducer = function(transducer){
	this.transducers.push(transducer);
};

/**
 * Returns transducer instance with specified id
 */
Device.prototype.getTransducer = function(id){
	for(var i=0; i < this.transducers.length; i++){
		if(this.transducers[i].id == id){
			return this.transducers[i];
		}
	}

	return null;
};

/**
 * Returns transducer instance with specified id
 */
Device.prototype.hasTransducer = function(id){
	for(var i=0; i < this.transducers.length; i++){
		if(this.transducers[i].id == id){
			return true;
		}
	}

	return false;
};

Device.prototype.getTransducerAt = function(index){
	if(index >= this.getTransducerCount()){
		return null;
	}
	return this.transducers[index];
};

Device.prototype.getTransducerCount = function(){
	return this.transducers.length;
};

/**
 * Registers a listener object to this device.
 * 
 * @param soxEventListener
 *            SoxEventListener instance
 */
Device.prototype.setSoxEventListener = function(soxEventListener) {
	this.soxEventListener = soxEventListener;
};
