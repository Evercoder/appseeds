//     AppSeeds (c) 2012 Dan Burzo
//     AppSeeds can be freely distributed under the MIT license.
// Elegant JavaScript components for modern web applications. Made by [@danburzo](https://twitter.com/danburzo).
//
// Fork & contribute at [github.com/danburzo/appseeds](https://github.com/danburzo/appseeds). 
//
// Download [zip](https://github.com/danburzo/appseeds/zipball/master), [tar](https://github.com/danburzo/appseeds/tarball/master). 
//
// The guiding principles were: speed, terseness and progressive disclosure.
//
// API / Annotated source code
// ===========================
//
// What you're seeing below is the annotated source code slash makeshift API reference for AppSeeds.
// It was automatically generated with [docco](http://jashkenas.github.com/docco/). Here goes:

// Encapsulate the library to protect global scope.
/*global exports, define, require, console*/
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
  Seeds.version = '0.7.0';

  // Polyfills, mostly for IE, around missing Array methods.
  if(!Array.isArray) {
    Array.isArray = function (vArg) { return Object.prototype.toString.call(vArg) === "[object Array]"; };
  }

  // Seeds.PubSub
  // ============
  // Alias: *Seeds.PS*
  // 
  // Simple Publish/Subscribe implementation for the Mediator pattern.
  // It supports namespaced events like: `namespace:event`.
  Seeds.PubSub = Seeds.PS = {
  
    // Create a PubSub instance.
    // 
    //  * *options* a configuration object for the PubSub instance.
    create: function(options) {
      var ps = Seeds.o.beget(this._instanceMethods);
      Seeds.o.mixin(ps, options, {
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
        var events = [], str = '', ch, i;
        for (i = 0; i < event.length; i++) {
          if ((ch = event.charAt(i)) === ':') {
            events.push(str);
          }
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
          if (flags.recoup) {
            oldArgs = this._pubsubHappened[event];
            if (oldArgs) {
              method.apply(thisArg || this, oldArgs);
            }
          }
        }
        return this;
      },

      // Unsubscribe a function from one or more events.
      //
      //  * **unsub(eventString, method)**
      //    * *eventString* one or more space-separated events;
      //    * *method* (optional) the function to unsubscribe
      //
      // If no *method* is provided, all attached methods will be unsubscribed from the event(s).
      unsub: function(eventStr, method) {
        var events = eventStr.split(/\s+/), event, eventArray, newEventArray, i, j;
        for (i = 0; i < events.length; i++) {
          eventArray = this._pubsubEvents[event = events[i]];
          newEventArray = [];
          for (j = 0; method && j < eventArray.length; j++) {
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
      
      // Schedule an event to publish, using *Seeds.Lambda*. 
      // 
      // * **schedule(eventString, [arg1, ... [argN]])** identical to *PubSub.pub()*.
      //
      // While pub() publishes an event immediately, schedule() returns a scheduled task 
      // which you need to trigger by using `now()`, `delay()` etc.
      schedule: function() {
        if (!Seeds.Lambda) {
          return null;
        }
        return Seeds.Lambda.create.apply(
          Seeds.Lambda, 
          [this.pub, this].concat(Array.prototype.slice.call(arguments))
        );
      }
    },

    // #### PubSub Constants
    PUBLIC_API: ['pub', 'sub', 'unsub', 'once', 'recoup']
  };

  // Seeds.StateManager
  // ==================
  // Alias: *Seeds.SM*
  //
  // *StateManager* implements a hierarchical state chart closely aligned with David Harel's definition 
  // from hi seminal paper *Statecharts: A Visual Formalism For Complex Systems*.
  // 
  // Using a state chart to organize your application helps your modules react to state-specific events 
  // in a clear, maintainable way.
  Seeds.StateManager = Seeds.SM = {
    
    // Creates a new instance of State Manager. Used as follows:
    // 
    // * **create(states)**
    //    * *states* (optional) one or more space-separated state names, or an array of such strings;
    //      convenience method for *StateManager.add(states)*
    create: function(options) {

      var stateManager = Seeds.o.beget(this._instanceMethods);
      
      // Mix in a *Seeds.PubSub* instance to use in dispatching events.
      var pubsub = Seeds.o.facade(Seeds.PS.create(), Seeds.PS.PUBLIC_API, stateManager);

      Seeds.o.mixin(stateManager, pubsub, {
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
      
      //  Get/set information about a state.
      //
      //  * *stateName* name of the state
      //  * *val* (optional) object to set as new value for state
      //
      // Returns the state object.
      state: function(stateName, val) {
        if (val !== undefined) {
          this._states[stateName] = val;
        }
        return this._states[stateName];
      },
      
      //  Gets the substates for a state.
      //
      //  * *stateName* name of the state
      // 
      // Returns an array containing the names of the child states.
      children: function(stateName) {
        var substates = [], i;
        for (i in this._states) {
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
        var exits = this._toRoot(startState), entries = this._toRoot(endState), lca, idx, i, j;
        for (i = 0; i < exits.length; i++) {
          idx = -1;
          for (j = 0; j < entries.length; j++) {
            if (entries[j] === exits[i]) {
              idx = j;
              break;
            }
          }
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
            this.pub('error', 'String ' + str + ' is an invalid state pair and has been dropped.');
            childStates = [];
            break;
        }
        var pairs = [], childState, defaultSubstateRegex = /^!/, i;
        for (i = 0; i < childStates.length; i++) {
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
      // Attempting to transition to an inexistent state does nothing and publishes a warning.
      // Likewise, attempting to transition to the same state as the current one will do nothing.
      // 
      //  * **go(stateName, [arg1, [arg2 &hellip; argN]])** 
      //    * *stateName* the name of the state to which to transition;
      //    * (optional) any number of additional parameters.
      //
      // The additional parameters will be sent as arguments to the *stay* method of the destination state.
      go: function(stateName) {
        var state = this.state(stateName),
            args = Array.prototype.slice.call(arguments, 1) || [];
        if (state === undefined) {
          this.pub('error', 'State ' + stateName + ' not defined');
          return;
        }
        if (this.current !== stateName && this._status === Seeds.SM.STATUS_READY) {
          var states = this._lca(this.current, stateName);
          args.unshift(states);
          this._walk.apply(this, args);
        }
        return this;
      },

      _walk: function(states) {
        var i, action, args = Array.prototype.slice.call(arguments, 1);
        this._status = Seeds.SM.STATUS_TRANSITIONING;

        /* exit to common ancestor */
        for (i = 0; i < states.exits.length; i++) {
          this.current = states.exits[i];
          this.context = this.state(states.exits[i]).context;
          if (typeof this.context.exit === 'function') {
            if (this.context.exit.call(this) === Seeds.SM.ASYNC) {
              this._status = Seeds.SM.STATUS_ASYNC;
              this._queue = { exits: states.exits.slice(i+1), entries: states.entries, lca: states.lca, args: args };
              return this;
            }
          }
          this.pub('exit', this.current);
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
              this._queue = { exits: [], entries: states.entries.slice(i+1), lca: states.entries[i], args: args };
              return this;
            }
          }
          this.pub('enter', this.current);
        }

        this._status = Seeds.SM.STATUS_READY;

        var defaultSubstate = this.state(this.current).defaultSubstate;
        if (defaultSubstate) {
          /* go to default substate */
          args.unshift(defaultSubstate);
          this.go.apply(this, args);
        } else {
          /* execute 'stay' */
          if (typeof this.context.stay === 'function') {
            this.context.stay.apply(this, args);
          }
          args.unshift('stay', this.current);
          this.pub.apply(this, args);
        }
      },

      resume: function() {
        var args = this._queue.args;
        delete this._queue.args;

        if (this._status === Seeds.SM.STATUS_ASYNC) {
          args.unshift(this._queue);
          this._walk.apply(this, args);
        } else {
          this.pub('error', 'State manager is not paused.');
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
                this.pub('error', 'State ' + parentState + 
                  ' is not included in the tree. State not added.');
                return;
              }
              if (this.state(childState)) {
                this.pub('error', 'State ' + childState + 
                  ' is already defined. New state not added.');
              }
              this.state(childState, { 
                context: {}, 
                defaultSubstate: null,
                parent: parentState
              });
              if (isDefaultSubstate) {
                if (this.state(parentState).defaultSubstate) {
                  this.pub('error', 'State ' + parentState + 
                    ' already has a default substate ' + this.state(parentState).defaultSubstate  + 
                    '. It will be overwritten with ' + childState);
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
      act: function(actionName) {
        if (this._status !== Seeds.SM.ASYNC) {
          // Don't forget to regenerate the context to current state 
          // after the recursive call ends.
          var originalContext = this.context;
          this._act(this.current, arguments);
          this.context = originalContext;
        } else {
          this.pub('error', 'State manager is paused, can\'t perform action ' + actionName);
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
          this.pub('act', args[0], state);
          if (ret === false) {
            return;
          }
        }
        var parentState = this.state(state).parent;
        if (parentState) {
          this._act(parentState, args);
        }
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
                this.pub('error', 'State ' + stateName + ' doesn\'t exist. Actions not added.');
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
              
              if (!state.context) {
                state.context = {};
              }
              
              for (i in actions) {
                if (actions.hasOwnProperty(i)) {
                  state.context[i] = actions[i];
                }
              }
            }
          }
        }
        return this;
      }
    }
  };

  // Seeds.Lambda
  // ============
  // *Lambda* supercharges your functions, providing a clear API for delaying, repeating, and limiting their execution.
  Seeds.Lambda = {

    // Create a task.
    //  
    //  *  **create(callback, thisArg, [arg1, [arg2 ... ])**
    //    * *callback* the function to schedule;
    //    * *thisArg* (optional) context for the function;
    //    * *arg1 ... argN* (optional) additional parameters to send to the function.
    //
    // Returns a *StateManager.Lambda* task. Can also be invoked as *Seeds.f()*, for convenience.
    create: function(callback, thisArg) {
      var f = function() {
        return f.reset.apply(f, arguments);
      };
      Seeds.o.mixin(f, this._instanceMethods, {
        callback: callback,
        args: Array.prototype.slice.call(arguments, 2),
        thisArg: thisArg || this,
        limit: null,
        _lastCalled: null,
        _timerId: null,
        period: null,
        type: null
      });
      return f;
    },

    // ### Seeds.Lambda API
    _instanceMethods: {

      // Execute the task immediately. If the task is throttled (see *Lambda.throttle()*),
      // it will not be executed with higher frequency than the one imposed by the throttle limit. 
      // 
      // If you provide parameters to this call, they will override the ones declared on *create()*.
      run: function() {
        var now = (new Date()).getTime();
        if (!this.limit || !this._lastCalled || (now - this._lastCalled > this.limit)) {
          this.callback.apply(this.thisArg, arguments.length ? arguments : this.args);
          this._lastCalled = now;
        }
        return this;
      },

      // Stop the scheduled task.
      stop: function() {
        if (this._timerId) {
          if (this.type === 'delay') {
            window.clearTimeout(this._timerId);
          } else if (this.type === 'interval') {
            window.clearInterval(this._timerId);
          }
        }
        return this;
      },

      // Reset the timer of the schedule task, effectively postponing its execution.
      reset: function() {
        this.stop();
        var that = this, f = function() { that.run(); };
        if (this.type === 'delay') {
          this._timerId = window.setTimeout(f, this.period);
        } else if (this.type === 'interval') {
          this._timerId = window.setInterval(f, this.period);
        } else {
          this.run.apply(this, arguments);
        }
        return this;
      },

      // Delay task execution with a number of milliseconds.
      // 
      //  * **delay(timeout)**
      //    * *timeout* delay of execution, in milliseconds.
      delay: function(timeout) {
        this.type = 'delay';
        this.period = timeout;
        return this;
      },

      // Like *delay*, but also starts the timer.
      delayed: function(timeout) {
        return this.delay(timeout).reset();
      },

      // Repeat the execution of the task at a fixed interval.
      // 
      //  * **repeat(interval)**
      //    * *interval* the execution interval
      repeat: function(interval) {
        this.type = 'interval';
        this.period = interval;
        return this;
      },

      // Like *repeat*, but also starts the timer.
      repeated: function(interval) {
        return this.repeat(interval).reset();
      },

      // Limit the execution frequency of a task.
      //
      //  * **throttle(limit)**
      //    * *limit* the maximum frequency of execution, in milliseconds.
      //      send `0` or `null` to cancel the throttling.
      throttle: function(limit) {
        this.limit = limit;
        return this;
      }
    }
  };

  // Utility methods
  // ===============
  
  // ## Seeds.o 
  // *Seeds.o* implements useful methods for object manipulation.
  Seeds.o = {
    // *guid* generates random GUIDs (Global Unique IDs) for things.
    guid: function() {
      var S4 = function() { return (((1+Math.random())*0x10000)|0).toString(16).substring(1); };
      return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    },

    // *mixin* takes an arbitrary number of objects as arguments and mixes them into the first object.
    mixin: function(obj) {
      var i, j;
      for (i = 1; i < arguments.length; i++) {
        var ext = arguments[i];
        if (ext) {
          for (j in ext) {
            if (ext.hasOwnProperty(j)) {
              obj[j] = ext[j];
            }
          }
        }
      }
      return obj;
    },

    // *beget* implements prototypal inheritance, as suggested in
    // [this article](http://javascript.crockford.com/prototypal.html) by Douglas Crockford.
    beget: function(o) {
      var C = function() {};
      C.prototype = o;
      return new C();
    },

    // *facade* returns a facade for a source object containing the desired subset of methods.
    //
    //  * **facade(sourceObj, api, destObj)**
    //    * *sourceObj* the source object containing the methods;
    //    * *api* a mapping for the methods to include in the facade:
    //      * if it's an array, the facade method names will have the same name 
    //        as the ones in the source object;
    //      * if it's a hash, the key will be the method name from the source object
    //        and the value will be the name to use in the facade;
    //    * *destObj* (optional) the destination object to which to bind the methods;
    //      if ommited, the methods will be re-bound to the facade itself.
    facade: function(sourceObj, api, destObj) {
      var facade = {}, i;
      if (Array.isArray(api)) {
        for (i = 0; i < api.length; i++) {
          facade[api[i]] = Seeds.o.bind(sourceObj, api[i], destObj || facade);
        }
      } else if (typeof api === 'object') {
        for (i in api) {
          if (api.hasOwnProperty(i)) {
            facade[api[i]] = Seeds.o.bind(sourceObj, i, destObj || facade);
          }
        }
      }
      return facade;
    },

    // *bind* implements functionality similar to *Function.bind*
    // in that it attaches a method to a different context.
    //
    //  * **bind(sourceObj, methodName, destObj)**
    //    * *sourceObj* the original object where the method was defined;
    //    * *methodName* the name of the property to bind;
    //    * *destObj* destination object to which to bind the function.
    // 
    // In addition to the usual bind behavior, *bind* detects method chaining
    // and keeps it intact with the new context.
    bind: function(sourceObj, methodName, destObj) {
      return function() {
        var ret = sourceObj[methodName].apply(sourceObj, arguments);
        /* detect method chaining */
        return ret === sourceObj ? destObj : ret;
      };
    }
  };

  // ## Seeds.f
  // Use this as an alias for *Seeds.Lambda.create*.
  Seeds.f = function() {
    return Seeds.Lambda.create.apply(Seeds.Lambda, arguments);
  };
}(this));
