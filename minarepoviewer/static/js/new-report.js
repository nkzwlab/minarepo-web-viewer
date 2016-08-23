var BOSHSERVICE = 'http://soxfujisawa.ht.sfc.keio.ac.jp:5280/http-bind/';
var XMPPSERVER = 'soxfujisawa.ht.sfc.keio.ac.jp';

var reportMap = null;
var reportValues = {
  user: null,
  latitude: null,
  longitude: null,
  comment: '',
  image: ''
};

var INIT_MAP_CENTER = {
  lat: 35.339193,  // 藤沢市役所(緯度)
  lng: 139.490016  // 藤沢市役所(経度)
}
var SFC = {
  lat: 35.388281,  // SFC緯度
  lng: 139.427309  // SFC経度
}

var reportTypes = [
  'ps_animal',         // 動物
  'ps_illegalGarbage', // 不法投棄
  'ps_garbageStation', // 集積所
  'ps_graffiti',       // 落書き
  'ps_damage',         // 道路
  'ps_streetlight',    // 街灯
  'ps_kyun',           // キュン
  'ps_disaster',       // 災害
  'ps_zansa',          // 残渣
  'ps_kaisyuwasure',  // 回収忘れ
  'ps_others'          // その他
];

var type2text = {
  'ps_animal': '動物の死骸',
  'ps_illegalGarbage': '不法投棄ごみ',
  'ps_garbageStation': '回収されていないゴミ',
  'ps_graffiti': '落書き',
  'ps_damage': '痛んだ道路',
  'ps_streetlight': '問題のある街灯',
  'ps_kyun': 'キュン',
  'ps_disaster': '災害の発生',
  'ps_zansa': 'ゴミの出し間違い',
  'ps_kaisyuwasure': 'ゴミの回収し忘れ',
  'ps_others': 'その他'
};

var type2textShort = {
  'ps_animal': '動物',
  'ps_illegalGarbage': '投棄',
  'ps_garbageStation': 'ゴミ置場',
  'ps_graffiti': '落書',
  'ps_damage': '道路',
  'ps_streetlight': '街灯',
  'ps_kyun': '♡♡',
  'ps_disaster': '災害',
  'ps_zansa': '残渣',
  'ps_kaisyuwasure': '回収忘れ',
  'ps_others': '他'
};

var type2img = function(type, isSelected) {
  var suffix = (isSelected) ? '' : '-unselected';
  return '/static/img/minarepo-icons/' + type + suffix +'.png';
};

var publishReport = function(type) {
  var device = new Device(type);

  for (key in reportValues) {
    var transducer = new Transducer();
    transducer.name = key;
    transducer.id = key;
    device.addTransducer(transducer);

    var data = new SensorData(key, new Date(), reportValues[key], reportValues[key]);
    transducer.setSensorData(data);
  }

  client.publishDevice(device);
};

var showToast = function(type, msg, msec) {
  $.toast({
    heading: type,
    icon: type.toLowerCase(),
    text: msg,
    hideAfter: msec,
    allowToastClose: true,
    position: 'mid-center',
    loader: false
  });
  return;
};

var constants = {
  TOGGLE_VIEWER_PAGE_BUTTON: 'TOGGLE_VIEWER_PAGE_BUTTON',
  TOGGLE_TYPE_BUTTON: 'TOGGLE_TYPE_BUTTON',
  TOGGLE_PUBLISH_BUTTON: 'TOGGLE_PUBLISH_BUTTON'
};

