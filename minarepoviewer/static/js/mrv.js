'use strict';

var reportMap = null;
var placedReportIds = {}; // id => marker

var INIT_MAP_CENTER = {
  lat: 35.339193, // 藤沢市役所(緯度)
  lng: 139.490016 // 藤沢市役所(経度)
};

var SFC = {
  lat: 35.388281, // SFC緯度
  lng: 139.427309 // SFC経度
};

var TABLE_REPORTS_PER_PAGE = 10;
var TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES = 5; // [Prev] [1] [2] [3] [4] [5] [Next] みたいな奴の数字の数

if (TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES % 2 == 0) {
  console.error('TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES should be odd number! going to +1');
  TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES += 1;
}

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

var type2textShort = {
  'ps_animal': '動物',
  'ps_illegalGarbage': '投棄',
  'ps_garbageStation': 'ゴミ',
  'ps_graffiti': '落書',
  'ps_damage': '道路',
  'ps_streetlight': '街灯',
  'ps_kyun': '♡♡',
  'ps_others': '他'
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

// for DEBUG
// function gen(ln) {
// 	var ret = [];
// 	for (var i = 1; i <= ln; i++) {
// 		ret.push([i]);
// 	}
// 	return ret;
// }

// for DEBUG
// var arrayCommaJoin = function(ary) {
//   return (_.map(ary, function(item) {
//     return String(item);
//   })).join(',');
// }

var TableUtil = {
  countPages: function countPages(reports) {
    var amari = reports.length % TABLE_REPORTS_PER_PAGE;
    var amariPlus = 0 < amari ? 1 : 0;
    return Math.floor(reports.length / TABLE_REPORTS_PER_PAGE) + amariPlus;
  },
  getPageReports: function getPageReports(reports, pageNumber) {
    var sidx = (pageNumber - 1) * TABLE_REPORTS_PER_PAGE;
    var eidx = pageNumber * TABLE_REPORTS_PER_PAGE;
    var pageReports = [];
    for (var i = sidx; i < eidx && i < reports.length; i++) {
      pageReports.push(reports[i]);
    }
    return pageReports;
  },
  genPaginationNumbers: function genPaginationNumbers(reports, selectingPageNumber) {
    var sp = selectingPageNumber;
    var maxPageNum = TableUtil.countPages(reports);
    var width = (TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES - 1) / 2;

    var ret = [];

    if (maxPageNum <= TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES) {
      for (var i = 1; i <= maxPageNum; i++) {
        ret.push(i);
      }
      return ret;
    }

    // 現在選択されてるページの左側
    var left = [];
    for (var i = sp - 1; 1 <= i && sp - i <= width; i--) {
      left.unshift(i); // add to head
    }
    // console.debug('left=' + arrayCommaJoin(left));

    // 現在選択されてるページの右側
    var right = [];
    for (var i = sp + 1; i <= maxPageNum && i - sp <= width; i++) {
      right.push(i);
    }
    // console.debug('right=' + arrayCommaJoin(right));

    if (ret.length < TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES) {
      if (left.length < width) {
        // should append to right more
        // console.debug('gonna add right more current: left=' + arrayCommaJoin(left) + ', right=' + arrayCommaJoin(right));
        var nOthers = 1 + left.length;
        while (nOthers + right.length < TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES && right[right.length - 1] < maxPageNum) {
          var newValue = right[right.length - 1] + 1;
          // console.debug('[gonna add right] going to add ' + newValue);
          // right.push(right[right.length - 1] + 1);
          right.push(newValue);
        }
      } else if (right.length < width) {
        // should append to left more
        // console.debug('gonna add left more current: left=' + arrayCommaJoin(left) + ', right=' + arrayCommaJoin(right));
        var nOthers = 1 + right.length;
        while (nOthers + left.length < TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES && 1 < left[0]) {
          var newValue = left[0] - 1;
          // left.unshift(left[0] - 1);
          // console.debug('[gonna add left] going to add ' + newValue);
          left.unshift(newValue);
        }
      }
    }

    // left, rightをもとに組み立てる
    _.each(left, function (lp) {
      ret.push(lp);
    });
    ret.push(sp);
    _.each(right, function (rp) {
      ret.push(rp);
    });

    return ret;
  }
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
    // console.debug('created marker for report=' + r.id + ', lat=' + latitude + ', lng=' + longitude + ', icon=' + iconUrl);

    var reportId = r.id;
    marker.addListener('click', function () {
      // console.debug('pin clicked: report.id=' + reportId);
      flux.actions.onClickPin({ reportId: reportId });
    });

    placedReportIds[r.id] = marker; // このreportはもうピンを追加した。
  });
};

