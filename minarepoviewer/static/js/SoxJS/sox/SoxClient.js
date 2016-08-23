/**
 * BOSHサービス(HTTP-XMPPブリッジ)のURLとXMPPサーバホスト名、ノード名を
 * 指定して、SoxClientを作成する。ノード名には_dataや_metaを除いた部分を 指定する。
 */
function SoxClient(boshService, xmppServer, jid, password) {
	// server information
	this.boshService = boshService;
	this.xmppServer = xmppServer;
	// admin credentials
	this.jid = jid;
	this.password = password;
	this.authenticated = false;
	this.connection = null;
	this.soxEventListener = null;
	this.subscribedDevices = new Array();

    this.isAnonymousAllowed = true;
}

SoxClient.prototype.toString = function() {
	return "[SoxClient xmppServer=" + this.xmppServer + ", authenticated=" + this.authenticated + ", connected=" + this.isConnected() + "]";
};

SoxClient.prototype.rawInput = function(data) {
	if (window.console) {
		console.log("RECV: " + data);
	}
};

SoxClient.prototype.rawOutput = function(data) {
	if (window.console) {
		console.log("SENT: " + data);
	}
};

SoxClient.prototype.isConnected = function() {
	return (this.connection != null) && this.connection.connected;
};

/**
 * Establishes a connection to the server specified in the constructor,
 */
SoxClient.prototype.connect = function() {
	this.connection = new Strophe.Connection(this.boshService);
	this.connection.rawInput = this.rawInput;
	this.connection.rawOutput = this.rawOutput;
	var me = this;
	var callback = function(status) {
		if (status == Strophe.Status.CONNECTING) {
			console.log('[SoxClient.js] Connecting...');
		} else if (status == Strophe.Status.CONNFAIL) {
			console.log('[SoxClient.js] Connection failed');
			if (me.soxEventListener) {
				me.soxEventListener.connectionFailed({
					soxClient : me
				});
			}
		} else if (status == Strophe.Status.DISCONNECTING) {
			console.log('[SoxClient.js] Disconnecting...');
		} else if (status == Strophe.Status.DISCONNECTED) {
			console.log('[SoxClient.js] Disconnected');
			if (me.soxEventListener) {
				me.soxEventListener.disconnected({
					soxClient : me
				});
			}
		} else if (status == Strophe.Status.CONNECTED) {
			if (me.jid && me.password) {
				// if jid and password are given, we are authenticated by the
				// server
				me.authenticated = true;
			}
			console.log("[SoxClient.js] Connected to " + me);
			me.connection.send($pres().c('priority').t('-1'));

			me.connection.PubSub.bind('xmpp:pubsub:last-published-item', function(obj) {
				try {
					me._processLastPublishedItem(obj.node, obj.id, obj.entry, obj.timestamp);
				} catch (e) {
					printStackTrace(e);
					alert(e);
				}
			});
			me.connection.PubSub.bind('xmpp:pubsub:item-published', function(obj) {
				try {
					me._processPublishedItem(obj.node, obj.id, obj.entry);
				} catch (e) {
					printStackTrace(e);
					alert(e);
				}
			});

			if (me.soxEventListener) {
				me.soxEventListener.connected({
					soxClient : me
				});
			}
		}
		return true;
	};

	if (this.jid && this.password) {
		this.connection.connect(this.jid, this.password, callback);
	} else {
		this.connection.connect(this.xmppServer + "/pubsub", "", callback);
	}

	return true;

};

/**
 * Disconnect from server
 */
SoxClient.prototype.disconnect = function() {
    if(!this.isAnonymousAllowed){
    	if (!this.connection || !this.authenticated) {
    		return false;
    	}
    } else if (!this.connection){
        return false;
    }

	this.connection.disconnect("Because I want to...");
	return true;
};

/**
 * jQueryオブジェクトをダンプする
 */
