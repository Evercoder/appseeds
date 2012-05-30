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

**.create()** 
Creates a new instance of StateManager.

* .create(statechartString)
* .create(statechartStringArray)
* .create(options)

**.add()** 
Adds states to the state chart.

* .add(statechartString) Add a series of states to the state chart. Various formats accepted:
** Single child state: *parentState -> childState* adds `childState` under `parentState` in the state chart.
** Multiple child states: *parentState -> childState1 childState2*
** Implied root state: *childState1 childState2* when ommited, the parent state is assumed to be the root state.
* .add(statechartStringArray) as a shortcut to the above, method allows an array of aforementioned `statechartString`

**.whenIn()** 
Define state-specific actions.

* *.whenIn(stateName, actions)* 
** stateName: string representing state name or a list of space-separated state names.
** actions: an object containing the functions to associate with the state(s)
* *.whenIn(actionsHash)* shortcut for declaring actions for multiple states; key is the state name(s), value is the object containing the actions for the state(s)

**.act(actionString)** 
Send an action to the state manager. There are two actions with special meaning:

* *enter()* specifies the behavior when the state manager transitions into the state
* *exit()* specifies the behavior when the state manager transitions away from the state 

**.goTo(stateNameString)** 
Transition to a state.

**.locate()** 
Returns the current state.

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

**.sub(topicString, method, [thisArg, [isOnce]])** 
subscribe to a topic. The method can optionally be tied to a context via the `thisArg` parameter. The `isOnce` boolean controls sub() vs. once() behavior.

**.unsub(topicString, method)** 
unsubscribe a function from a topic.

**.once(topicString, method, [thisArg])** 
same as sub(), except the method self-unsubscribes upon successful execution.
To signal an unsuccessful execution (and thus prevent the unubscription) return false from your method.

**.pub(topicString, [arg1, [arg2, ... [argN] ... ]])** 
publish a topic. Method can receive additional arguments to pass to the subscribers

---

## AppSeeds.Scheduler

Scheduler is a module for mananging timed events that provides a wrapper for `window.setTimeout` & `window.setInterval`, with handy methods to delay, repeat, reset and cancel events.

### Quick start guide

#### 1. Make a schedule

    var schedule = AppSeeds.Scheduler.create(function() {
      // do something
    });

**What happened:** The scheduler has created a task but it has not executed the function yet.

#### 2. Delay the execution

    schedule.delay(1000); // wait a sec, then run
    
**What happened:** The function was executed after a 1 second delay.

#### Extra credit: integrate with PubSub

    // instead of 
    ps.pub('event', arg1, arg2);
    
    // you can do this
    ps.schedule('event', arg1, arg2).delay(1000);
    
**What happened:** Instead of publishing the event right away, we schedule it to run after 1 second.

### API reference

**.create(callback, [args, [thisArg]])** create a scheduled task. Returns an instance of AppSeeds.Scheduler.

**.now()** Execute the scheduled task immediately.

**.delay(timeout)** Execute the scheduled task after a number of milliseconds. (Equivalent of window.setTimeout)

**.repeat(interval)** Execute the scheduled task repeatedly with an interval of x milliseconds. (Equivalent of window.setInterval)

**.reset()** Re-start the timers for the scheduled task, effectively postponing the task.

**.cancel()** Remove all timers for the scheduled task.


### Use cases

* Periodical auto-save mechanism
* Text box with delayed auto-search
