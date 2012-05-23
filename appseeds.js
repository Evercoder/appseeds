/*globals console AppSeeds*/

AppSeeds = {};

/*
  Constructor method for State Manager.
  Usage: App.stateManager = new AppSeeds.Rhizome();
  
  @param rootState {String} (Optional) a name for the root state; default is 'root'.
*/
AppSeeds.Rhizome = function(rootState) {
  
  rootState = rootState || 'root';

  // current state of the manager
  var _currentState = rootState;
  
  // current set of actions. key is action name, value is an array of functions.
  var _currentActions = {};
  
  // the set of all states with their actions
  var _allStates = {};
  _allStates[rootState] = {};
  
  // the state tree; key is state name, value is name of parent state.
  var _parentStates = {};
  _parentStates[rootState] = null;
  
  // we don't add these to _currentActions, invoked separately on state transitions
  var _reservedMethods = ['enter', 'exit'];
  
  // traces path from current state to root state
  function _toRoot(stateName) {
    var route = [];
    while(stateName) {
      route.push(stateName);
      stateName = _parentStates[stateName];
    }
    return route;
  }
  
  // finds LCA (Lowest Common Ancestors) between two states
  function _lca(startState, endState) { 
    var exits = _toRoot(startState), entries = _toRoot(endState);
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
  }
  
  // check if argument is a function
  function _isFunc(f) {
    return typeof f === 'function';
  }
  
  /*
    Transition to a new state in the manager.
    Attempting to transition to an inexistent state does nothing (and logs a warning)
    Attempting to transition to the same state as the current one will again do nothing.
    
    @param stateName {String} the name of the state to which to transition.
  */
  this.go = function(stateName) {
    var state = _allStates[stateName];
    if (state === undefined) {
      console.warn('State ' + stateName + ' not defined');
      return;
    }
    if (_currentState !== stateName) {
      var states = _lca(_currentState, stateName);
      var i, action, currentState;
      
      // exit to common ancestor
      for (i = 0; i < states.exits.length; i++) {
        currentState = _allStates[states.exits[i]];
        if (_isFunc(currentState.exit)) currentState.exit.call(this);
        for (action in currentState) {
          if (currentState.hasOwnProperty(action) && _isFunc(currentState[action]) && _reservedMethods.indexOf(action) === -1) {
            if (_currentActions[action]) {
              var idx = _currentActions[action].indexOf(currentState[action]);
              if (idx !== -1) _currentActions[action].splice(idx, 1);
            }
          }
        }
      }
      
      // enter to desired state
      for (i = 0; i < states.entries.length; i++) {
        currentState = _allStates[states.entries[i]];
        if (typeof currentState.enter === 'function') currentState.enter.call(this);
        for (action in currentState) {
          if (currentState.hasOwnProperty(action) && _isFunc(currentState[action]) && _reservedMethods.indexOf(action) === -1) {
            if (!_currentActions[action]) _currentActions[action] = [];
            _currentActions[action] = [currentState[action]].concat(_currentActions[action]);
          }
        }
      }
      _currentState = stateName;
    }
  };
  
  /*
    Add a state to the manager.
    All state names need to be unique.
    Attempting to add a state with an existing name will show a warning and the state will not be added.
    Attempting to add a state to an inexisting parent will show a warning and the state will not be added.
    
    Usage:
    
    A.  add(parentState, childState, [options])
    B.  add(parentState, {
          childState1: options1,
          childState2: options2,
          ....
          childStateN: optionN
        });
    
    @param parentState {String} the name of the parent state
    @param childState {String} the name of the state to add
    @param options {Object} the hash of actions for the state
  */
  this.add = function(parentState, childState, options) {
    if (!_allStates[parentState]) {
      console.warn('State ' + parentState + ' is not included in the tree. State not added.');
      return;
    }
    if (typeof childState === 'object') {
      for (var state in childState) this.add(parentState, state, childState[state]);
    } else {
      if (_allStates[childState]) {
        console.warn('State ' + childState + ' is already defined. State not added.');
        return;
      }
      _allStates[childState] = options || {};
      _parentStates[childState] = parentState;
    }
  };
  
  /*
    Perform an action within the state manager.
    The manager will go through the entire state chain, starting from the current state
    and up to the root, for matching actions.
    
    You can break the chain by returning false in an action.
    
    Usage: action(actionName, [arg1, [arg2, ..., argN]]);
    
    @param actionName {String} the name of the action
    @param arg1 ... argN (optional) additional parameters to send to the action
  */
  this.action = function() {
    var actions = _currentActions[arguments[0]] || [];
    for (var i = 0; i < actions.length; i++) {
      // break the chain on `return false;`
      if (actions[i].apply(this, Array.prototype.slice.call(arguments, 1)) === false) break; 
    }
  };
  
  /*
    Get the current state.
    @return {String} current state
  */
  this.locate = function() {
    return _currentState;
  };
};