var MinaRepoStore = Fluxxor.createStore({
  initialize: function() {
    this.selectedType = '';

    this.bindActions(constants.TOGGLE_VIEWER_PAGE_BUTTON, this.onToggleViewerPageButton);
    this.bindActions(constants.TOGGLE_TYPE_BUTTON, this.onToggleTypeButton);
    this.bindActions(constants.TOGGLE_PUBLISH_BUTTON, this.onTogglePublishButton);
  },
  getState: function() {
    return {
      selectedType: this.selectedType
    }
  },
  onToggleViewerPageButton: function(data) {
    return;
  },
  onToggleTypeButton: function(data) {
    this.selectedType = data.type;
    reportValues.type = this.selectedType;
    this.emit('change');
  },
  onTogglePublishButton: function() {
    var rName = reportValues.user;
    var rLat = reportValues.latitude;
    var rLng = reportValues.longitude;

    if (!rName || !rLat || !rLng) {
      var toastMsg = '<p class="toast-msg">未記入の項目があります</p>';
      showToast('Error', toastMsg, '2500');
      return;
    }
    publishReport(this.selectedType);
    this.emit('change');
  }
});

var actions = {
  onToggleViewerPageButton: function() {
    window.location.href = "/";
  },
  onToggleTypeButton: function(data) {
    this.dispatch(constants.TOGGLE_TYPE_BUTTON, {type: data.type});
  },
  onTogglePublishButton: function() {
    this.dispatch(constants.TOGGLE_PUBLISH_BUTTON);
  }
};

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var stores = { MinaRepoStore: new MinaRepoStore() };
var flux = new Fluxxor.Flux(stores, actions);

var User = React.createClass({displayName: "User",
  onChangeName: function(text) {
    reportValues.user = text.target.value;
  },
  render: function() {
    var descRow = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "small-10 small-centered columns"}, 
        React.createElement("p", null, "(1) 報告者名を登録してください [", React.createElement("font", {color: "red"}, "必須"), "]")
      )
    );
    var inputRow = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "small-6 small-centered columns"}, 
        React.createElement("input", {type: "text", onChange: this.onChangeName})
      )
    );

    return React.createElement("div", null, 
      descRow, 
      inputRow
    );
  }
});

var TypeButtons = React.createClass({displayName: "TypeButtons",
  onButtonClick: function(type) {
    return function(event) {
      flux.actions.onToggleTypeButton({ type: type });
    };
  },
  render: function() {
    var selectedBtn = this.props.selectedType;

    var that = this;
    var buttons = _.map(reportTypes, function(type) {
      var shortTxtType = type2textShort[type]
      var isSelected = (selectedBtn == type);
      var imgFile = type2img(type, isSelected);
      var key = type + '-' + (isSelected ? 'selected' : 'unselected');  // React wants key!
      return React.createElement("div", {key: key, className: "column mrv-btn-container"}, 
        React.createElement("p", {className: "btn-set"}, React.createElement("img", {
          onClick: that.onButtonClick(type), 
          src: imgFile, 
          className: "mrv-btn-image"}
        ), shortTxtType)
      );
    });

    var descRow = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "small-10 small-centered columns"}, 
        React.createElement("p", null, "(2) レポート種類を選んでください [", React.createElement("font", {color: "red"}, "必須"), "]")
      )
    );
    var buttonRow = React.createElement("div", {className: "row mrv-btn-row"}, 
      React.createElement("div", {className: "small-10 medium-8 small-centered columns"}, 
        React.createElement("div", {className: "row small-up-4 large-up-7"}, 
          buttons
        )
      )
    );

    return React.createElement("div", null, 
      descRow, 
      buttonRow
    );
  }
});

