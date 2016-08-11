function SoxEventListener() {}

/**
 * Called when the device, to which this listener is registered, receives a new sensor data.
 * 
 * @param soxEvent { soxClient: SoxClient instance, device: Device instance, transducers: Transducer instances}
 */
SoxEventListener.prototype.sensorDataReceived = function(soxEvent) {};

/**
 * Called when the device, to which this listener is registered, receives a new meta data.
 * 
 * @param soxEvent { soxClient: SoxClient instance, device: Device instance }
 */
SoxEventListener.prototype.metaDataReceived = function(soxEvent) {};

/**
 * Called when the device, to which this listener is registered, has successfully established
 * a connection to the server
 * @param soxEvent {soxClient: SoxClient instance}
 */
SoxEventListener.prototype.connected = function(soxEvent){};

/**
 * Called when the connection request to the device, to which this listener is registered, 
 * has failed.
 * @param soxEvent {soxClient: SoxClient instance, errorCode: errorCode(http://xmpp.org/extensions/xep-0086.html)}
 */
SoxEventListener.prototype.connectionFailed = function(soxEvent){};

/**
 * Called when the program has disconnected from the device
 * @param soxEvent {soxClient: SoxClient instance}
 */
SoxEventListener.prototype.disconnected = function(soxEvent){};

/**
 * Called when a node creation request has been processed by the server successfully
 * @param soxEvent {soxClient: SoxClient instance, device: device}
 */
SoxEventListener.prototype.created = function(soxEvent){};

/**
 * Called when a node creation request has been failed by the server
 * @param soxEvent {soxClient: SoxClient instance, device: device, nodeName: "name", errorCode: errorCode(http://xmpp.org/extensions/xep-0086.html)}
 */
SoxEventListener.prototype.creationFailed = function(soxEvent){};

/**
 * Called when node discovery request has been processed by the server successfully
 * @param soxEvent {soxClient: SoxClient instance, devices: device array}
 */
SoxEventListener.prototype.discovered = function(soxEvent){};

/**
 * Called when node discovery request has been failed
 * @param soxEvent {soxClient: SoxClient instance, errorCode: errorCode(http://xmpp.org/extensions/xep-0086.html)}
 */
SoxEventListener.prototype.discoveryFailed = function(soxEvent){};

/**
 * Called when node resolve request has been processed by the server successfully
 * @param soxEvent {soxClient: SoxClient instance, device: device}
 */
SoxEventListener.prototype.resolved = function(soxEvent){};

/**
 * Called when node resolve request has been failed
 * @param soxEvent {soxClient: SoxClient instance, device: device, errorCode: errorCode(http://xmpp.org/extensions/xep-0086.html)}
 */
SoxEventListener.prototype.resolveFailed = function(soxEvent){};

/**
 * Called when a node deletion request has been processed by the server successfully
 * @param soxEvent {soxClient: SoxClient instance, device: device}
 */
SoxEventListener.prototype.deleted = function(soxEvent){};

/**
 * Called when a node deletion request has been failed by the server
 * @param soxEvent {soxClient: SoxClient instance, device: device, nodeName: "name", errorCode: errorCode(http://xmpp.org/extensions/xep-0086.html)}
 */
SoxEventListener.prototype.deletionFailed = function(soxEvent){};

/**
 * Called when a subscription request to the device, to which this listener is registered, 
 * has successfully processed by the server
 * 
 * @param soxEvent {device: Device instance}
 */
SoxEventListener.prototype.subscribed = function(soxEvent){};

/**
 * Called when a publish request has successfully processed by the server
 * 
 * @param soxEvent {device: Device instance}
 */
SoxEventListener.prototype.published = function(soxEvent){};

/**
 * Called when a subscription request to the device, to which this listener is registered, 
 * has failed.
 * 
 * @param soxEvent {device: Device instance, nodeName: "name", errorCode: errorCode(http://xmpp.org/extensions/xep-0086.html)}
 */
SoxEventListener.prototype.subscriptionFailed = function(soxEvent){};

/**
 * Called when the unsubscription request to the device, to which this listener is registered, 
 * has successfully processed by the server
 * 
 * @param soxEvent {device: Device instance, nodeName: "name"}
 */
SoxEventListener.prototype.unsubscribed = function(soxEvent){};

/**
 * Called when the unsubscription request to the device, to which this listener is registered, 
 * has failed.
 * 
 * @param soxEvent {device: Device instance, nodeName: "name", errorCode: errorCode(http://xmpp.org/extensions/xep-0086.html)}
 */
SoxEventListener.prototype.unsubscriptionFailed = function(soxEvent){};

