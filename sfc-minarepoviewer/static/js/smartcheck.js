
var fetchDetail = function(reportId) {
  var url = '/api/detail/' + reportId;
  var params = {};
  $.ajax({
    url: url,
    method: 'GET',
    data: params,
    success: function(data, status, jqxhr) {
      var detail = data.result.report;
      flux.actions.onFetchingDetailSuccess({ detail: detail });
    },
    error: function() {
      flux.actions.onFetchingDetailFailed();
    }
  });
  flux.actions.onStartFetchingDetail();
};

var getUrlParameter = function(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};

var getDateArry = function(timestamp) {
  var parsedTimestamp = timestamp.replace(/-/g, '/');

  var reportDate = new Date(parsedTimestamp);
  var year = reportDate.getYear() + 1900;
  var month = reportDate.getMonth() + 1;
  var date = reportDate.getDate();

  return {
    year: year,
    month: month,
    date: date
  };
};

var printSmartCheck = function() {
  window.print();
  return;
};

var constants = {
  START_FETCHING_DETAIL: 'START_FETCHING_DETAIL',
  FETCHING_DETAIL_SUCCESS: 'FETCHING_DETAIL_SUCCESS',
  FETCHING_DETAIL_FAILED: 'FETCHING_DETAIL_FAILED'
};