var fetchReports = function fetchReports(types, startDate, endDate, isUsingDate, topLeft, bottomRight) {
  var url = '/api/reports';

  // console.debug('fetchReports: types=' + types);

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
      // console.debug('got reports!');
      var reports = data.result.reports;
      // console.debug('got reports! len=' + reports.length);
      flux.actions.onFetchingReportsSuccess({ reports: reports });
    },
    error: function error() {
      flux.actions.onFetchingReportsFailed();
    }
  });
  flux.actions.onStartFetchingReports();
  // console.debug('reports requested!');
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
  SET_REPORTS: 'SET_REPORTS',
  TABLE_PREV_PAGE_CLICKED: 'TABLE_PREV_PAGE_CLICKED',
  TABLE_NEXT_PAGE_CLICKED: 'TABLE_NEXT_PAGE_CLICKED',
  TABLE_SET_PAGE: 'TABLE_SET_PAGE',
  TOGGLE_SHOWING_TABLE: 'TOGGLE_SHOWING_TABLE'
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
    this.tableSelectedPage = 1;
    this.isShowingTable = false;

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
    this.bindActions(constants.TABLE_PREV_PAGE_CLICKED, this.onTablePrevPageClicked);
    this.bindActions(constants.TABLE_NEXT_PAGE_CLICKED, this.onTableNextPageClicked);
    this.bindActions(constants.TABLE_SET_PAGE, this.onTableSetPage);
    this.bindActions(constants.TOGGLE_SHOWING_TABLE, this.onToggleShowingTable);
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
      mapBottomRight: this.mapBottomRight,
      tableSelectedPage: this.tableSelectedPage,
      isShowingTable: this.isShowingTable
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
    // console.debug('updated clickedPinReportId! ' + data.reportId);
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
  },
  onTablePrevPageClicked: function onTablePrevPageClicked() {
    var currentPage = this.tableSelectedPage;
    if (currentPage == 1) {
      console.error('cannot go prev when current page is 1');
    } else {
      this.tableSelectedPage = currentPage - 1;
    }
    this.emit('change');
  },
  onTableNextPageClicked: function onTableNextPageClicked() {
    var currentPage = this.tableSelectedPage;
    var maxPage = TableUtil.countPages(this.reports);
    if (currentPage == maxPage) {
      console.error('cannot go next when current page is last: last=' + maxPage);
    } else {
      this.tableSelectedPage = currentPage + 1;
    }
    this.emit('change');
  },
  onTableSetPage: function onTableSetPage(data) {
    var page = data.page;
    this.tableSelectedPage = page;
    this.emit('change');
  },
  onToggleShowingTable: function onToggleShowingTable() {
    this.isShowingTable = !this.isShowingTable;
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
  },
  onTablePrevPageClicked: function onTablePrevPageClicked() {
    this.dispatch(constants.TABLE_PREV_PAGE_CLICKED);
  },
  onTableNextPageClicked: function onTableNextPageClicked() {
    this.dispatch(constants.TABLE_NEXT_PAGE_CLICKED);
  },
  onTableSetPage: function onTableSetPage(data) {
    this.dispatch(constants.TABLE_SET_PAGE, { page: data.page });
  },
  onToggleShowingTable: function onToggleShowingTable() {
    this.dispatch(constants.TOGGLE_SHOWING_TABLE);
  }
};

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var stores = { MinaRepoStore: new MinaRepoStore() };
var flux = new Fluxxor.Flux(stores, actions);