(function($){
	$.fn.dump = function(){
		var elements = this;
		var dumphtml = [];
		
		elements.each(function(){
			var element = $(this);
			if($.browser.msie) {
				for(var i = 0; i < element.length; i++) {
					dumphtml.push(element[i].outerHTML.replace(/^[\r\n\t]+/, ''));
					dumphtml.push("\n");
				}
			} else {
				for(var i = 0; i < element.length; i++) {
					dumphtml.push('<' + element[i].nodeName.toLowerCase());
					for(var j = 0; j < element[i].attributes.length; j++) {
						dumphtml.push(' ' + element[i].attributes[j].nodeName + '="' 
							+ element[i].attributes[j].nodeValue + '"');
					}
					dumphtml.push('>' + element[i].innerHTML);
					dumphtml.push('<\/' + element[i].nodeName.toLowerCase() + '>');
					dumphtml.push("\n");
				}
			}
		});
		alert(dumphtml.join(''));
		
		return this;
	};
})(jQuery);

SoxClient.prototype.resolveDevice = function(device) {
    if(!this.isAnonymousAllowed){
    	if (!this.connection || !this.authenticated) {
    		return false;
    	}
    } else if (!this.connection){
        return false;
    }

	var me = this;
	console.log("[SoxClient.js] resolveDevice name=" + device.nodeName);
	var successCallback = function(data) {
		/* dataは以下のような感じ
		<body xmlns='http://jabber.org/protocol/httpbind'><presence xmlns='jabber:client' from='sensorizer@sox.ht.sfc.keio.ac.jp/9719511701413823240149044' to='sensorizer@sox.ht.sfc.keio.ac.jp/4256993771413823283837524'><priority>-1</priority><delay xmlns='urn:xmpp:delay' from='sensorizer@sox.ht.sfc.keio.ac.jp/9719511701413823240149044' stamp='2014-10-20T16:40:40Z'/><x xmlns='jabber:x:delay' stamp='20141020T16:40:40'/></presence><presence xmlns='jabber:client' from='sensorizer@sox.ht.sfc.keio.ac.jp/937465781413816191856773' to='sensorizer@sox.ht.sfc.keio.ac.jp/4256993771413823283837524'><priority>-1</priority><delay xmlns='urn:xmpp:delay' from='sensorizer@sox.ht.sfc.keio.ac.jp/937465781413816191856773' stamp='2014-10-20T14:43:12Z'/><x xmlns='jabber:x:delay' stamp='20141020T14:43:12'/></presence><presence xmlns='jabber:client' from='sensorizer@sox.ht.sfc.keio.ac.jp/27765683871413823264621828' to='sensorizer@sox.ht.sfc.keio.ac.jp/4256993771413823283837524'><priority>-1</priority><delay xmlns='urn:xmpp:delay' from='sensorizer@sox.ht.sfc.keio.ac.jp/27765683871413823264621828' stamp='2014-10-20T16:41:05Z'/><x xmlns='jabber:x:delay' stamp='20141020T16:41:05'/></presence><presence xmlns='jabber:client' from='sensorizer@sox.ht.sfc.keio.ac.jp/4256993771413823283837524' to='sensorizer@sox.ht.sfc.keio.ac.jp/4256993771413823283837524'><priority>-1</priority></presence><iq xmlns='jabber:client' from='pubsub.sox.ht.sfc.keio.ac.jp' to='sensorizer@sox.ht.sfc.keio.ac.jp/4256993771413823283837524' id='1:sendIQ' type='result'><pubsub xmlns='http://jabber.org/protocol/pubsub'><items node='しらすの入荷情報湘南_meta'><item id='metaInfo'><device name='しらすの入荷情報湘南' type='outdoor weather'>&lt;transducer name=&apos;url&apos; id=&apos;url&apos; /&gt;
		&lt;transducer name=&apos;入荷情報&apos; id=&apos;入荷情報&apos; /&gt;
		&lt;transducer name=&apos;latitude&apos; id=&apos;latitude&apos; /&gt;
		&lt;transducer name=&apos;longitude&apos; id=&apos;longitude&apos; /&gt;
		&lt;transducer name=&apos;天気&apos; id=&apos;天気&apos; /&gt;
		&lt;transducer name=&apos;気温&apos; id=&apos;気温&apos; units=&apos;℃&apos; /&gt;
		</device></item></items></pubsub></iq></body>
		**/
		//$(data).dump();
		try {
			var deviceElement = $(data).find('device');
			device.name = $(deviceElement).attr('name');
			device.type = $(deviceElement).attr('type');
			
			var transducerElements = $($(data).text()); 
            if ($(data).text().trim() == ""){
                transducerElements = $($($($(data)).html()).html());
            }

			for (var i = 0; i < transducerElements.length; i++) {
				var transducer = Transducer.fromXML(transducerElements.eq(i));
				if (device.getTransducer(transducer.id) || transducer.id == undefined) {
					continue;
				}
				device.addTransducer(transducer);
				console.log("[SoxClient.js] SoxClient::resolveDevice: Created " + transducer);
			}
			if (me.soxEventListener) {
				me.soxEventListener.resolved({
					soxClient : me,
					device : device,
				});
			}
		} catch (e) {
			printStackTrace(e);
			if (me.soxEventListener) {
				me.soxEventListener.resolveFailed({
					soxClient : me,
					device : device,
				});
			}
		}
	};
	var failureCallback = function(data) {
		console.log("[SoxClient.js] resolve failed. device=" + device);
		if (me.soxEventListener) {
			me.soxEventListener.resolveFailed({
				soxClient : me,
				device : device,
			});
		}
	};
	this.connection.PubSub.items(device.nodeName + "_meta").done(successCallback).fail(failureCallback);
};

