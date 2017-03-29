
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
  UPDATE_EMAIL: 'UPDATE_EMAIL',
  UPDATE_PASSWD: 'UPDATE_PASSWD',
  UPDATE_CHECK_PASSWD: 'UPDATE_CHECK_PASSWD',
  UPDATE_PERMISSION: 'UPDATE_PERMISSION',
  TOGGLE_INSERT_BUTTON: 'TOGGLE_INSERT_BUTTON'
};

var MinaRepoStore = Fluxxor.createStore({
  initialize: function() {
    this.email = '';
    this.passwd = '';
    this.checkPasswd = '';
    this.permission = '';

    this.bindActions(constants.UPDATE_EMAIL, this.onUpdateEmail);
    this.bindActions(constants.UPDATE_PASSWD, this.onUpdatePasswd);
    this.bindActions(constants.UPDATE_CHECK_PASSWD, this.onUpdateCheckPasswd);
    this.bindActions(constants.UPDATE_PERMISSION, this.onUpdatePermission);
    this.bindActions(constants.TOGGLE_INSERT_BUTTON, this.onToggleInsertButton);
  },
  getState: function() {
    return {
      email: this.email,
      passwd: this.passwd,
      checkPasswd: this.checkPasswd,
      permission: this.permission
    }
  },
  onUpdateEmail: function(data) {
    this.email = data.email;
    this.emit('change');
  },
  onUpdatePasswd: function(data) {
    this.passwd = data.passwd;
    this.emit('change');
  },
  onUpdateCheckPasswd: function(data) {
    this.checkPasswd = data.checkPasswd;
    this.emit('change');
  },
  onUpdatePermission: function(data) {
    this.permission = data.permission;
    this.emit('change');
  },
  onToggleInsertButton: function(data) {
    alert('hoge');
    return;
  }
});

var actions = {
  onUpdateEmail: function(data) {
    this.dispatch(constants.UPDATE_EMAIL, { email: data.email });
  },
  onUpdatePasswd: function(data) {
    this.dispatch(constants.UPDATE_PASSWD, { passwd: data.passwd });
  },
  onUpdateCheckPasswd: function(data) {
    this.dispatch(constants.UPDATE_CHECK_PASSWD, { checkPasswd: data.checkPasswd });
  },
  onUpdatePermission: function(data) {
    this.dispatch(constants.UPDATE_PERMISSION, { permission: data.permission });
  },
  onToggleInsertButton: function(data) {
    $.ajax({
      type: 'POST',
      url: '/users/create',
      data: {
        email: data.email,
        password: data.passwd,
        permission: data.permission
      },
      dataType: 'json',
      success: function(data) {
        window.location.href = '/login';
      },
      error: function(data) {
        var toastMsg = '<div class="toast-msg">\
          <p>作成できませんでした</p>\
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

var LoginForm = React.createClass({
  onChangeEmail: function(text) {
    var email = text.target.value;
    flux.actions.onUpdateEmail({ email: email });
  },
  onChangePasswd: function(text) {
    var passwd = text.target.value;
    flux.actions.onUpdatePasswd({ passwd: passwd });
  },
  onCheckPasswd: function(text) {
    var checkPasswd = text.target.value;
    flux.actions.onUpdateCheckPasswd({ checkPasswd: checkPasswd });
  },
  onChangePermission: function(text) {
    var permission = text.target.value;
    flux.actions.onUpdatePermission({ permission: permission });
  },
  onButtonClick: function(email, passwd, checkPasswd, permission) {
    return function(event) {
      if (passwd == checkPasswd) {
          flux.actions.onToggleInsertButton({
            email: email,
            passwd: passwd,
            permission: permission
          });
      } else {
        var toastMsg = '<div class="toast-msg">\
          <p>確認用パスワードが間違っています</p>\
        </div>';
        showToast('Error', toastMsg, '3000');
      }
    }
  },
  render: function() {
    var email = this.props.email;
    var passwd = this.props.passwd;
    var checkPasswd = this.props.checkPasswd;
    var permission = this.props.permission;

    return <div className="row">
      <div className="small-6 small-centered columns mrv-btn-row">
        <h4>新規ユーザ登録</h4>
        <div className="row">
          <input type="text" placeholder="Eメールアドレス" onChange={this.onChangeEmail}></input>
        </div>
        <div className="row">
          <input type="password" placeholder="パスワード" onChange={this.onChangePasswd}></input>
        </div>
        <div className="row">
          <input type="password" placeholder="パスワード確認用" onChange={this.onCheckPasswd}></input>
        </div>
        <div>
          <label>権限
            <select>
              <option value="Super">管理者</option>
              <option value="Power">一般</option>
            </select>
          </label>
        </div>
        <button type="button" className="button" onClick={this.onButtonClick(email, passwd, checkPasswd, permission)}>ユーザ作成</button>
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

    var loginForm = <LoginForm
      email={this.props.email}
      passwd={this.props.passwd}
      checkPasswd={this.props.checkPasswd}
      permission={this.props.permission}
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
      {loginForm}
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
      email={s.email}
      passwd={s.passwd}
      checkPasswd={s.checkPasswd}
      permission={s.permission}
    />;
  }
});

var main  = function() {
  ReactDOM.render(
    <MinaRepoViewerApp flux={flux} />,
    document.getElementById('minarepo-viewer-app')
  );

  $(document).foundation();
};

$(main);
