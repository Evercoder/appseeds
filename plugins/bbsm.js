Seeds.BBSM = {
	create: function(sm, router) {
		var smr = Seeds.o.beget(this._instanceMethods);
		Seeds.o.mixin(smr, {
			sm: sm,
			router: router,
			_routes: {}
		});
		sm.sub('stay', function(stateName) {
			smr.router.navigate(smr._routes[stateName]);
		});
		router.on('event:stateChanged', function(stateName) {
			smr.sm.go(stateName);
		});
		return smr;
	},
	_instanceMethods: {
		route: function(stateName, route) {
			var state = sm.state(stateName);
			if (!state) {
				sm.pub('error', 'State ' + stateName + ' is not defined');
				return;
			}
			this._routes[stateName] = route;
			this.router.route(route, 'stateChanged');
			return this;
		}
	}
};