/**
 * Creates a new SoX device with XMPP nodes xxx_data and xxx_meta on the server
 * 
 * @param device
 *            device instance
 * @param accessModel
 *            open, authorize, whitelist, presence, or roster
 * @param publishModel
 *            open, publishers, or subscribers
 * @return false if this is not connected to the server or the connection is not
 *         authenticated
 */
SoxClient.prototype.createDevice = function(device) {

	if (!this.isConnected() || !this.authenticated) {
		console.log("[SoxClient.js] not connected.");
		return false;
	}
	var me = this;
	var failureCallback = function(data) {
		/**
		 * creation failure! data is iq element [server reply (data)] <body
		 * xmlns='http://jabber.org/protocol/httpbind'> <iq
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/1376813336139165838253271'
		 * type='error' id='18:pubsub'> <pubsub
		 * xmlns='http://jabber.org/protocol/pubsub'> <create node='hoge_meta'/>
		 * <configure> <x xmlns='jabber:x:data' type='submit'> <field
		 * type='hidden' var='FORM_TYPE'>
		 * <value>http://jabber.org/protocol/pubsub#node_config</value>
		 * </field> <field type='text-single' var='pubsub#access_model'>
		 * <value>open</value> </field> <field type='text-single'
		 * var='pubsub#publish_model'> <value>open</value> </field> <field
		 * type='text-single' var='pubsub#max_items'> <value>1</value> </field>
		 * </x> </configure> </pubsub> <error code='409' type='cancel'>
		 * <conflict xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/> </error>
		 * </iq> </body>
		 */
		var nodeName = $(data).find('create').attr('node');
		var errorCode = $(data).find('error').attr('code');
		console.log("Failed to create: " + nodeName);
		if (me.soxEventListener) {
			me.soxEventListener.creationFailed({
				soxClient : me,
				device : device,
				nodeName : nodeName,
				errorCode : errorCode
			});
		}
	};

	var successMetaCallback = function(data) {
		/**
		 * creation successfull! data is iq element [server reply (data)] <body
		 * xmlns='http://jabber.org/protocol/httpbind'> <iq
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/1376813336139165838253271'
		 * id='15:pubsub' type='result'> <pubsub
		 * xmlns='http://jabber.org/protocol/pubsub'> <create node='hoge_data'/>
		 * </pubsub> </iq> </body>
		 */
		var nodeName = $(data).find("create").attr("node");
		console.log("Created: " + nodeName);
		if (me.soxEventListener) {
			me.soxEventListener.created({
				soxClient : me,
				device : device
			});
		}
		device.setMetaDirty(true);
	};

	var successDataCallback = function(data) {
		/* postpone setting data dirty flag till actual data is set */
		// device.setDataDirty(true);
		var nodeName = $(data).find("create").attr("node");
		console.log("[SoxClient.js] Created: " + nodeName);
		// create _meta node
		me.connection.PubSub.createNode(device.nodeName + "_meta", {
			'pubsub#access_model' : device.accessModel,
			'pubsub#publish_model' : device.publishModel,
			'pubsub#max_items' : 1
		}).done(successMetaCallback).fail(failureCallback);
	};
	console.log("[SoxClient.js] Creating " + device.nodeName);

	// first create _data node
	this.connection.PubSub.createNode(device.nodeName + "_data", {
		'pubsub#access_model' : device.accessModel,
		'pubsub#publish_model' : device.publishModel,
		'pubsub#max_items' : 1
	}).done(successDataCallback).fail(failureCallback);

	return true;
};

