
var token = '';

var getParameterByName = function(name) {
  url = window.location.href;

  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
  var results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

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
  UPDATE_PASSWD: 'UPDATE_PASSWD',
  UPDATE_CHECK_PASSWD: 'UPDATE_CHECK_PASSWD',
  TOGGLE_SEND_BUTTON: 'TOGGLE_SEND_BUTTON'
};

var MinaRepoStore = Fluxxor.createStore({
  initialize: function() {
    this.passwd = '';
    this.checkPasswd = '';

    this.bindActions(constants.UPDATE_PASSWD, this.onUpdatePasswd);
    this.bindActions(constants.UPDATE_CHECK_PASSWD, this.onUpdateCheckPasswd);
    this.bindActions(constants.TOGGLE_SEND_BUTTON, this.onToggleSendButton);
  },
  getState: function() {
    return {
      passwd: this.passwd,
      checkPasswd: this.checkPasswd
    }
  },
  onUpdatePasswd: function(data) {
    this.passwd = data.passwd;
    this.emit('change');
  },
  onUpdateCheckPasswd: function(data) {
    this.checkPasswd = data.checkPasswd;
    this.emit('change');
  },
  onToggleSendButton: function(data) {
    return;
  }
});

var actions = {
  onUpdatePasswd: function(data) {
    this.dispatch(constants.UPDATE_PASSWD, { passwd: data.passwd });
  },
  onUpdateCheckPasswd: function(data) {
    this.dispatch(constants.UPDATE_CHECK_PASSWD, { checkPasswd: data.checkPasswd });
  },
  onToggleSendButton: function(data) {
    $.ajax({
      type: 'GET',
      url: '/users/reset_password',
      data: {
        passwd: data.passwd,
        token: token
      },
      dataType: 'json',
      success: function(data) {
        var toastMsg = '<div class="toast-msg">\
          <p>再設定しました</p>\
        </div>';
        showToast('Success', toastMsg, '3000');
        window.location.href = '/login';
      },
      error: function(data) {
        var toastMsg = '<div class="toast-msg">\
          <p>再設定に失敗しました</p>\
        </div>';
        showToast('Error', toastMsg, '3000');
      }
    });
  }
};

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;

var stores = { MinaRepoStore: new MinaRepoStore() };
var flux = new Fluxxor.Flux(stores, actions);

var PasswdForm = React.createClass({
  onChangePasswd: function(text) {
    var passwd = text.target.value;
    flux.actions.onUpdatePasswd({ passwd: passwd });
  },
  onChangeCheckPasswd: function(text) {
    var checkPasswd = text.target.value;
    flux.actions.onUpdateCheckPasswd({ checkPasswd: checkPasswd });
  },
  onButtonClick: function(passwd, checkPasswd) {
    return function(event) {
      if (passwd == checkPasswd) {
        flux.actions.onToggleSendButton({ passwd: passwd });
      } else {
        var toastMsg = '<div class="toast-msg">\
          <p>確認用パスワードが間違っています</p>\
        </div>';
        showToast('Error', toastMsg, '3000');
      }
    }
  },
  render: function() {
    var passwd = this.props.passwd;
    var checkPasswd = this.props.checkPasswd;

    return <div className="row">
      <div className="small-6 small-centered columns mrv-btn-row">
        <h4>パスワード再設定</h4>
        <div className="row">
          <input type="text" placeholder="パスワード" onChange={this.onChangePasswd}></input>
        </div>
        <div className="row">
          <input type="text" placeholder="確認用パスワード" onChange={this.onChangeCheckPasswd}></input>
        </div>
        <button type="button" className="button" onClick={this.onButtonClick(passwd, checkPasswd)}>パスワード再設定</button>
      </div>
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

    var passwdForm = <PasswdForm
      passwd={this.props.passwd}
      checkPasswd={this.props.checkPasswd}
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
      {passwdForm}
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
  },
  render: function() {
    var s = this.state;
    return <MinaRepoViewer
      passwd={s.passwd}
      checkPasswd={s.checkPasswd}
    />;
  }
});

var main  = function() {
  ReactDOM.render(
    <MinaRepoViewerApp flux={flux} />,
    document.getElementById('minarepo-viewer-app')
  );

  $(document).foundation();

  token = getParameterByName('token');
};

$(main);
