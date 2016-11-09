
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
}

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

var SmartCheckTable = React.createClass({
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

    console.log(detail);

    if (!isFetchingDetailFailed && detailExists) {
      var reportDate = getDateArry(detail.timestamp);
      var date = <div className="row tablediv">
        <div className="column small-3 text-center">連絡日</div>
        <div className="column small-2 text-right sidebar-left">{reportDate.year}</div>
        <div className="column small-1 text-right">年</div>
        <div className="column small-1 text-right">{reportDate.month}</div>
        <div className="column small-1 text-right">月</div>
        <div className="column small-1 text-right">{reportDate.date}</div>
        <div className="column small-1 text-right">日</div>
        <div className="column small-2 text-center">　</div>
      </div>;

      var reporter = <div className="row tablediv">
        <div className="column small-3 text-center">連絡者</div>
        <div className="column small-3 text-center sidebar-left">　</div>
        <div className="column small-2">課</div>
        <div className="column small-2 text-center sidebar-left">内線</div>
        <div className="column small-2 sidebar-left">　　</div>
      </div>;

      var group = <div className="row tablediv align-middle">
        <div className="column small-3 text-center">担当課</div>
        <div className="column small-4 text-center sidebar-left">
          <select className="hmargin">
            <option>環境</option>
            <option>土木</option>
            <option>都市整備</option>
          </select>
        </div>
        <div className="column small-1 text-right">部</div>
        <div className="column small-4 text-center">
          <select className="hmargin">
            <option>環境総務課</option>
            <option>環境事業センター</option>
            <option>土木維持課</option>
            <option>公園課</option>
          </select>
        </div>
      </div>;

      var cases = <div className="row tablediv align-middle">
        <div className="column small-3 text-center">案件</div>
        <div className="column small-9 sidebar-left">
          <div className="row">
            <label className="inline"><input className="margin-left" id="checkbox1" type="checkbox"/>道路の穴・陥没</label>
            <label className="inline"><input className="margin-left" id="checkbox2" type="checkbox"/>道路の側溝・桝の詰まり</label>
          </div>
          <div className="row">
            <div className="column small-12">
              <label className="inline"><input id="checkbox3" type="checkbox"/>照明の不点・昼点灯</label>
              <span>（</span>
              <label className="inline"><input className="margin-left" id="checkbox3" type="checkbox"/>道路</label>
              <label className="inline"><input className="margin-left" id="checkbox3" type="checkbox"/>公園</label>
              <label className="inline lightgray"><input className="margin-left" id="checkbox3" type="checkbox"/>＊その他具体的に　</label>
              <span>）</span>
            </div>
          </div>
          <div className="row">
            <div className="column small-12">
              <label className="inline"><input id="checkbox4" type="checkbox"/>落書き</label>
              <span>（</span>
              <label className="inline"><input className="margin-left" id="checkbox3" type="checkbox"/>防災倉庫</label>
              <label className="inline"><input className="margin-left" id="checkbox3" type="checkbox"/>ガードレール</label>
              <label className="inline lightgray"><input className="margin-left" id="checkbox3" type="checkbox"/> ＊その他具体的に　</label>
              <span>）</span>
            </div>
          </div>
          <div className="row">
            <div className="column small-12">
              <label className="inline"><input id="checkbox5" type="checkbox"/>ガードレール・車止めの破損</label>
              <label className="inline"><input className="margin-left" id="checkbox6" type="checkbox"/>公園器具の破損</label>
            </div>
          </div>
          <div className="row">
            <div className="column small-12">
              <label className="inline"><input id="checkbox6" type="checkbox"/>ごみの不法投棄</label>
              <span>（</span>
              <label className="inline"><input className="margin-left" id="checkbox3" type="checkbox"/>公園</label>
              <label className="inline"><input className="margin-left" id="checkbox3" type="checkbox"/>道路</label>
              <label className="inline lightgray"><input className="margin-left" id="checkbox3" type="checkbox"/> ＊その他具体的に　</label>
              <span>）</span>
            </div>
          </div>
          <div className="row">
            <div className="column small-12">
              <label className="inline"><input id="checkbox6" type="checkbox"/>車道外側線の塗装劣化</label>
              <label className="inline"><input className="margin-left" id="checkbox6" type="checkbox"/>カーブミラーの方向違い</label>
              <label className="inline"><input className="margin-left" id="checkbox6" type="checkbox"/>その他</label>
            </div>
          </div>
        </div>
      </div>;

     var detailMap = <div className="row tablediv align-middle">
        <div className="column small-3 text-center"><small>案件の所在地(又は場所が確認できるもの)</small></div>
        <div className="column small-9 sidebar-left text-center vpadding">
          {detail.address}
        </div>
      </div>;

      var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + detail.geo[0] + "," + detail.geo[1] +
        "&zoom=17&size=240x240&sensor=false&key=AIzaSyC6Lq4RSVHU0Iu_EIE-WWX_a7hFf_XGzaQ&markers=" + detail.geo[0] + "," + detail.geo[1];
      var imgSrc = detail.image;
      if (detail.image == '' || detail.image == 'data:,') {
        imgSrc = '/static/img/no-image.png';
      }

      var picMap = <div className="row tablediv double-bottom align-middle">
        <div className="column small-3 text-center">写真又は地図</div>
        <div className="column small-9 sidebar-left">
          <div className="row">
            <div className="column small-6 highbox">
              <img className="auto-img" src={imgSrc}></img>
            </div>
            <div className="column small-6">
             <img src={mapUrl} className="vmargin"></img>
            </div>
          </div>
        </div>
      </div>;

      var recievedDate = <div className="row tablediv">
        <div className="column small-3 text-center">担当課受理日</div>
        <div className="column small-3 text-right sidebar-left">年</div>
        <div className="column small-2 text-right">月</div>
        <div className="column small-2 text-right">日</div>
        <div className="column small-2 text-center">　</div>
      </div>;

      var actionResult = <div className="row tablediv align-middle">
        <div className="column small-3 text-center">対応結果</div>
        <div className="column small-9 sidebar-left">
          <div className="row">
            <div className="column small-12">
              <label className="inline"><input id="r-checkbox1" type="checkbox"/>対応済み</label>
              <label className="inline"><input className="margin-left" id="r-checkbox2" type="checkbox"/><small>確認したが、対応には時間をようするため、今後調整していく</small></label>
            </div>
          </div>
          <div className="row">
            <div className="column small-12">
              <label className="inline"><input id="r-checkbox3" type="checkbox"/>確認したが、対応不要</label>
              <label className="inline"><input className="margin-left" id="r-checkbox4" type="checkbox"/><small>別途、同様の市民要望あり</small></label>
              （<span className="lightgray"><small>＊受付番号等あれば記載</small></span>）
            </div>
          </div>
        </div>
      </div>;

      var picResult = <div className="row tablediv bottom align-middle">
        <div className="column small-3 text-center">対応写真等</div>
        <div className="column small-9 text-center sidebar-left highbox">　</div>
      </div>;
    }


    return <div>
      {date}
      {reporter}
      {group}
      {cases}
      {detailMap}
      {picMap}
      {recievedDate}
      {actionResult}
      {picResult}
    </div>;
  }
});