/**
 * Delets a SoX device with XMPP nodes xxx_data and xxx_meta on the server
 * 
 * @param device
 *            the device to delete
 * @return false if this is not connected to the server or the connection is not
 *         authenticated
 */
SoxClient.prototype.deleteDevice = function(device) {
	if (!this.isConnected() || !this.authenticated) {
		return false;
	}
	var me = this;
	// callback for _meta node deletion
	var successMetaCallback = function(data) {
		/**
		 * deletion successful [server response (data)] <body
		 * xmlns='http://jabber.org/protocol/httpbind'> <iq
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/207117033513916731381698'
		 * id='6:pubsub' type='result'/> </body>
		 */
		console.log("[SoxClient.js] Deleted: " + device.nodeName + "_meta");
		if (me.soxEventListener) {
			me.soxEventListener.deleted({
				soxClient : me,
				device : device
			});
		}
	};
	// callback for _data node deletion
	var successDataCallback = function(data) {
		console.log("[SoxClient.js] Deleted: " + device.nodeName + "_data");
		me.connection.PubSub.deleteNode(device.nodeName + "_meta").done(successMetaCallback).fail(failureCallback);
	};
	// callback for errors
	var failureCallback = function(data) {
		/**
		 * deletion failed [server response (data)] <body
		 * xmlns='http://jabber.org/protocol/httpbind'> <iq
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/1187778913139167712338840'
		 * type='error' id='7:pubsub'> <pubsub
		 * xmlns='http://jabber.org/protocol/pubsub#owner'> <delete
		 * node='hoge_data'/> </pubsub> <error code='404' type='cancel'>
		 * <item-not-found xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/>
		 * </error> </iq> </body>
		 */
		var nodeName = $(data).find('delete').attr('node');
		var errorCode = $(data).find('error').attr('code');
		console.log("[SoxClient.js] Failed to delete: " + device.nodeName + " code=" + errorCode);
		if (me.soxEventListener) {
			me.soxEventListener.deletionFailed({
				soxClient : me,
				device : device,
				nodeName : nodeName,
				errorCode : errorCode
			});
		}
	};

	console.log("[SoxClient.js] Deleting " + device);
	this.connection.PubSub.deleteNode(device.nodeName + "_data").done(successDataCallback).fail(failureCallback);

	return true;
};

/**
 * Discover all the devices created on the server. If a query is given, this
 * function tries to find the device that has the string in the query as its
 * basename.
 * 
 * QUERY RESULT N/A All devices abc The device having abc_meta and abc_data
 */
