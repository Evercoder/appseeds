//     AppSeeds (c) 2012 Dan Burzo
//     AppSeeds can be freely distributed under the MIT license.
// Elegant JavaScript components for modern web applications. Made by [@danburzo](https://twitter.com/#!/danburzo).
//
// Fork & contribute at [github.com/danburzo/appseeds](https://github.com/danburzo/appseeds). 
//
// Download [zip](https://github.com/danburzo/appseeds/zipball/master), [tar](https://github.com/danburzo/appseeds/tarball/master). 
//
// API / Annotated source code
// ===========================
//
// What you're seeing below is the annotated source code slash makeshift API reference for AppSeeds.
// It was automatically generated with [docco](http://jashkenas.github.com/docco/). Here goes:

// Encapsulate the library to protect global scope.
/*globals exports define require console*/
(function(){

  var root = this;

  // Export AppSeeds for CommonJS and the browser.
  var AppSeeds, Seeds;
  if (typeof exports !== 'undefined') {
    AppSeeds = Seeds = exports;
  } else {
    AppSeeds = Seeds = root.AppSeeds = root.Seeds = {};
  }

  // Current version of the application, using [semantic versioning](http://semver.org/).
  AppSeeds.version = '0.7.0';

  // Polyfills, mostly for IE, around missing Array methods like [indexOf](https://gist.github.com/1034425).
  if(!Array.isArray) {
    Array.isArray = function (vArg) { return Object.prototype.toString.call(vArg) === "[object Array]"; };
  }
  if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(a,b,c){ 
      for(c=this.length,b=(c+~~b)%c;b<c&&(!(b in this)||this[b]!==a);b++);
      return b^c?b:-1;
    };
  }

  // Seeds.StateManager
  // ==================
  // Alias: *Seeds.SM*
  //
  // *StateManager* implements a hierarchical state chart closely aligned with David Harel's definition 
  // from hi seminal paper *Statecharts: A Visual Formalism For Complex Systems*.
  // 
  // Using a state chart to organize your application helps your modules react to state-specific events 
  // in a clear, maintainable way.
  AppSeeds.StateManager = AppSeeds.SM = {
    
    // Creates a new instance of State Manager. Used as follows:
    // 
    // * **create(states)**
    //    * *states* one or more space-separated state names, or an array of such strings;
    //      convenience method for *StateManager.add(states)*
    // * **create(options)**
    //    * *options* a configuration object. Available options:
    //      * *states* one or more space-separated state names, or an array of such strings;
    //      * *onEnter* (delegatable) callback for when *enter* is executed on a state;
    //      * *onExit* (delegatable) callback for when *exit* is executed on a state;
    //      * *onStay* (delegatable) callback for when *stay* is executed on a state;
    //      * *onAct* (delegatable) callback for when an action is triggered on a state;
    //      * *delegate* delegate for the object.
    create: function(options) {

      var stateManager = Seeds.create(this._instanceMethods);
      Seeds.mixin(stateManager, {
        _status: Seeds.StateManager.STATUS_READY,
        root: 'root',
        _states: {},
        _actions: {},
        _queue: {}
      });

      stateManager.state(stateManager.root, {
        parent: null,
        context: {},
        defaultSubstate: null
      });
      stateManager.context = stateManager.state(stateManager.root).context;
      stateManager.current = stateManager.root;
    
      options = options || {};
      if (typeof options === 'string' || Array.isArray(options)) {
        stateManager.add(options);
      } else {
        Seeds.mixin(stateManager, options);
      }
      if (stateManager.states) {
        stateManager.add(states);
        delete stateManager.states;
      }
      return stateManager;
    },

    // #### State Manager constants
    // The state manager can accept a new transition.
    STATUS_READY: 0x01,
    // The state manager is currently in a transition, and therefore is locked.
    STATUS_TRANSITIONING: 0x02,
    // The state manager was paused as part of an asynchronous transition.
    STATUS_ASYNC: 0x03,
    // The flag to return in *enter*/*exit* to enter asynchronous mode and pause the state manager.
    ASYNC: false,
  
    // ### Seeds.StateManager API
    _instanceMethods: {

      // Name of the root state.
      root: 'root',
      
      // Current state. This should not be manually overwritten!
      current: null,
      
      // Hash for the collection of states, with state name as key and an object
      // as value to keep information about the state:
      // 
      // * *parent* parent state
      // * *defaultSubstate* default substate
      // * *context* the collection of actions associated with the state
      _states: {},
    
      // The context of the current state, contains the actions and other 'private' methods
      // defined with when() for that state.
      context: null,

      // The current status of the state manager.
      _status: null,

      // Where we left off when going into ASYNC mode. We need this in order to resume. 
      _queue: null,

      // Initialize the state manager (optional, at this point).
      init: function() {
        if (typeof this._onInit === 'function') this._onInit.call(this);
        return this;
      },
      
      //  Get/set information about a state.
      //
      //  * *stateName* name of the state
      //  * *val* (optional) object to set as new value for state
      //
      // Returns the state object.
      state: function(stateName, val) {
        if (val !== undefined) this._states[stateName] = val;
        return this._states[stateName];
      },
      
      //  Gets the substates for a state.
      //
      //  * *stateName* name of the state
      // 
      // Returns an array containing the names of the child states.
      children: function(stateName) {
        var substates = [];
        for (var i in this._states) {
          if (this._states.hasOwnProperty(i) && this._states[i].parent === stateName) {
            substates.push(i);
          }
        }
        return substates;
      },

      // Navigates from the current state up to the root state, 
      // returning the list of state names that make up the branch.
      _toRoot: function(stateName) {
        var route = [];
        while(stateName) {
          route.push(stateName);
          stateName = this.state(stateName).parent;
        }
        return route;
      },
    
      // Find the LCA (Lowest Common Ancestor) between two states.
      _lca: function(startState, endState) { 
        var exits = this._toRoot(startState), entries = this._toRoot(endState), lca;
        for (var i = 0; i < exits.length; i++) {
          var idx = entries.indexOf(exits[i]);
          if (idx !== -1) {
            lca = exits[i];
            exits = exits.slice(0, i);
            entries = entries.slice(0, idx).reverse();
            break;
          }
        }
        return { exits: exits, entries: entries, lca: lca };
      },
    
      // Parse a state string. See *StateManager.add()* for expected formats.
      _getStatePairs: function(str) {
        var tmp = str.split('->');
        var parentState, childStates;
        switch(tmp.length) {
          case 0:
            childStates = [];
            break;
          case 1:
            parentState = this.root;
            childStates = tmp[0].split(/\s+/);
            break;
          case 2:
            parentState = tmp[0].replace(/^\s\s*/, '').replace(/\s\s*$/, ''); // trim
            childStates = tmp[1].split(/\s+/);
            break;
          default: 
            console.warn('String ' + str + ' is an invalid state pair and has been dropped.');
            childStates = [];
            break;
        }
        var pairs = [], childState, defaultSubstateRegex = /^!/;
        for (var i = 0; i < childStates.length; i++) {
          if (childStates[i]) {
            pairs.push([
              parentState, 
              childStates[i].replace(defaultSubstateRegex, ''), 
              defaultSubstateRegex.test(childStates[i])
            ]);
          }
        }
        return pairs;
      },
    
      // Transition to a new state in the manager.
      // 
      // Attempting to transition to an inexistent state does nothing and logs a warning.
      // Likewise, attempting to transition to the same state as the current one will do nothing.
      // 
      // Parameters:
      // 
      //  * *stateName* the name of the state to which to transition
      go: function(stateName) {
        var state = this.state(stateName);
        if (state === undefined) {
          console.warn('State ' + stateName + ' not defined');
          return;
        }
        if (this.current !== stateName && this._status === Seeds.SM.STATUS_READY) {
          var states = this._lca(this.current, stateName);
          this._walk(states);
        }
        return this;
      },

      _walk: function(states) {
        var i, action;
        this._status = Seeds.SM.STATUS_TRANSITIONING;

        /* exit to common ancestor */
        for (i = 0; i < states.exits.length; i++) {
          this.current = states.exits[i];
          this.context = this.state(states.exits[i]).context;
          if (typeof this.context.exit === 'function') {
            if (this.context.exit.call(this) === Seeds.SM.ASYNC) {
              this._status = Seeds.SM.STATUS_ASYNC;
              this._queue = { exits: states.exits.slice(i+1), entries: states.entries, lca: states.lca };
              return this;
            }
          }
          Seeds.delegate(this, 'onExit', this.current);
        }
      
        /* set common ancestor as current state */
        this.current = states.lca;
        this.context = this.state(this.current).context;

        /* enter to desired state */
        for (i = 0; i < states.entries.length; i++) {
          this.current = states.entries[i];
          this.context = this.state(states.entries[i]).context;
          if (typeof this.context.enter === 'function') {
            if (this.context.enter.call(this) === Seeds.SM.ASYNC) {
              this._status = Seeds.SM.STATUS_ASYNC;
              this._queue = { exits: [], entries: states.entries.slice(i+1), lca: states.entries[i] };
              return this;
            }
          }
          Seeds.delegate(this, 'onEnter', this.current);
        }

        this._status = Seeds.SM.STATUS_READY;

        var defaultSubstate = this.state(this.current).defaultSubstate;
        if (defaultSubstate) {
          /* go to default substate */
          this.go(defaultSubstate);
        } else {
          /* execute 'stay' */
          if (typeof this.context.stay === 'function') {
            this.context.stay.call(this);
          }
          Seeds.delegate(this, 'onStay', this.current);
        }
      },

      resume: function() {
        if (this._status === Seeds.SM.STATUS_ASYNC) {
          this._walk(this._queue);
        } else {
          console.warn('State manager is not paused.');
        }
      },

      // Add states to the manager. 
      // 
      // All state names need to be unique. Attempting to add a state with an existing name 
      // will show a warning and the state will not be added. Likewise, attempting to add a state 
      // to an inexisting parent will show a warning and the state will not be added.
      //
      // Signatures:
      //
      //  * **add(stateString)**
      //  * **add(stateString1, ..., stateStringN)**
      //  * **add(stateHash)** where the key is the name of the parent state and the value is a list
      //    of space-separated state names.
      //
      // Expected format for the state strings:
      //
      //  * `parentState -> state1 state2 state3` or
      //  * `state1 state2 state3` in which case the root state is the implied parent.
      //
      // To specify a default substate, use `!` like this:
      // 
      //     parentState -> state1 !state2 state3
      // 
      // TODO would be cool to add `=>` instead of `->` if the substates are meant to be parallel.
      add: function(stateConnection) {
        var i, parentState, childState, isDefaultSubstate;
        if (arguments.length > 1) {
          for (i = 0; i < arguments.length; i++) {
            this.add(arguments[i]);
          }
        } else {
          if (Array.isArray(stateConnection)) {
            for (i = 0; i < stateConnection.length; i++) {
              this.add(stateConnection[i]);
            }
          } else if (typeof stateConnection === 'string') {
            var pairs = this._getStatePairs(stateConnection);
            for (i = 0; i < pairs.length; i++) {
              parentState = pairs[i][0];
              childState = pairs[i][1];
              isDefaultSubstate = pairs[i][2];
              if (!this.state(parentState)) {
                console.warn('State ' + parentState + ' is not included in the tree. State not added.');
                return;
              }
              if (this.state(childState)) {
                console.warn('State ' + childState + ' is already defined. New state not added.');
              }
              this.state(childState, { 
                context: {}, 
                defaultSubstate: null,
                parent: parentState
              });
              if (isDefaultSubstate) {
                if (this.state(parentState).defaultSubstate) {
                  console.warn('State %s already has a default substate %s which will be overwritten with %s', 
                    parentState, this.state(parentState).defaultSubstate, childState);
                }
                this.state(parentState).defaultSubstate = childState;
              }
            }
          } else if (typeof stateConnection === 'object') {
            for (i in stateConnection) {
              if (stateConnection.hasOwnProperty(i)) {
                this.add(i + " -> " + stateConnection[i]);
              }
            }
          }
        }
        return this;
      },
    
      // Perform an action within the state manager.
      // 
      // The manager will look through the entire state chain, 
      // starting from the current state and up to the root, for matching actions.
      //
      // You can break this chain by returning false in one of the actions, 
      // to prevent it from bubbling to the ancestor states.
      //
      // You can send any number of additional parameters to the action:
      //
      //  * **act(actionName, [arg1, [arg2, ..., argN]])**
      //    * *actionName* the name of the action;
      //    * *arg1, ... argN* (optional) additional parameters to pass to the action.
      act: function() {
        if (this._status !== Seeds.SM.ASYNC) {
          // Don't forget to regenerate the context to current state 
          // after the recursive call ends.
          this.context = this._act(this.current, arguments);
        } else {
          console.warn('State manager is paused, can\'t perform action %s', arguments[0]);
        }
        return this;
      },

      // Get a reference to a state manager action.
      //
      //  * **act(actionName)**
      //    * *actionName* name of the action
      //
      // Returns a reference to the appropriate invocation of *act()*.
      action: function(actionName) {
        var that = this;
        if (!this._actions[actionName]) {
          this._actions[actionName] = function() {
            return that.act.apply(that, [actionName].concat(Array.prototype.slice.call(arguments)));
          };
        }
        return this._actions[actionName];
      },

      // Act recursively up the state tree until an action returns `false`. 
      _act: function(state, args) {
        this.context = this.state(state).context;
        var action = this.context[args[0]];
        if (typeof action === 'function') {
          var ret = action.apply(this, Array.prototype.slice.call(args, 1));
          Seeds.delegate(this, 'onAct', args[0], state);
          if (ret === false) return;
        }
        var parentState = this.state(state).parent;
        if (parentState) this._act(parentState, args);   
        return this.context;    
      },
    
      
      // Attach a set of actions for one or more states.
      // 
      // Subsequent declarations of the same action for a state will overwrite the previous ones.
      // Signatures:
      //
      //  * **when(stateNames, actionsHash)**
      //    * *stateNames* one or more space-separated stata names;
      //    * *actionsHash* an object containing the actions to add to this state.
      //      There are three reserved action names with special meaning:
      //      * *enter* is executed when the manager enters the state;
      //      * *exit* is executed when the manager leaves the state;
      //      * *stay* is executed when the manager arrives in the state as its destination;
      //  * **when(stateNames, actionName, action)** a simpler way to add a single action at a time to the state;
      //  * **when(stateNames, stayFunction)** even simpler: if the second parameter is a function, 
      //    it will be interpreted as the *stay* action for the state;
      //  * **when(stateHash)** you can even have multiple state action declarations in the same call. 
      //
      // For example:
      //
      //      when({
      //        'state1 state2': { /* some actions */ },
      //        'state3': { /* some other actions */ } 
      //      });
      //
      // Actions defined here will receive all the parameters sent with *StateManager.act()*. 
      // `this` inside the action refers to the state manager. `this.context` refers to the actions hash
      // defined for the state and can be used to reference other actions from the same state directly.
      when: function(stateString, actions, action) {
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
              var state = this.state(stateName);
              if (!state) {
                console.warn('State %s doesn\'t exist. Actions not added.', stateName);
                return;
              }
              
              /* interpret single function as `stay` method */
              if (typeof actions === 'function') {
                actions = { stay: actions };
              } else if (typeof actions === 'string') {
                /* 
                  interpret add('stateName', 'actionName', function(){ ... }) 
                  as add('stateName', { actionName: function() {...}}) 
                */
                var tmp = actions;
                actions = {};
                actions[tmp] = action;
              }
              
              if (!state.context) state.context = {};
              
              for (i in actions) {
                if (actions.hasOwnProperty(i)) state.context[i] = actions[i];
              }
            }
          }
        }
        return this;
      }
    }
  };

  // Seeds.PubSub
  // ============
  // Alias: *Seeds.PS*
  // 
  // Simple PubSub implementation.
  // Events can be namespaced like this: `namespace:event`
  AppSeeds.PubSub = AppSeeds.PS = {
  
    // Create a PubSub instance.
    // 
    //  * *options* a configuration object for the PubSub instance.
    create: function(options) {
      var ps = Seeds.create(this._instanceMethods);
      Seeds.mixin(ps, options, {
        _pubsubEvents: {},
        _pubsubHappened: {}
      });
      return ps;
    },

    // ### Seeds.PubSub API
    _instanceMethods: {
      // Publish an event.
      //    
      //  * **pub(event, [arg1, [arg2 ...]])**
      //    * *event* the event to trigger;
      //    * *arg1 ... argN* (optional) any number of additional params to pass to the event subscribers.
      pub: function(eventString) {
        var eventComponents = this._parseEventNamespace(eventString);
        var eventArray, i, ilen, j, jlen, args, subscriber, ret, event;
        for (i = 0, ilen = eventComponents.length; i < ilen; i++) {
          eventArray = this._pubsubEvents[event = eventComponents[i]] || [];
          args = Array.prototype.slice.call(arguments, 1);
          for (j = 0, jlen = eventArray.length; j < jlen; j++) {
            subscriber = eventArray[j];
            ret = subscriber[0].apply(subscriber[1] || this, args);
            if (subscriber[2] && ret !== false) {
              this.unsub(event, subscriber[0]);
            }
          }
          this._pubsubHappened[event] = args;
        }
        return this;
      },
      
      // Parses the namespaced event string to identify its components.
      _parseEventNamespace: function(event) {
        var events = [], str = '', ch;
        for (var i = 0; i < event.length; i++) {
          if ((ch = event.charAt(i)) === ':') events.push(str);
          str += ch;
        }
        events.push(str);
        return events;
      },

      // Subscribe a function to one or more events.
      //
      //  * **sub(eventString, method, [thisArg, [flags]])**
      //    * *eventString* one or more space-separated events;
      //    * *method* the function to subscribe to the events;
      //    * *thisArg* (optional) context for the method;
      //    * *flags* (optional) boleans to configure the subscribers's behavior:
      //      * *once* if true, the subscriber will self-unsubscribe after the first successful execution. You'll usually use *PubSub.once()* for this;
      //      * *recoup* if true, the subscriber will execute immediately if the event it subscribes to already happened. You'll usually use *PubSub.recoup()* for this.
      //
      // *Careful!* When subscribing a method to multiple events, if the events don't get published
      // with compatible parameters, you can end up with weird behavior. To avoid this, it's best to
      // keep a common interface for all events in the list.
      sub: function(eventStr, method, thisArg, flags) {
        var events = eventStr.split(/\s+/), event, eventArray, i, len, oldArgs;
        flags = flags || { once: false, recoup: false };
        for (i = 0, len = events.length; i < len; i++) {
          eventArray = this._pubsubEvents[event = events[i]];
          if (eventArray) {
            eventArray.push([method, thisArg, flags.once]);
          } else {
            this._pubsubEvents[event] = [[method, thisArg, flags.once]];
          }
          if (flags.recoup && (oldArgs = this._pubsubHappened[event])) {
            method.apply(thisArg || this, oldArgs);
          }
        }
        return this;
      },

      // Unsubscribe a function from one or more events.
      //
      //  * **unsub(eventString, method)**
      //    * *eventString* one or more space-separated events;
      //    * *method* the function to unsubscribe
      unsub: function(eventStr, method) {
        var events = eventStr.split(/\s+/), event, eventArray, newEventArray, i, j;
        for (i = 0; i < events.length; i++) {
          eventArray = this._pubsubEvents[event = events[i]];
          newEventArray = [];
          for (j = 0; j < eventArray.length; j++) {
            if (eventArray[j][0] !== method) {
              newEventArray.push(eventArray[j]);
            }
          }
          this._pubsubEvents[event] = newEventArray;
        }
        return this;
      },
      
      // Subscribe to an event once. 
      // 
      // The function will be unsubscribed upon successful exectution.
      // To mark the function execution as unsuccessful 
      // (and thus keep it subscribed), make it return `false`.
      //
      //  * **once(eventString, method, thisArg)** identical to *PubSub.sub()*.
      once: function(eventStr, method, thisArg) {
        return this.sub(eventStr, method, thisArg, { once: true });
      },

      // Subscribe to an event, and execute immediately if that event was ever published before.
      //
      // If executed immediately, the subscriber will get as parameters the last values sent with the event.
      //
      //  * **recoup(eventString, method, thisArg)** identical to *PubSub.sub()*.
      recoup: function(eventStr, method, thisArg) {
        return this.sub(eventStr, method, thisArg, { recoup: true });
      },
      
      // Schedule an event to publish, using *Seeds.Scheduler*. 
      // 
      // * **schedule(eventString, [arg1, ... [argN]])** identical to *PubSub.pub()*.
      //
      // While pub() publishes an event immediately, schedule() returns a scheduled task 
      // which you need to trigger by using `now()`, `delay()` etc.
      schedule: function() {
        if (!Seeds.Scheduler) return null;
        return Seeds.Scheduler.create.apply(
          AppSeeds.Scheduler, 
          [this.pub, this].concat(Array.prototype.slice.call(arguments))
        );
      }
    }
  };

  // Seeds.Scheduler
  // ===============
  // Scheduler allows you to work with timed callbacks through a simple, clear API.
  AppSeeds.Scheduler = AppSeeds.Sked = {

    // Create a scheduled task.
    //  
    //  *  **create(callback, thisArg, [arg1, [arg2 ... ])**
    //    * *callback* the task to schedule
    //    * *thisArg* (optional) context for the scheduled task
    //    * *arg1 ... argN* (optional) additional parameters to send to the task
    //
    // Returns a *StateManager.Scheduler* instance.
    create: function(callback, thisArg) {
      var schedule = Seeds.create(this._instanceMethods);
      Seeds.mixin(schedule, {
        callback: callback,
        args: Array.prototype.slice.call(arguments, 2),
        thisArg: thisArg || this,
        timeout: null,
        interval: null,
        limit: null,
        _lastCalled: (new Date()).getTime(),
        _timerId: null
      });
      return schedule;
    },

    // ### Seeds.Scheduler API
    _instanceMethods: {
      // Execute the scheduled task immediately. If the task is throttled (see *Scheduler.throttle()*),
      // it will not be executed with higher frequency than the one imposed by the throttle limit. 
      // 
      // If you provide parameters to this call, they will override the ones declared on *create()*.
      now: function() {
        var now = (new Date()).getTime();
        if (!this.limit || (now - this._lastCalled > this.limit)) {
          this.callback.apply(this.thisArg, arguments.length ? arguments : this.args);
          this._lastCalled = now;
        }
        return this;
      },

      // Limit the execution frequency of a task.
      //
      //  * **throttle(limit)**
      //    * *limit* the maximum frequency of execution, in milliseconds.
      //      send `0` or `null` to cancel the throttling.
      throttle: function(limit) {
        this.limit = limit;
        return this;
      },

      // Reset the timer of the schedule task, effectively postponing its execution.
      reset: function() {
        this.stop();
        if (this.timeout) {
          this.delay(this.timeout);
        } else if (this.interval) {
          this.repeat(this.interval);
        }
        return this;
      },
      
      // Delay task execution with a number of milliseconds, similar to `window.setTimeout`.
      // 
      //  * **delay(timeout)**
      //    * *timeout* delay of execution, in milliseconds.
      //
      // Can be postponed by calling *reset()*.
      delay: function(timeout) {
        var that = this;
        this.timeout = timeout;
        this.interval = null;
        this._timerId = window.setTimeout(function() { that.now(); }, timeout);
        return this;
      },

      // Repeat the execution of the task at a fixed interval, similar to `window.setInterval`.
      // 
      //  * **repeat(interval)**
      //    * *interval* the execution interval
      //
      // Can be postponed by calling *reset()*.
      repeat: function(interval) {
        var that = this;
        this.interval = interval;
        this.timeout = null;
        this._timerId = window.setInterval(function() { that.now(); }, interval);
        return this;
      },
      
      // Stop the scheduled task. It can be resumed by calling *reset()*.
      stop: function() {
        if (this.timeout) {
          window.clearTimeout(this._timerId);
        } else if (this.interval) {
          window.clearInterval(this._timerId);
        }
        return this;
      }
    },

    // ### Seeds.Scheduler static methods

    // Convenience method to get a throttled version of a function,
    // without having to manually instantiate *Seeds.Scheduler*. 
    //
    //  * **throttled(callback, limit)**
    //    * *callback* the original function
    //    * *limit* the maximum frequency of executuin, in milliseconds
    //
    // Returns a throttled version of the function. If you want more control
    // (e.g. change the throttle limit), create it the old fashioned way.
    throttled: function(callback, limit) {
      var task = Seeds.Scheduler.create(callback).throttle(limit);
      return function() { task.now(); };
    },

    // Convenience method to get a delayed version of a function,
    // without having to manually instantiate *Seeds.Scheduler*. 
    //
    //  * **delayed(callback, timeout)**
    //    * *callback* the original function
    //    * *timeout* the delay in milliseconds
    //
    // Returns a delayed version of the function. Note that this is a plain function.
    // If you want more control (e.g. *stop*, *reset*), create it the normal way:
    // *Seeds.Scheduler.create(callback).delay(timeout)* which returns the scheduler instance.
    // 
    // This is the reason why there's no *repeated()* convenience method, because you'd have 
    // no way of controlling it once it starts.
    delayed: function(callback, timeout) {
      var task = Seeds.Scheduler.create(callback).delay(timeout).stop();
      return function() { task.reset(); };
    }
  };
  
  // Seeds.Permit
  // ============
  // Conditionally allow the execution of functions in your application.
  AppSeeds.Permit = {

    // Create an instance of *Seeds.Permit*.
    // 
    //  * **create(options)**
    //    * *options* a hash of options for the instance; available options:
    //      * *onAllow* callback for when a function was allowed to execute;
    //      * *onDisallow* callback for when a function was disallowed from executing;
    //      * *delegate* as an alternative to defining the two callbacks above directly 
    //        on the *Permit* object, you can define a delegate that implements those methods;
    //  * **create(evaluator, [thisArg])** convenience method to create a new *Permit* instance 
    //    and define the evaluator directly. Signature is identical to *Permit.evaluator*.
    create: function(options, thisArg) {

      var permit = Seeds.create(this._instanceMethods);

      Seeds.mixin(permit, {
        _functions: {}, 
        _evaluator: function(expr) { return expr; }, 
        _thisArg: this
      });
      
      // Extend the *Seeds.Permit* instance with the sent options.
      // Particularly useful for attaching delegate functions (see *Seeds.delegate*).
      if (typeof options === 'object' && !(options instanceof RegExp)) {
        Seeds.mixin(permit, options);
      } else if (typeof options !== 'undefined') {
        permit.evaluator(options, thisArg);
      }
      
      return permit;
    },

    // ### Seeds.Permit API
    _instanceMethods: {
      // This method matches the expression to the evaluator, to decide whether to allow the execution of the function.
      _isAllowed: function(expr) {
        if (typeof this._evaluator === 'string') {
          return expr === this._evaluator;
        } else if (typeof this._evaluator === 'function') {
          return this._evaluator.call(this._thisArg, expr);
        } else if (this._evaluator instanceof RegExp) {
          return this._evaluator.test(expr);
        }
        return false;
      },

      // Allow a function for a set of user roles.
      //
      //  * **allow(expr, originalFunction)**
      //    * *expr* expression to evaluate
      //    * *originalFunction* the function to protect
      //
      // Returns a protected version of the function, 
      // which can only be executed when the provided expression makes the evaluator return a truthy value (see *Permit.evaluator*).
      allow: function(expr, originalFunction) {
        var i, fId;
        if (typeof originalFunction === 'function') {
          for (i in this._functions) {
            if (this._functions.hasOwnProperty(i) && this._functions[i].func === originalFunction) {
              fId = i;
              break;
            }
          } 
          if (!fId) {
            this._functions[fId = AppSeeds.guid()] = { func: originalFunction, expr: expr };
          }
          var f = this._functions[fId], permit = this;
          f.locked = function() {
            if (permit._isAllowed(f.expr)) {
              /* allow */
              var ret = f.func.apply(this, arguments);
              Seeds.delegate(permit, 'onAllow', [f.locked].concat(Array.prototype.slice.call(arguments)));
              return ret;
            } else {
              /* disallow */
              Seeds.delegate(permit, 'onDisallow', [f.locked].concat(Array.prototype.slice.call(arguments)));
            }
          };
          return f.locked;
        }
        return null;
      },
      
      // Set the evaluator for the permit.
      //
      //  * **evaluator(ev, [thisArg])**
      //    * *ev* the evaluator; can be a function, string or regular expression;
      //    * *thisArg* (optional) if the evaluator is a function, you can also send a context for it.
      //
      // When the evaluator is a function, it will receive a single parameter: the expression to evaluate.
      // Return a truthy value if the expression passes and a falsy value otherwise.
      evaluator: function(ev, thisArg) {
        this._evaluator = ev;
        if (thisArg !== undefined) this._thisArg = thisArg;
        return this;
      }
    }
  };

  // Utility methods
  // ===============

  // *Seeds.delegate* implements the delegation pattern.
  // 
  //  * **delegate(obj, name, [arg1, ...[argN]])**
  //    * *obj* the object on which to apply the delegation
  //    * *name* the name of the function to delegate
  //    * *arg1...argN* the arguments to pass to the function
  //
  // The action will be triggered on *obj.delegate* if present, or *obj* itself otherwise.
  AppSeeds.delegate = function(obj, name) {
    var delegate = obj.delegate || obj;
    if (typeof delegate[name] === 'function') {
      return delegate[name].apply(this, Array.prototype.slice.call(arguments, 2));
    }
    return true;
  };
  
  // *Seeds.guid* generates random GUIDs (Global Unique IDs) for things.
  AppSeeds.guid = function() {
    var S4 = function() { return (((1+Math.random())*0x10000)|0).toString(16).substring(1); };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
  };
  
  // *Seeds.mixin* takes an arbitrary number of objects as arguments and mixes them into the first object.
  AppSeeds.mixin = function() {
    var obj = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      var ext = arguments[i];
      if (ext) {
        for (var j in ext) {
          if (ext.hasOwnProperty(j)) obj[j] = ext[j];
        }
      }
    }
    return obj;
  };

  // *Seeds.create* implements prototypal inheritance, as suggested in
  // [this article](http://javascript.crockford.com/prototypal.html) by Douglas Crockford.
  AppSeeds.create = function(o) {
    var C = function() {};
    C.prototype = o;
    return new C();
  };
  
})(this);
