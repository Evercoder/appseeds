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