SoxClient.prototype.discoverDevices = function(query) {
	if (!this.isConnected()) {
		return false;
	}

	var me = this;
	var successCallback = function(data) {
		console.log("[SoxClient.js] data={" + data + "}");
		var devices = new Array();
		if (Array.isArray(data)) {
			data.forEach(function(node) {
				console.log(">>>>> node=" + node);
				if (node.indexOf('_meta') != -1) {
					var nodeBaseName = node.substr(0, node.length - 5);
					if (query && query == nodeBaseName) {
						/*
						 * query is given and the query matches to the device
						 * node name
						 */
						devices.push(new Device(nodeBaseName));
						console.log(node.substr(0, node.length - 5));
					} else if (!query) {
						/* no query is given */
						devices.push(new Device(nodeBaseName));
						console.log(node.substr(0, node.length - 5));
					}
				}
			});
		}
		if (me.soxEventListener) {
			me.soxEventListener.discovered({
				soxClient : me,
				devices : devices
			});
		}
	};

	var failureCallback = function(data) {
		console.log("[SoxClient.js] SoxClient.discoverNodes.failureCallback: " + JSON.stringify(data));
		if (me.soxEventListener) {
			me.soxEventListener.discoveryFailed({
				soxClient : me
			});
		}
	};

	// if(query){
	// this.connection.PubSub.discoverNodes(query+"_meta").done(successCallback).fail(failureCallback);
	// }else{
	this.connection.PubSub.discoverNodes().done(successCallback).fail(failureCallback);
	// }
	return true;
};

SoxClient.prototype.publishDevice = function(device) {
	if (!this.isConnected()) {
		return false;
	}
	var me = this;
	var successMetaCallback = function(data) {
		/**
		 * <body xmlns='http://jabber.org/protocol/httpbind'> <iq
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/28891197051391135161948900'
		 * id='3:pubsub' type='result'> <pubsub
		 * xmlns='http://jabber.org/protocol/pubsub'> <publish node='nodeName'>
		 * <item id='metaInfo'/> </publish> </pubsub> </iq> </body>
		 */
		var nodeName = $(data).find('publish').attr('node');
		console.log("[SoxClient.js] Published: " + device.name + "_meta");
		device.setMetaDirty(false);
		if (me.soxEventListener) {
			me.soxEventListener.published({
				soxClient : me,
				nodeName : device.name + "_meta",
				device : device
			});
		}
	};

	var successDataCallback = function(data) {
		/**
		 * <body xmlns='http://jabber.org/protocol/httpbind'> <iq
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/28891197051391135161948900'
		 * id='3:pubsub' type='result'> <pubsub
		 * xmlns='http://jabber.org/protocol/pubsub'> <publish node='nodeName'>
		 * <item id='metaInfo'/> </publish> </pubsub> </iq> </body>
		 */
		var nodeName = $(data).find('publish').attr('node');
		console.log("[SoxClient.js] Published: " + device.name + "_data");
		device.setDataDirty(false);
		if (me.soxEventListener) {
			me.soxEventListener.published({
				soxClient : me,
				nodeName : device.name + "_data",
				device : device
			});
		}
	};
	var failureCallback = function(data) {
		console.log("[SoxClient.js] Publish Failed: ");
	};

	if (device.isDataDirty()) {
		this.connection.PubSub.publish(device.nodeName + "_data", $build('data').t(device.toDataString()).tree(), device.nodeName + "_data").done(
				successDataCallback).fail(failureCallback);
	}

	if (device.isMetaDirty()) {
		this.connection.PubSub.publish(device.nodeName + "_meta", $build('device', {
			name : device.name,
			type : device.type
		}).t(device.toMetaString()).tree(), 'metaInfo').done(successMetaCallback).fail(failureCallback);
	}

	return true;
};

/**
 * このデバイスをサブスクライブする。サブスクライブに失敗したら、このインスタンスを 例外として投げる。サブスクライブに成功したらコールバック関数を呼び出す。
 * This function returns true when a subscription request has been sent to the
 * server without waiting for its reply. If you need to be reminded when the
 * request has been processed, please register a soxEventListener using
 * setsoxEventListener method. If connection is not yet made, this function
 * returns false. It also returns false if the device is already subscribed.
 */
