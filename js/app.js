var mudahale = angular.module('kotu', ['ngSanitize']);

mudahale.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);

mudahale.controller('mainController', ['$scope', '$http', '$window', '$timeout', '$q', function ($scope, $http, $window, $timeout, $q) {

    $scope.kotu = new kotu();

    $scope.recognition = new webkitSpeechRecognition();
    $scope.recognition.continuous = true;
    $scope.recognition.interimResults = true;

    $scope.history = [];

    $scope.recognition.onstart = function() {
        console.log('i am listening...');
    };

    $scope.recognition.onresult = function(event) {
        var interim_transcript = '';

        for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                var exp = event.results[i][0].transcript;


                var result = $scope.kotu.understand(exp);
                $scope.putResponse(result.reply);
                $scope.history.push(result);
            } else {
                interim_transcript += event.results[i][0].transcript;
            }
        }

        $scope.$digest();
    };

    $scope.recognition.onerror = function(event) {
        console.log('do not get it...');
    };

    $scope.recognition.onend = function() {
        console.log('i am done.')
    }

    $scope.putResponse = function(response) {
        $scope.animateResponse = false;
        $scope.responseContent = response;

        /**
         * speak
         * var msg = new SpeechSynthesisUtterance(response);
         * window.speechSynthesis.speak(msg);
         */


        $timeout(function() {
            $scope.animateResponse = true;
        }, 10);

        $timeout(function() {
            $scope.animateResponse = false;
        }, 5000);

    };

    $scope.final_transcript = '';
    $scope.recognition.start();
}]);
