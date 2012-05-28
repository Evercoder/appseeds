/*globals test expect ok strictEqual AppSeeds*/

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