var ReportMap = React.createClass({displayName: "ReportMap",
  componentDidMount: function() {
    // GoogleMaps初期化

    // FIXME: センターの位置をスマートフォンのGPSから取得する？
    // var sfcLatitude = 35.388281;
    // var sfcLongitude = 139.427309;
    reportMap = new google.maps.Map(document.getElementById('report-map'), {
        center: INIT_MAP_CENTER,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false
      }
    );

    var marker = new google.maps.Marker({
        position: null,
        map: reportMap,
        title: 'レポート地点'
    });

    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    reportMap.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    reportMap.addListener('bounds_changed', function() {
        searchBox.setBounds(reportMap.getBounds());
    });
    searchBox.addListener('places_changed', function() {
      var places = searchBox.getPlaces();

      if (places.length == 0) {
        return;
      }

      // Clear out the old markers.
      marker.setMap(null);

      var bounds = new google.maps.LatLngBounds();
      marker = new google.maps.Marker({
        map: reportMap,
        title: places[0].name,
        position: places[0].geometry.location
      });
      reportMap.fitBounds(bounds);
      reportMap.panTo(places[0].geometry.location);
      reportMap.setZoom(15);

      reportValues.latitude = places[0].geometry.location.lat();
      reportValues.longitude = places[0].geometry.location.lng();
    });

    google.maps.event.addListener(reportMap, 'click', function(e) {
      var clickedLat = e.latLng.lat();
      var clickedLng = e.latLng.lng();
      var clickedPosition = {lat: clickedLat, lng: clickedLng};
      reportValues.latitude = clickedLat;
      reportValues.longitude = clickedLng;

      reportMap.panTo(clickedPosition);
      marker.setMap(null);
      marker = new google.maps.Marker({
        position: clickedPosition,
        map: reportMap,
        title: 'レポート地点'
      });
    });

    var set = google.maps.InfoWindow.prototype.set;
    google.maps.InfoWindow.prototype.set = function(key, val) {
        if (key === 'map') {
            if (! this.get('noSuppress')) {
                return;
            }
        }
        set.apply(this, arguments);
    };
  },
  render: function() {
    var descRow = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "small-10 small-centered columns"}, 
        React.createElement("p", null, "(3) 場所を指定してください [", React.createElement("font", {color: "red"}, "必須"), "]")
      )
    );
    var mapRow = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "small-12 medium-8 small-centered columns"}, 
        React.createElement("input", {id: "pac-input", className: "controls small-2", type: "text", placeholder: "検索"}), 
        React.createElement("div", {id: "report-map", key: "report-map"})
      )
    );

    return React.createElement("div", null, 
      descRow, 
      mapRow
    );
  }
});

var ReportComment = React.createClass({displayName: "ReportComment",
  onChangeComment: function(text) {
    reportValues.comment = text.target.value;
  },
  render: function() {
    var descRow = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "small-10 small-centered columns"}, 
        React.createElement("p", null, "(4) コメントを記入してください [", React.createElement("font", {color: "blue"}, "任意"), "]")
      )
    );
    var commentRow = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "medium-8 medium-centered columns"}, 
        React.createElement("textarea", {onChange: this.onChangeComment})
      )
    );

    return React.createElement("div", null, 
      descRow, 
      commentRow
    );
  }
});

var ReportImage = React.createClass({displayName: "ReportImage",
  onUploadImage: function(img) {
    var imgfiles = img.target.files;
    if(!imgfiles.length) {
      return;
    }

    var reportImage = imgfiles[0];
    var options = {canvas: true};
    loadImage.parseMetaData(reportImage, function(data) {
      if (data.exif) {
        options.orientation = data.exif.get('Orientation');
      }
      options.maxHeight = 550;
      options.maxWidth = 550;
    });
    loadImage(
      reportImage,
      function(canvas) {
        reportValues.image = canvas.toDataURL('image/png');
      },
      options
    );
  },
  render: function() {
    return React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "small-10 small-centered columns"}, 
        React.createElement("p", null, 
          "(5) 画像を登録してください [", React.createElement("font", {color: "blue"}, "任意"), "]:", 
          React.createElement("input", {className: "file-upload-btn", type: "file", onChange: this.onUploadImage, accept: "image/*"})
        )
      )
    )
  }
});