SoxClient.prototype.subscribeDevice = function(device) {
	if (!device) {
		console.log("[SoxClient.js] device is undefined.");
		return false;
	}
	if (!this.isConnected() || (device.metaSubscribed && device.dataSubscribed)) {
		return false;
	}
	console.log("[SoxClient.js] SoxClient::subscribeDevice: Subscribing " + device.toString());
	var me = this;
	this.subscribedDevices[device.nodeName] = device;

	var successDataCallback = function(data) {
		device.dataSubid = $(data).find('subscription').attr('subid');
		device.dataSubscribed = true;
		console.log("[SoxClient.js] SoxClient::subscribeDevice: Subscribed: " + device.nodeName + "_data");
		if (me.soxEventListener) {
			me.soxEventListener.subscribed({
				soxClient : me,
				device : device
			});
		}
	};
	var successMetaCallback = function(data) {
		/**
		 * subscription successfull [server response (data)] <body
		 * xmlns='http://jabber.org/protocol/httpbind'> <message
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/2473748927139170367828983'> <event
		 * xmlns='http://jabber.org/protocol/pubsub#event'> <items
		 * node='hoge_meta'/> </event> </message> <iq xmlns='jabber:client'
		 * from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/2473748927139170367828983'
		 * id='9:pubsub' type='result'> <pubsub
		 * xmlns='http://jabber.org/protocol/pubsub'> <subscription
		 * jid='guest@ps.ht.sfc.keio.ac.jp/2473748927139170367828983'
		 * subscription='subscribed' subid='56F1130152627' node='hoge_meta'/>
		 * </pubsub> </iq> </body>
		 */
		device.metaSubid = $(data).find('subscription').attr('subid');
		device.metaSubscribed = true;
		console.log("[SoxClient.js] SoxClient::subscribeDevice: Subscribed: " + device.nodeName + "_meta");
		me.connection.PubSub.subscribe(device.nodeName + "_data").done(successDataCallback).fail(failureCallback);
	};
	var failureCallback = function(data) {
		/**
		 * subscription failure [server response (data)] <body
		 * xmlns='http://jabber.org/protocol/httpbind'> <iq
		 * xmlns='jabber:client' from='pubsub.ps.ht.sfc.keio.ac.jp'
		 * to='guest@ps.ht.sfc.keio.ac.jp/2473748927139170367828983'
		 * type='error' id='12:pubsub'> <pubsub
		 * xmlns='http://jabber.org/protocol/pubsub'> <subscribe
		 * node='hoge_data'
		 * jid='guest@ps.ht.sfc.keio.ac.jp/2473748927139170367828983'/>
		 * </pubsub> <error code='404' type='cancel'> <item-not-found
		 * xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/> </error> </iq> </body>
		 */
		var nodeName = $(data).find('subscription').attr('node');
		var errorCode = $(data).find('error').attr('code');
		delete me.subscribedDevices[device.nodeName];
		console.log("[SoxClient.js] SoxClient::subscribeDevice: Subscription Failed: " + nodeName);
		if (me.soxEventListener) {
			me.soxEventListener.subscriptionFailed({
				device : device,
				nodeName : nodeName,
				errorCode : errorCode
			});
		}
	};

	/**
	 * we first subscribe _meta node so that Device instance is successfully
	 * generated before receiving last published item of corresponding _data
	 * node
	 */
	this.connection.PubSub.subscribe(device.nodeName + "_meta").done(successMetaCallback).fail(failureCallback);

	return true;
};

/**
 * Unsubscribes from the device. This function returns true when a
 * unsubscription request has been sent to the server without waiting for its
 * reply. If you need to be reminded when the request has been processed, please
 * register a soxEventListener using setsoxEventListener method. If connection
 * is not yet made, this function returns false.
 */
