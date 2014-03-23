var mudahale = angular.module('kotu', ['ngSanitize']);

mudahale.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);

mudahale.controller('mainController', ['$scope', '$http', '$window', '$timeout', '$q', function ($scope, $http, $window, $timeout, $q) {
    var tz = new nat.tokenizer();

    $scope.recognition = new webkitSpeechRecognition();
    $scope.recognition.continuous = true;
    $scope.recognition.interimResults = true;

    $scope.history = [];

    $scope.recognition.onstart = function() {
        console.log('i\'m listening...');
    };

    $scope.recognition.onresult = function(event) {
        var interim_transcript = '';

        for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                var exp = event.results[i][0].transcript;
                $scope.understand(exp);
                //

            } else {
                interim_transcript += event.results[i][0].transcript;
            }
        }

        $scope.$digest();
    };

    $scope.recognition.onerror = function(event) {
        console.log('don\'t get it');
    };

    $scope.recognition.onend = function() {
        console.log('i\'m done.')
    }

    $scope.understand = function(exp) {
        var understood = false;

        var tokens = tz.execute(exp).map(function(token) {
            return {
                value: token.value,
                type: nat.util.getType(token.type)
            };
        });

        var result = $scope.analyze(tokens);

        if(result.succeeded) {
            $scope.putResponse(result.rule.return);
        } else {
            $scope.final_transcript += exp;
        }


        $scope.history.push(result);
    };

    $scope.analyze = function(tokens) {
        var response = {
            succeeded: false
        };

        $scope.rules.some(function(rule) {
            rule.match.some(function(pattern) {
                var offset = 0;
                var matchedTokenCount = 0;
                for(var i = 0; i < pattern.length && i < tokens.length; i++) {

                    var token = tokens[i+offset];
                    var patternTokenExp = pattern[i];

                    var hasModifier = patternTokenExp[0] == '?';

                    var patternToken = hasModifier ? patternTokenExp.slice(1):patternTokenExp;

                    if(token.value.toLowerCase()==patternToken.toLowerCase()) {
                        matchedTokenCount++;
                    } else if(hasModifier) {
                        i++;
                        offset--;
                    } else {
                        break;
                    }

                    if(i == pattern.length-1) {
                        response =  {
                            succeeded: true,
                            rule: rule,
                            pattern: pattern,
                            tokens: tokens,
                            matchedTokenCount: matchedTokenCount
                        };
                        break;
                    }
                };
                return response.succeeded;
            });
            return response.succeeded;
        });

        return response;

    };

    $scope.putResponse = function(response) {
        $scope.animateResponse = false;
        $scope.responseContent = response;

        $timeout(function() {
            $scope.animateResponse = true;
        }, 10);

        $timeout(function() {
            $scope.animateResponse = false;
        }, 5000);
    }

    $scope.rules = [
        {
            match: [['what', 'is', '?the', 'time']],
            return: 'the time is ' + new Date() + '.'
        },
        {
            match: [['who', '?are', 'you'], ['tell', '?me', 'about', 'you'], ['you']],
            return: 'I am nobody.'
        },
        {
            match: [['hello'], ['hi'], ['holla']],
            return: 'Hello darling.'
        }
    ];


    $scope.final_transcript = '';
    $scope.recognition.start();
}]);