var MinaRepoStore = Fluxxor.createStore({
  initialize: function() {
    this.detail = null;
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = false;
    this.isFetchingDetailFinished = false;

   this.bindActions(constants.START_FETCHING_DETAIL, this.onStartFetchingDetail);
   this.bindActions(constants.FETCHING_DETAIL_SUCCESS, this.onFetchingDetailSuccess);
   this.bindActions(constants.FETCHING_DETAIL_FAILED, this.onFetchingDetailFailed);
  },
  getState: function() {
    return {
      detail: this.detail,
      isFetchingDetail: this.isFetchingDetail,
      isFetchingDetailFailed: this.isFetchingDetailFailed,
      isFetchingDetailFinished: this.isFetchingDetailFinished
    }
  },
  onStartFetchingDetail: function(data) {
    this.isFetchingDetail = true;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingDetailSuccess: function(data) {
    this.detail = data.detail;
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = false;
    this.emit('change');
  },
  onFetchingDetailFailed: function(data) {
    this.isFetchingDetail = false;
    this.isFetchingDetailFailed = true;
    this.emit('change');
  }
});

var actions = {
  onStartFetchingDetail: function(data) {
    this.dispatch(constants.START_FETCHING_DETAIL);
  },
  onFetchingDetailSuccess: function(data) {
    var detail = data.detail;
    this.dispatch(constants.FETCHING_DETAIL_SUCCESS, { detail: detail });
  },
  onFetchingDetailFailed: function(data) {
    this.dispatch(constants.FETCHING_DETAIL_FAILED);
  }
};

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var stores = { MinaRepoStore: new MinaRepoStore() };
var flux = new Fluxxor.Flux(stores, actions);

var SmartCheckTable = React.createClass({displayName: "SmartCheckTable",
  checked: function() {
    return;
  },
  render: function() {
    var detail = this.props.detail;
    var isFetchingDetail = this.props.isFetchingDetail;
    var isFetchingDetailFailed = this.props.isFetchingDetailFailed;

    var fetchingDetail = (isFetchingDetail || isFetchingDetailFailed);
    var detailExists = (
      (detail !== undefined && detail !== null) && (
        (detail.id !== null) && (detail.id !== undefined)
      )
    );

    if (!isFetchingDetailFailed && detailExists) {
      var reportDate = getDateArry(detail.timestamp);
      var date = React.createElement("div", {className: "row tablediv"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "連絡日"), 
        React.createElement("div", {className: "column small-2 text-right sidebar-left"}, reportDate.year), 
        React.createElement("div", {className: "column small-1 text-right"}, "年"), 
        React.createElement("div", {className: "column small-1 text-right"}, reportDate.month), 
        React.createElement("div", {className: "column small-1 text-right"}, "月"), 
        React.createElement("div", {className: "column small-1 text-right"}, reportDate.date), 
        React.createElement("div", {className: "column small-1 text-right"}, "日"), 
        React.createElement("div", {className: "column small-2 text-center"}, "　")
      );

      var reporter = React.createElement("div", {className: "row tablediv align-middle"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "連絡者"), 
        React.createElement("div", {className: "column small-6 sidebar-left sidebar-right"}, 
          React.createElement("input", {className: "hmargin width50 inline", type: "text"}), 
          React.createElement("span", null, "課"), 
          React.createElement("input", {className: "hmargin width40 inline", type: "text"})
        ), 
        React.createElement("div", {className: "column small-1 text-center"}, "内線"), 
        React.createElement("div", {className: "column small-2 sidebar-left"}, 
          React.createElement("input", {className: "hmargin text-center", type: "text"})
        )
      );

      var group = React.createElement("div", {className: "row tablediv align-middle"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "担当課"), 
        React.createElement("div", {className: "column small-4 text-center sidebar-left"}, 
          React.createElement("select", {className: "hmargin"}, 
            React.createElement("option", null, "環境"), 
            React.createElement("option", null, "土木"), 
            React.createElement("option", null, "都市整備")
          )
        ), 
        React.createElement("div", {className: "column small-1 text-right"}, "部"), 
        React.createElement("div", {className: "column small-4 text-center"}, 
          React.createElement("select", {className: "hmargin"}, 
            React.createElement("option", null, "環境総務課"), 
            React.createElement("option", null, "環境事業センター"), 
            React.createElement("option", null, "土木維持課"), 
            React.createElement("option", null, "公園課")
          )
        )
      );

      var cases = React.createElement("div", {className: "row tablediv align-middle"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "案件"), 
        React.createElement("div", {className: "column small-9 sidebar-left"}, 
          React.createElement("div", {className: "row"}, 
            React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox1", type: "checkbox"}), "道路の穴・陥没"), 
            React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox2", type: "checkbox"}), "道路の側溝・桝の詰まり")
          ), 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-12"}, 
              React.createElement("label", {className: "inline"}, React.createElement("input", {id: "checkbox3", type: "checkbox"}), "照明の不点・昼点灯"), 
              React.createElement("span", null, "（"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), "道路"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), "公園"), 
              React.createElement("label", {className: "inline lightgray"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), "＊その他具体的に　"), 
              React.createElement("span", null, "）")
            )
          ), 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-12"}, 
              React.createElement("label", {className: "inline"}, React.createElement("input", {id: "checkbox4", type: "checkbox"}), "落書き"), 
              React.createElement("span", null, "（"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), "防災倉庫"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), "ガードレール"), 
              React.createElement("label", {className: "inline lightgray"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), " ＊その他具体的に　"), 
              React.createElement("span", null, "）")
            )
          ), 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-12"}, 
              React.createElement("label", {className: "inline"}, React.createElement("input", {id: "checkbox5", type: "checkbox"}), "ガードレール・車止めの破損"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox6", type: "checkbox"}), "公園器具の破損")
            )
          ), 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-12"}, 
              React.createElement("label", {className: "inline"}, React.createElement("input", {id: "checkbox6", type: "checkbox"}), "ごみの不法投棄"), 
              React.createElement("span", null, "（"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), "公園"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), "道路"), 
              React.createElement("label", {className: "inline lightgray"}, React.createElement("input", {className: "margin-left", id: "checkbox3", type: "checkbox"}), " ＊その他具体的に　"), 
              React.createElement("span", null, "）")
            )
          ), 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-12"}, 
              React.createElement("label", {className: "inline"}, React.createElement("input", {id: "checkbox6", type: "checkbox"}), "車道外側線の塗装劣化"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox6", type: "checkbox"}), "カーブミラーの方向違い"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "checkbox6", type: "checkbox"}), "その他")
            )
          )
        )
      );

     var detailMap = React.createElement("div", {className: "row tablediv align-middle"}, 
        React.createElement("div", {className: "column small-3 text-center"}, React.createElement("small", null, "案件の所在地(又は場所が確認できるもの)")), 
        React.createElement("div", {className: "column small-8 sidebar-left text-center vpadding"}, 
          React.createElement("input", {className: "hmargin text-center", defaultValue: detail.address, type: "text"})
        ), 
        React.createElement("div", {className: "column small-1 text-center vpadding"}, 
          "付近"
        )
      );

      var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + detail.geo[0] + "," + detail.geo[1] +
        "&zoom=15&size=240x240&sensor=false&key=AIzaSyC6Lq4RSVHU0Iu_EIE-WWX_a7hFf_XGzaQ&markers=" + detail.geo[0] + "," + detail.geo[1];
      var imgSrc = detail.image;
      if (detail.image == '' || detail.image == 'data:,') {
        imgSrc = '/static/img/no-image.png';
      }

      var picMap = React.createElement("div", {className: "row tablediv double-bottom align-middle"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "写真又は地図"), 
        React.createElement("div", {className: "column small-9 sidebar-left"}, 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-6 highbox"}, 
              React.createElement("img", {className: "auto-img", src: imgSrc})
            ), 
            React.createElement("div", {className: "column small-6"}, 
             React.createElement("img", {src: mapUrl, className: "vmargin"})
            )
          )
        )
      );

      var recievedDate = React.createElement("div", {className: "row tablediv"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "担当課受理日"), 
        React.createElement("div", {className: "column small-3 text-right sidebar-left"}, "年"), 
        React.createElement("div", {className: "column small-2 text-right"}, "月"), 
        React.createElement("div", {className: "column small-2 text-right"}, "日"), 
        React.createElement("div", {className: "column small-2 text-center"}, "　")
      );

      var actionResult = React.createElement("div", {className: "row tablediv align-middle"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "対応結果"), 
        React.createElement("div", {className: "column small-9 sidebar-left"}, 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-12"}, 
              React.createElement("label", {className: "inline"}, React.createElement("input", {id: "r-checkbox1", type: "checkbox"}), "対応済み"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "r-checkbox2", type: "checkbox"}), React.createElement("small", null, "確認したが、対応には時間をようするため、今後調整していく"))
            )
          ), 
          React.createElement("div", {className: "row"}, 
            React.createElement("div", {className: "column small-12"}, 
              React.createElement("label", {className: "inline"}, React.createElement("input", {id: "r-checkbox3", type: "checkbox"}), "確認したが、対応不要"), 
              React.createElement("label", {className: "inline"}, React.createElement("input", {className: "margin-left", id: "r-checkbox4", type: "checkbox"}), React.createElement("small", null, "別途、同様の市民要望あり")), 
              "（", React.createElement("span", {className: "lightgray"}, React.createElement("small", null, "＊受付番号等あれば記載")), "）"
            )
          )
        )
      );

      var picResult = React.createElement("div", {className: "row tablediv bottom align-middle"}, 
        React.createElement("div", {className: "column small-3 text-center"}, "対応写真等"), 
        React.createElement("div", {className: "column small-9 text-center sidebar-left highbox"}, "　")
      );
    }


    return React.createElement("div", null, 
      date, 
      reporter, 
      group, 
      cases, 
      detailMap, 
      picMap, 
      recievedDate, 
      actionResult, 
      picResult
    );
  }
});

