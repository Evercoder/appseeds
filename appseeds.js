/*globals console AppSeeds*/

/*
  TODO:
    - allow whenIn to take a hash of:
        stateString: { actions }
    - allow ASYNC behavior by returning false on enter / exit + StateManager.resume()
    - explore pattern of integration with jQuery:
    
      HTML: <a data-seed-action='actionName'>Label</a>  
      JS: $('[data-seed-action]').on('click', function(e) {
        stateManager.act($(this).data('seed-action'));
      });
      
    - change constructor to AppSeeds.StateManager.create()?
    - add method AppSeeds.StateManager.start(initialState)
    - deal with 'private' properties declared in whenIn() 
      that we probably want to be able to access from the normal actions.
*/

AppSeeds = {};

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
  
  create: function(options) {
    var C = function() {};
    C.prototype = this;
    var stateManager = new C();
    
    // init internals
    stateManager._allStates[stateManager.rootState] = {};
    stateManager._parentStates[stateManager.rootState] = null;
    stateManager._currentState = stateManager.rootState;
    
    options = options || {};
    if (options.init) stateManager._onInit = options.init;
    if (options.statechart) {
      stateManager.add(options.statechart);
    }
    return stateManager;
  },
  
  init: function() {
    if (this._isFunc(this._onInit)) this._onInit.call(this);
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
    var pairs = [];
    var tmp = str.split('->');
    if (tmp.length === 2) {
      var parentState = tmp[0].trim();
      var childStates = tmp[1].split(/\s+/);
      for (var i = 0; i < childStates.length; i++) {
        if (childStates[i]) pairs.push([parentState, childStates[i]]);
      }
    } else {
      console.warn('String ' + str + ' is an invalid state pair and has been dropped.');
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
          if (currentState.exit.call(this) === false) {
            // TODO halt
          }
        }
      }
      
      // enter to desired state
      for (i = 0; i < states.entries.length; i++) {
        currentState = this._allStates[states.entries[i]];
        if (typeof currentState.enter === 'function') {
          if (currentState.enter.call(this) === false) {
            // TODO halt
          }
        }
      }
      this._currentState = stateName;
      this._regenerateCurrentActions();
    }
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
    var actions = this._currentActions[arguments[0]] || [];
    for (var i = 0; i < actions.length; i++) {
      // break the chain on `return false;`
      if (actions[i].apply(this, Array.prototype.slice.call(arguments, 1)) === false) break; 
    }
  },
  
  /*
    Attach a set of actions for one or more states.
    Multiple declarations of the same action for a state will overwrite the existing one.
    
    @param stateString {String} a string representing a state name or a list of space-separated state names
    @actions actions to attach to the state(s)
  */
  whenIn: function(stateString, actions) {
    var i, states = stateString.split(/\s+/);
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
    this._regenerateCurrentActions();
  },
  
  /*
    Get the current state.
    @return {String} current state
  */
  locate: function() {
    return this._currentState;
  }
};

// TODO
AppSeeds.PubSub = {};