var PublishButton = React.createClass({displayName: "PublishButton",
  componentDidMount: function() {
    client = new SoxClient(BOSHSERVICE, XMPPSERVER);

    var soxEventListener = new SoxEventListener();
    soxEventListener.connected = function(soxEvent) {
      console.debug('Connected!' + soxEvent);
    };
    soxEventListener.connectionFailed = function(soxEvent) {
      var toastMsg = '<div class="toast-msg">\
        <p>サーバに接続できませんでした．ページを再読み込みしてください</p>\
      </div>';
      showToast('Error', toastMsg, '2500');
      console.debug('Connection Failed' + soxEvent);
    };
    soxEventListener.resolved = function(soxEvent) {
      console.debug('Resolved' + soxEvent);
    };
    soxEventListener.resolveFailed = function(soxEvent) {
      console.debug('Resolve Failed' + soxEvent);
    };
    soxEventListener.published = function(soxEvent) {
      $.toast({
        hideAfter: '1500',
        heading: 'Success',
        icon: 'success',
        text: '<p class="toast-msg">送信しました</p>',
        allowToastClose: true,
        position: 'mid-center',
        loader: false,
        afterHidden: function() {
          window.location.href = "/";
        }
      });
      console.debug('Published' + soxEvent);
    };
    soxEventListener.publishFailed = function(soxEvent) {
      var toastMsg = '<div class="toast-msg">\
        <p>送信できませんでした．しばらく経ってから再度お試しください</p>\
      </div>';
      showToast('Error', toastMsg, '3000');
      console.debug('Publish Failed' + soxEvent);
    };

    client.setSoxEventListener(soxEventListener);
    client.connect();
  },
  onButtonClick: function() {
    return function(event) {
      flux.actions.onTogglePublishButton();
    };
  },
  render: function() {
    var togglePublishButton = React.createElement("div", {className: "large-2 large-centered columns"}, 
      React.createElement("button", {className: "button expanded large", onClick: this.onButtonClick()}, 
        "送信"
      )
    );

    return React.createElement("div", {className: "row"}, 
      togglePublishButton
    );
  }
});

var ViewerPageButton = React.createClass({displayName: "ViewerPageButton",
  onToggleViewerPageButton: function() {
    return function() {
      flux.actions.onToggleViewerPageButton();
    }
  },
  render: function() {
     return React.createElement("div", {className: "row"}, 
       React.createElement("div", {className: "small-10 small-centered columns mrv-btn-row"}, 
         React.createElement("a", {onClick: this.onToggleViewerPageButton()}, "<< 藤沢みなレポへ")
       )
     );
  }
});

var MinaRepoViewer = React.createClass({displayName: "MinaRepoViewer",
  render: function() {
    var header = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "large-12 columns mrv-title-container"}, 
        React.createElement("img", {src: "/static/img/minarepo-title.png", className: "mrv-title-image"})
      )
    );

    var viewerPageButton = React.createElement(ViewerPageButton, null);

    var user = React.createElement(User, null);
    var buttons = React.createElement(TypeButtons, {
      selectedType: this.props.selectedType}
    );
    var reportMap = React.createElement(ReportMap, null);
    var reportComment = React.createElement(ReportComment, null);
    var reportImage = React.createElement(ReportImage, null);
    var publishButton = React.createElement(PublishButton, null);

    var footer = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "large-12 columns mrv-footer"}, 
        "Powered by ", React.createElement("a", {href: "https://www.city.fujisawa.kanagawa.jp/"}, "藤沢市"), " and ", React.createElement("a", {href: "https://www.ht.sfc.keio.ac.jp/"}, "htlab"), 
        React.createElement("br", null), React.createElement("br", null)
      )
    );

    return React.createElement("div", null, 
      header, 
      React.createElement("hr", null), 
      viewerPageButton, 
      user, 
      buttons, 
      reportMap, 
      reportComment, 
      reportImage, 
      publishButton, 
      React.createElement("hr", null), 
      footer
    );
  }
});

var MinaRepoViewerApp = React.createClass({displayName: "MinaRepoViewerApp",
  mixins: [ FluxMixin, StoreWatchMixin('MinaRepoStore') ],
  getStateFromFlux: function() {
    return this.getFlux().store('MinaRepoStore').getState();
  },
  componentDidMount: function() {
    console.debug('!!!! MinaRepoViewerApp.componentDidMount');
  },
  render: function() {
    var s = this.state;
    return React.createElement(MinaRepoViewer, {
      selectedType: s.selectedType}
    );
  }
});

var main  = function() {
  ReactDOM.render(
    React.createElement(MinaRepoViewerApp, {flux: flux}),
    document.getElementById('minarepo-viewer-app')
  );

  $(document).foundation();
};

$(main);
