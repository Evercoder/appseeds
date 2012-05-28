AppSeeds is the utility-belt toolkit for modern JavaScript applications.

## AppSeeds.StateManager

Library-agnostic state manager for your schemes & machinations.

### Quick start guide

#### 1. Create your state manager

    var stateManager = AppSeeds.StateManager.create();
    
**What happened:** `stateManager` is ready to manage your application states. For now it has an single empty state called `root` with no actions.

#### 2. Add your states

    stateManager.add([
      'root -> loggedIn loggedOut', // the root state has two sub-states
      'loggedIn -> home users profile settings' // `loggedIn` state has four sub-states
    ]);
    
**What happpened:** We defined the state hierarchy for our application.
  
#### 3. Add your state-specific actions

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

#### 4. Your first state transition

    $(document).ready(function() {
      stateManager.goTo('loggedOut');
    });
    
**What happened:** When we loaded our application (in the above case, on DOM ready) we transitioned to the `loggedOut` state, our starting point in the application. Since we defined an `enter` action for this state, the login dialog pops up.
  
#### 4. Make your app do things

    stateManager.act('logIn'); // will call the `logIn` action
  
**What happened:** We invoked a state-specific action. This will look into the tree for actions with the specified name, starting from the current state and up to the root state, executing each. In our case, `logIn` is only defined in the `loggedOut` state, with the effect of transitioning to the `loggedIn` state. Consequently the login dialog is hidden and the app interface is displayed, courtesy of our `enter`/`exit` actions.

### API reference

**.create()** creates a new instance of the state manager.

* .create(statechartString)
* .create(statechartStringArray)
* .create(options)

**.add()** adds states to the state chart.

* .add(statechartString)
* .add(statechartStringArray)

**.whenIn()** define state-specific actions.

* .whenIn(stateName, actions)
* .whenIn(actionsHash)

**.act(actionString)** send an action to the state manager.

**.goTo(stateNameString)** transition to a state.

**.locate()** returns the current state.

---

## AppSeeds.PubSub

PubSub allows you application components to talk to each other through well-established channels, loosening that tight coupling.

### Quick start guide

#### 1. Create your message dispatcher

    var ps = AppSeeds.PubSub.create();

**What happened:** We instantiated PubSub. `ps` is ready to dispatch events.

#### 2. Subscribe to an event
  
    ps.sub('mail_received', function(title, sender) {
      console.log('you received a message from ' + sender + ' with the title ' + title);
    });

**What happened:** We created a subscriber for the `mail_received` event.

#### 3. Publish an event

    ps.pub('mail_received', 'Check out this GIF!', 'Dan');

**What happened:** We published the `mail_received` event, and the subscriber defined earlier was notified.

#### Extra credit: namespaced events
    
    ps.sub('mail', function() { console.log('caught a mail event!'); });
    ps.sub('mail:received', function(title, sender) { /* see previous step */ });
    ps.sub('mail:sent', function(title, recipient) { /* do something */ });

    ps.pub('mail:sent', 'Dan, that was hilarious!', 'Dan');

**What happened:** You created three subscribers. The first of them will be notified of any event within the `mail` namespace, while the other two subscribe to specific events within the namespace. Finally, the published event will be caught by the first and the third subscribers.


### API reference

**.create()** create a new instance of PubSub.

**.sub(topicString, method, [thisArg, [isOnce]])** subscribe to a topic. The method can optionally be tied to a context via the `thisArg` parameter. The `isOnce` boolean controls sub() vs. once() behavior.

**.unsub(topicString, method)** unsubscribe a function from a topic.

**.once(topicString, method, [thisArg]) ** same as sub(), except the method self-unsubscribes upon successful execution.
To signal an unsuccessful execution (and thus prevent the unubscription) return false from your method.

**.pub(topicString, [arg1, [arg2, ... [argN] ... ]])** publish a topic. Method can receive additional arguments to pass to the subscribers

---

## AppSeeds.util

Coming soon!