SoxClient.prototype.unsubscribeDevice = function(device) {
	if (!this.isConnected() || (!device.metaSubscribed && !device.dataSubscribed)) {
		return false;
	}
	console.log("[SoxClient.js] Unsubscribing " + device.toString());

	var me = this;
	var successMetaCallback = function(data) {
		device.metaSubid = null;
		device.metaSubscribed = false;
		delete this.subscribedDevices[device.nodeName];
		if (me.soxEventListener) {
			me.soxEventListener.unsubscribed({
				soxClient : me,
				device : device,
				nodeName : nodeName
			});
		}
		console.log("[SoxClient.js] Unsubscribed: " + device);
	};
	var successDataCallback = function(data) {
		device.dataSubid = null;
		device.dataSubscribed = false;
		this.connection.PubSub.unsubscribe(device.nodeName + "_meta").done(successMetaCallback).fail(failureCallback);
	};
	var failureCallback = function(data) {
		var nodeName = $(data).find('subscription').attr('node');
		console.log("[SoxClient.js] Unsubscription Failed: " + nodeName);
		if (me.soxEventListener) {
			me.soxEventListener.unsubscriptionFailed({
				soxClient : me,
				device : device,
				nodeName : nodeName
			});
		}
	};

	// first subscribe _data node
	this.connection.PubSub.unsubscribe(device.nodeName + "_data").done(successDataCallback).fail(failureCallback);

	return true;
};

/**
 * Unsubscribes from all subscription
 */
SoxClient.prototype.unsubscribeAll = function() {
	if (!this.isConnected()) {
		return false;
	}

	var me = this;
	var successCallback = function(data) {
		/**
		 * parameter "data" is an array of the following objects
		 * {"node":"Air_at_Fujisawa_Goshomi_Elementary_School_data",
		 * "jid":"guest@sox.ht.sfc.keio.ac.jp/24963379221399978317593251",
		 * "subid":"577EEDA9B051F", "subscription":"subscribed"}
		 */
		for (var i = 0; i < data.length && i < 100; i++) {
			// console.log("SoxClient.unsubscribeAll: node="+data[i].node+",
			// jid="+data[i].jid+", subid="+data[i].subid);
			console.log("[SoxClient.js] SoxClient.unsubscribeAll: # of subscription=" + data.length);
			me.connection.PubSub.unsubscribe(data[i].node, data[i].jid, data[i].subid).done(function() {
				var now = new Date();
				console.log("[SoxClient.js] " + now + " unsubscribed " + data[i].node + ", " + data[i].jid);
			}).fail(function() {
				console.log("[SoxClient.js] failed to unsubscribe " + data[i].node + ", " + data[i].jid);
			});
		}
		if (data.length > 1) {
			me.unsubscribeAll();
		}
	};

	var failureCallback = function(data) {
		console.log("[SoxClient.js] SoxClient.getSubscriptions.failureCallback: " + data);
	};

	// first subscribe _data node
	this.connection.PubSub.getSubscriptions().done(successCallback).fail(failureCallback);

	return true;
};

/**
 * Checks if the node with specified name exists on the specified server
 * 
 * @param callback
 * @param callbackArg
 */
SoxClient.prototype.exists = function(nodeName) {
	return false;
};

/**
 * Registers a listener object to this device.
 * 
 * @param soxEventListener
 *            SoxEventListener instance
 */
SoxClient.prototype.setSoxEventListener = function(soxEventListener) {
	this.soxEventListener = soxEventListener;
};

SoxClient.prototype.getSoxEventListener = function() {
	return this.soxEventListener;
};

/**
 * Returns an instance of Device whose name is equal to the specified one
 * 
 * @param name
 *            XMPP node name without _data or _meta or the device name
 */
SoxClient.prototype.getDevice = function(name) {

};

/**
 * Process the last published item on the specified node, which is given by the
 * server right after a subscription.
 */
