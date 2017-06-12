
var reportMap = null;
var placedReportIds = {};  // id => marker
var infoWindow = null;

var reportHashPattern = /^\#report=([0-9]+)$/;

var INIT_MAP_CENTER = {
  lat: 35.339193,  // 藤沢市役所(緯度)
  lng: 139.490016  // 藤沢市役所(経度)
}

var SFC = {
  lat: 35.388281,  // SFC緯度
  lng: 139.427309  // SFC経度
}

// きちんとボタンを押した時に時刻レンジを計算するためfunctionで持つ
var trDay =          function() { return DateUtil.dayRange(new Date()); };
var trWeek =         function() { return DateUtil.weekRange(new Date()); };
var trMonth =        function() { return DateUtil.monthRange(new Date()); };
var trWeekFromNow =  function() { return DateUtil.thisWeekRange(new Date()); };
var trMonthFromNow = function() { return DateUtil.thisMonthRange(new Date()); };
var trAll =          function() { return [null, null]; };

var timeRangeButtonDefinitions = [
  { label: '今日', range: trDay },
  { label: '今週', range: trWeek},
  { label: '今月', range: trMonth },
  { label: '直近１週間', range: trWeekFromNow },
  { label: '直近１ヶ月', range: trMonthFromNow },
  { label: '全期間', range: trAll }
];
var defaultTimeRangeButton = '直近１ヶ月';
var defaultTimeRangeButtonIndex = 0;
for (var i = 0; i < timeRangeButtonDefinitions.length; i++) {
  var label = timeRangeButtonDefinitions[i].label;
  if (label === defaultTimeRangeButton) {
    defaultTimeRangeButtonIndex = i;
    break;
  }
}


var TABLE_REPORTS_PER_PAGE = 10;
var TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES = 5;  // [Prev] [1] [2] [3] [4] [5] [Next] みたいな奴の数字の数

if (TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES % 2 == 0) {
  console.error('TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES should be odd number! going to +1');
  TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES += 1;
}

var DateUtil = {
  formatNum: function(num, keta) {
    var sn = String(num);
    var fusoku = keta - sn.length;
    var ret = sn;
    for (var i = 0; i < fusoku; i++) {
      ret = '0' + ret;
    }
    return ret;
  },
  formatDate: function(d) {
    var y = d.getYear() + 1900;
    var m = d.getMonth() + 1;
    var day = d.getDate();

    var hour = d.getHours();
    var min = d.getMinutes();
    var sec = d.getSeconds();
    var f = DateUtil.formatNum;
    return f(y, 4) + '-' + f(m, 2) + '-' + f(day, 2) + ' ' + f(hour, 2) + ':' + f(min, 2) + ':' + f(sec, 2);
  },
  startOfDay: function(d) {
    var y = d.getYear() + 1900;
    var m = d.getMonth() + 1;
    var d = d.getDate();
    return new Date(y, m - 1, d, 0, 0, 0);
  },
  isLeapYear: function(y) {
    if (y % 400 === 0) {
      return true;
    } else if (y % 100 === 0) {
      return false;
    } else if (y % 4 === 0) {
      return true;
    } else {
      return false;
    }
  },
  daysOfMonth: function(y, m) {
    if (m === 2) {
      return (DateUtil.isLeapYear(y)) ? 29 : 28;
    } else if (m === 1 || m === 3 || m === 5 || m === 7 || m === 8 || m === 10 || m === 12) {
      return 31;
    } else {
      return 30;
    }
  },
  prevDay: function(y, m, d) {
    if (d === 1) {
      if (m == 1) {
        return [y - 1, 12, 31];
      } else {
        var newMonth = m - 1;
        var endOfNewMonth = DateUtil.daysOfMonth(y, newMonth);
        return [y, newMonth, endOfNewMonth];
      }
    } else {
      return [y, m, d - 1];
    }
  },
  nextDay: function(y, m, d) {
    var eom = DateUtil.daysOfMonth(y, m);
    if (d === eom) {
      if (m === 12) {
        return [y + 1, 1, 1];
      } else {
        return [y, m + 1, 1];
      }
    } else {
      return [y, m, d + 1];
    }
  },
  ymdTuple: function(d) {
    var year = d.getYear() + 1900;
    var month = d.getMonth() + 1;
    var day = d.getDate();
    return [year, month, day];
  },
  tupleToDate: function(tuple) {
    var y = tuple[0];
    var m = tuple[1];
    var d = tuple[2];
    return new Date(y, m - 1, d, 0, 0, 0);
  },
  startOfWeek: function(d) {
    var d = DateUtil.startOfDay(d);
    var MONDAY = 1;  // starts from 0==Sunday
    while (d.getDay() != MONDAY) {
      var ymd = DateUtil.ymdTuple(d);
      var prevDayTuple = DateUtil.prevDay(ymd[0], ymd[1], ymd[2]);
      d = DateUtil.tupleToDate(prevDayTuple);
    }
    return d;
  },
  goForward: function(startDay, n) {
    var tuple = DateUtil.ymdTuple(startDay);
    var y = tuple[0];
    var m = tuple[1];
    var d = tuple[2];
    for (var i = 0; i < n; i++) {
      tuple = DateUtil.nextDay(y, m, d);
      y = tuple[0];
      m = tuple[1];
      d = tuple[2];
    }
    return new Date(y, m - 1, d, 0, 0, 0);
  },
  goBackward: function(startDay, n) {
    var tuple = DateUtil.ymdTuple(startDay);
    var y = tuple[0];
    var m = tuple[1];
    var d = tuple[2];
    for (var i = 0; i < n; i++) {
      tuple = DateUtil.prevDay(y, m, d);
      y = tuple[0];
      m = tuple[1];
      d = tuple[2];
    }
    return new Date(y, m - 1, d, 0, 0, 0);
  },
  weekRange: function(d) {
    var startOfWeek = DateUtil.startOfWeek(d);
    var endOfWeek = DateUtil.goForward(startOfWeek, 7);
    return [startOfWeek, endOfWeek];
  },
  startOfMonth: function(d) {
    var day = d.getDate();
    var n = day - 1;
    return DateUtil.goBackward(d, n);
  },
  monthRange: function(d) {
    var startOfMonth = DateUtil.startOfMonth(d);
    var y = d.getYear() + 1900;
    var m = d.getMonth() + 1;
    var daysOfMonth = DateUtil.daysOfMonth(y, m);
    var endOfMonth = DateUtil.goForward(startOfMonth, daysOfMonth);
    return [startOfMonth, endOfMonth];
  },
  thisWeekRange: function(d) {
    var end = d;
    var start = new Date(end.getTime() - (7 * 24 * 60 * 60 * 1000.0));
    return [start, end];
  },
  thisMonthRange: function(d) {
    var end = d;
    var start = new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000.0));
    return [start, end];
  },
  dayRange: function(d) {
    var startOfDay = DateUtil.startOfDay(d);
    var nextDay = DateUtil.goForward(startOfDay, 1);
    return [startOfDay, nextDay];
  }
};

var defaultTimeRangeComputer = timeRangeButtonDefinitions[defaultTimeRangeButtonIndex].range;
var defaultTimeRange = defaultTimeRangeComputer();
var defaultStartDate = defaultTimeRange[0];
var defaultEndDate = defaultTimeRange[1];

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
  'ps_forgetGarbage',  // 回収忘れ
  'ps_others',         // その他
  'ps_recycleStation'  // 資源集積所

];

var type2pinInfo = {
  // 'ps_animal':         { label: '逝', color: '#91d8f6', textColor: '#000000' },  // 動物
  'ps_animal':         { label: 'ど', color: '#91d8f6', textColor: '#000000' },  // 動物
  'ps_illegalGarbage': { label: '棄', color: '#b4b4b5', textColor: '#000000' },  // 不法投棄
  'ps_garbageStation': { label: '残', color: '#76c47b', textColor: '#000000' },  // 集積所
  'ps_graffiti':       { label: '塗', color: '#f0b44f', textColor: '#000000' },  // 落書き
  'ps_damage':         { label: '道', color: '#595757', textColor: '#ffffff' },  // 道路
  'ps_streetlight':    { label: '灯', color: '#f5ef8e', textColor: '#000000' },  // 街灯
  'ps_kyun':           { label: '幸', color: '#e8212d', textColor: '#000000' },  // キュン
  'ps_disaster':       { label: '災', color: '#031435', textColor: '#ffffff' },  // 災害
  'ps_zansa':          { label: '別', color: '#ff8dd0', textColor: '#000000' },  // 残渣
  'ps_forgetGarbage':  { label: '忘', color: '#ee82ee', textColor: '#000000' },  // 回収忘れ
  'ps_others':         { label: '他', color: '#ffffff', textColor: '#000000' },  // その他
  'ps_recycleStation': { label: 'リ', color: '#2222ff', textColor: '#ffffff' }   // 資源集積所
};

var type2text = {
  'ps_animal': '動物の死骸',
  'ps_illegalGarbage': '不法投棄ごみ',
  'ps_garbageStation': 'ゴミ置き場',
  'ps_graffiti': '落書き',
  'ps_damage': '痛んだ道路',
  'ps_streetlight': '問題のある街灯',
  'ps_kyun': 'キュン',
  'ps_disaster': '災害の発生',
  'ps_zansa': 'ゴミの出し間違い',
  'ps_forgetGarbage': 'ゴミの回収し忘れ',
  'ps_others': 'その他',
  'ps_recycleStation': '資源集積所'
};

