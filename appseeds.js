/**
  AppSeeds 0.3 (c) 2012 Dan Burzo
  AppSeeds can be freely distributed under the MIT license.
  http://github.com/danburzo/appseeds
*/
/*
  TODO:
  StateManager:
    - integrate with backbone router
    - allow ASYNC behavior by returning false on enter / exit + StateManager.resume()
    - explore pattern of integration with jQuery:
  
      HTML: <a data-seed-action='actionName'>Label</a>  
      JS: $('[data-seed-action]').on('click', function(e) {
        stateManager.act($(this).data('seed-action'));
      });
    
    - add method AppSeeds.StateManager.start(initialState)
    - deal with 'private' properties declared in whenIn() 
      that we probably want to be able to access from the normal actions.

    - Conundrum: should probably re-compute currentActions incrementally, with each state transition,
      so that an enter()/exit() that tries to call an action through act() behaves intuitively.
      In this case, what to do if an act() method calls goTo? that goto will potentially alter _currentActions.
      
  Scheduler:
    - each delay() / repeat() pushes a new element in this._timerIds
      e.g. ['timeout', timerId], ['interval', timerId]
      reset() will loop through this._timerIds and reset the timeout/interval as fit
      clear() will do the same.
      
      This is to allow multiple parallel schedules on each event.
*/


