/*globals test asyncTest expect ok strictEqual stop start AppSeeds Seeds*/

module('AppSeeds');

test('StateManager implied root state', function() {
	var sm = AppSeeds.StateManager.create('state1 state2');
	sm.goTo('state1');
	strictEqual(sm.locate(), 'state1', 'state navigation');
	sm.goTo('state2');
	strictEqual(sm.locate(), 'state2', 'state navigation');
	strictEqual(sm._parentStates['state1'], 'root', 'implied root');
	strictEqual(sm._parentStates['state2'], 'root', 'implied root');
});

test("State manager stay() method", function() {
  expect(3);
  var sm = AppSeeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> state11 state12',
    'state2 -> state21 state22',
    'state11 -> state111 state 112'
  ]);

  sm.when('state1', {
    stay: function() {
      ok('here!', 'state1.stay()');
    }
  });

  sm.goTo('state1');

  // go to destination via descendant state
  sm.goTo('state2').goTo('state111').goTo('state1');
  
  // go to destination via ancestor state
  sm.goTo('root').goTo('state1');
});

test("StateManager stay() to define default substate", function() {
  expect(2);
  var sm = AppSeeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> state11 state12',
    'state2 -> state21 state22',
    'state11 -> state111 state112'
  ]);
  sm.when('state1', {
    stay: function() { this.goTo('state111'); }
  });

  sm.when('state11', {
    stay: function() {
      ok('here!', 'state11.stay()');
    }
  });
  sm.when('state111', {
    stay: function() {
      ok('here!', 'state111.stay()');
    }
  });

  sm.goTo('state1');
  strictEqual(sm.locate(), 'state111', 'transitioned to state111');
  sm.goTo('root');
});

test("StateManager: defaultSubstate", function() {
  expect(1);
  var sm = AppSeeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> !state11 state12',
    'state2 -> state21 state22',
    'state11 -> !state111 state112'
  ]);

  sm.goTo('state1');
  strictEqual(sm.locate(), 'state111', 'transitioned to state111');
});

test("StateManager: overwrite defaultSubstate", function() {
  expect(1);
  var sm = AppSeeds.StateManager.create();
  sm.add([
    'state1 state2',
    'state1 -> !state11',
    'state1 -> !state12',
    'state12 -> !state121 state122',
    'state11 -> !state111 state112'
  ]);

  sm.goTo('state1');
  strictEqual(sm.locate(), 'state121', 'transitioned to state121');
});

test("StateManager: defaultSubstate for root", function() {
  expect(1);
  var sm = AppSeeds.StateManager.create();
  sm.add('state1 !state2');
  sm.goTo('state1').goTo('root');

  strictEqual(sm.locate(), 'state2', 'transitioned to state2');
});

test("StateManager: when(string, function) interpreted as stay() function", function() {
  expect(1);
  var sm = Seeds.StateManager.create('state1 state2 state3');
  sm.add('state1 -> state11 state12 state13');
  sm.add('state11 -> state111 state112 state113');
  
  sm.when('state11', function() {
    ok('here!', 'im in state11');
  });
  sm.goTo('state111');
  sm.goTo('state1');
  sm.goTo('state11');
});

test('PubSub basic use case', function() {
	expect(2);
	var ps = AppSeeds.PubSub.create();
	ps.sub('topic', function() {
		ok('here!', 'single subscriber');
	});
	ps.pub('topic');
	var count = 0;
	ps.sub('topic2', function() { count++; });
	ps.sub('topic2', function() { count++; });
	ps.sub('topic2', function() { count++; });
	ps.sub('topic3', function() { count++; });
	ps.pub('topic2');
	strictEqual(count, 3, 'multiple subscribers');
});

test('PubSub once()', function() {
  expect(7);
  var ps = AppSeeds.PubSub.create(), ran = 0;
  ps.sub('topic', function() {
    ok('here!', 'im a recurring subscriber');
  })
  .once('topic', function() {
    ok('here!', 'im a one-time subscriber');
  })
  .once('topic', function() {
    ok('here!', 'im a two-time subscriber');
    if (++ran < 2) return false;
  })
  .pub('topic')
  .pub('topic')
  .pub('topic')
  .pub('topic');
});

test('PubSub: sub() to multiple events, once() to multiple events', function() {
  expect(9);
  var ps = AppSeeds.PubSub.create();
  ps.sub('topic1 topic2 topic3', function() {
    ok('here!', 'im a subscriber');
  });
  ps.once('topic1 topic2 topic3', function() {
    ok('here!', 'im a subscriber');
  });
  ps.pub('topic1').pub('topic2').pub('topic3');
  ps.pub('topic1').pub('topic2').pub('topic3');
});

test('PubSub: namespaced events', function() {
  expect(2);
  var ps = AppSeeds.PubSub.create();
  ps.sub('namespace:topic1', function() {
    ok('here!', 'subscriber to topic1 in namespace');
  });
  ps.sub('namespace:topic2', function() {
    ok('here!', 'subscriber to topic2 in namespace');
  });
  ps.sub('namespace', function() {
    ok('here!', 'subscriber to entire namespace');
  });
  ps.sub('namespace2:topic1', function() {
    ok('here!', 'subscriber to topic1 in different namespace');
  });
  ps.pub('namespace:topic1');
});

test('PubSub: nested namespaces', function() {
  expect(3);
  var ps = AppSeeds.PubSub.create();
  ps.sub('parent:child:event', function() {
    ok('here!', 'subscribed to specific event');
  });
  ps.sub('parent:child', function() {
    ok('here!', 'subscribed to sub-namespace');
  });
  ps.sub('parent', function() {
    ok('here!', 'subscribed to entire namespace');
  });
  ps.sub('child:event', function() {
    ok('here!', 'subscribed to invalid namespace portion');
  });
  ps.pub('parent:child:event');
});

test('Scheduler sync behavior', function() {
  expect(1);
  var schedule = AppSeeds.Scheduler.create(function() {
    ok('here', 'callback executed!');
  });
  schedule.now();
});

asyncTest('Scheduler async: delay + reset', function() {
  expect(1);
  var schedule = AppSeeds.Scheduler.create(function() {
    ok('here', 'callback executed!');
  });
  schedule.delay(200);
  var i = 0;
  window.setInterval(function() {
    if (i++ < 10) schedule.reset();
  }, 100);
  
  window.setInterval(function() {
    start();
  }, 1300);
});

asyncTest('Scheduler async: repeat + reset', function() {
  expect(5);
  var schedule = AppSeeds.Scheduler.create(function() {
    ok('here', 'callback executed!');
  });
  schedule.repeat(100);
  var i = 0;
  window.setInterval(function() {
    if (i++ < 6) schedule.reset();
  }, 50);
  window.setTimeout(function() {
    schedule.stop();
  }, 850);
  
  window.setTimeout(function() {
    start();
  }, 2000);
});