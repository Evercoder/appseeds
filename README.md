AppSeeds is the utility-belt toolkit for modern JavaScript applications.

## AppSeeds.StateManager

Library-agnostic state manager for your schemes & machinations.

### Quick start guide

#### 1. Create your state manager

    var stateManager = new AppSeeds.StateManager();
    
**What happened:** `stateManager`, as the name implies, is ready to manage your application states. For now it has an single empty state called `root` with no actions.

#### 2. Add your states

    stateManager.add([
      'root -> loggedIn loggedOut', // the root state has two sub-states
      'loggedIn -> home users profile settings' // `loggedIn` state has four sub-states
    ]);
    
**What happpened:** We defined the state hierarchy for our application.
  
### 3. Add your state-specific actions

    stateManger.whenIn('loggedOut', {
      enter: function() {
        // show login dialog
      },
      exit: function() {
        // hide login dialog
      },
      logIn: function() {
        this.goTo('loggedIn'); // transition to state `loggedIn`
      }
    });

    stateManager.whenIn('loggedIn', {
      enter: function() {
        // show main application interface
      },
      exit: function() {
        // hide main application interface
      },
      logOut: function() {
        this.goTo('loggedOut'); // transition to state `loggedOut`
      }
    });
  
**What happened:** Two things, actually: firstly, we defined the reserved `enter` and `exit` methods, which dictate what happens when the application transitions to the state / away from the state; secondly, we specified some state-specific methods that will only be available when the application is in that state. This makes the application more robust since we're essentially making sure that methods are executed in their intended context.

### 4. Your first state transition

    $(document).ready(function() {
      stateManager.goTo('loggedOut');
    });
    
**What happened:** When we loaded our application (in the above case, on DOM ready) we transitioned to the `loggedOut` state, our starting point in the application. Since we defined an `enter` action for this state, the login dialog pops up.
  
### 4. Make your app do things

    stateManager.act('logIn'); // will call the `logIn` action
  
**What happened:** We invoked a state-specific action. This will look into the tree for actions with the specified name, starting from the current state and up to the root state, executing each. In our case, `logIn` is only defined in the `loggedOut` state, with the effect of transitioning to the `loggedIn` state. Consequently the login dialog is hidden and the app interface is displayed, courtesy of our `enter`/`exit` actions.

## AppSeeds.PubSub

Coming soon...