/*globals exports define require console*/
(function(){
  // for CommonJS and the browser
  var AppSeeds = typeof exports !== 'undefined' ? exports : (this.AppSeeds = {});
  
  AppSeeds.version = '0.3';

  /*
    Constructor method for State Manager.
    Usage: App.stateManager = new AppSeeds.StateManager.create();
  */

  AppSeeds.StateManager = {
    rootState: 'root',
    _currentState: null, // current state of the manager
    _currentActions: {}, // current set of actions. key is action name, value is an array of functions.
    _allStates: {}, // the set of all states with their actions
  
    _parentStates: {}, // the state tree; key is state name, value is name of parent state.
  
    // we don't add these to _currentActions, invoked separately on state transitions
    _reservedMethods: ['enter', 'exit'],
  
    /* Optional Backbone.Router */
    router: null,
  
    onStateChange: function(stateName) {
      // no-op
    },
  
    create: function(options) {
      var C = function() {};
      C.prototype = this;
      var stateManager = new C();
    
      // init internals
      stateManager.rootState = 'root';
      stateManager.router = null;
      stateManager._currentActions = {};
      stateManager._parentStates = {};
      stateManager._allStates = {};
      stateManager._allStates[stateManager.rootState] = {};
      stateManager._parentStates[stateManager.rootState] = null;
      stateManager._currentState = stateManager.rootState;
    
      options = options || {};

      if (typeof options === 'string') {
        // single option, interpret as 'statechart option'
        stateManager.add(options);
      } else {
        if (options.init) stateManager._onInit = options.init;
        if (options.statechart) {
          stateManager.add(options.statechart);
        }
        if (this._isFunc(options.onStateChange)) {
          stateManager.onStateChange = options.onStateChange;
        }
        if (options.router) {
          stateManager.router = options.router;
        }
      }
      return stateManager;
    },
  
    init: function() {
      if (this._isFunc(this._onInit)) this._onInit.call(this);
      return this;
    },
  
    // traces path from current state to root state
    _toRoot: function(stateName) {
      var route = [];
      while(stateName) {
        route.push(stateName);
        stateName = this._parentStates[stateName];
      }
      return route;
    },
  
    // finds LCA (Lowest Common Ancestors) between two states
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
  
    _regenerateCurrentActions: function() {
      this._currentActions = {};
      var states = this._toRoot(this._currentState);
      for (var i = 0; i < states.length; i++) {
        var actions = this._allStates[states[i]];
        for (var j in actions) {
          if (actions.hasOwnProperty(j) && this._isFunc(actions[j]) && this._reservedMethods.indexOf(j) === -1) {
            if (!this._currentActions[j]) this._currentActions[j] = [];
            this._currentActions[j].push(actions[j]);
          }
        }
      }
    },
  
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
      var pairs = [];
      for (var i = 0; i < childStates.length; i++) {
        if (childStates[i]) pairs.push([parentState, childStates[i]]);
      }
      return pairs;
    },
  
    /*
      Transition to a new state in the manager.
      Attempting to transition to an inexistent state does nothing (and logs a warning)
      Attempting to transition to the same state as the current one will again do nothing.
    
      @param stateName {String} the name of the state to which to transition.
    */
    goTo: function(stateName) {
      var state = this._allStates[stateName];
      if (state === undefined) {
        console.warn('State ' + stateName + ' not defined');
        return;
      }
      if (this._currentState !== stateName) {
        var states = this._lca(this._currentState, stateName);
        var i, action, currentState;
      
        // exit to common ancestor
        for (i = 0; i < states.exits.length; i++) {
          currentState = this._allStates[states.exits[i]];
          if (this._isFunc(currentState.exit)) {
            if (currentState.exit.call(this, this._currentState) === false) {
              // TODO halt
            }
          }
        }
      
        // enter to desired state
        for (i = 0; i < states.entries.length; i++) {
          currentState = this._allStates[states.entries[i]];
          if (typeof currentState.enter === 'function') {
            if (currentState.enter.call(this, this._currentState) === false) {
              // TODO halt
            }
          }
        }
        this._currentState = stateName;
        this._regenerateCurrentActions();
        this.onStateChange(stateName);
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
      B. add('parentState -> childState1, childState2, ..., childStateN');
      C. add([
        'parentState1 -> childState11, childState12, ... childState1N',
        'parentState2 -> childState21, childState22, ... childState2N',
        ...
      ]);
    
      @param stateConnection {String/Array} a string describing a relationship between parent state and child state(s). 
        Additionally can be an array of aforementioned strings.
    */
    add: function(stateConnection) {
      var i, parentState, childState;
      if (typeof stateConnection === 'string') {
        // string
        var pairs = this._getStatePairs(stateConnection);
        for (i = 0; i < pairs.length; i++) {
          parentState = pairs[i][0];
          childState = pairs[i][1];
          if (!this._allStates[parentState]) {
            console.warn('State ' + parentState + ' is not included in the tree. State not added.');
            return;
          }
          if (typeof childState === 'object') {
            for (var state in childState) this.add(parentState, state, childState[state]);
          } else {
            if (this._allStates[childState]) {
              console.warn('State ' + childState + ' is already defined. State not added.');
              return;
            }
            this._allStates[childState] = {};
            this._parentStates[childState] = parentState;
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
    
      Usage: acti(actionName, [arg1, [arg2, ..., argN]]);
    
      @param actionName {String} the name of the action
      @param arg1 ... argN (optional) additional parameters to send to the action
    */
    act: function() {
      // we use map() to clone the array so any changes to it in the meantime will not affect the flow
      // e.g. if a state will call goTo() which in turn overwrites _currentActions
      var actions = (this._currentActions[arguments[0]] || []).map(function(item) { return item; });
      for (var i = 0; i < actions.length; i++) {
        // break the chain on `return false;`
        if (actions[i].apply(this, Array.prototype.slice.call(arguments, 1)) === false) break; 
      }
      return this;
    },
  
    /*
      Attach a set of actions for one or more states.
      Multiple declarations of the same action for a state will overwrite the existing one.

      USAGE:
        A. whenIn('stateName', { 
          action1: function() {},
          action2: function() {},
          ...
        });

        B. whenIn('stateName1 stateName2 ...', {
          action1: function() {},
          action2: function() {},
          ...
        });

        C. whenIn({
          "stateName1": {
            action11: function(){},
            action12: function(){}
          },
          "stateName2 stateName3 ... ": {
            action21: function() {},
            action22: function() {}
          }
        });
    
      @param stateString {String/Object} a string representing:
        - a state name (usage A)
        - a list of space-separated state names (usage B)      
        - a hash where the key is a state name / space-separated state names, and the value is the actions object (usage C)
      @actions actions {Object} list of actions to attach to the state(s)
    */
    whenIn: function(stateString, actions) {
      var i;
      if (typeof stateString === 'object') {
        for (i in stateString) {
          this.whenIn(i, stateString[i]);
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
            for (i in actions) {
              if (actions.hasOwnProperty(i)) this._allStates[stateName][i] = actions[i];
            }
          }
        }
      }
      this._regenerateCurrentActions();
      return this;
    },
  
    /*
      Get the current state.
      @return {String} current state
    */
    locate: function() {
      return this._currentState;
    }
  };

  /**
    Simple PubSub implementation.
    Events can be namespaced like this: 'namespace:event'
  */
  AppSeeds.PubSub = {
  
    create: function(options) {
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
        eventArray = this._pubsubEvents[event] || [];
        args = Array.prototype.slice.call(arguments, 1);
        for (j = 0; j < eventArray.length; j++) {
          subscriber = eventArray[j];
          ret = subscriber[0].apply(subscriber[1] || this, args);
          if (subscriber[2] && ret !== false) {
            this.unsub(event, subscriber[0]);
          }
        }
      }
      return this;
    },
    
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
      @param thisArg (Optional){Object} 'this' context for the method
      @param isOnce (Optional){Boolean} if true, subscriber will self-unsubscribe after first (successful) execution
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
      Schedule an event to publish.
      @returns an AppSeeds.Scheduler instance.
    */
    schedule: function() {
      return AppSeeds.Scheduler.create(this.pub, arguments, this);
    }
  };

  /**
    Scheduler allows you to work with timed callbacks through a simple, crear API.
  */
  AppSeeds.Scheduler = {
    
    create: function(callback, args, thisArg) {
      var C = function() {};
      C.prototype = this;
      var schedule = new C();
      schedule.callback = callback;
      schedule.args = args;
      schedule.thisArg = thisArg || this;
      schedule.timeout = null;
      schedule.interval = null;
      schedule._timerId = null;
      return schedule;
    },
    
    /**
      Publish scheduled event immediately.
    */
    now: function() {
      this.callback.apply(this.thisArg, this.args);
      return this;
    },
    
    /**
      Reset the timer on the event.
    */
    reset: function(forever) {
      if (this.timeout) {
        window.clearTimeout(this._timerId);
        if (!forever) this.delay(this.timeout);
      } else if (this.interval) {
        window.clearInterval(this._timerId);
        if (!forever) this.repeat(this.interval);
      }
      return this;
    },
    
    /**
      Delay the publication with a number of milliseconds.
    */
    delay: function(timeout) {
      var that = this;
      this.timeout = timeout;
      this.interval = null;
      this._timerId = window.setTimeout(function() { that.now(); }, timeout);
      return this;
    },
    
    /**
      Repeat the publication of the event each N milliseconds.
    */
    repeat: function(interval) {
      var that = this;
      this.interval = interval;
      this.timeout = null;
      this._timerId = window.setInterval(function() { that.now(); }, interval);
      return this;
    },
    
    /**
      Cancel the scheduled publication. 
      Alias for .reset(forever = true)
    */
    stop: function() {
      this.reset(true);
      return this;
    }
  };
  
})(this);