SoxClient.prototype._processLastPublishedItem = function(node, id, entry, timestamp) {
	// replace special character to tags
	entry = entry.toString().replace(/&lt;/g, "<");
	entry = entry.toString().replace(/&gt;/g, ">");
	entry = entry.toString().replace(/&apos;/g, "'");

	var nodeName = node.substring(0, node.indexOf("_"));
	if (!this.subscribedDevices[nodeName]) {
		// we come here if a node is subscribed during the past execution of the
		// program.
		// this happens because XMPP server is stateful.
		this.subscribedDevices[nodeName] = new Device(nodeName);
	}

	if (node.indexOf('_meta') != -1) {
		var deviceElement = $(entry).find('device');
		this.subscribedDevices[nodeName].name = $(deviceElement).attr('name');
		this.subscribedDevices[nodeName].type = $(deviceElement).attr('type');

		var transducerElements = $(entry).find("transducer");
		for (var i = 0; i < transducerElements.length; i++) {
			var transducer = Transducer.fromXML(transducerElements.eq(i));
			if (this.subscribedDevices[nodeName].getTransducer(transducer.id)) {
				continue;
			}
			this.subscribedDevices[nodeName].addTransducer(transducer);
			console.log("[SoxClient.js] SoxClient::_processLastPublishedItem: Created " + transducer);
		}

		
		if (this.soxEventListener) { this.soxEventListener.metaDataReceived({
		soxClient : this, device : this.subscribedDevices[nodeName], }); }
		
	} else if (node.indexOf("_data") != -1) {
		var updatedTransducers = new Array();
		var transducerValues = $(entry).find("transducerValue");
		for (var i = 0; i < transducerValues.length; i++) {
			var data = SensorData.fromXMLString(transducerValues.eq(i));
			if (!data) {
				/* Transducerに値が入っていないとき、上の関数はnullを返す。ので、それの処理を飛ばす */
				continue;
			}
			var transducer = this.subscribedDevices[nodeName].getTransducer(data.id);
			if (!transducer) {
				console.log("[SoxClient.js] no transducer found for " + data.toString());
				continue;
			} else if (transducer.setSensorData(data)) {
				updatedTransducers.push(transducer);
			}
			console.log("[SoxClient.js] SoxClient::_processLastPublishedItem: Received " + data.toString());
		}

		
		 if (this.soxEventListener) {
		 this.soxEventListener.sensorDataReceived({ soxClient : this, device :
		 this.subscribedDevices[nodeName], transducers : updatedTransducers
		 }); }
		
	}
	console.log("[SoxClient.js] SoxClient::_processLastPublishedItem:  finished");
	return true;
};

/**
 * サーバから非同期に送られてくる最新アイテムを処理する
 */
SoxClient.prototype._processPublishedItem = function(node, id, entry) {
	// For soxPublisher.html, replace special character to tags
	entry = entry.toString().replace(/&lt;/g, "<");
	entry = entry.toString().replace(/&gt;/g, ">");
	entry = entry.toString().replace(/&apos;/g, "'");
	// alert("processPublishedItem: node="+node);

	if (node.indexOf("_meta") != -1) {

	} else if (node.indexOf("_data") != -1) {
		var nodeName = node.substring(0, node.indexOf("_"));
		var updatedTransducers = new Array();
		var transducerValues = $(entry).find("transducerValue");
		for (var i = 0; i < transducerValues.length; i++) {
			var data = SensorData.fromXMLString(transducerValues.eq(i));
			if (!data) {
				/* Transducerに値が入っていないとき、上の関数はnullを返す。ので、それの処理を飛ばす */
				continue;
			}
			var transducer = this.subscribedDevices[nodeName].getTransducer(data.id);
			if (!transducer) {
				console.log("[SoxClient.js] SoxClient::_processPublishedItem: no transducer foudn for " + data.toString());
				continue;
			} else if (transducer.setSensorData(data)) {
				updatedTransducers.push(transducer);
			}
			console.log("[SoxClient.js] SoxClient::_processPublishedItem: Received " + data.toString());
		}
		if (this.soxEventListener) {
			this.soxEventListener.sensorDataReceived({
				soxClient : this,
				device : this.subscribedDevices[nodeName],
				transducers : updatedTransducers
			});
		}
	}
	return true;
};

// 例外オブジェクトからスタックトレースを出力する関数。
function printStackTrace(e) {
	if (e.stack) {
		// 出力方法は、使いやすいように修正する。
		console.log(e.stack);
		alert(e.stack);
	} else {
		// stackがない場合には、そのままエラー情報を出す。
		console.log(e.message, e);
	}
}
