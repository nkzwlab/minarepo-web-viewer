'use strict';

var reportMap = null;
var placedReportIds = {}; // id => marker

var reportTypes = ['ps_animal', // 動物
'ps_illegalGarbage', // 不法投棄
'ps_garbageStation', // 集積所
'ps_graffiti', // 落書き
'ps_damage', // 道路
'ps_streetlight', // 街灯
'ps_kyun', // キュン
'ps_others' // その他
];

var type2pinInfo = {
  'ps_animal': { label: '逝', color: '#91d8f6', textColor: '#000000' }, // 動物
  'ps_illegalGarbage': { label: '棄', color: '#b4b4b5', textColor: '#000000' }, // 不法投棄
  'ps_garbageStation': { label: '残', color: '#76c47b', textColor: '#000000' }, // 集積所
  'ps_graffiti': { label: '塗', color: '#f0b44f', textColor: '#000000' }, // 落書き
  'ps_damage': { label: '道', color: '#595757', textColor: '#ffffff' }, // 道路
  'ps_streetlight': { label: '灯', color: '#f5ef8e', textColor: '#000000' }, // 街灯
  'ps_kyun': { label: '幸', color: '#e8212d', textColor: '#000000' }, // キュン
  'ps_others': { label: '他', color: '#ffffff', textColor: '#000000' } // その他
};

var type2text = {
  'ps_animal': '動物の死骸',
  'ps_illegalGarbage': '不法投棄ごみ',
  'ps_garbageStation': '回収されていないゴミ',
  'ps_graffiti': '落書き',
  'ps_damage': '痛んだ道路',
  'ps_streetlight': '問題のある街灯',
  'ps_kyun': 'キュン',
  'ps_others': 'その他'
};

var type2img = function type2img(type, isSelected) {
  var suffix = isSelected ? '' : '-unselected';
  return '/static/img/minarepo-icons/' + type + suffix + '.png';
};

var getMarkerUrl = function getMarkerUrl(type) {
  var pinInfo = type2pinInfo[type];
  var label = encodeURI(pinInfo.label);
  var color = pinInfo.color.substring(1); // remove first sharp character
  var textColor = pinInfo.textColor.substring(1); // remove first sharp char
  var url = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + label + '|' + color + '|' + textColor;
  return url;
};

var convertBounds = function convertBounds(mapBounds) {
  var northEast = mapBounds.getNorthEast(); // top right
  var southWest = mapBounds.getSouthWest(); // bottom left

  var north = northEast.lat();
  var east = northEast.lng();

  var south = southWest.lat();
  var west = southWest.lng();

  var northWest = { latitude: north, longitude: west }; // top left
  var southEast = { latitude: south, longitude: east }; // bottom right

  return {
    topLeft: northWest,
    bottomRight: southEast
  };
};

var selectSelected = function selectSelected(obj) {
  return _.select(reportTypes, function (rt) {
    return obj[rt] === true;
  });
};

var selectedNotSelected = function selectedNotSelected(obj) {
  return _.select(reportTypes, function (rt) {
    return obj[rt] !== true;
  });
};

// var removeAllPins = function() {
//   var pins = _.values(placedReportIds);
//   _.each(pins, function(pin) {
//     // TODO: remove pin
//     pin.setMap(null);
//   });
//   placedReportIds = {};
// };

var buildCheck = function buildCheck(ary) {
  var check = {};
  _.each(ary, function (item) {
    check[item] = true;
  });
  return check;
};

var diffReportIds = function diffReportIds(oldIds, newIds) {
  var oldCheck = buildCheck(oldIds);
  var newCheck = buildCheck(newIds);

  // newにあってoldにない => added
  var added = _.select(newIds, function (nid) {
    return oldCheck[nid] !== true;
  });

  // oldにあってnewにない => removed
  var removed = _.select(oldIds, function (oid) {
    return newCheck[oid] !== true;
  });

  return { added: added, removed: removed };
};

