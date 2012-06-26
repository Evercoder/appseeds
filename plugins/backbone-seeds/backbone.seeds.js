// Backbone.StateRouter
// --------------------
// *StateRouter* extends *Backbone.Router* to easily integrate it with *Seeds.StateManager*.
// It behaves exactly like a normal Router, with the ability to track special routes separately.
// To map routes to states, use the following format: `'route': 'state:stateName'`.
Backbone.StateRouter = Backbone.Router.extend({
	constructor: function(options) {
		Backbone.Router.prototype.constructor.call(this, options);
		this.manager = options.manager;
		this._stateRoutes = {};
		if (this.manager) {
			var router = this;
			this.manager.sub('stay', function(stateName) {
				var route = router._stateRoutes[stateName];
				if (route) {
					router.navigate(route);
				}
			});
			this.on('all', function(route) {
				var ret = /^route:state:(.+)/.exec(route);
				if (ret) this.manager.go(ret[1]);
			})
		}
	},
	route: function(route, name) {
		Backbone.Router.prototype.route.apply(this, arguments);
		var ret = /^state:(.+)/.exec(name);
		if (ret) {
			this._stateRoutes[ret[1]] = route;
		}
	}
});