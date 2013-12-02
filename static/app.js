var app = angular.module('TodoTree', []);

app.directive('tree', function() {
	return {
		template: '<ul></ul>',
	};
});