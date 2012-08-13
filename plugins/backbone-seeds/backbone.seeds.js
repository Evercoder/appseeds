// Backbone.StateRouter
// --------------------
// *StateRouter* extends *Backbone.Router* for easy integration with *Seeds.StateManager*.
// It behaves like a normal Router, with one addition: when the associated state manager
// transitions to a new state, the router will navigate to the appropriate URL and viceversa.
//
// Usage:
//
//		var sm = Seeds.StateManager.create();
//		var router = new Backbone.StateRouter({
//			manager: sm,
//			routes: {
//				'some/route': 'state:A',
//				'some/other/route': 'state:B'
//			}
//		});
//
//	*sm* and *router* will now be in sync.
Backbone.StateRouter = Backbone.Router.extend({

	// Set up *Backbone.StateRouter*.
	constructor: function(options) {
		Backbone.Router.prototype.constructor.call(this, options);
		this.manager = options.manager;
		if (this.manager) {
			var router = this;
			// Attach a listener to the *stay* event in the state manager.
			this.manager.sub('stay', function(stateName) {
				var route = router._stateRoutes[stateName],
            args = Array.prototype.slice.call(arguments, 1), reg, results;
        if (route) {
          reg = router._routeToRegExp(route);
          results = reg.exec(route).slice(1);
          if (results.length >= 1 && args.length >= 1) {
            for (var i = 0;  i < results.length; i++) {
              route = route.replace(results[i],args[i]);
            }
          }
          router.navigate(route);
        }
			});
			// Attach a listener on all the router events, to see if they match the *route:state:stateName* format.
			this.on('all', function(route) {
				var ret = /^route:state:(.+)/.exec(route),
            args = Array.prototype.slice.call(arguments, 1) || [];
        if (ret) {
          args.unshift(ret[1]);
          this.manager.go.apply(this.manager, args);
        }
			});
		}
	},
	// Overwrite the *route()* method to keep a reference to routes with the name in the *state:stateName* format.
	route: function(route, name) {
		Backbone.Router.prototype.route.apply(this, arguments);
		var ret = /^state:(.+)/.exec(name);
		if (!this._stateRoutes) this._stateRoutes = {};
		if (ret) this._stateRoutes[ret[1]] = route;
	}
});
