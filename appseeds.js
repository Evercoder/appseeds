/*globals console AppSeeds*/

AppSeeds = {};

AppSeeds.Rhizome = function(rootState) {
  
  rootState = rootState || 'root';

  var _currentState = rootState;
  var _currentActions = {}; // current set of actions
  var _allStates = {}; // the list of all state names
  _allStates[rootState] = {};
  
  var _parentStates = {}; // the tree structure
  _parentStates[rootState] = null;
  
  function _toRoot(stateName) {
    var route = [];
    while(stateName) {
      route.push(stateName);
      stateName = _parentStates[stateName];
    }
    return route;
  }
  
  // returns two lists of states states to go from startState to endState through LCA
  function _lca(startState, endState) {
    
    var exits = _toRoot(startState);
    var entries = _toRoot(endState);
    
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
  
  this.go = function(stateName) {
    var state = _allStates[stateName];
    if (state === undefined) {
      console.error('State ' + stateName + ' not defined');
      return;
    }
    if (_currentState !== stateName) {
      var states = _lca(_currentState, stateName);
      var i, action, currentState;
      
      // exit to common ancestor
      for (i = 0; i < states.exits.length; i++) {
        currentState = _allStates[states.exits[i]];
        if (typeof currentState.exit === 'function') {
          currentState.exit();
        }
        for (action in currentState) {
          if (currentState.hasOwnProperty(action) && ['enter', 'exit'].indexOf(action) === -1) {
            if (_currentActions[action]) {
              var idx = _currentActions[action].indexOf(currentState[action]);
              if (idx !== -1) {
                _currentActions[action].splice(idx, 1);
              }
            }
          }
        }
      }
      
      // enter to desired state
      for (i = 0; i < states.entries.length; i++) {
        currentState = _allStates[states.entries[i]];
        if (typeof currentState.enter === 'function') {
          currentState.enter();
        }
        for (action in currentState) {
          if (currentState.hasOwnProperty(action) && ['enter', 'exit'].indexOf(action) === -1) {
            if (!_currentActions[action]) _currentActions[action] = [];
            _currentActions[action] = [currentState[action]].concat(_currentActions[action]);
          }
        }
      }
      _currentState = stateName;
    }
  };
  
  this.add = function(parentState, childState, options) {
    if (!_allStates[parentState]) {
      console.error('State ' + parentState + ' is not included in the tree');
      return;
    }
    if (_allStates[childState]) {
      console.error('State ' + childState + ' is already defined. Choose a different state name.');
      return;
    }
    _allStates[childState] = options || {};
    _parentStates[childState] = parentState;
  };
  
  this.action = function() {
    var actions = _currentActions[arguments[0]] || [];
    for (var i = 0; i < actions.length; i++) {
      var action = actions[i];
      if (typeof action === 'function') {
        var actionArguments = Array.prototype.slice.call(arguments, 1);
        var ret = action.apply(this, actionArguments);
        if (ret) break; // break the action chain the first return true;
      }
    }
  };
  
  this.map = function() {
    var childStates = {};
    for (var i in _parentStates) {
      var parent = _parentStates[i];
      if (parent) {
        if (!childStates[parent]) childStates[parent] = [];
        childStates[parent].push(i);
      }
    }
    console.log(childStates);
  };
  
  this.locate = function() {
    return _currentState;
  };
};