var type2textShort = {
  'ps_animal': '動物',
  'ps_illegalGarbage': '投棄',
  'ps_garbageStation': '置場',
  'ps_graffiti': '落書',
  'ps_damage': '道路',
  'ps_streetlight': '街灯',
  'ps_kyun': '♡♡',
  'ps_disaster': '災害',
  'ps_zansa': '残渣',
  'ps_forgetGarbage': '拾忘',
  'ps_others': '他',
  'ps_recycleStation': '資源'
};

var reportLevel = [
  '対応必要なし',
  '対応必要(通知なし)',
  '緊急(通知あり)'
];

var reportLevelShort = [
  '無',
  '必要',
  '緊急'
];

var type2img = function(type, isSelected) {
  var suffix = (isSelected) ? '' : '-unselected';
  return '/static/img/minarepo-icons/' + type + suffix +'.png';
};

var finished2img = function(isFinished) {
  var suffix = (isFinished) ? 'finished' : 'unfinished';
  return '/static/img/' + suffix + '.png';
}

var progress2class = function(progress, selected) {
  var classList = 'button side-margin';
  if (progress == selected) {
    if (progress == 'finished') {
      classList += ' success';
    } else if (progress == 'unfinished') {
      classList += ' alert';
    }
  } else {
    classList += ' secondary';
  }

  return classList;
};

var getMarkerUrl = function(type) {
  var pinInfo = type2pinInfo[type];
  var label = encodeURI(pinInfo.label);
  var color = pinInfo.color.substring(1);  // remove first sharp character
  var textColor = pinInfo.textColor.substring(1);  // remove first sharp char
  var url = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + label + '|' + color + '|' + textColor;
  return url;
};

var convertBounds = function(mapBounds) {
  var northEast = mapBounds.getNorthEast();  // top right
  var southWest = mapBounds.getSouthWest();  // bottom left

  var north = northEast.lat();
  var east = northEast.lng();

  var south = southWest.lat();
  var west = southWest.lng();

  var northWest = { latitude: north, longitude: west };  // top left
  var southEast = { latitude: south, longitude: east };  // bottom right

  return {
    topLeft: northWest,
    bottomRight: southEast
  };
};

var countSelectedTypes = function(selectedTypes) {
  var count = 0;
  for (var i = 0; i < reportTypes.length; i++) {
    var t = reportTypes[i];
    if (selectedTypes[t]) {
      count++;
    }
  }
  return count;
};

var changeAllTypes = function(selectedTypes, bool) {
  for (var i = 0; i < reportTypes.length; i++) {
    var t = reportTypes[i];
    selectedTypes[t] = bool;
  }
  return selectedTypes;
};

var showToast = function(type, message) {
  $.toast({
    heading: type,
    icon: type,
    text: message,
    hideAfter: 2000,
    allowToastClose: true,
    position: 'mid-center',
    loader: false
  });
  return;
};

var timestampShaper = function(timestamp) {
    var parsedTimestamp = timestamp.replace(/-/g, '/');
    var shapedTime = null;

    var currentTime = new Date();
    var dateString = currentTime.getYear() + '/' + (1 + Number(currentTime.getMonth())) + '/' + currentTime.getDate();
    var reportTime = new Date(parsedTimestamp);
    var reportDateString = reportTime.getYear() + '/' + (1 + Number(reportTime.getMonth())) + '/' + reportTime.getDate();

    var date = new Date(dateString);
    var reportDate = new Date(reportDateString);
    var dateDiff = (date - reportDate) / (1000 * 60 * 60 * 24);

    if (dateDiff > 0) {
      shapedTime = (reportTime.getMonth() + 1) + '月' + reportTime.getDate() + '日';
      // shapedTime = dateDiff + '日前';
    } else {
      var hour = String(reportTime.getHours());
      var minute = String(reportTime.getMinutes());

      if (hour.length < 2) {
        hour = '0' + hour;
      }
      if (minute.length < 2) {
        minute = '0' + minute;
      }
      shapedTime = hour + ':' + minute;
    }

    return shapedTime;
};

// for DEBUG
// function gen(ln) {
//   var ret = [];
//   for (var i = 1; i <= ln; i++) {
//     ret.push([i]);
//   }
//   return ret;
// }

// for DEBUG
// var arrayCommaJoin = function(ary) {
//   return (_.map(ary, function(item) {
//     return String(item);
//   })).join(',');
// }