var MinaRepoViewer = React.createClass({
  render: function() {
    var header = <div className="row">
      <div className="large-12 columns text-center">
        <h4>ふじさわスマートチェック 連絡票兼結果報告</h4>
      </div>
    </div>;

    var smartcheckTable = <SmartCheckTable
      detail={this.props.detail}
      isFetchingDetail={this.props.isFetchingDetail}
      isFetchingDetailFailed={this.props.isFetchingDetail}
      isFetchingDetailFinished={this.props.isFetchingDetailFinished}
    />;

    var footer = <div className="row noprint">
      <div className="large-12 columns mrv-footer">
        Powered by <a href="https://www.city.fujisawa.kanagawa.jp/">藤沢市</a> and <a href="https://www.ht.sfc.keio.ac.jp/">htlab</a>
        <br/><br/>
      </div>
    </div>;

    return <div className="row">
      <div className="columns large-8 large-centered">
        {header}
        {smartcheckTable}
        <hr className="noprint"/>
        {footer}
      </div>
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
  },
  render: function() {
    var s = this.state;
    return <MinaRepoViewer
      detail={s.detail}
      isFetchingDetail={s.isFetchingDetail}
      isFetchingDetailFailed={s.isFetchingDetail}
      isFetchingDetailFinished={s.isFetchingDetailFinished}
    />;
  }
});

var main  = function() {
  ReactDOM.render(
    <MinaRepoViewerApp flux={flux} />,
    document.getElementById('minarepo-viewer-app')
  );

  var detailId = getUrlParameter('id');
  fetchDetail(detailId);
};

$(main);