var ReportDetail = React.createClass({
  displayName: 'ReportDetail',

  componentWillReceiveProps: function componentWillReceiveProps(newProps) {
    // console.debug('ReportDetail: componentWillReceiveProps() called');
    var newReportId = newProps.clickedPinReportId;
    var currentReportId = this.props.clickedPinReportId;
    if (currentReportId !== newReportId) {
      // fetch detail
      setTimeout(function () {
        // console.debug('going to fetch report detail id=' + newReportId);
        var url = '/api/detail/' + newReportId;
        $.ajax({
          url: url,
          method: 'GET',
          success: function success(data, status, jqxhr) {
            // console.debug('got report detail id=' + newReportId);
            var report = data.result.report;
            flux.actions.onFetchingDetailSuccess({ selectedReport: report });
          },
          error: function error() {
            // console.error('detail fetch error');
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
      // console.debug('detail pattern 0: not clicked');
      return React.createElement('div', null);
    }

    var isFetchingDetail = this.props.isFetchingDetail;
    var isFetchingDetailFailed = this.props.isFetchingDetailFailed;

    var detail = this.props.selectedReport;
    var detailExists = detail !== undefined && detail !== null && detail.id !== null && detail.id !== undefined;

    var detailReportId;
    var detailType;
    var detailComment;
    var detailUser;
    var detailImage;
    var detailLocation;
    var detailTimestamp;
    var centerButtonDom = '';

    if (!isFetchingDetail && !isFetchingDetailFailed && detailExists) {
      // console.debug('detail pattern 1: got report');
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

      var centerButtonHandler = function centerButtonHandler(event) {
        // var marker = report
        // var marker = placedReportIds[detailReportId];
        var lat = Number(detail.geo[0]);
        var lng = Number(detail.geo[1]);
        document.getElementById('report-map').scrollIntoView();
        reportMap.setZoom(18);
        reportMap.panTo({ lat: lat, lng: lng });
      };
      centerButtonDom = React.createElement(
        'button',
        { className: 'button', onClick: centerButtonHandler },
        'マップに表示'
      );
    } else if (isFetchingDetail) {
      // console.debug('detail pattern 2: fetching');
      detailTimestamp = '読み込み中...';
      detailUser = '読み込み中...';
      detailType = '読み込み中...';
      detailComment = '読み込み中...';
      detailLocation = '読み込み中...';
      detailImage = '/static/img/loading-image.gif'; // FIXME: 権利？
    } else if (!isFetchingDetail && isFetchingDetailFailed) {
        // console.debug('detail pattern 3: fetch failed');
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
        detailImage = '/static/img/loading-image.gif'; // FIXME: もっとエラーっぽい画像にしたい
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
          'div',
          { className: 'mrv-detail-info-header' },
          React.createElement(
            'h3',
            null,
            'レポート内容'
          )
        ),
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
        ),
        centerButtonDom
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
    // var sfcLatitude = 35.388281;
    // var sfcLongitude = 139.427309;

    reportMap = new google.maps.Map(document.getElementById('report-map'), {
      // center: { lat: INIT_MAP_CENTER.latitude, lng: INIT_MAP_CENTER.longitude },
      center: INIT_MAP_CENTER,
      zoom: 15
    });
    // console.debug('initialized reportMap');
  },
  componentWillReceiveProps: function componentWillReceiveProps(newProps) {
    // updatePinsをよぶ
    // console.debug('ReportMap: componentWillReceiveProps() called');
    var reports = newProps.reports;
    updatePins(reports);
  },
  render: function render() {
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
        React.createElement('div', { id: 'report-map', key: 'report-map' })
      )
    );
  }
});

var ReportTable = React.createClass({
  displayName: 'ReportTable',

  render: function render() {
    var reports = this.props.reports;
    var selectedPage = this.props.tableSelectedPage;

    var showingReports = TableUtil.getPageReports(reports, selectedPage);
    // console.debug('%% showingReports.length=' + showingReports.length + ', sp=' + selectedPage + ', n-reports=' + reports.length);

    var reportRows = _.map(showingReports, function (report) {
      // console.debug('%% generating tr element for report.id=' + report.id)
      var reportId = report.id;
      var key = 'report-' + String(report.id);
      var showHandler = function showHandler(event) {
        flux.actions.onClickPin({ reportId: reportId });
      };
      var reportTypeStr = type2textShort[report.type];
      var reportTypeImg = type2img(report.type, true);
      var reportTypeImg = React.createElement('img', { src: reportTypeImg, className: 'mrv-report-table-report-type-image' });
      var reportType = React.createElement(
        'span',
        null,
        reportTypeImg,
        ' ',
        reportTypeStr
      );

      return React.createElement(
        'tr',
        { key: key },
        React.createElement(
          'td',
          null,
          React.createElement(
            'span',
            { className: 'mrv-report-table-show-detail-link', onClick: showHandler },
            reportId
          )
        ),
        React.createElement(
          'td',
          null,
          React.createElement(
            'span',
            { className: 'mrv-report-table-show-detail-link', onClick: showHandler },
            reportType
          )
        ),
        React.createElement(
          'td',
          null,
          React.createElement(
            'span',
            { className: 'mrv-report-table-show-detail-link', onClick: showHandler },
            report.user
          )
        ),
        React.createElement(
          'td',
          null,
          React.createElement(
            'span',
            { className: 'mrv-report-table-show-detail-link', onClick: showHandler },
            report.timestamp
          )
        )
      );
    });

    var isFirstPage = selectedPage == 1;
    var isLastPage = selectedPage == TableUtil.countPages(reports);
    var paginationPages = TableUtil.genPaginationNumbers(reports, selectedPage);
    // console.debug('@@ paginationPages.length=' + paginationPages.length);

    var paginationElements = _.map(paginationPages, function (pg) {
      // console.debug('@@ generating li element for page=' + pg);
      var isThisPageSelected = pg == selectedPage;
      var key = 'page-' + String(pg) + (isThisPageSelected ? '-selected' : '-unselected');
      var pgLiClass = classNames({ current: isThisPageSelected });
      var clickHandler = function clickHandler(event) {
        event.preventDefault(); // don't go top
        flux.actions.onTableSetPage({ page: pg });
      };
      var number = null;
      if (isThisPageSelected) {
        number = String(pg);
      } else {
        number = React.createElement(
          'a',
          { href: '#', onClick: clickHandler },
          pg
        );
      }
      return React.createElement(
        'li',
        { className: pgLiClass, key: key },
        number
      );
    });

    var prevArrowClass = classNames({ 'pagination-previous': true, disabled: isFirstPage });
    var prevArrowKey = 'prev-arrow-' + (isFirstPage ? 'disabled' : 'available');
    var prevOnClick = function prevOnClick(event) {
      event.preventDefault(); // don't go top
      flux.actions.onTablePrevPageClicked();
    };
    var insidePrev = null;
    var prevMessage = '前へ';
    if (isFirstPage) {
      insidePrev = prevMessage;
    } else {
      insidePrev = React.createElement(
        'a',
        { href: '#', onClick: prevOnClick },
        prevMessage
      );
    }
    paginationElements.unshift(React.createElement(
      'li',
      { className: prevArrowClass, key: prevArrowKey },
      insidePrev
    ));

    var nextArrowClass = classNames({ 'pagination-next': true, disabled: isLastPage });
    var nextArrowKey = 'next-arrow-' + (isLastPage ? 'disabled' : 'available');
    var insideNext = null;
    var nextMessage = '次へ';
    var nextOnClick = function nextOnClick(event) {
      event.preventDefault();
      flux.actions.onTableNextPageClicked();
    };
    if (isLastPage) {
      insideNext = nextMessage;
    } else {
      insideNext = React.createElement(
        'a',
        { href: '#', onClick: nextOnClick },
        nextMessage
      );
    }
    paginationElements.push(React.createElement(
      'li',
      { className: nextArrowClass, key: nextArrowKey },
      insideNext
    ));

    var pager1 = React.createElement(
      'ul',
      { className: 'pagination text-center pager1', role: 'pagination', 'aria-label': 'Pagination', key: 'pager1' },
      paginationElements
    );
    var pager2 = React.createElement(
      'ul',
      { className: 'pagination text-center pager2', role: 'pagination', 'aria-label': 'Pagination', key: 'pager2' },
      paginationElements
    );

    return React.createElement(
      'div',
      { className: 'row' },
      React.createElement(
        'div',
        { className: 'large-12 columns mrv-report-table-container' },
        React.createElement(
          'nav',
          null,
          pager1
        ),
        React.createElement(
          'table',
          { className: 'hover mrv-report-table' },
          React.createElement(
            'thead',
            null,
            React.createElement(
              'tr',
              null,
              React.createElement(
                'th',
                null,
                'ID'
              ),
              React.createElement(
                'th',
                null,
                'レポ種類'
              ),
              React.createElement(
                'th',
                null,
                '投稿者'
              ),
              React.createElement(
                'th',
                null,
                '投稿時刻'
              )
            )
          ),
          React.createElement(
            'tbody',
            null,
            reportRows
          )
        ),
        React.createElement(
          'nav',
          null,
          pager2
        )
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
      console.debug('!!! TypeButtons.onButtonClick');
      fetchReports(selectSelected(that.props.selectedTypes), that.props.startDate, that.props.endDate, that.props.isUsingDate, that.props.mapTopLeft, that.props.mapBottomRight);
      flux.actions.onTableSetPage({ page: 1 });
    };
  },
  render: function render() {
    var selBtnMap = this.props.selectedTypes;

    var that = this;
    var buttons = _.map(reportTypes, function (type) {
      var isSelected = selBtnMap[type];
      var imgFile = type2img(type, isSelected);
      var key = type + '-' + (isSelected ? 'selected' : 'unselected'); // React wants key!
      return React.createElement('img', {
        key: key,
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

    var isShowingTable = this.props.isShowingTable;
    var reportTable = '';
    if (isShowingTable) {
      reportTable = React.createElement(ReportTable, {
        reports: this.props.reports,
        tableSelectedPage: this.props.tableSelectedPage
      });
    }

    var tableToggleButtonMsg = isShowingTable ? '表を閉じる' : '表を表示する';
    var tableToggleButtonClass = classNames({ button: true, expanded: true });
    // var tableToggleButtonClass = 'expanded button';
    var tableToggleButtonHandler = function tableToggleButtonHandler(event) {
      flux.actions.onToggleShowingTable();
    };
    var tblTglContainerClass = classNames({
      'large-12': true,
      'columns': true,
      'mrv-btn-close-table': isShowingTable,
      'mrv-btn-open-table': !isShowingTable
    });
    var tableToggleButton = React.createElement(
      'div',
      { className: 'row' },
      React.createElement(
        'div',
        { className: tblTglContainerClass },
        React.createElement(
          'button',
          { className: tableToggleButtonClass, onClick: tableToggleButtonHandler },
          tableToggleButtonMsg
        )
      )
    );

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
        ),
        React.createElement('br', null),
        React.createElement('br', null)
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
      reportTable,
      tableToggleButton,
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
    console.debug('!!!! MinaRepoViewerApp.componentDidMount');
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
      mapBottomRight: s.mapBottomRight,
      tableSelectedPage: s.tableSelectedPage,
      isShowingTable: s.isShowingTable
    });
  }
});

var main = function main() {
  ReactDOM.render(React.createElement(MinaRepoViewerApp, { flux: flux }), document.getElementById('minarepo-viewer-app'));

  $(document).foundation();
};

$(main);