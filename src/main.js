var applicationID = "6F1E40A5";
var LEARN_NAMESPACE = "urn:x-cast:com.kg.learn";

console.log("Create app module");
var learnTeacherApp = angular.module('LearnTeacherApp', ['ngMaterial', 'pascalprecht.translate', 'ngAnimate']);

learnTeacherApp.config(['$translateProvider',
  function($translateProvider) {
    $translateProvider.useStaticFilesLoader({
      prefix: 'UI/assets/translation/main/',
      suffix: '.json'
    });
    $translateProvider.addInterpolation('$translateMessageFormatInterpolation');
    $translateProvider.preferredLanguage('fr');

  }
]);

var learnTeacherController = function($scope, $document, $translate) {
  _this = this;
  this._scope = $scope;
  this.document = $document;
  // Callback called when Cast extension is available
  window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
    if (loaded) {
      console.log("Cast API available.");
      _this.initializeCastApi();
    } else {
      console.log(errorInfo);
    }
  }

  // Bind public methods
  $scope.startAppSession = this.startAppSession.bind(this);
  $scope.stopApp = this.stopApp.bind(this);
  $scope.sendMessage = this.sendMessage.bind(this);
  $scope.identify = this.identify.bind(this);
  $scope.readyToPlay = this.readyToPlay.bind(this);
  $scope.submitAnswer = this.submitAnswer.bind(this);
  $scope.testAnimate = function($event) {
    console.log("testAnimate: element ", $event);
    event.target.className += " animated bounce";
  };


  $translate("PLAYER").then(function(player) {
    _this.name = player + Math.floor((Math.random() * 1000) + 1);
  });
  this.gameStarted = false;
  this.question = "Combien font 3 * 4 / 32 ?";
  this.answer = "";
  this.answerOK = false;
  this.receiverAvailable = false;
  this.sessionConnected = false;
}

learnTeacherController.prototype = {
  /**
   * Cast extension is available, init contact.
   */
  initializeCastApi: function() {
    this.sessionRequest = new chrome.cast.SessionRequest(applicationID);
    this.apiConfig = new chrome.cast.ApiConfig(this.sessionRequest, this.sessionListener.bind(this),
      this.receiverListener.bind(this));
    chrome.cast.initialize(this.apiConfig, this.onInitSuccess.bind(this), this.onInitError.bind(this));
  },

  /* API Init OK */
  onInitSuccess: function() {
    console.log("Cast API intialized.");
  },

  onInitError: function() {
    console.log("Cast API init error.");
  },

  /* Receiver events */
  receiverListener: function(e) {
    console.log("Receiver listener");
    _this = this;
    if (e === chrome.cast.ReceiverAvailability.AVAILABLE) {
      console.log("Receiver is available");
      this._scope.$apply(function() {
        _this.receiverAvailable = true;
      });
    }
  },

  /* Session events */
  sessionListener: function(e) {
    console.log("Session listener");
    console.log(e);
    this.appSession = e;
  },

  /* Request app session */
  startAppSession: function() {
    console.log("Request app session")
    chrome.cast.requestSession(this.onRequestSessionSuccess.bind(this), this.onRequestSessionError.bind(this));
  },

  /* Session started */
  onRequestSessionSuccess: function(e) {
    console.log("App session request success");
    console.log(e);
    this.appSession = e;
    this.appSession.addUpdateListener(this.sessionUpdated.bind(this));
    this.appSession.addMessageListener(LEARN_NAMESPACE, this.onReceiverMessage.bind(this));
    _this = this;
    this._scope.$apply(function() {
      _this.sessionConnected = true;
    });
  },

  /* Error when starting session */
  onRequestSessionError: function(e) {
    console.log("App session request error: ");
    console.log(e);
  },

  /* Session events */
  sessionUpdated: function(e) {
    console.log("Session update received");
    console.log(e);
  },

  /* Request session end */
  stopApp: function() {
    console.log("Stop app session.")
    this.appSession.stop(this.onStopSuccess.bind(this), this.onStopError.bind(this));
  },

  onStopSuccess: function() {
    console.log("App stopped successfully");
  },

  /* Error while requesting session end */
  onStopError: function(e) {
    console.log("App stop error");
    console.log(e);
  },

  /* Primitive to send message to receiver */
  sendMessage: function(command) {
    console.log("Send message to receiver");
    if (this.appSession) {
      this.appSession.sendMessage(LEARN_NAMESPACE, command,
        function(e) {
          console.log("Message sent", command);
        },
        function(e) {
          console.log("Message not sent");
        });
    } else {
      console.log('No session available');
    }
  },


  /**** COMMANDS ****/

  /* Send teacher identification to receiver */
  identify: function() {
    var command = {
      command: 'identify',
      teacher: true
    };
    this.sendMessage(command);
  },

  readyToPlay: function() {
    var command = {
      command: 'readyToPlay',
      value: true
    };
    this.sendMessage(command);
  },


  /* Handle message from Cast receiver*/
  onReceiverMessage: function(protocol, e) {
    var event = JSON.parse(e);
    console.log("Message received: ", protocol, event);

    switch (event.command) {
      case "identify":
        console.log("should identify");
        this.identify();
        break;
      case "question":
        var _this = this;
        this._scope.$apply(function() {
          _this.ask(event.question);
          console.log("Quesion asked: ", event.question);
        });
        break;
      case "endGame":
        this.endGame(event.winner);
        break;
      default:
        console.log("unknown command");
    }
  },
  ask: function(question) {
    this.gameStarted = true;
    if (this.answer != "") {
      this.answerOK = true;
      _this = this;
      setTimeout(function() {
        _this._scope.$apply(function() {
          _this.question = question;
          _this.answer = "";
          _this.answerOK = false;
        });
      }, 2000);
    } else {
      this.question = question;
      this.answer = "";
    }
  },
  submitAnswer: function() {
    console.log("this before sending answer", this);
    var command = {
      command: 'submitAnswer',
      value: this.answer
    };
    this.sendMessage(command);
  },
  endGame: function(winner) {
    var _this = this;
    this._scope.$apply(function() {
      console.log("winner is ", winner);
      _this.question = "";
      _this.winner = winner;
      _this.gameStarted = false;
    });
  }
}



learnTeacherController.$inject = ['$scope', '$document', '$translate'];
learnTeacherApp.controller('learnTeacherController', learnTeacherController);