var TableUtil = {
  countPages: function(reports) {
    var amari  = reports.length % TABLE_REPORTS_PER_PAGE;
    var amariPlus = (0 < amari) ? 1 : 0;
    return Math.floor(reports.length / TABLE_REPORTS_PER_PAGE) + amariPlus;
  },
  getPageReports: function(reports, pageNumber) {
    var sidx = (pageNumber - 1) * TABLE_REPORTS_PER_PAGE;
    var eidx = pageNumber * TABLE_REPORTS_PER_PAGE;
    var pageReports = [];
    for (var i = sidx; i < eidx && (i < reports.length); i++) {
      pageReports.push(reports[i]);
    }
    return pageReports;
  },
  genPaginationNumbers: function(reports, selectingPageNumber) {
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
    for (var i = sp - 1; (1 <= i) && (sp - i) <= width; i--) {
      left.unshift(i);  // add to head
    }
    // console.debug('left=' + arrayCommaJoin(left));

    // 現在選択されてるページの右側
    var right = []
    for (var i = sp + 1; (i <= maxPageNum) && (i - sp) <= width; i++) {
      right.push(i);
    }
    // console.debug('right=' + arrayCommaJoin(right));

    if (ret.length < TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES) {
      if (left.length < width) {
        // should append to right more
        // console.debug('gonna add right more current: left=' + arrayCommaJoin(left) + ', right=' + arrayCommaJoin(right));
        var nOthers = 1 + left.length;
        while (nOthers + right.length < TABLE_REPORTS_MAX_PAGINATION_SHOW_PAGES && right[right.length-1] < maxPageNum) {
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
    _.each(left, function(lp) {
      ret.push(lp);
    })
    ret.push(sp);
    _.each(right, function(rp) {
      ret.push(rp);
    })

    return ret;
  }
};

var selectSelected = function(obj) {
  return _.select(reportTypes, function(rt) {
    return (obj[rt] === true);
  })
};

var selectedNotSelected = function(obj) {
  return _.select(reportTypes, function(rt) {
    return (obj[rt] !== true);
  })
};

// var removeAllPins = function() {
//   var pins = _.values(placedReportIds);
//   _.each(pins, function(pin) {
//     // TODO: remove pin
//     pin.setMap(null);
//   });
//   placedReportIds = {};
// };

var buildCheck = function(ary) {
  var check = {};
  _.each(ary, function(item) {
    check[item] = true;
  });
  return check;
};

var diffReportIds = function(oldIds, newIds) {
  var oldCheck = buildCheck(oldIds);
  var newCheck = buildCheck(newIds);

  // newにあってoldにない => added
  var added = _.select(newIds, function(nid) { return (oldCheck[nid] !== true); });

  // oldにあってnewにない => removed
  var removed = _.select(oldIds, function(oid) { return (newCheck[oid] !== true); });

  return { added: added, removed: removed };
};


var updatePins = function(reports) {
  // mapのpinをreportsにシンクロさせる

  if (reportMap === null || reportMap === undefined) {
    console.debug('updatePins(): reportMap is null!');
    return;
  }

  var newIds = _.map(reports, function(r) { return r.id });
  var oldIds = _.keys(placedReportIds);
  var diff = diffReportIds(oldIds, newIds);

  // removedなreportなものをマップから削除する
  _.each(diff.removed, function(rid) {
    var removingMarker = placedReportIds[rid];
    removingMarker.setMap(null);  // causes disappearance
    delete placedReportIds[rid];
  });

  // addedなreportsのみをえらぶ
  var addedCheck = buildCheck(diff.added);
  var addedReports = _.select(reports, function(r) { return (addedCheck[r.id] === true); });

  // addedなreportsをMarkerとしてmapに追加
  _.each(addedReports, function(r) {
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
    marker.addListener('click', function() {
      // console.debug('pin clicked: report.id=' + reportId);
      flux.actions.onClickPin({ reportId: reportId });
      reportMap.panTo({ lat: Number(latitude), lng: Number(longitude) });
    });

    placedReportIds[r.id] = marker;  // このreportはもうピンを追加した。
  });
};

var fetchReports = function(types, startDate, endDate, topLeft, bottomRight, progress, query) {
  var url = '/api/reports';

  // console.debug('fetchReports: types=' + types);

  var params = {
    nodes: JSON.stringify(types),
    top_left: topLeft,
    bottom_right: bottomRight,
    progress: progress,
    include_image: 'false',
    query: query
  };

  if (startDate !== null && startDate !== undefined) {
    params.time_start = DateUtil.formatDate(startDate);
  }
  if (endDate !== null && endDate !== undefined) {
    params.time_end = DateUtil.formatDate(endDate);
  }

  $.ajax({
    url: url,
    method: 'GET',
    data: params,
    success: function(data, status, jqxhr) {
      // console.debug('got reports!');
      var reports = data.result.reports;
      // console.debug('got reports! len=' + reports.length);
      flux.actions.onFetchingReportsSuccess({ reports: reports });
      setTimeout(function() {
        setTimeout(function() {
          flux.actions.onTableSetPage({ page: 1 });
        }, 0);
      }, 0);
    },
    error: function() {
      flux.actions.onFetchingReportsFailed();
    }
  });
  flux.actions.onStartFetchingReports();
  // console.debug('reports requested!');
};

var fetchDetail = function(reportId) {
  var url = '/api/detail/' + reportId;
  var params = {};
  $.ajax({
    url: url,
    method: 'GET',
    data: params,
    success: function(data, status, jqxhr) {
      var report = data.result.report;
      flux.actions.onFetchingDetailSuccess({ selectedReport: report });
    },
    error: function() {
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
  START_FETCHING_COMMENTS: 'START_FETCHING_COMMENTS',
  FETCHING_COMMENTS_SUCCESS: 'FETCHING_COMMENTS_SUCCESS',
  FETCHING_COMMENTS_FAILED: 'FETCHING_COMMENTS_FAILED',
  CLICK_PIN: 'CLICK_PIN',
  // UPDATE_START_DATE: 'UPDATE_START_DATE',
  // UPDATE_END_DATE: 'UPDATE_END_DATE',
  UPDATE_QUERY_RANGE: 'UPDATE_QUERY_RANGE',
  DRAG_MAP: 'DRAG_MAP',
  TOGGLE_TYPE_BUTTON: 'TOGGLE_TYPE_BUTTON',
  TOGGLE_PROGRESS_BUTTON: 'TOGGLE_PROGRESS_BUTTON',
  TOGGLE_SELECT_ALL_TYPE_BUTTON: 'TOGGLE_SELECT_ALL_TYPE_BUTTON',
  SET_REPORTS: 'SET_REPORTS',
  TABLE_PREV_PAGE_CLICKED: 'TABLE_PREV_PAGE_CLICKED',
  TABLE_NEXT_PAGE_CLICKED: 'TABLE_NEXT_PAGE_CLICKED',
  TABLE_SET_PAGE: 'TABLE_SET_PAGE',
  TOGGLE_SHOWING_TABLE: 'TOGGLE_SHOWING_TABLE',
  TOGGLE_SHOWING_FILTER: 'TOGGLE_SHOWING_FILTER',
  TOGGLE_NEW_REPORT: 'TOGGLE_NEW_REPORT',
  TOGGLE_SMARTCHECK: 'TOGGLE_SMARTCHECK',
  UPDATE_COMMENT_USER: 'UPDATE_COMMENT_USER',
  UPDATE_NEW_COMMENT: 'UPDATE_NEW_COMMENT',
  UPDATE_COMMENT_PANEL: 'UPDATE_COMMENT_PANEL',
  UPLOAD_COMMENT_IMAGE: 'UPLOAD_COMMENT_IMAGE',
  CHECK_FINISHED: 'CHECK_FINISHED',
  REVERT_FINISHED: 'REVERT_FINISHED',
  UPDATE_SEARCH_QUERY: 'UPDATE_SEARCH_QUERY',
  UPDATE_TIME_RANGE_BUTTON_INDEX: 'UPDATE_TIME_RANGE_BUTTON_INDEX'
};

var MinaRepoStore = Fluxxor.createStore({
  initialize: function() {
    this.reports = [];
    this.comments = [];
    this.selectedReport = null;
    var selectedTypes = {};
    _.each(reportTypes, function(rt) {
      selectedTypes[rt] = true;  // デフォルトで全部選択
    });
    this.selectedTypes = selectedTypes;
    this.selectedProgress = 'none';
    this.clickedPinReportId = null;
    this.startDate = defaultStartDate;
    this.endDate = defaultEndDate;
    this.isFetchingReports = false;
    this.isFetchingReportsFailed = false;
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = false;
    this.isFetchingComments = false;
    this.isFetchingCommentsFailed = false;
    this.mapTopLeft = null;
    this.mapBottomRight = null;
    this.tableSelectedPage = 1;
    this.isShowingTable = true; // shinny modifyied to show from beginning [false -> true]
    this.isShowingFilter = false;
    this.commentUser = '';
    this.newComment = '';
    this.cmntImage = '';
    this.checkFinished = false;
    this.revertFinished = false;
    this.searchQuery = '';
    this.timeRangeButtonIndex = defaultTimeRangeButtonIndex;  // all

    this.bindActions(constants.START_FETCHING_REPORTS, this.onStartFetchingReports);
    this.bindActions(constants.FETCHING_REPORTS_SUCCESS, this.onFetchingReportsSuccess);
    this.bindActions(constants.FETCHING_REPORTS_FAILED, this.onFetchingReportsFailed);
    this.bindActions(constants.START_FETCHING_DETAIL, this.onStartFetchingDetail);
    this.bindActions(constants.FETCHING_DETAIL_SUCCESS, this.onFetchingDetailSuccess);
    this.bindActions(constants.FETCHING_DETAIL_FAILED, this.onFetchingDetailFailed);
    this.bindActions(constants.START_FETCHING_COMMENTS, this.onStartFetchingComments);
    this.bindActions(constants.FETCHING_COMMENTS_SUCCESS, this.onFetchingCommentsSuccess);
    this.bindActions(constants.FETCHING_COMMENTS_FAILED, this.onFetchingCommentsFailed);
    this.bindActions(constants.CLICK_PIN, this.onClickPin);
    // this.bindActions(constants.UPDATE_START_DATE, this.onUpdateStartDate);
    // this.bindActions(constants.UPDATE_END_DATE, this.onUpdateEndDate);
    this.bindActions(constants.UPDATE_QUERY_RANGE, this.onUpdateQueryRange);
    this.bindActions(constants.DRAG_MAP, this.onDragMap);
    this.bindActions(constants.TOGGLE_TYPE_BUTTON, this.onToggleTypeButton);
    this.bindActions(constants.TOGGLE_PROGRESS_BUTTON, this.onToggleProgressButton);
    this.bindActions(constants.TOGGLE_SELECT_ALL_TYPE_BUTTON, this.onToggleSelectAllTypeButton);
    this.bindActions(constants.SET_REPORTS, this.onSetReports);
    this.bindActions(constants.TABLE_PREV_PAGE_CLICKED, this.onTablePrevPageClicked);
    this.bindActions(constants.TABLE_NEXT_PAGE_CLICKED, this.onTableNextPageClicked);
    this.bindActions(constants.TABLE_SET_PAGE, this.onTableSetPage);
    this.bindActions(constants.TOGGLE_SHOWING_TABLE, this.onToggleShowingTable);
    this.bindActions(constants.TOGGLE_SHOWING_FILTER, this.onToggleShowingFilter);
    this.bindActions(constants.TOGGLE_NEW_REPORT, this.onToggleNewReport);
    this.bindActions(constants.TOGGLE_SMARTCHECK, this.onToggleSmartcheck);
    this.bindActions(constants.UPDATE_COMMENT_USER, this.onUpdateCommentUser);
    this.bindActions(constants.UPDATE_NEW_COMMENT, this.onUpdateNewComment);
    this.bindActions(constants.UPLOAD_COMMENT_IMAGE, this.onUploadImage);
    this.bindActions(constants.CHECK_FINISHED, this.onCheckFinished);
    this.bindActions(constants.REVERT_FINISHED, this.onRevertFinished);
    this.bindActions(constants.UPDATE_COMMENT_PANEL, this.onUpdateCommentPanel);
    this.bindActions(constants.UPDATE_SEARCH_QUERY, this.onUpdateSearchQuery);
    this.bindActions(constants.UPDATE_TIME_RANGE_BUTTON_INDEX, this.onUpdateTimeRangeButtonIndex);
  },
  getState: function() {
    return {
      reports: this.reports,
      comments: this.comments,
      selectedReport: this.selectedReport,
      selectedTypes: this.selectedTypes,
      clickedPinReportId: this.clickedPinReportId,
      startDate: this.startDate,
      endDate: this.endDate,
      isFetchingReports: this.isFetchingReports,
      isFetchingReportsFailed: this.isFetchingReportsFailed,
      isFetchingDetail: this.isFetchingDetail,
      isFetchingDetailFailed: this.isFetchingDetailFailed,
      isFetchingComments: this.isFetchingComments,
      isFetchingCommentsFailed: this.isFetchingCommentsFailed,
      mapTopLeft: this.mapTopLeft,
      mapBottomRight: this.mapBottomRight,
      tableSelectedPage: this.tableSelectedPage,
      isShowingTable: this.isShowingTable,
      isShowingFilter: this.isShowingFilter,
      commentUser: this.commentUser,
      newComment: this.newComment,
      cmntImage: this.cmntImage,
      checkFinished: this.checkFinished,
      revertFinished: this.revertFinished,
      selectedProgress: this.selectedProgress,
      searchQuery: this.searchQuery,
      timeRangeButtonIndex: this.timeRangeButtonIndex
    }
  },
  onStartFetchingReports: function(data) {
    this.isFetchingReports = true;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingReportsSuccess: function(data) {
    this.reports = data.reports;
    this.isFetchingReports = false;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingReportsFailed: function(data) {
    this.isFetchingReports = false;
    this.isFetchingDetailFailed = true;
    this.emit('change');
  },
  onStartFetchingDetail: function(data) {
    this.isFetchingDetail = true;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingDetailSuccess: function(data) {
    this.selectedReport = data.selectedReport;
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingDetailFailed: function(data) {
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = true;
    this.emit('change');
  },
  onStartFetchingComments: function(data) {
    this.isFetchingComments = true;
    this.isFetchingCommentsFailed = false;
    this.emit('change');
  },
  onFetchingCommentsSuccess: function(data) {
    this.comments = data.comments;
    this.isFetchingComments = false;
    this.isFetchingCommentsFailed = false;
    this.emit('change');
  },
  onFetchingCommentsFailed: function(data) {
    this.isFetchingComments = false;
    this.isFetchingCommentsFailed = true;
    this.emit('change');
  },
  onClickPin: function(data) {
    this.clickedPinReportId = data.reportId;
    window.location.hash = "report=" + data.reportId;
    // console.debug('updated clickedPinReportId! ' + data.reportId);
    this.emit('change');
  },
  // onUpdateStartDate: function(data) {
  //   this.startDate = data.startDate;
  //   this.emit('change');
  // },
  // onUpdateEndDate: function(data) {
  //   this.endDate = data.endDate;
  //   this.emit('change');
  // },
  onUpdateQueryRange: function(data) {
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.emit('change');
  },
  onDragMap: function(data) {
    this.mapTopLeft = data.mapTopLeft;
    this.mapBottomRight = data.mapBottomRight;
    this.emit('change');
  },
  onToggleTypeButton: function(data) {
    var type = data.type;
    var selectedNum = countSelectedTypes(this.selectedTypes);

    if (selectedNum == reportTypes.length) { // all selected -> single filter
      changeAllTypes(this.selectedTypes, false);
      this.selectedTypes[type] = !this.selectedTypes[type];
    } else if (selectedNum == 1) {
      if (this.selectedTypes[type]) { // single filter -> all selected
        changeAllTypes(this.selectedTypes, true);
      } else {
        this.selectedTypes[type] = !this.selectedTypes[type]; // just add filter type
      }
    } else {
      this.selectedTypes[type] = !this.selectedTypes[type]; // just add filter type
    }
    this.emit('change');
  },
  onToggleProgressButton: function(data) {
    var progress = data.selectedProgress;
    if (this.selectedProgress == progress) {
      this.selectedProgress = 'none';
    } else {
      this.selectedProgress = progress;
    }

    this.emit('change');
  },
  onToggleSelectAllTypeButton: function() {
    changeAllTypes(this.selectedTypes, true);
    this.emit('change');
  },
  onSetReports: function(data) {
    this.reports = data.reports;
    this.emit('change');
  },
  onTablePrevPageClicked: function() {
    var currentPage = this.tableSelectedPage;
    if (currentPage == 1) {
      console.error('cannot go prev when current page is 1');
    } else {
      this.tableSelectedPage = currentPage - 1;
    }
    this.emit('change');
  },
  onTableNextPageClicked: function() {
    var currentPage = this.tableSelectedPage;
    var maxPage = TableUtil.countPages(this.reports);
    if (currentPage == maxPage) {
      console.error('cannot go next when current page is last: last=' + maxPage);
    } else {
      this.tableSelectedPage = currentPage + 1;
    }
    this.emit('change');
  },
  onTableSetPage: function(data) {
    var page = data.page;
    this.tableSelectedPage = page;
    this.emit('change');
  },
  onToggleShowingTable: function() {
    this.isShowingTable = !this.isShowingTable;
    this.emit('change');
  },
  onToggleShowingFilter: function() {
    this.isShowingFilter = !this.isShowingFilter;
    this.emit('change');
  },
  onToggleNewReport: function() {
    return;
  },
  onToggleSmartcheck: function() {
    return;
  },
  onUpdateCommentUser: function(data) {
    this.commentUser = data.commentUser;
    this.emit('change');
  },
  onUpdateNewComment: function(data) {
    this.newComment = data.newComment;
    this.emit('change');
  },
  onUploadImage: function(data) {
    this.cmntImage = data.image;
    this.emit('change');
  },
  onCheckFinished: function(data) {
    this.checkFinished = data.checked;
    this.emit('change');
  },
  onRevertFinished: function(data) {
    this.revertFinished = data.revert;
    this.emit('change');
  },
  onUpdateCommentPanel: function(data) {
    var reportId = data.reportId;
    var url = '/api/report/' + reportId + '/comments';
    $.ajax({
      method: 'GET',
      url: url,
      success: function(data, status, jqxhr) {
        this.comments = data.result;
      },
      error: function() {
        this.onFetchingCommentsFailed();
      }
    });
    this.emit('change');
  },
  onUpdateSearchQuery: function(data) {
    this.searchQuery = data.query;
    this.emit('change');
  },
  onUpdateTimeRangeButtonIndex: function(data) {
    this.timeRangeButtonIndex = data.timeRangeButtonIndex;
    this.emit('change');
  }
});

var actions = {
  onStartFetchingReports: function(data) {
    this.dispatch(constants.START_FETCHING_REPORTS);
  },
  onFetchingReportsSuccess: function(data) {
    var reports = data.reports;
    this.dispatch(constants.FETCHING_REPORTS_SUCCESS, { reports: reports });
  },
  onFetchingReportsFailed: function(data) {
    this.dispatch(constants.FETCHING_REPORTS_FAILED);
  },
  onStartFetchingDetail: function(data) {
    this.dispatch(constants.START_FETCHING_DETAIL);
  },
  onFetchingDetailSuccess: function(data) {
    var selectedReport = data.selectedReport;
    this.dispatch(constants.FETCHING_DETAIL_SUCCESS, { selectedReport: selectedReport });
  },
  onFetchingDetailFailed: function(data) {
    this.dispatch(constants.FETCHING_DETAIL_FAILED);
  },
  onStartFetchingComments: function(data) {
    this.dispatch(constants.START_FETCHING_COMMENTS);
  },
  onFetchingCommentsSuccess: function(data) {
    var comments = data.comments;
    this.dispatch(constants.FETCHING_COMMENTS_SUCCESS, { comments: comments });
  },
  onFetchingCommentsFailed: function(data) {
    this.dispatch(constants.FETCHING_DETAIL_FAILED);
  },
  onClickPin: function(data) {
    var reportId = data.reportId;
    this.dispatch(constants.CLICK_PIN, { reportId: reportId });
  },
  // onUpdateStartDate: function(data) {
  //   var startDate = data.startDate;
  //   this.dispatch(constants.UPDATE_START_DATE, { startDate: startDate });
  // },
  // onUpdateEndDate: function(data) {
  //   var endDate = data.endDate;
  //   this.dispatch(constants.UPDATE_END_DATE, { endDate: endDate });
  // },
  onUpdateQueryRange: function(data) {
    this.dispatch(constants.UPDATE_QUERY_RANGE, data);
  },
  onDragMap: function(data) {
    var argData = {
      mapTopLeft: data.mapTopLeft,
      mapBottomRight: data.mapBottomRight
    };
    this.dispatch(constants.DRAG_MAP, argData);
  },
  onToggleTypeButton: function(data) {
    this.dispatch(constants.TOGGLE_TYPE_BUTTON, { type: data.type });
  },
  onToggleProgressButton: function(data) {
    this.dispatch(constants.TOGGLE_PROGRESS_BUTTON, { selectedProgress: data.selectedProgress });
  },
  onToggleSelectAllTypeButton: function() {
    this.dispatch(constants.TOGGLE_SELECT_ALL_TYPE_BUTTON);
  },
  onSetReports: function(data) {
    this.dispatch(constants.SET_REPORTS, { reports: data.reports });
  },
  onTablePrevPageClicked: function() {
    this.dispatch(constants.TABLE_PREV_PAGE_CLICKED);
  },
  onTableNextPageClicked: function() {
    this.dispatch(constants.TABLE_NEXT_PAGE_CLICKED);
  },
  onTableSetPage: function(data) {
    this.dispatch(constants.TABLE_SET_PAGE, { page: data.page });
  },
  onToggleShowingTable: function() {
    this.dispatch(constants.TOGGLE_SHOWING_TABLE);
  },
  onToggleShowingFilter: function() {
    this.dispatch(constants.TOGGLE_SHOWING_FILTER);
  },
  onToggleNewReport: function() {
    window.location.href = '/new_report';
  },
  onToggleSmartcheck: function(data) {
    var url = '/smartcheck?id=' + data.id;
    var win = window.open(url, '_blank');
    win.focus();
  },
  onUpdateCommentUser: function(data) {
    this.dispatch(constants.UPDATE_COMMENT_USER, { commentUser: data.commentUser });
  },
  onUpdateNewComment: function(data) {
    this.dispatch(constants.UPDATE_NEW_COMMENT, { newComment: data.newComment });
  },
  onUpdateCommentPanel: function(data) {
    this.dispatch(constants.UPDATE_COMMENT_PANEL, { reportId: data.reportId });
  },
  onUploadImage: function(data) {
    this.dispatch(constants.UPLOAD_COMMENT_IMAGE, { image: data.image });
  },
  onCheckFinished: function(data) {
    this.dispatch(constants.CHECK_FINISHED, { checked: data.checked });
  },
  onRevertFinished: function(data) {
    this.dispatch(constants.REVERT_FINISHED, { revert: data.revert });
  },
  onUpdateSearchQuery: function(data) {
    this.dispatch(constants.UPDATE_SEARCH_QUERY, {query: data.query});
  },
  onUpdateTimeRangeButtonIndex: function(data) {
    this.dispatch(constants.UPDATE_TIME_RANGE_BUTTON_INDEX, { timeRangeButtonIndex: data.timeRangeButtonIndex });
  }
};


var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var stores = { MinaRepoStore: new MinaRepoStore() };
var flux = new Fluxxor.Flux(stores, actions);

var ReportDetail = React.createClass({
  componentWillReceiveProps: function(newProps) {
    // console.debug('ReportDetail: componentWillReceiveProps() called');
    var newReportId = newProps.clickedPinReportId;
    var currentReportId = this.props.clickedPinReportId;
    if (currentReportId !== newReportId) {
      // fetch detail
      setTimeout(function() {
        // console.debug('going to fetch report detail id=' + newReportId);
        var url = '/api/detail/' + newReportId;
        $.ajax({
          url: url,
          method: 'GET',
          success: function(data, status, jqxhr) {
            // console.debug('got report detail id=' + newReportId);
            var report = data.result.report;
            flux.actions.onFetchingDetailSuccess({ selectedReport: report });
          },
          error: function() {
            // console.error('detail fetch error');
            flux.actions.onFetchingDetailFailed();
          }
        });
        flux.actions.onStartFetchingDetail();
      }, 0);
    }
  },
  smartcheckToggleButtonHandler: function(event) {
    var hashMatch = window.location.hash.match(reportHashPattern);
    var reportId = parseInt(hashMatch[1]);
    flux.actions.onToggleSmartcheck({ id : reportId });
  },
  render: function() {
    var pinId = this.props.clickedPinReportId;
    if (pinId === null || pinId === undefined) {
      // console.debug('detail pattern 0: not clicked');
      return <div/>;
    }

    var isFetchingDetail = this.props.isFetchingDetail;
    var isFetchingDetailFailed = this.props.isFetchingDetailFailed;

    var detail = this.props.selectedReport;
    var detailExists = (
      (detail !== undefined && detail !== null) && (
        (detail.id !== null) && (detail.id !== undefined)
      )
    );

    var detailReportId;
    var detailType;
    var detailComment;
    var detailUser;
    var detailImage;
    var detailLocation;
    var detailTimestamp;
    var detailLevel;
    var detailFinishedHdr;
    var detailFinished;
    var centerButtonDom = '';

    if (!isFetchingDetail && !isFetchingDetailFailed && detailExists) {
      // console.debug('detail pattern 1: got report');
      detailReportId = detail.id;
      var detailTypeStr = type2text[detail.type];
      var reportTypeImg = type2img(detail.type, true);
      var detailTypeImg = <img src={reportTypeImg} className="mrv-detail-report-type-image" />;
      detailType = <span>{detailTypeImg} {detailTypeStr}</span>;
      detailComment = detail.comment;
      detailUser = detail.user;
      detailImage = detail.image;
      var finished = (detail.finished) ? '対応完了' : '未対応';
      detailFinishedHdr = <dt>レポート対応状況</dt>;
      detailFinished = <dd>{finished}</dd>;
      if (detailImage == '' || detailImage == 'data:,') {
        detailImage = '/static/img/no-image.png';
      }
      detailTimestamp = detail.timestamp;
      var parsedTimestamp = detailTimestamp.replace(/-/g, '/');
      var currentTime = new Date();
      var dateString  = currentTime.getYear() + '/' + currentTime.getMonth() + '/' + currentTime.getDate();
      var reportTime = new Date(parsedTimestamp);
      var reportDateString = reportTime.getYear() + '/' + reportTime.getMonth() + '/' + reportTime.getDate();
      var date = new Date(dateString);
      var reportDate = new Date(reportDateString);
      var dateDiff = (date - reportDate) / (1000 * 60 * 60 * 24);
      if (dateDiff > 0) {
        var shapedTime = dateDiff + '日前';
        detailTimestamp += ' (' + shapedTime + ')';
      }
      if (detailComment === '') {
        detailComment = <span className="mrv-detail-no-comment">(コメントなし)</span>
      }
      var address = detail.address;
      if (address === null) {
        address = <span className="mrv-detail-no-address">(取得されていません)</span>;
      }

      if (detail.level == 0) {
        detailFinishedHdr = '';
        detailFinished = '';
      }
      var reportLevelClass = 'level-' + detail.level;
      detailLevel = <span className={reportLevelClass}>{reportLevel[detail.level]}</span>;
      detailLocation = <div>
        住所: {address}<br/>
        GPS座標: 緯度={detail.geo[0]}, 経度={detail.geo[1]}
      </div>;

      var centerButtonHandler = function(event) {
        // var marker = report
        // var marker = placedReportIds[detailReportId];
        var lat = Number(detail.geo[0]);
        var lng = Number(detail.geo[1]);
        document.getElementById('report-map').scrollIntoView();
        reportMap.setZoom(18);
        reportMap.panTo({ lat: lat, lng: lng });
      };
      centerButtonDom = <button className="button" onClick={centerButtonHandler}>マップに表示</button>;

      var openInfoWindow = function(imgData, lat, lng) {
        var img = new Image();
        img.className = 'info-img-horizontal';
        img.addEventListener('load', function() {
          if (img.width < img.height) {
            img.className = 'info-img-vertical';
          }

          if (infoWindow === null || infoWindow === undefined) {
            infoWindow = new google.maps.InfoWindow({
              content: '<section>' + img.outerHTML + '</section>',
              position: new google.maps.LatLng(lat, lng),
              pixelOffset: new google.maps.Size(0, -30)
            });
            google.maps.event.addListener(reportMap, 'click', function() {
              infoWindow.close();
            });
          } else {
            infoWindow.setContent('<section>' + img.outerHTML + '</section>');
            infoWindow.position = new google.maps.LatLng(lat, lng);
          }
          infoWindow.setMap(reportMap);
        });
        img.src = imgData;
      };
      openInfoWindow(detailImage, detail.geo[0], detail.geo[1]);
    } else if (isFetchingDetail) {
      // console.debug('detail pattern 2: fetching');
      detailReportId = '読み込み中...';
      detailTimestamp = '読み込み中...';
      detailUser = '読み込み中...';
      detailType = '読み込み中...';
      detailComment = '読み込み中...';
      detailLocation = '読み込み中...';
      detailLevel = '読み込み中...';
      detailFinished = '読み込み中...';
      detailImage = '/static/img/loading-image.gif';  // FIXME: 権利？
    } else if (!isFetchingDetail && isFetchingDetailFailed) {
      // console.debug('detail pattern 3: fetch failed');
      detailReportId = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailTimestamp = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailUser = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailType = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailComment = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailLocation = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailLevel = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailFinished = <span className="mrv-detail-error">読み込みに失敗しました</span>;
      detailImage = '/static/img/loading-image.gif';  // FIXME: もっとエラーっぽい画像にしたい
    }

    return <div className="row mrv-detail">
      <div className="large-6 columns mrv-detail-img-container">
        <div className="mrv-detail-img-inner-container">
          <h3>レポート画像</h3>
          <div><img src={detailImage} className="mrv-detail-image" /></div>
        </div>
      </div>
      <div className="large-6 columns">
        <div className="mrv-detail-info-header">
          <h3>レポート内容</h3>
        </div>
        <dl className="mrv-detail-info">
          <dt>レポートID</dt>
          <dd>{detailReportId}</dd>

          <dt>レポート種別</dt>
          <dd>{detailType}</dd>

          <dt>レポート投稿日時</dt>
          <dd>{detailTimestamp}</dd>

          <dt>場所</dt>
          <dd>{detailLocation}</dd>

          <dt>レポートユーザー</dt>
          <dd>{detailUser}</dd>

          <dt>レポート対応レベル</dt>
          <dd>{detailLevel}</dd>

          {detailFinishedHdr}
          {detailFinished}

          <dt>コメント</dt>
          <dd>{detailComment}</dd>
        </dl>
        <div className="columns text-center">
          <button className="button" onClick={this.smartcheckToggleButtonHandler}>スマートチェックに書き出す</button>
        </div>
      </div>
    </div>;
  }
});

var DateControlButton = React.createClass({
  onClick: function(event) {
    var label = this.props.label;
    var selected = this.props.selected;
    var index = this.props.index;
    console.debug('@@DateControlButton clicked: label=' + label + ', selected=' + selected + ', index=' + index);
    var rangeCalculator = this.props.range;
    var range = rangeCalculator();
    var startDate = range[0];
    var endDate = range[1];
    flux.actions.onUpdateTimeRangeButtonIndex({ timeRangeButtonIndex: index });
    flux.actions.onUpdateQueryRange({ startDate: startDate, endDate: endDate });
    setTimeout(function() {
      var state = flux.stores.MinaRepoStore.getState();
      fetchReports(
        selectSelected(state.selectedTypes),
        state.startDate,
        state.endDate,
        state.mapTopLeft,
        state.mapBottomRight,
        state.selectedProgress,
        state.searchQuery
      );
    }, 0);
  },
  render: function() {
    var label = this.props.label;
    var selected = this.props.selected;
    var index = this.props.index;
    var cssClass = classNames({
      'button': true,
      'date-btn-selected': selected
    });
    return <div className="small-2 columns text-center">
      <button onClick={this.onClick} className={cssClass}>{label}</button>
    </div>
  }
});

var DateController = React.createClass({
  render: function() {
    // return '';  // FIXME: alphaバージョンではなしにする？
    var timeRangeButtonIndex = this.props.timeRangeButtonIndex;
    // var now = new Date();
    var i = 0;
    var buttonDefinitions = _.map(timeRangeButtonDefinitions, function(d) {
      var idx = i++;
      var selected = (timeRangeButtonIndex === idx);
      return { label: d.label, range: d.range, selected: selected, index: idx };
    });
    var buttons = _.map(buttonDefinitions, function(d) {
      return <DateControlButton {...d} />;
    });

    return <div className="row">
      {buttons}
    </div>;
  }
});

var ReportMap = React.createClass({
  componentDidMount: function() {
    // GoogleMaps初期化

    // FIXME: センターの位置をスマートフォンのGPSから取得する？
    // var sfcLatitude = 35.388281;
    // var sfcLongitude = 139.427309;

    reportMap = new google.maps.Map(
      document.getElementById('report-map'),
      {
        // center: { lat: INIT_MAP_CENTER.latitude, lng: INIT_MAP_CENTER.longitude },
        center: INIT_MAP_CENTER,
        zoom: 15
      }
    );
    // console.debug('initialized reportMap');
  },
  componentWillReceiveProps: function(newProps) {
    // updatePinsをよぶ
    // console.debug('ReportMap: componentWillReceiveProps() called');
    var reports = newProps.reports;
    updatePins(reports);
  },
  render: function() {
    var nReports = this.props.reports.length;
    var msgReportNum = '';

    if (this.props.isFetchingReports) {
      msgReportNum = <div className="mrv-loading-reports">
        <img src="/static/img/loading2.gif" className="mrv-img-loading-reports" />
        レポートを読み込み中...
      </div>;
    } else if (this.props.isFetchingReportsFailed) {
      msgReportNum = 'レポートの読み込みに失敗しました';
    } else {
      msgReportNum = '' + nReports + '件のレポート';
    }

    return <div className="large-6 columns mrv-map-container">
      {msgReportNum}
      <div id="report-map" key="report-map"></div>
    </div>;
  }
});

var ReportTable = React.createClass({
  render: function() {
    var reports = this.props.reports;
    var selectedPage = this.props.tableSelectedPage;
    var selectedReport = this.props.selectedReport;

    var showingReports = TableUtil.getPageReports(reports, selectedPage);
    // console.debug('%% showingReports.length=' + showingReports.length + ', sp=' + selectedPage + ', n-reports=' + reports.length);

    var reportRows = _.map(showingReports, function(report) {
      // console.debug('%% generating tr element for report.id=' + report.id)
      var reportId = report.id;
      var key = 'report-' + String(report.id);
      var showHandler = function(event) {
        flux.actions.onClickPin({ reportId: reportId });

        var lat = Number(report.geo[0]);
        var lng = Number(report.geo[1]);
        document.getElementById('report-map').scrollIntoView();
        reportMap.setZoom(18);
        reportMap.panTo({ lat: lat, lng: lng });
      };
      var reportTypeStr = type2textShort[report.type];
      var reportTypeImg = type2img(report.type, true);
      var reportTypeImg = <img src={reportTypeImg} className="mrv-report-table-report-type-image" />;
      var reportType = <span>{reportTypeImg} {reportTypeStr}</span>;

      var reportLevelColor = 'level-' + report.level;
      var reportLevelStr = reportLevelShort[report.level];

      var reportFinishedImg = '-';
      if (report.level) {
        reportFinishedImg = finished2img(report.finished);
        reportFinishedImg = <img src={reportFinishedImg} className="mrv-report-table-report-type-image" />;
      }

      var reportTime = timestampShaper(report.timestamp);

      var rowClass = "mrv-report-table-show-detail-link";
      var hashId = location.hash.split('report=')[1];
      if (( hashId !== undefined && hashId !== null)
        && hashId == reportId) {
        rowClass += " selected";
      }

      var reporter = report.user;
      var reporterClass = "";
      if (reporter.length > 10) {
        reporterClass = "report-user-abbr";
      }

      return <tr className={rowClass} key={key} onClick={showHandler}>
        <td><span>{reportId}</span></td>
        <td><span>{reportType}</span></td>
        <td><span className={reporterClass}>{report.user}</span></td>
        <td><span>{reportTime}</span></td>
        <td><span className={reportLevelColor}>{reportLevelStr}</span></td>
        <td><span className="text-center">{reportFinishedImg}</span></td>
      </tr>;
    });

    var isFirstPage = (selectedPage == 1);
    var isLastPage = (selectedPage == TableUtil.countPages(reports));
    var paginationPages = TableUtil.genPaginationNumbers(reports, selectedPage);
    // console.debug('@@ paginationPages.length=' + paginationPages.length);

    var paginationElements = _.map(paginationPages, function(pg) {
      // console.debug('@@ generating li element for page=' + pg);
      var isThisPageSelected = (pg == selectedPage);
      var key = 'page-' + String(pg) + (isThisPageSelected ? '-selected' : '-unselected');
      var pgLiClass = classNames({ current: isThisPageSelected });
      var clickHandler = function(event) {
        event.preventDefault();  // don't go top
        flux.actions.onTableSetPage({ page: pg });
      };
      var number = null;
      if (isThisPageSelected) {
        number = String(pg);
      } else {
        number = <a href="#" onClick={clickHandler}>{pg}</a>
      }
      return <li className={pgLiClass} key={key}>
        {number}
      </li>;
    });

    var prevArrowClass = classNames({ 'pagination-previous': true, disabled: isFirstPage });
    var prevArrowKey = 'prev-arrow-' + (isFirstPage ? 'disabled' : 'available');
    var prevOnClick = function(event) {
      event.preventDefault();  // don't go top
      flux.actions.onTablePrevPageClicked();
    };
    var insidePrev = null;
    var prevMessage = '前へ';
    if (isFirstPage) {
      insidePrev = prevMessage;
    } else {
      insidePrev = <a href="#" onClick={prevOnClick}>{prevMessage}</a>;
    }
    paginationElements.unshift(<li className={prevArrowClass} key={prevArrowKey}>
      {insidePrev}
    </li>);

    var nextArrowClass = classNames({ 'pagination-next': true, disabled: isLastPage });
    var nextArrowKey = 'next-arrow-' + (isLastPage ? 'disabled' : 'available');
    var insideNext = null;
    var nextMessage = '次へ';
    var nextOnClick = function(event) {
      event.preventDefault();
      flux.actions.onTableNextPageClicked();
    };
    if (isLastPage) {
      insideNext = nextMessage;
    } else {
      insideNext = <a href="#" onClick={nextOnClick}>{nextMessage}</a>;
    }
    paginationElements.push(<li className={nextArrowClass} key={nextArrowKey}>
      {insideNext}
    </li>);

    var pager1 = <ul className="pagination text-center pager1" role="pagination" aria-label="Pagination" key="pager1">{paginationElements}</ul>;
    var pager2 = <ul className="pagination text-center pager2" role="pagination" aria-label="Pagination" key="pager2">{paginationElements}</ul>;

    return <div className="large-6 columns mrv-report-table-container">
      <nav>
        {pager1}
      </nav>

      <table className="hover mrv-report-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>レポ種類</th>
            <th>投稿者</th>
            <th>投稿時刻</th>
            <th>対応</th>
            <th>完了</th>
          </tr>
        </thead>

        <tbody>
          {reportRows}
        </tbody>
      </table>

      <nav>
        {pager2}
      </nav>
    </div>;
  }
});

var TypeButtons = React.createClass({
  onButtonClick: function(type) {
    var that = this;
    return function(event) {
      flux.actions.onToggleTypeButton({ type: type });

      // 新しくクエリする => マーカーの差分が表示される
      console.debug('!!! TypeButtons.onButtonClick');
      fetchReports(
        selectSelected(that.props.selectedTypes),
        that.props.startDate,
        that.props.endDate,
        that.props.mapTopLeft,
        that.props.mapBottomRight,
        that.props.selectedProgress,
        that.props.searchQuery
      );
      flux.actions.onTableSetPage({ page: 1 });
    };
  },
  onSelectAllButtonClick: function() {
    var that = this;
    return function(event) {
      flux.actions.onToggleSelectAllTypeButton();

      // 新しくクエリする => マーカーの差分が表示される
      console.debug('!!! TypeButtons.onSelectAllButtonClick');
      fetchReports(
        selectSelected(that.props.selectedTypes),
        that.props.startDate,
        that.props.endDate,
        that.props.mapTopLeft,
        that.props.mapBottomRight,
        that.props.selectedProgress,
        that.props.searchQuery
      );
      flux.actions.onTableSetPage({ page: 1 });
    };
  },
  render: function() {
    var selBtnMap = this.props.selectedTypes;

    var that = this;
    var buttons = _.map(reportTypes, function(type) {
      var isSelected = selBtnMap[type];
      var imgFile = type2img(type, isSelected);
      var key = type + '-' + (isSelected ? 'selected' : 'unselected');  // React wants key!
      return <img
        key={key}
        onClick={that.onButtonClick(type)}
        src={imgFile}
        className="mrv-btn-image"
      />;
    });
    var selectAllButton = <button className="button" onClick={this.onSelectAllButtonClick()}>全種類選択</button>;

    return <div className="row mrv-btn-row">
      <div className="small-12 columns">
        レポート種類別フィルタ
      </div>
      <div className="medium-12 columns mrv-btn-container">
        {buttons}
      </div>
      <div className="small-12 columns mrv-select-all-btn">
        {selectAllButton}
      </div>
    </div>;
  }
});

var ProgressButtons = React.createClass({
  onButtonClick: function(selectedProgress) {
    var that = this;
    return function() {
      flux.actions.onToggleProgressButton({ selectedProgress: selectedProgress });

      // 新しくクエリする => マーカーの差分が表示される
      setTimeout(function() {
        fetchReports(
          selectSelected(that.props.selectedTypes),
          that.props.startDate,
          that.props.endDate,
          that.props.mapTopLeft,
          that.props.mapBottomRight,
          that.props.selectedProgress,
          that.props.searchQuery
        );
      }, 0);
      flux.actions.onTableSetPage({ page: 1 });
    };
  },
  render: function() {
    var selectedProgress = this.props.selectedProgress;
    var selectedTypes = this.props.selectedTypes;
    var class4finish = progress2class('finished', selectedProgress);
    var class4unfinish = progress2class('unfinished', selectedProgress);

    return <div className="row mrv-btn-row">
      <div className="small-12 columns">
        レポート完了フィルタ
      </div>
      <div className="medium-12 medium-centered columns mrv-btn-container">
        <button key='finished' className={class4finish} onClick={this.onButtonClick('finished')}>完了のみ</button>
        <button key='unfinished' className={class4unfinish} onClick={this.onButtonClick('unfinished')}>未完了のみ</button>
      </div>
    </div>;
  }
});

var ReporterSearch = React.createClass({
  onChangeQuery: function(text) {
    var searchQuery = text.target.value;
    flux.actions.onUpdateSearchQuery({ query: searchQuery });

    var that = this;
    if (searchQuery.length == 0) {
      fetchReports(
        selectSelected(that.props.selectedTypes),
        that.props.startDate,
        that.props.endDate,
        that.props.mapTopLeft,
        that.props.mapBottomRight,
        that.props.selectedProgress,
        ""
      );
    }

    return;
  },
  onButtonClick: function() {
    fetchReports(
      selectSelected(this.props.selectedTypes),
      this.props.startDate,
      this.props.endDate,
      this.props.mapTopLeft,
      this.props.mapBottomRight,
      this.props.selectedProgress,
      this.props.searchQuery
    );
    flux.actions.onTableSetPage({ page: 1 });
  },
  render: function() {
    return <div className="row mrv-btn-row">
      <div className="small-12 columns">
        レポート投稿者フィルタ
      </div>
      <div className="row">
        <div className="small-4 small-centered columns ">
          <input type="text" placeholder="投稿者名" onChange={this.onChangeQuery} className="columns medium-8"></input>
          <button key='search' onClick={this.onButtonClick} className="columns medium-4 button">検索</button>
        </div>
      </div>
    </div>;
  }
});

var ReportCommentPanel = React.createClass({
  updateCommentPanel: function(reportId, checked) {
    var that = this;
    $.ajax({
      method: 'GET',
      url: '/api/report/' + reportId + '/comments',
      success: function(data, status, jqxhr) {
        var comments = data.result;
        flux.actions.onFetchingCommentsSuccess({ comments: comments });
      },
      error: function() {
        flux.actions.onFetchingCommentsFailed();
      }
    });
    flux.actions.onStartFetchingComments();

    if (checked) {
      var url = '/api/detail/' + reportId;
      $.ajax({
        url: url,
        method: 'GET',
        success: function(data, status, jqxhr) {
          var report = data.result.report;
          flux.actions.onFetchingDetailSuccess({ selectedReport: report });
        },
        error: function() {
          flux.actions.onFetchingDetailFailed();
        }
      });
      flux.actions.onStartFetchingDetail();
    }

    fetchReports(
      selectSelected(that.props.selectedTypes),
      that.props.startDate,
      that.props.endDate,
      that.props.mapTopLeft,
      that.props.mapBottomRight,
      that.props.selectedProgress,
      that.props.searchQuery
    );
  },
  clearInput: function() {
    flux.actions.onUpdateCommentUser({ commentUser: '' });
    flux.actions.onUpdateNewComment({ newComment: '' });
    flux.actions.onUploadImage({ image: '' });
    if (this.props.checkFinished) {
      flux.actions.onCheckFinished({ checked: false });
    } else if (this.props.revertFinished) {
      flux.actions.onRevertFinished({ checked: false });
    }
  },
  onUpdateCommentUser: function(event) {
    var commentUser = event.target.value;
    flux.actions.onUpdateCommentUser({ commentUser: commentUser });
  },
  onUpdateNewComment: function(event) {
    var newComment = event.target.value;
    flux.actions.onUpdateNewComment({ newComment: newComment });
  },
  onUploadImage: function(event) {
    var imgFile = event.target.files;
    if (!imgFile.length) {
      return;
    }

    var image =  imgFile[0];
    var options = {canvas: true};
    loadImage.parseMetaData(image, function(data) {
      if (data.exif) {
        options.orientation = data.exif.get('Orientation');
      }
      options.maxHeight = 550;
      options.maxWidth = 550;
    });
    loadImage(
      image,
      function(canvas) {
        var dataURI = canvas.toDataURL('image/png');
        flux.actions.onUploadImage({ image: dataURI });
      },
      options
    );
  },
  onPushSubmitButton: function() {
    var that = this;
    return function() {
      if (!that.props.commentUser || !that.props.newComment) {
        showToast('error', '名前またはメッセージを入力してください');
        return;
      }
      var reportId = that.props.selectedReport.id;
      var data = {
        user: that.props.commentUser,
        comment: that.props.newComment,
        image: that.props.cmntImage
      };

      var checked = true;
      if (that.props.checkFinished) {
        data.finished = true;
      } else if (that.props.revertFinished) {
        data.revert = true;
      } else {
        checked = false;
      }

      $.ajax({
        method: 'POST',
        url: '/api/report/' + reportId + '/comments/new',
        data: data,
        dataType: 'json',
        success: function(data) {
          showToast('success', 'メッセージが投稿されました');
          that.clearInput();
          that.updateCommentPanel(reportId, checked);
        },
        error: function(data) {
          showToast('error', 'メッセージが投稿できませんでした．もう一度お試しください');
        }
      });
    }
  },
  onCheckFinished: function(event) {
    var val = event.target.checked;
    flux.actions.onCheckFinished({ checked: val });
  },
  onRevertFinished: function(event) {
    var val = event.target.checked;
    flux.actions.onRevertFinished({ revert: val });
  },
  componentWillReceiveProps: function(newProps) {
    var that = this;
    var newReportId = newProps.clickedPinReportId;
    var currentReportId = this.props.clickedPinReportId;
    if (currentReportId !== newReportId) {
      // fetch comments
      setTimeout(function() {
        var url = '/api/report/' + newReportId + '/comments';
        $.ajax({
          url: url,
          method: 'GET',
          success: function(data, status, jqxhr) {
            var comments = data.result;
            flux.actions.onFetchingCommentsSuccess({ comments: comments });
          },
          error: function() {
            flux.actions.onFetchingCommentsFailed();
          }
        });
        flux.actions.onStartFetchingComments();
      }, 0);
    }
  },
  render: function() {
    var selectedTypes = this.props.selectedTypes;
    var selectedProgress = this.props.selectedProgress;
    var commentUser = this.props.commentUser;
    var newComment = this.props.newComment;
    var cmntImage = this.props.cmntImage;
    var checkFinished = this.props.checkFinished;
    var revertFinished = this.props.revertFinished;
    var detail = this.props.selectedReport;
    var isFetchingDetail = this.props.isFetchingDetail;
    var isFetchingDetailFailed = this.props.isFetchingDetailFailed;
    var comments = this.props.comments;
    var isFetchingComments = this.props.isFetchingComments;
    var isFetchingCommentsFailed = this.props.isFetchingCommentsFailed;

    var fetchingComments = (isFetchingComments || isFetchingCommentsFailed);
    var commentsExists = (comments !== undefined && comments !== null);
    var detailExists = (
      (detail !== undefined && detail !== null) && (
        (detail.id !== null) && (detail.id !== undefined)
      )
    );

    var headerRow = '';
    var commentPanel = '';
    var commentLists = '';
    var usernameRow = '';
    var textAreaRow = '';
    var imageRow = '';
    var buttonRow = '';
    if (!fetchingComments && commentsExists && detailExists) {
      if (comments.length) {
        commentLists = _.map(comments, function(comment) {
          var image = '';
          if (comment.image) {
            image = <div className="text-center"><img className="comment-img" src={comment.image}/></div>;
          }
          return <div className="row" key={comment.id}>
            <div className="small-10 small-centered columns comment no-margin-btm">
              <span>{comment.user} [{comment.timestamp}] : {comment.comment}</span>
              {image}
            </div>
          </div>;
        });
      } else {
        commentLists = <p className="no-margin-btm text-center">現在メッセージはありません</p>;
      }

      headerRow = <div className="row comment-editor">
        <h3 className="text-center">ディスカッション</h3>
      </div>;
      commentPanel = <div id="comment-panel" className="row comment-editor">
        <div className="medium-9 medium-centered columns">
          <div className="panel">{commentLists}</div>
        </div>
      </div>;

      usernameRow = <div className="row">
        <div className="medium-9 medium-centered columns">
          <input type="text" className="comment-user" onChange={this.onUpdateCommentUser} value={this.props.commentUser} placeholder="名前" />
        </div>
      </div>;
      textAreaRow = <div className="row">
        <div className="medium-9 medium-centered columns">
          <textarea onChange={this.onUpdateNewComment} value={this.props.newComment} placeholder="メッセージを入力" />
        </div>
      </div>;
      imageRow = <div className="row">
        <div className="small-9 small-centered columns">
          <p>
            画像を登録:
            <input className="short-size" type="file" onChange={this.onUploadImage} accept="image/*" />
          </p>
        </div>
      </div>;

      if (detail.level == 0) {
        // hide checkbox
        buttonRow = <div className="row">
          <div className="small-6 small-centered columns text-center">
            <button className="button success text-center" onClick={this.onPushSubmitButton()}>メッセージ投稿</button>
          </div>
        </div>;
      } else if (detail.finished == true) {
        // checkbox for finished task
        buttonRow = <div className="row">
          <div className="small-6 medium-8 columns text-center">
            <label className="checkbox-label">
              <input id="checkbox-finished" type="checkbox" onChange={this.onRevertFinished} checked={this.props.revertFinished} />
              メッセージを書き込んで対応を未完了に戻す
            </label>
          </div>
          <div className="small-6 small-centered medium-4 columns">
            <button className="button text-center success msg-pub-btn" onClick={this.onPushSubmitButton()}>メッセージ投稿</button>
          </div>
        </div>;
      } else {
        buttonRow = <div className="row">
          <div className="small-6 medium-8 columns text-center">
            <label className="checkbox-label">
              <input id="checkbox-finished" type="checkbox" onChange={this.onCheckFinished} checked={this.props.checkFinished} />
              メッセージを書き込んで対応を完了する
            </label>
          </div>
          <div className="small-6 small-centered medium-4 columns">
            <button className="button text-center success msg-pub-btn" onClick={this.onPushSubmitButton()}>メッセージ投稿</button>
          </div>
        </div>;
      }
    }

    return <div>
      {headerRow}
      {commentPanel}
      {usernameRow}
      {textAreaRow}
      {imageRow}
      {buttonRow}
    </div>;
  }
});

var MinaRepoViewer = React.createClass({
  render: function() {
    var header = <div className="row">
      <div className="large-12 columns mrv-title-container">
        <a href="/">
          <img src="/static/img/minarepo-title.png" className="mrv-title-image" />
        </a>
      </div>
    </div>;

    var buttons = <TypeButtons
      selectedTypes={this.props.selectedTypes}
      startDate={this.props.startDate}
      endDate={this.props.endDate}
      mapTopLeft={this.props.mapTopLeft}
      mapBottomRight={this.props.mapBottomRight}
      selectedProgress={this.props.selectedProgress}
      searchQuery={this.props.searchQuery}
    />;

    var progressButtons = <ProgressButtons
      selectedTypes={this.props.selectedTypes}
      selectedProgress={this.props.selectedProgress}
      searchQuery={this.props.searchQuery}
    />;

    var dateController = <DateController
      timeRangeButtonIndex={this.props.timeRangeButtonIndex}
    />;

    var reporterSearch = <ReporterSearch
      selectedTypes={this.props.selectedTypes}
      selectedProgress={this.props.selectedProgress}
      searchQuery={this.props.searchQuery}
    />;

    var isShowingFilter = this.props.isShowingFilter;
    var reportFilter = '';
    if (isShowingFilter) {
      reportFilter = <div>
        {buttons}
        {progressButtons}
        {reporterSearch}
      </div>;
    }

    var filterToggleButtonMsg = (isShowingFilter) ? 'フィルタ ▲' : 'フィルタ ▼';
    var filterToggleButtonClass = classNames({
      button: true,
      success: true
    });
    var filterToggleButtonHandler = function(event) {
      flux.actions.onToggleShowingFilter();
    };
    var filterToggleButton = <div className="small-6 columns">
      <button className={filterToggleButtonClass} onClick={filterToggleButtonHandler}>{filterToggleButtonMsg}</button>
    </div>;

    var newReportToggleButtonClass = classNames({
      button: true,
      "float-right": true
    });
    var newReportToggleButtonHandler = function(event) {
      flux.actions.onToggleNewReport();
    };
    var newReportToggleButton = <div className="small-6 columns">
      <button className={newReportToggleButtonClass} onClick={newReportToggleButtonHandler}>+新規レポート</button>
    </div>;

    var toggleButtonRow = <div className="row">
      {filterToggleButton}
      {newReportToggleButton}
    </div>;

    var reportMap = <ReportMap
      reports={this.props.reports}
      selectedReport={this.props.selectedReport}
      clickedPinReportId={this.props.clickedPinReportId}
      isFetchingReports={this.props.isFetchingReports}
      isFetchingReportsFailed={this.props.isFetchingReportsFailed}
    />;

    var isShowingTable = this.props.isShowingTable;
    var reportTable = '';
    if (isShowingTable) {
      reportTable = <ReportTable
        reports={this.props.reports}
        tableSelectedPage={this.props.tableSelectedPage}
        selectedReport={this.props.selectedReport}
      />;
    }

    var tableToggleButtonMsg = (isShowingTable) ? '表を閉じる' : '表を表示する';
    var tableToggleButtonClass = classNames({ button: true, expanded: true  });
    // var tableToggleButtonClass = 'expanded button';
    var tableToggleButtonHandler = function(event) {
      flux.actions.onToggleShowingTable();
    };
    var tblTglContainerClass = classNames({
      'large-12': true,
      'columns': true,
      'mrv-btn-close-table': isShowingTable,
      'mrv-btn-open-table': !isShowingTable
    });
    var tableToggleButton = <div className="row">
      <div className={tblTglContainerClass}>
        <button className={tableToggleButtonClass} onClick={tableToggleButtonHandler}>{tableToggleButtonMsg}</button>
      </div>
    </div>;

    var reportView = <div className="row mrv-rv-row">
      {reportTable}
      {reportMap}
    </div>;

    var reportDetail = <ReportDetail
      detail={this.props.detail}
      isFetchingDetail={this.props.isFetchingDetail}
      isFetchingDetailFailed={this.props.isFetchingDetailFailed}
      selectedReport={this.props.selectedReport}
      clickedPinReportId={this.props.clickedPinReportId}
    />;

    var reportCommentPanel = <ReportCommentPanel
      comments={this.props.comments}
      isFetchingComments={this.props.isFetchingComments}
      isFetchingCommentsFailed={this.props.isFetchingCommentsFailed}
      selectedReport={this.props.selectedReport}
      isFetchingDetail={this.props.isFetchingDetail}
      isFetchingDetailFailed={this.props.isFetchingDetailFailed}
      clickedPinReportId={this.props.clickedPinReportId}
      commentUser={this.props.commentUser}
      newComment={this.props.newComment}
      cmntImage={this.props.cmntImage}
      checkFinished={this.props.checkFinished}
      revertFinished={this.props.revertFinished}
      selectedProgress={this.props.selectedProgress}
      selectedTypes={this.props.selectedTypes}
    />;

    var footer = <div className="row">
      <div className="large-12 columns mrv-footer">
        Powered by <a href="https://www.city.fujisawa.kanagawa.jp/">藤沢市</a> and <a href="https://www.ht.sfc.keio.ac.jp/">htlab</a>
        <br/><br/>
      </div>
    </div>;

    return <div>
      {header}
      <hr/>
      {toggleButtonRow}
      {reportFilter}
      {dateController}
      {/*
      {filterToggleButton}
      {dateController}
      {reportMap}
      {reportTable}     // Merged into below {reportView}
      {tableToggleButton}
      */}
      {reportView}
      {reportDetail}
      {reportCommentPanel}
      <hr/>
      {footer}
    </div>;
  }
});

var MinaRepoViewerApp = React.createClass({
  mixins: [ FluxMixin, StoreWatchMixin('MinaRepoStore') ],
  getStateFromFlux: function() {
    return this.getFlux().store('MinaRepoStore').getState();
  },
  componentDidMount: function() {
    console.debug('!!!! MinaRepoViewerApp.componentDidMount');
    fetchReports(
      selectSelected(this.state.selectedTypes),
      this.state.startDate,
      this.state.endDate,
      this.state.mapTopLeft,
      this.state.mapBottomRight,
      this.state.selectedProgress,
      this.state.searchQuery
    );
  },
  render: function() {
    var s = this.state;
    return <MinaRepoViewer
      reports={s.reports}
      comments={s.comments}
      selectedTypes={s.selectedTypes}
      selectedProgress={s.selectedProgress}
      clickedPinReportId={s.clickedPinReportId}
      detail={s.detail}
      startDate={s.startDate}
      endDate={s.endDate}
      selectedReport={s.selectedReport}
      isFetchingReports={s.isFetchingReports}
      isFetchingReportsFailed={s.isFetchingReportsFailed}
      isFetchingDetail={s.isFetchingDetail}
      isFetchingDetailFailed={s.isFetchingDetailFailed}
      isFetchingComments={s.isFetchingComments}
      isFetchingCommentsFailed={s.isFetchingCommentsFailed}
      mapTopLeft={s.mapTopLeft}
      mapBottomRight={s.mapBottomRight}
      tableSelectedPage={s.tableSelectedPage}
      isShowingTable={s.isShowingTable}
      isShowingFilter={s.isShowingFilter}
      commentUser={s.commentUser}
      newComment={s.newComment}
      cmntImage={s.cmntImage}
      checkFinished={s.checkFinished}
      revertFinished={s.revertFinished}
      searchQuery={s.searchQuery}
      timeRangeButtonIndex={s.timeRangeButtonIndex}
    />;
  }
});

var main  = function() {
  ReactDOM.render(
    <MinaRepoViewerApp flux={flux} />,
    document.getElementById('minarepo-viewer-app')
  );

  $(document).foundation();

  var hashMatch = window.location.hash.match(reportHashPattern);
  if (hashMatch) {
    var reportId = parseInt(hashMatch[1]);
    flux.actions.onClickPin({ reportId: reportId });
  }
};

$(main);