var updatePins = function updatePins(reports) {
  // mapのpinをreportsにシンクロさせる

  if (reportMap === null || reportMap === undefined) {
    console.debug('updatePins(): reportMap is null!');
    return;
  }

  var newIds = _.map(reports, function (r) {
    return r.id;
  });
  var oldIds = _.keys(placedReportIds);
  var diff = diffReportIds(oldIds, newIds);

  // removedなreportなものをマップから削除する
  _.each(diff.removed, function (rid) {
    var removingMarker = placedReportIds[rid];
    removingMarker.setMap(null); // causes disappearance
    delete placedReportIds[rid];
    console.debug('removed marker: report.id=' + rid);
  });

  // addedなreportsのみをえらぶ
  var addedCheck = buildCheck(diff.added);
  var addedReports = _.select(reports, function (r) {
    return addedCheck[r.id] === true;
  });

  // addedなreportsをMarkerとしてmapに追加
  _.each(addedReports, function (r) {
    var latitude = r.geo[0];
    var longitude = r.geo[1];
    var position = new google.maps.LatLng(latitude, longitude);

    var iconUrl = getMarkerUrl(r.type);
    var marker = new google.maps.Marker({
      position: position,
      map: reportMap,
      icon: iconUrl,
      visible: true
    });
    console.debug('created marker for report=' + r.id + ', lat=' + latitude + ', lng=' + longitude + ', icon=' + iconUrl);

    var reportId = r.id;
    marker.addListener('click', function () {
      // TODO: 詳細表示
      console.debug('pin clicked: report.id=' + reportId);
      flux.actions.onClickPin({ reportId: reportId });
    });

    placedReportIds[r.id] = marker; // このreportはもうピンを追加した。
  });
};

var fetchReports = function fetchReports(types, startDate, endDate, isUsingDate, topLeft, bottomRight) {
  var url = '/api/reports';

  console.debug('fetchReports: types=' + types);

  var params = {
    nodes: JSON.stringify(types),
    top_left: topLeft,
    bottom_right: bottomRight,
    include_image: 'false'
  };

  if (isUsingDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  }

  $.ajax({
    url: url,
    method: 'GET',
    data: params,
    success: function success(data, status, jqxhr) {
      console.debug('got reports!');
      var reports = data.result.reports;
      console.debug('got reports! len=' + reports.length);
      flux.actions.onFetchingReportsSuccess({ reports: reports });
    },
    error: function error() {
      flux.actions.onFetchingReportsFailed();
    }
  });
  flux.actions.onStartFetchingReports();
  console.debug('reports requested!');
};

var fetchDetail = function fetchDetail(reportId) {
  var url = '/api/detail/' + reportId;
  var params = {};
  $.ajax({
    url: url,
    method: 'GET',
    data: params,
    success: function success(data, status, jqxhr) {
      var report = data.result.report;
      flux.actions.onFetchingDetailSuccess({ selectedReport: report });
    },
    error: function error() {
      flux.actions.onFetchingDetailFailed();
    }
  });
  flux.actions.onStartFetchingDetail();
};

var constants = {
  START_FETCHING_REPORTS: 'START_FETCHING_REPORTS',
  FETCHING_REPORTS_SUCCESS: 'FETCHING_REPORTS_SUCCESS',
  FETCHING_REPORTS_FAILED: 'FETCHING_REPORTS_FAILED',
  START_FETCHING_DETAIL: 'START_FETCHING_DETAIL',
  FETCHING_DETAIL_SUCCESS: 'FETCHING_DETAIL_SUCCESS',
  FETCHING_DETAIL_FAILED: 'FETCHING_DETAIL_FAILED',
  CLICK_PIN: 'CLICK_PIN',
  UPDATE_START_DATE: 'UPDATE_START_DATE',
  UPDATE_END_DATE: 'UPDATE_END_DATE',
  TOGGLE_USE_DATE: 'TOGGLE_USE_DATE',
  DRAG_MAP: 'DRAG_MAP',
  TOGGLE_TYPE_BUTTON: 'TOGGLE_TYPE_BUTTON',
  SET_REPORTS: 'SET_REPORTS'
};

