app.controller('Tasklists', function($scope, $http) {
	$scope.tasklists = null;
	
	$scope.init = function() {
		$http.get('get_tasks').success(function(data) {
			console.log(data);
			$scope.tasklists = data.tasklists;
		});
	};
	
	$scope.getChildren = function() {
		
	};
});