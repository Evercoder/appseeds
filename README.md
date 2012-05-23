AppSeeds, the utility-belt toolkit for your JavaScript application
========

## AppSeeds.StateManager

Library-agnostic state manager for your schemes & machinations.

### Quick start guide

#### 1. Create your state manager
`var stateManager = new AppSeeds.StateManager();`

#### 2. Add your states

  stateManager.add([
    'root -> loggedIn loggedOut', // the root state has two sub-states
    'loggedIn -> home users profile settings' // the `loggedIn` state has four sub-states
  ]);
  
  stateManager.goTo('loggedOut'); // this will be our initial state
  
### 3. Add your state-specific actions

  stateManger.whenIn('loggedOut', {
    logIn: function() {
      this.goTo('loggedIn'); // transition to state `loggedIn`
    }
  });

  stateManager.whenIn('loggedIn', {
    logOut: function() {
      this.goTo('loggedOut'); // transition to state `loggedOut`
    }
  });
  
### 4. Make your app do things

  stateManager.act('logIn'); // will call the `logIn` action
  
