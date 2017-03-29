
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
  TOGGLE_SEND_BUTTON: 'TOGGLE_SEND_BUTTON'
};

var MinaRepoStore = Fluxxor.createStore({
  initialize: function() {
    this.email = '';

    this.bindActions(constants.UPDATE_EMAIL, this.onUpdateEmail);
    this.bindActions(constants.TOGGLE_SEND_BUTTON, this.onToggleSendButton);
  },
  getState: function() {
    return {
      email: this.email,
      permission: this.permission
    }
  },
  onUpdateEmail: function(data) {
    this.email = data.email;
    this.emit('change');
  },
  onToggleSendButton: function(data) {
    alert('hoge');
    return;
  }
});

var actions = {
  onUpdateEmail: function(data) {
    this.dispatch(constants.UPDATE_EMAIL, { email: data.email });
  },
  onToggleSendButton: function(data) {
    $.ajax({
      type: 'GET',
      url: '/users/forget_password',
      data: {
        email: data.email
      },
      dataType: 'json',
      success: function(data) {
        window.location.href = '/login';
      },
      error: function(data) {
        var toastMsg = '<div class="toast-msg">\
          <p>メールを送信できませんでした</p>\
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
  onButtonClick: function(email) {
    return function(event) {
     flux.actions.onToggleSendButton({ email: email });
    }
  },
  render: function() {
    var email = this.props.email;

    return <div className="row">
      <div className="small-6 small-centered columns mrv-btn-row">
        <h4>パスワード再設定</h4>
        <div className="row">
          <input type="text" placeholder="Eメールアドレス" onChange={this.onChangeEmail}></input>
        </div>
        <button type="button" className="button" onClick={this.onButtonClick(email)}>パスワード再設定</button>
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