var MinaRepoViewer = React.createClass({displayName: "MinaRepoViewer",
  render: function() {
    var header = React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "large-12 columns text-center"}, 
        React.createElement("h4", null, "ふじさわスマートチェック 連絡票兼結果報告")
      )
    );

    var smartcheckTable = React.createElement(SmartCheckTable, {
      detail: this.props.detail, 
      isFetchingDetail: this.props.isFetchingDetail, 
      isFetchingDetailFailed: this.props.isFetchingDetail, 
      isFetchingDetailFinished: this.props.isFetchingDetailFinished}
    );

    var footer = React.createElement("div", {className: "row noprint sticky-footer text-center"}, 
      React.createElement("div", {className: "large-6 large-centered"}, 
        React.createElement("div", {className: "button expanded", onClick: printSmartCheck}, "印刷")
      ), 
      React.createElement("div", {className: "large-12 columns mrv-footer"}, 
        "Powered by ", React.createElement("a", {href: "https://www.city.fujisawa.kanagawa.jp/"}, "藤沢市"), " and ", React.createElement("a", {href: "https://www.ht.sfc.keio.ac.jp/"}, "htlab"), 
        React.createElement("br", null), React.createElement("br", null)
      )
    );

    return React.createElement("div", {className: "row"}, 
      React.createElement("div", {id: "main", className: "columns large-8 large-centered"}, 
        header, 
        smartcheckTable, 
        React.createElement("hr", {className: "noprint"})
      ), 
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
      detail: s.detail, 
      isFetchingDetail: s.isFetchingDetail, 
      isFetchingDetailFailed: s.isFetchingDetail, 
      isFetchingDetailFinished: s.isFetchingDetailFinished}
    );
  }
});

var main  = function() {
  ReactDOM.render(
    React.createElement(MinaRepoViewerApp, {flux: flux}),
    document.getElementById('minarepo-viewer-app')
  );

  var detailId = getUrlParameter('id');
  fetchDetail(detailId);
};

$(main);
