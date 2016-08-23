/**

以下のようなXMLノードのjQueryオブジェクトを引数に、センサデータのインスタンスを作成する

<transducerValue rawvalue='52' timestamp='2014-01-08T18:54:21.485+09:00' typedvalue='52' id='unko'/>

**/

function SensorData(id, timestamp, rawValue, typedValue){
    this.rawValue = rawValue;
    this.typedValue = typedValue;
    this.id = id;
    this.timestamp = timestamp;
}

SensorData.prototype.getId = function(){
    return this.id;
};

/**
 * 単位変換前の生データを返す
 **/
SensorData.prototype.getRawValue = function(){
    return this.rawValue;
};

/**
 * センサデータ生成時刻を表すDateオブジェクトを返す
 **/
SensorData.prototype.getTimestamp = function(){
    return this.timestamp;
};

/**
 * 単位変換後のデータを返す
 **/
SensorData.prototype.getTypedValue = function(){
    return this.typedValue;
};

SensorData.fromXMLString = function(xml){
    var jQueryObject = $(xml);
    var rawValue = jQueryObject.attr("rawvalue");
    var typedValue = jQueryObject.attr("typedvalue");
    var id = jQueryObject.attr("id");
    
    var timeParser = /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)*/;
    var timeReg = timeParser.exec(jQueryObject.attr("timestamp"));

    if(!timeReg && !timeRegForSensorizer){
        console.log("####### timeReg is null (id="+id+" timestamp="+jQueryObject.attr("timestamp")+")");
        var timestamp = jQueryObject.attr("timestamp");
        return null;
    }else{
        var timestamp = new Date(timeReg[1], parseInt(timeReg[2])-1, timeReg[3], timeReg[4], timeReg[5], timeReg[6]);
        return new SensorData(id, timestamp, rawValue, typedValue);
    }
};

SensorData.prototype.toXMLString = function(){
	var offset = this.timestamp.getTimezoneOffset() / 60;
	var ts = this.timestamp.getFullYear()+"-"+
			(this.timestamp.getMonth()+1)+"-"+
			this.timestamp.getDate()+"T"+
			this.timestamp.getHours()+":"+
			this.timestamp.getMinutes()+":"+
			this.timestamp.getSeconds()+"."+
			("00"+this.timestamp.getMilliseconds()).slice(-3)+
			(offset < 0 ? "-" : "+")+offset+":00";

	return "<transducerValue rawValue='"+this.rawValue+"' "+
		"typedValue='"+this.typedValue+"' "+
		"timestamp='"+ts+"' "+
		"id='"+this.id+"'/>";
};

/**
 * このセンサデータの文字列表現を返す
 **/
SensorData.prototype.toString = function(){
    return "SensorData[rawValue="+this.rawValue+", typedValue="+this.typedValue+", timestamp="+this.timestamp.toString()+", id="+this.id+"]";
};