var MinaRepoStore = Fluxxor.createStore({
  initialize: function initialize() {
    this.reports = [];
    this.selectedReport = null;
    var selectedTypes = {};
    _.each(reportTypes, function (rt) {
      selectedTypes[rt] = true; // デフォルトで全部選択
    });
    this.selectedTypes = selectedTypes;
    this.clickedPinReportId = null;
    this.startDate = null;
    this.endDate = null;
    this.isUsingDate = false;
    this.isFetchingReports = false;
    this.isFetchingReportsFailed = false;
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = false;
    this.mapTopLeft = null;
    this.mapBottomRight = null;

    this.bindActions(constants.START_FETCHING_REPORTS, this.onStartFetchingReports);
    this.bindActions(constants.FETCHING_REPORTS_SUCCESS, this.onFetchingReportsSuccess);
    this.bindActions(constants.FETCHING_REPORTS_FAILED, this.onFetchingReportsFailed);
    this.bindActions(constants.START_FETCHING_DETAIL, this.onStartFetchingDetail);
    this.bindActions(constants.FETCHING_DETAIL_SUCCESS, this.onFetchingDetailSuccess);
    this.bindActions(constants.FETCHING_DETAIL_FAILED, this.onFetchingDetailFailed);
    this.bindActions(constants.CLICK_PIN, this.onClickPin);
    this.bindActions(constants.UPDATE_START_DATE, this.onUpdateStartDate);
    this.bindActions(constants.UPDATE_END_DATE, this.onUpdateEndDate);
    this.bindActions(constants.TOGGLE_USE_DATE, this.onToggleUseDate);
    this.bindActions(constants.DRAG_MAP, this.onDragMap);
    this.bindActions(constants.TOGGLE_TYPE_BUTTON, this.onToggleTypeButton);
    this.bindActions(constants.SET_REPORTS, this.onSetReports);
  },
  getState: function getState() {
    return {
      reports: this.reports,
      selectedReport: this.selectedReport,
      selectedTypes: this.selectedTypes,
      clickedPinReportId: this.clickedPinReportId,
      startDate: this.startDate,
      endDate: this.endDate,
      isUsingDate: this.isUsingDate,
      isFetchingReports: this.isFetchingReports,
      isFetchingReportsFailed: this.isFetchingReportsFailed,
      isFetchingDetail: this.isFetchingDetail,
      isFetchingDetailFailed: this.isFetchingDetailFailed,
      mapTopLeft: this.mapTopLeft,
      mapBottomRight: this.mapBottomRight
    };
  },
  onStartFetchingReports: function onStartFetchingReports(data) {
    this.isFetchingReports = true;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingReportsSuccess: function onFetchingReportsSuccess(data) {
    this.reports = data.reports;
    this.isFetchingReports = false;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingReportsFailed: function onFetchingReportsFailed(data) {
    this.isFetchingReports = false;
    this.isFetchingDetailFailed = true;
    this.emit('change');
  },
  onStartFetchingDetail: function onStartFetchingDetail(data) {
    this.isFetchingDetail = true;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingDetailSuccess: function onFetchingDetailSuccess(data) {
    this.selectedReport = data.selectedReport;
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingDetailFailed: function onFetchingDetailFailed(data) {
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = true;
    this.emit('change');
  },
  onClickPin: function onClickPin(data) {
    this.clickedPinReportId = data.reportId;
    console.debug('updated clickedPinReportId! ' + data.reportId);
    this.emit('change');
  },
  onUpdateStartDate: function onUpdateStartDate(data) {
    this.startDate = data.startDate;
    this.emit('change');
  },
  onUpdateEndDate: function onUpdateEndDate(data) {
    this.endDate = data.endDate;
    this.emit('change');
  },
  onToggleUseDate: function onToggleUseDate(data) {
    this.isUsingDate = !this.isUsingDate;
    this.emit('change');
  },
  onDragMap: function onDragMap(data) {
    this.mapTopLeft = data.mapTopLeft;
    this.mapBottomRight = data.mapBottomRight;
    this.emit('change');
  },
  onToggleTypeButton: function onToggleTypeButton(data) {
    var type = data.type;
    this.selectedTypes[type] = !this.selectedTypes[type];
    this.emit('change');
  },
  onSetReports: function onSetReports(data) {
    this.reports = data.reports;
    this.emit('change');
  }
});

var actions = {
  onStartFetchingReports: function onStartFetchingReports(data) {
    this.dispatch(constants.START_FETCHING_REPORTS);
  },
  onFetchingReportsSuccess: function onFetchingReportsSuccess(data) {
    var reports = data.reports;
    this.dispatch(constants.FETCHING_REPORTS_SUCCESS, { reports: reports });
  },
  onFetchingReportsFailed: function onFetchingReportsFailed(data) {
    this.dispatch(constants.FETCHING_REPORTS_FAILED);
  },
  onStartFetchingDetail: function onStartFetchingDetail(data) {
    this.dispatch(constants.START_FETCHING_DETAIL);
  },
  onFetchingDetailSuccess: function onFetchingDetailSuccess(data) {
    var selectedReport = data.selectedReport;
    this.dispatch(constants.FETCHING_DETAIL_SUCCESS, { selectedReport: selectedReport });
  },
  onFetchingDetailFailed: function onFetchingDetailFailed(data) {
    this.dispatch(constants.FETCHING_DETAIL_FAILED);
  },
  onClickPin: function onClickPin(data) {
    var reportId = data.reportId;
    this.dispatch(constants.CLICK_PIN, { reportId: reportId });
  },
  onUpdateStartDate: function onUpdateStartDate(data) {
    var startDate = data.startDate;
    this.dispatch(constants.UPDATE_START_DATE, { startDate: startDate });
  },
  onUpdateEndDate: function onUpdateEndDate(data) {
    var endDate = data.endDate;
    this.dispatch(constants.UPDATE_END_DATE, { endDate: endDate });
  },
  onToggleUseDate: function onToggleUseDate(data) {
    this.dispatch(constants.TOGGLE_USE_DATE);
  },
  onDragMap: function onDragMap(data) {
    var argData = {
      mapTopLeft: data.mapTopLeft,
      mapBottomRight: data.mapBottomRight
    };
    this.dispatch(constants.DRAG_MAP, argData);
  },
  onToggleTypeButton: function onToggleTypeButton(data) {
    this.dispatch(constants.TOGGLE_TYPE_BUTTON, { type: data.type });
  },
  onSetReports: function onSetReports(data) {
    this.dispatch(constants.SET_REPORTS, { reports: data.reports });
  }
};

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var stores = { MinaRepoStore: new MinaRepoStore() };
var flux = new Fluxxor.Flux(stores, actions);

var ReportDetail = React.createClass({
  displayName: 'ReportDetail',

  componentWillReceiveProps: function componentWillReceiveProps(newProps) {
    console.debug('ReportDetail: componentWillReceiveProps() called');
    var newReportId = newProps.clickedPinReportId;
    var currentReportId = this.props.clickedPinReportId;
    if (currentReportId !== newReportId) {
      // fetch detail
      setTimeout(function () {
        console.debug('going to fetch report detail id=' + newReportId);
        var url = '/api/detail/' + newReportId;
        $.ajax({
          url: url,
          method: 'GET',
          success: function success(data, status, jqxhr) {
            console.debug('got report detail id=' + newReportId);
            var report = data.result.report;
            flux.actions.onFetchingDetailSuccess({ selectedReport: report });
          },
          error: function error() {
            console.error('detail fetch error');
            flux.actions.onFetchingDetailFailed();
          }
        });
        flux.actions.onStartFetchingDetail();
      }, 0);
    }
  },
  render: function render() {
    var pinId = this.props.clickedPinReportId;
    if (pinId === null || pinId === undefined) {
      console.debug('detail pattern 0: not clicked');
      return React.createElement('div', null);
    }

    var isFetchingDetail = this.props.isFetchingDetail;
    var isFetchingDetailFailed = this.props.isFetchingDetailFailed;

    var detail = this.props.selectedReport;
    var detailExists = detail !== undefined && detail.id !== null && detail.id !== undefined;

    var detailReportId;
    var detailType;
    var detailComment;
    var detailUser;
    var detailImage;
    var detailLocation;
    var detailTimestamp;

    if (!isFetchingDetail && !isFetchingDetailFailed && detailExists) {
      console.debug('detail pattern 1: got report');
      detailReportId = detail.id;
      var detailTypeStr = type2text[detail.type];
      var reportTypeImg = type2img(detail.type, true);
      var detailTypeImg = React.createElement('img', { src: reportTypeImg, className: 'mrv-detail-report-type-image' });
      detailType = React.createElement(
        'span',
        null,
        detailTypeImg,
        ' ',
        detailTypeStr
      );
      detailComment = detail.comment;
      detailUser = detail.user;
      detailImage = detail.image;
      detailTimestamp = detail.timestamp;
      if (detailComment === '') {
        detailComment = React.createElement(
          'span',
          { className: 'mrv-detail-no-comment' },
          '(コメントなし)'
        );
      }
      var address = detail.address;
      if (address === null) {
        address = React.createElement(
          'span',
          { className: 'mrv-detail-no-address' },
          '(取得されていません)'
        );
      }
      detailLocation = React.createElement(
        'div',
        null,
        '住所: ',
        address,
        React.createElement('br', null),
        'GPS座標: 緯度=',
        detail.geo[0],
        ', 経度=',
        detail.geo[1]
      );
    } else if (isFetchingDetail) {
      console.debug('detail pattern 2: fetching');
      detailTimestamp = '読み込み中...';
      detailUser = '読み込み中...';
      detailType = '読み込み中...';
      detailComment = '読み込み中...';
      detailLocation = '読み込み中...';
      detailImage = '/static/img/loading-big.gif'; // FIXME: 権利？
    } else if (!isFetchingDetail && isFetchingDetailFailed) {
        console.debug('detail pattern 3: fetch failed');
        detailTimestamp = React.createElement(
          'span',
          { className: 'mrv-detail-error' },
          '読み込みに失敗しました'
        );
        detailUser = React.createElement(
          'span',
          { className: 'mrv-detail-error' },
          '読み込みに失敗しました'
        );
        detailType = React.createElement(
          'span',
          { className: 'mrv-detail-error' },
          '読み込みに失敗しました'
        );
        detailComment = React.createElement(
          'span',
          { className: 'mrv-detail-error' },
          '読み込みに失敗しました'
        );
        detailLocation = React.createElement(
          'span',
          { className: 'mrv-detail-error' },
          '読み込みに失敗しました'
        );
        detailImage = '/static/img/loading-big.gif'; // FIXME: もっとエラーっぽい画像にしたい
      }

    return React.createElement(
      'div',
      { className: 'row mrv-detail' },
      React.createElement(
        'div',
        { className: 'large-6 columns mrv-detail-img-container' },
        React.createElement(
          'div',
          { className: 'mrv-detail-img-inner-container' },
          React.createElement(
            'h3',
            null,
            'レポート画像'
          ),
          React.createElement(
            'div',
            null,
            React.createElement('img', { src: detailImage, className: 'mrv-detail-image' })
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'large-6 columns' },
        React.createElement(
          'dl',
          { className: 'mrv-detail-info' },
          React.createElement(
            'dt',
            null,
            'レポート種別'
          ),
          React.createElement(
            'dd',
            null,
            detailType
          ),
          React.createElement(
            'dt',
            null,
            'レポート投稿日時'
          ),
          React.createElement(
            'dd',
            null,
            detailTimestamp
          ),
          React.createElement(
            'dt',
            null,
            '場所'
          ),
          React.createElement(
            'dd',
            null,
            detailLocation
          ),
          React.createElement(
            'dt',
            null,
            'レポートユーザー'
          ),
          React.createElement(
            'dd',
            null,
            detailUser
          ),
          React.createElement(
            'dt',
            null,
            'コメント'
          ),
          React.createElement(
            'dd',
            null,
            detailComment
          )
        )
      )
    );
  }
});

var DateController = React.createClass({
  displayName: 'DateController',

  render: function render() {
    return ''; // FIXME: alphaバージョンではなしにする？
  }
});

var ReportMap = React.createClass({
  displayName: 'ReportMap',

  componentDidMount: function componentDidMount() {
    // GoogleMaps初期化

    // FIXME: センターの位置をスマートフォンのGPSから取得する？
    var sfcLatitude = 35.388281;
    var sfcLongitude = 139.427309;

    reportMap = new google.maps.Map(document.getElementById('report-map'), {
      center: { lat: sfcLatitude, lng: sfcLongitude },
      zoom: 15
    });
    console.debug('initialized reportMap');
  },
  componentWillReceiveProps: function componentWillReceiveProps(newProps) {
    // updatePinsをよぶ
    console.debug('ReportMap: componentWillReceiveProps() called');
    var reports = newProps.reports;
    updatePins(reports);
  },
  render: function render() {
    // TODO

    var nReports = this.props.reports.length;
    var msgReportNum = '';

    if (this.props.isFetchingReports) {
      msgReportNum = React.createElement(
        'div',
        { className: 'mrv-loading-reports' },
        React.createElement('img', { src: '/static/img/loading2.gif', className: 'mrv-img-loading-reports' }),
        'レポートを読み込み中...'
      );
    } else if (this.props.isFetchingReportsFailed) {
      msgReportNum = 'レポートの読み込みに失敗しました';
    } else {
      msgReportNum = '' + nReports + '件のレポート';
    }

    return React.createElement(
      'div',
      { className: 'row' },
      React.createElement(
        'div',
        { className: 'large-12 columns mrv-map-container' },
        msgReportNum,
        React.createElement('div', { id: 'report-map' })
      )
    );
  }
});

var TypeButtons = React.createClass({
  displayName: 'TypeButtons',

  onButtonClick: function onButtonClick(type) {
    var that = this;
    return function (event) {
      flux.actions.onToggleTypeButton({ type: type });

      // 新しくクエリする => マーカーの差分が表示される
      fetchReports(selectSelected(that.props.selectedTypes), that.props.startDate, that.props.endDate, that.props.isUsingDate, that.props.mapTopLeft, that.props.mapBottomRight);
    };
  },
  render: function render() {
    var selBtnMap = this.props.selectedTypes;

    var that = this;
    var buttons = _.map(reportTypes, function (type) {
      var isSelected = selBtnMap[type];
      var imgFile = type2img(type, isSelected);
      return React.createElement('img', {
        onClick: that.onButtonClick(type),
        src: imgFile,
        className: 'mrv-btn-image'
      });
    });

    var group1 = [buttons[0], buttons[1], buttons[2], buttons[3]];
    var group2 = [buttons[4], buttons[5], buttons[6], buttons[7]];

    group1 = React.createElement(
      'div',
      { className: 'medium-6 columns mrv-btn-container' },
      React.createElement(
        'div',
        { className: 'mrv-btn-inner-container' },
        group1
      )
    );
    group2 = React.createElement(
      'div',
      { className: 'medium-6 columns mrv-btn-container' },
      React.createElement(
        'div',
        { className: 'mrv-btn-inner-container' },
        group2
      )
    );

    return React.createElement(
      'div',
      { className: 'row mrv-btn-row' },
      group1,
      group2
    );
  }
});

var MinaRepoViewer = React.createClass({
  displayName: 'MinaRepoViewer',

  render: function render() {
    var header = React.createElement(
      'div',
      { className: 'row' },
      React.createElement(
        'div',
        { className: 'large-12 columns mrv-title-container' },
        React.createElement(
          'h1',
          null,
          '藤沢みなレポ'
        )
      )
    );

    var buttons = React.createElement(TypeButtons, {
      selectedTypes: this.props.selectedTypes,
      startDate: this.props.startDate,
      endDate: this.props.endDate,
      isUsingDate: this.props.isUsingDate,
      mapTopLeft: this.props.mapTopLeft,
      mapBottomRight: this.props.mapBottomRight
    });

    var dateController = React.createElement('dateController', {
      startDate: this.props.startDate,
      endDate: this.props.endDate,
      isUsingDate: this.props.isUsingDate
    });

    var reportMap = React.createElement(ReportMap, {
      reports: this.props.reports,
      selectedReport: this.props.selectedReport,
      clickedPinReportId: this.props.clickedPinReportId,
      isFetchingReports: this.props.isFetchingReports,
      isFetchingReportsFailed: this.props.isFetchingReportsFailed
    });

    var reportDetail = React.createElement(ReportDetail, {
      detail: this.props.detail,
      isFetchingDetail: this.props.isFetchingDetail,
      isFetchingDetailFailed: this.props.isFetchingDetailFailed,
      selectedReport: this.props.selectedReport,
      clickedPinReportId: this.props.clickedPinReportId
    });

    var footer = React.createElement(
      'div',
      { className: 'row' },
      React.createElement(
        'div',
        { className: 'large-12 columns mrv-footer' },
        'Powered by ',
        React.createElement(
          'a',
          { href: 'https://www.city.fujisawa.kanagawa.jp/' },
          '藤沢市'
        ),
        ' and ',
        React.createElement(
          'a',
          { href: 'https://www.ht.sfc.keio.ac.jp/' },
          'htlab'
        )
      )
    );

    return React.createElement(
      'div',
      null,
      header,
      React.createElement('hr', null),
      buttons,
      dateController,
      reportMap,
      reportDetail,
      React.createElement('hr', null),
      footer
    );
  }
});

var MinaRepoViewerApp = React.createClass({
  displayName: 'MinaRepoViewerApp',

  mixins: [FluxMixin, StoreWatchMixin('MinaRepoStore')],
  getStateFromFlux: function getStateFromFlux() {
    return this.getFlux().store('MinaRepoStore').getState();
  },
  componentDidMount: function componentDidMount() {
    fetchReports(selectSelected(this.state.selectedTypes), this.state.startDate, this.state.endDate, this.state.isUsingDate, this.state.mapTopLeft, this.state.mapBottomRight);
  },
  render: function render() {
    var s = this.state;
    return React.createElement(MinaRepoViewer, {
      reports: s.reports,
      selectedTypes: s.selectedTypes,
      clickedPinReportId: s.clickedPinReportId,
      detail: s.detail,
      startDate: s.startDate,
      endDate: s.endDate,
      selectedReport: s.selectedReport,
      isUsingDate: s.isUsingDate,
      isFetchingReports: s.isFetchingReports,
      isFetchingReportsFailed: s.isFetchingReportsFailed,
      isFetchingDetail: s.isFetchingDetail,
      isFetchingDetailFailed: s.isFetchingDetailFailed,
      mapTopLeft: s.mapTopLeft,
      mapBottomRight: s.mapBottomRight
    });
  }
});

var main = function main() {
  ReactDOM.render(React.createElement(MinaRepoViewerApp, { flux: flux }), document.getElementById('minarepo-viewer-app'));

  $(document).foundation();
};

$(main);