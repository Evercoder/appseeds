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

  // Current version of the application, using [semantic versioning](http://semver.org/)
  AppSeeds.version = '0.6.0';

  // Polyfills, mostly for IE, around missing Array methods like [indexOf](https://gist.github.com/1034425)
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
  // ====
  AppSeeds.StateManager = AppSeeds.SM = {
    
    // Name of the root state
    root: 'root',
    
    // Current state. Should not be manually overwritten!
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
  
    // Creates a new instance of State Manager. Used as follows:
    // 
    // * **create(states)**
    //    * *states* one or more space-separated state names, or an array of such strings;
    //      convenience method for *StateManager.add(states)*
    // * **create(options)**
    //    * *options* a configuration object. Available options:
    //      * *init* a function to execute when we call stateManager.init()
    //      * *states* one or more space-separated state names, or an array of such strings;
    //      convenience method for *StateManager.add(states)*
    create: function(options) {
      var C = function() {};
      C.prototype = this;
      var stateManager = new C();

      stateManager.root = 'root';
      stateManager._states = {};
      stateManager._actions = {};
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
        stateManager._onInit = options.init;
        if (options.states) {
          stateManager.add(options.states);
        }
      }
      return stateManager;
    },
  
    // Initialize the state manager (optional, at this point).
    init: function() {
      if (this._isFunc(this._onInit)) this._onInit.call(this);
      return this;
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
  
    // Find the LCA (Lowest Common Ancestor) between two states.
    _lca: function(startState, endState) { 
      var exits = this._toRoot(startState), entries = this._toRoot(endState);
      for (var i = 0; i < exits.length; i++) {
        var idx = entries.indexOf(exits[i]);
        if (idx !== -1) {
          exits = exits.slice(0, i);
          entries = entries.slice(0, idx).reverse();
          break;
        }
      }
      return { exits: exits, entries: entries };
    },
  
    // Check if the argument is a function.
    _isFunc: function(f) {
      return typeof f === 'function';
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
      if (this.current !== stateName) {
        var states = this._lca(this.current, stateName);
        var i, action;
      
        /* exit to common ancestor */
        for (i = 0; i < states.exits.length; i++) {
          this.context = this.state(states.exits[i]).context;
          if (this._isFunc(this.context.exit)) {
            if (this.context.exit.call(this) === false) {
              /* TODO halt */
            }
          }
        }
      
        /* enter to desired state */
        for (i = 0; i < states.entries.length; i++) {
          this.context = this.state(states.entries[i]).context;
          if (this._isFunc(this.context.enter)) {
            if (this.context.enter.call(this) === false) {
              /* TODO halt */
            }
          }
        }

        this.current = stateName;
        
        var defaultSubstate = this.state(this.current).defaultSubstate;
        if (defaultSubstate) {
          /* go to default substate */
          this.go(defaultSubstate);
        } else {
          /* execute 'stay' */
          this.context = this.state(this.current).context;
          if (this._isFunc(this.context.stay)) {
            this.context.stay.call(this);
          }
        }

      }
      return this;
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
      // Don't forget to regenerate the context to current state 
      // after the recursive call ends.
      this.context = this._act(this.current, arguments);
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
      if (this._isFunc(action) && action.apply(this, Array.prototype.slice.call(args, 1)) === false) return;
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
            if (this._isFunc(actions)) {
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
  };

  // Seeds.PubSub
  // ============
  // Simple PubSub implementation.
  // Events can be namespaced like this: `namespace:event`
  AppSeeds.PubSub = AppSeeds.PS = {
  
    // Create a PubSub instance.
    // 
    //  * *options* a configuration object for the PubSub instance.
    create: function(options) {
      var C = function() {};
      C.prototype = this;
      var ps = new C();
      Seeds.extend(ps, options, {
        _pubsubEvents: {},
        _pubsubHappened: {}
      });
      return ps;
    },

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
  };

  // Seeds.Scheduler
  // ===============
  // Scheduler allows you to work with timed callbacks through a simple, clear API.
  AppSeeds.Scheduler = {
    
    // Create a scheduled task.
    //  
    //  *  **create(callback, thisArg, [arg1, [arg2 ... ])**
    //    * *callback* the task to schedule
    //    * *thisArg* (optional) context for the scheduled task
    //    * *arg1 ... argN* (optional) additional parameters to send to the task
    //
    // Returns a *StateManager.Scheduler* instance.
    create: function(callback, thisArg) {
      var C = function() {};
      C.prototype = this;
      var schedule = new C();
      Seeds.extend(schedule, {
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

    // Static convenience method to get a throttled version of a function,
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
  };
  
  // Seeds.Permit
  // ============
  // Conditionally allow the execution of functions in your application.
  AppSeeds.Permit = {

    // Create an instance of *Seeds.Permit*.
    // 
    //  * **create(options)**
    //    * *options* a hash of options for the instance; available options:
    //      * *didAllow* callback for when a function was allowed to execute;
    //      * *didDisallow* callback for when a function was disallowed from executing;
    //      * *delegate* as an alternative to defining the two callbacks above directly 
    //        on the *Permit* object, you can define a delegate that implements those methods;
    //  * **create(evaluator, [thisArg])** convenience method to create a new *Permit* instance 
    //    and define the evaluator directly. Signature is identical to *Permit.evaluator*.
    create: function(options, thisArg) {
      
      // Protect the private stuff.
      // The default evaluator is the identity function.
      var _functions = {}, _evaluator = function(expr) { return expr; }, _thisArg = this;

      // This method matches the expression to the evaluator, to decide whether to allow the execution of the function.
      var _isAllowed = function(expr) {
        if (typeof _evaluator === 'string') {
          return expr === _evaluator;
        } else if (typeof _evaluator === 'function') {
          return _evaluator.call(_thisArg, expr);
        } else if (_evaluator instanceof RegExp) {
          return _evaluator.test(expr);
        }
        return false;
      };

      var permit = {
        
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
            for (i in _functions) {
              if (_functions.hasOwnProperty(i) && _functions[i].func === originalFunction) {
                fId = i;
                break;
              }
            } 
            if (!fId) {
              _functions[fId = AppSeeds.guid()] = { func: originalFunction, expr: expr };
            }
            return function() {
              var f = _functions[fId];
              if (_isAllowed(f.expr)) {
                /* allow */
                Seeds.delegate.apply(permit, ['didAllow'].concat(Array.prototype.slice.call(arguments)));
                return f.func.apply(this, arguments);
              } else {
                /* disallow */
                Seeds.delegate.apply(permit, ['didDisallow'].concat(Array.prototype.slice.call(arguments)));
              }
            };
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
          _evaluator = ev;
          if (thisArg !== undefined) _thisArg = thisArg;
          return this;
        }
      };
      
      // Extend the *Seeds.Permit* instance with the sent options.
      // Particularly useful for attaching delegate functions (see *Seeds.delegate*).
      if (typeof options === 'object' && !(options instanceof RegExp)) {
        Seeds.extend(permit, options);
      } else {
        permit.evaluator(options, thisArg);
      }
      
      return permit;
    }
  };

  // Utility methods
  // ===============

  //  *Seeds.delegate* provides delegate support for all modules.
  AppSeeds.delegate = function() {
    var delegate = this.delegate || this;
    if (typeof delegate[arguments[0]] === 'function') {
      return delegate[arguments[0]].apply(this, Array.prototype.slice.call(arguments, 1));
    }
    return true;
  };
  
  // *Seeds.guid* generates random GUIDs (Global Unique IDs) for stuff.
  AppSeeds.guid = function() {
    var S4 = function() { return (((1+Math.random())*0x10000)|0).toString(16).substring(1); };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
  };
  
  // *Seeds.extend* takes an arbitrary number of objects and merges them together into the first object.
  AppSeeds.extend = function() {
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
  
})(this);
