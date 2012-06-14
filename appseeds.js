/**
  AppSeeds (c) 2012 Dan Burzo
  AppSeeds can be freely distributed under the MIT license.
  http://github.com/danburzo/appseeds
*/

/*globals exports define require console*/
(function(){
  // for CommonJS and the browser
  var AppSeeds = typeof exports !== 'undefined' ? exports : (this.AppSeeds = this.Seeds = {});
  
  // Semantic versioning
  // @see http://semver.org/
  AppSeeds.version = '0.4.0';

  // polyfills
  if(!Array.isArray) Array.isArray = function (vArg) { return Object.prototype.toString.call(vArg) === "[object Array]"; };

  /**
    @class
    AppSeeds.StateManager
  */
  AppSeeds.StateManager = {
    
    // name of the root state
    rootState: 'root',
    
    // current state of the manager
    _currentState: null,
    
    // TODO consolidate _allStates, _parentStates, _defaultSubstates into single hash
    
    // keeps the collection of states
    // key: state name; value: hash of actions for the state
    _allStates: {}, 
  
    // the state tree
    // key: child state name; value: parent state name;
    _parentStates: {},
    
    // default substates
    // key: state name; value: default substate name;
    _defaultSubstates: {}, // the default substate for each state
  
    /**
      Create a new instance of State Manager.
      Usage: MyApp.stateManager = new AppSeeds.StateManager.create();
      
      @param options {String/Array/Object}
        - when string/array, interpreted as 'states' option
        - when hash, the following options are available:
          - init {Function} what to execute when we call stateManager.init()
          - states {String/Array} a string or list of strings that describe the state chart structure
            (convenience method equivalent to .add(states))
    */
    create: function(options) {
      var C = function() {};
      C.prototype = this;
      var stateManager = new C();
    
      // initialize internals
      stateManager.rootState = 'root';
      stateManager._parentStates = {};
      stateManager._allStates = {};
      stateManager._defaultSubstates = {};
      stateManager._allStates[stateManager.rootState] = stateManager.context = {};
      stateManager._parentStates[stateManager.rootState] = null;
      stateManager._currentState = stateManager.rootState;
    
      options = options || {};
      if (typeof options === 'string' || Array.isArray(options)) {
        stateManager.add(options);
      } else {
        // TODO migrate _onInit to delegate pattern
        stateManager._onInit = options.init;
        if (options.states) {
          stateManager.add(options.states);
        }
      }
      return stateManager;
    },
  
    // initialize state manager; optional, at this point.
    init: function() {
      if (this._isFunc(this._onInit)) this._onInit.call(this);
      return this;
    },
  
    // trace path from current state to root state
    _toRoot: function(stateName) {
      var route = [];
      while(stateName) {
        route.push(stateName);
        stateName = this._parentStates[stateName];
      }
      return route;
    },
  
    // find the LCA (Lowest Common Ancestors) between two states
    _lca: function(startState, endState) { 
      var exits = this._toRoot(startState), entries = this._toRoot(endState);
      for (var i = 0; i < exits.length; i++) {
        var idx = entries.indexOf(exits[i]);
        if (idx !== -1) {
          // found the LCA
          exits = exits.slice(0, i);
          entries = entries.slice(0, idx).reverse();
          break;
        }
      }
      return { exits: exits, entries: entries };
    },
  
    // check if argument is a function
    _isFunc: function(f) {
      return typeof f === 'function';
    },
  
    // parse the state string into pairs of parent and child state.
    _getStatePairs: function(str) {
      var tmp = str.split('->');
      var parentState, childStates;
      switch(tmp.length) {
        case 0:
          childStates = [];
          break;
        case 1:
          parentState = this.rootState;
          childStates = tmp[0].split(/\s+/);
          break;
        case 2:
          parentState = tmp[0].trim();
          childStates = tmp[1].split(/\s+/);
          break;
        default: 
          console.warn('String ' + str + ' is an invalid state pair and has been dropped.');
          childStates = [];
          break;
      }
      var pairs = [], childState, defaultSubstateRegex = /^!/;
      for (var i = 0; i < childStates.length; i++) {
        if (childStates[i]) pairs.push([parentState, childStates[i].replace(defaultSubstateRegex, ''), defaultSubstateRegex.test(childStates[i])]);
      }
      return pairs;
    },
  
    /*
      Transition to a new state in the manager.
      Attempting to transition to an inexistent state does nothing (and logs a warning)
      Attempting to transition to the same state as the current one will again do nothing.
    
      @param stateName {String} the name of the state to which to transition.
    */
    go: function(stateName) {
      var state = this._allStates[stateName];
      if (state === undefined) {
        console.warn('State ' + stateName + ' not defined');
        return;
      }
      if (this._currentState !== stateName) {
        var states = this._lca(this._currentState, stateName);
        var i, action;
      
        // exit to common ancestor
        for (i = 0; i < states.exits.length; i++) {
          this.context = this._allStates[states.exits[i]];
          if (this._isFunc(this.context.exit)) {
            if (this.context.exit.call(this) === false) {
              // TODO halt
            }
          }
        }
      
        // enter to desired state
        for (i = 0; i < states.entries.length; i++) {
          this.context = this._allStates[states.entries[i]];
          if (this._isFunc(this.context.enter)) {
            if (this.context.enter.call(this) === false) {
              // TODO halt
            }
          }
        }

        this._currentState = stateName;
        
        // execute 'stay'
        this.context = this._allStates[this._currentState];
        if (this._isFunc(this.context.stay)) {
          this.context.stay.call(this);
        }

        // go to default substate
        var defaultSubstate = this._defaultSubstates[this._currentState];
        if (defaultSubstate) this.go(defaultSubstate);
      }
      return this;
    },
    /*
      Add a state to the manager.
      All state names need to be unique.
      Attempting to add a state with an existing name will show a warning and the state will not be added.
      Attempting to add a state to an inexisting parent will show a warning and the state will not be added.
    
      Usage:
    
      A. add('parentState -> childState');
      B. add('parentState -> childState1 childState2 ... childStateN');
      C. add([
        'parentState1 -> childState11 childState12 ... childState1N',
        'parentState2 -> childState21 childState22 ... childState2N',
        ...
      ]);
    
      @param stateConnection {String/Array} a string describing a relationship between parent state and child state(s). 
        Additionally can be an array of aforementioned strings.
    */
    add: function(stateConnection) {
      var i, parentState, childState, isDefaultSubstate;
      if (typeof stateConnection === 'string') {
        // string
        var pairs = this._getStatePairs(stateConnection);
        for (i = 0; i < pairs.length; i++) {
          parentState = pairs[i][0];
          childState = pairs[i][1];
          isDefaultSubstate = pairs[i][2];
          if (!this._allStates[parentState]) {
            console.warn('State ' + parentState + ' is not included in the tree. State not added.');
            return;
          }
          if (this._allStates[childState]) {
            console.warn('State ' + childState + ' was already defined and will be overwritten.');
          }
          this._allStates[childState] = {};
          this._parentStates[childState] = parentState;
          if (isDefaultSubstate) {
            if (this._defaultSubstates[parentState]) {
              console.warn('State ' + parentState + ' already has a default substate ' + this._defaultSubstates[parentState] + ' which will be overwritten with ' + childState);
            }
            this._defaultSubstates[parentState] = childState;
          }
        }
      } else {
        // array
        for (i = 0; i < stateConnection.length; i++) {
          this.add(stateConnection[i]);
        }
      }
      return this;
    },
  
    /*
      Perform an action within the state manager.
      The manager will go through the entire state chain, starting from the current state
      and up to the root, for matching actions.
    
      You can break the chain by returning false in an action.
    
      Usage: act(actionName, [arg1, [arg2, ..., argN]]);
    
      @param actionName {String} the name of the action
      @param (optional) arg1 ... argN - additional parameters to send to the action
    */
    act: function() {
      // regenerate context to current state after bubbling up
      this.context = this._act(this._currentState, arguments);
      return this;
    },

    /* 
      act recursively until action returns false; 
    */
    _act: function(state, args) {
      this.context = this._allStates[state];
      var action = this.context[args[0]];
      // break the chain on `return false;`
      if (this._isFunc(action) && action.apply(this, Array.prototype.slice.call(args, 1)) === false) return;
      if (this._parentStates[state]) this._act(this._parentStates[state], args);   
      return this.context;    
    },
  
    /*
      Attach a set of actions for one or more states.
      Multiple declarations of the same action for a state will overwrite the existing one.

      USAGE:
        A. when('stateName', { 
          action1: function() {},
          action2: function() {},
          ...
        });

        B. when('stateName1 stateName2 ...', {
          action1: function() {},
          action2: function() {},
          ...
        });

        C. when({
          "stateName1": {
            action11: function(){},
            action12: function(){}
          },
          "stateName2 stateName3 ... ": {
            action21: function() {},
            action22: function() {}
          }
        });
        
        D. when('stateName1', function() {
          // interpreted as `stay` function
        });
    
      @param stateString {String/Object} a string representing:
        - a state name (usage A)
        - a list of space-separated state names (usage B)      
        - a hash where the key is a state name / space-separated state names, and the value is the actions object (usage C)
      @param actions {Object/Function} list of actions to attach to the state(s)
        - Note: if function, will be interpreted as `stay`
    */
    when: function(stateString, actions) {
      var i;
      if (typeof stateString === 'object') {
        for (i in stateString) {
          this.when(i, stateString[i]);
        }
      } else {
        var states = stateString.split(/\s+/);
        for (i = 0; i < states.length; i++) {
          var stateName = states[i];
          if (stateName) {
            if (!this._allStates[stateName]) {
              console.warn('State ' + stateName + ' doesn\'t exist. Actions not added.');
              return;
            }
            
            // interpret single function as `stay` method
            if (this._isFunc(actions)) {
              actions = { stay: actions };
            }
            
            for (i in actions) {
              if (actions.hasOwnProperty(i)) this._allStates[stateName][i] = actions[i];
            }
          }
        }
      }
      return this;
    },
  
    /*
      Get the current state.
      @returns {String} current state
    */
    locate: function() {
      return this._currentState;
    },
    
    /** @deprecated */
    whenIn: function() {
      console.info('Deprecated: Use when() instead of whenIn()');
      return this.when.apply(this, arguments);
    },
    
    /** @deprecated */
    goTo: function() {
      console.info('Deprecated: Use go() instead of goTo()');
      return this.go.apply(this, arguments);
    }
  };

  /**
    Simple PubSub implementation.
    Events can be namespaced like this: 'namespace:event'
  */
  AppSeeds.PubSub = {
  
    /** 
      Create a PubSub instance.
    */
    create: function() {
      var C = function() {};
      C.prototype = this;
      var ps = new C();
      ps._pubsubEvents = {};
      return ps;
    },

    /**
      Publish an event.
      
      @param event {String} the event to trigger
      @param (Optional) any number of additional params to pass to the methods subscribed to the event.
    */
    pub: function(eventString) {
      var eventComponents = this._parseEventNamespace(eventString);
      var eventArray, j, args, subscriber, ret, event;
      for (var i = 0; i < eventComponents.length; i++) {
        event = eventComponents[i];
        eventArray = this._pubsubEvents[event];
        if (eventArray) {
          args = Array.prototype.slice.call(arguments, 1);
          for (j = 0; j < eventArray.length; j++) {
            subscriber = eventArray[j];
            ret = subscriber[0].apply(subscriber[1] || this, args);
            if (subscriber[2] && ret !== false) {
              this.unsub(event, subscriber[0]);
            }
          }
        }
      }
      return this;
    },
    
    // parse the namespaced event string to identify its components
    _parseEventNamespace: function(event) {
      var events = [], str = '', ch;
      for (var i = 0; i < event.length; i++) {
        if ((ch = event.charAt(i)) === ':') events.push(str);
        str += ch;
      }
      events.push(str);
      return events;
    },

    /**
      Subscribe a function to an event or list of events.
      
      @param eventStr {String} the event to subscribe to or list of space-separated events.
      @param method {Function} the method to run when the event is triggered
      @param (Optional) thisArg {Object} 'this' context for the method
      @param (Optional) isOnce {Boolean} if true, subscriber will self-unsubscribe after first (successful) execution
    */
    sub: function(eventStr, method, thisArg, isOnce) {
      var events = eventStr.split(/\s+/), event, eventArray, i;
      for (i = 0; i < events.length; i++) {
        event = events[i];
        eventArray = this._pubsubEvents[event];
        if (eventArray) {
          eventArray.push([method, thisArg, isOnce]);
        } else {
          this._pubsubEvents[event] = [[method, thisArg, isOnce]];
        }
      }
      return this;
    },

    /**
      Unsubscribe a function from an event or list of events.
      
      @param eventStr {String} event to unsubscribe from or list of space-separated events.
      @param method {Function} the method to unsubscribe
    */
    unsub: function(eventStr, method) {
      var events = eventStr.split(/\s+/), event, eventArray, i;
      var f = function(item) { return item[0] !== method; }; // filter function
      for (i = 0; i < events.length; i++) {
        event = events[i];
        this._pubsubEvents[event] = this._pubsubEvents[event].filter(f);
      }
      return this;
    },
    
    /**
      Subscribe to an event once. (Alias for sub() with isOnce = true)
      The function will be unsubscribed upon successful exectution.
      If you want to mark the function execution as unsuccessful 
      (and thus keep it subscribed), use `return false;`
    
      @param eventStr {String} the event to subscribe to or list of space-separated events.
      @param method {Function} the function to subscribe
      @param thisArg (Optional) {Object} the context to pass to the function
    */
    once: function(eventStr, method, thisArg) {
      return this.sub(eventStr, method, thisArg, true);
    },
    
    /**
      Schedule an event to publish, accepts same parameters as pub(). 
      While pub() publishes an event immediately, schedule() returns a scheduled task.
      @returns an AppSeeds.Scheduler instance.
    */
    schedule: function() {
      return AppSeeds.Scheduler.create(this.pub, arguments, this);
    }
  };

  /**
    Scheduler allows you to work with timed callbacks through a simple, clear API.
  */
  AppSeeds.Scheduler = {
    
    /**
      Create a scheduled task.
      
      @param callback {Function} the task to schedule
      @param (Optional) args {Array} an array of arguments to pass to the task upon execution
      @param (Optional) thisArg {Object} the context for the scheduled task
      
      @returns an AppSeeds.Scheduler instance.
    */
    create: function(callback, args, thisArg) {
      var C = function() {};
      C.prototype = this;
      var schedule = new C();
      schedule.callback = callback;
      schedule.args = args || [];
      schedule.thisArg = thisArg || this;
      schedule.timeout = null;
      schedule.interval = null;
      schedule._timerId = null;
      return schedule;
    },
    
    /**
      Execute scheduled task immediately.
    */
    now: function() {
      this.callback.apply(this.thisArg, this.args);
      return this;
    },
    
    /**
      Reset the timer of the schedule task, effectively postponing its execution.
    */
    reset: function() {
      this.stop();
      if (this.timeout) {
        this.delay(this.timeout);
      } else if (this.interval) {
        this.repeat(this.interval);
      }
      return this;
    },
    
    /**
      Delay the publication with a number of milliseconds.
      @param timeout {Number} the delay before execution, in milliseconds
    */
    delay: function(timeout) {
      var that = this;
      this.timeout = timeout;
      this.interval = null;
      this._timerId = window.setTimeout(function() { that.now(); }, timeout);
      return this;
    },
    
    /**
      Repeat the execution of the task each N milliseconds.
      @param interval {Number} the frequency of execution, in milliseconds
    */
    repeat: function(interval) {
      var that = this;
      this.interval = interval;
      this.timeout = null;
      this._timerId = window.setInterval(function() { that.now(); }, interval);
      return this;
    },
    
    /**
      Stop the scheduled task.
      Use reset() to resume the schedule.
    */
    stop: function() {
      if (this.timeout) {
        window.clearTimeout(this._timerId);
      } else if (this.interval) {
        window.clearInterval(this._timerId);
      }
      return this;
    },

    // TODO
    destroy: function() {}
  };

  // TODO
  AppSeeds.DelegateSupport = {
    delegate: null,
    del: function(name) {
      return this.delegate && typeof this.delegate[name] === 'function' ? 
        this.delegate[name].apply(this, Array.prototype.slice.call(arguments, 1)) : true;
    }
  };

  AppSeeds.Binder = {
    // TODO DOM Binder of sorts.
  };
  
})(this);
