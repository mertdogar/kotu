function kotu() {
    var that = this;
    this.tz = new nat.tokenizer();

    this.aliases = [
        {
            match: [
                ['open', 'parentheses'],
                ['open', 'brackets'],
                ['open', 'bracket']
            ],
            replace: '('
        },
        {
            match: [
                ['close', 'parentheses'],
                ['close', 'brackets'],
                ['close', 'bracket']
            ],
            replace: ')'
        },
        {
            match: [
                ['plus'],
                ['sum']
            ],
            replace: '+'
        },
        {
            match: [
                ['minus'],
                ['subtract']
            ],
            replace: '-'
        },
        {
            match: [
                ['multiply'],
                ['times']
            ],
            replace: '*'
        },
        {
            match: [
                ['equals'],
                ['is', 'equals'],
                ['is', 'equal']
            ],
            replace: '=='
        },
        {
            match: [
                ['divided', 'by'],
                ['divide', 'by']
            ],
            replace: '/'
        },
        {
            match: [
                ['to', 'the', 'power', 'of']
            ],
            replace: function(tokens) {
                return false;
            }
        }
    ];

    this.rules = [
        {
            match: [
                ['what', 'is', '?the', 'time']
            ],
            return: 'the time is ' + new Date() + '.'
        },
        {
            match: [
                ['who', '?are', 'you'],
                ['tell', '?me', 'about', 'you'],
                ['you']
            ],
            return: 'I am nobody.'
        },
        {
            match: [
                ['hello'],
                ['hi'],
                ['holla']
            ],
            return: 'Hello darling.'
        },
        {
            match: [
                ['open', '?file']
            ],
            return: function(tokens, respond) {
                var rem = tokens.slice(2)[0].value;
                console.log(rem);

                var txtFile = new XMLHttpRequest();
                txtFile.open("GET", "../" + rem + ".html", true);
                txtFile.onreadystatechange = function() {
                    if (txtFile.readyState === 4 && txtFile.status === 200)
                        respond(txtFile.responseText);
                    else
                        console.log('couldn\'t open file.');
                };
                txtFile.send(null);
            }
        },
        {
            match: [
                ['evaluate'],
                ['calculate'],
                ['run'],
                ['eval'],
                ['calc']
            ],
            return: function(tokens, respond) {
                var rem = that.replaceAliases(tokens.slice(1));

                var exp = '';
                rem.forEach(function(token) {
                    exp += token.value;
                });

                var returnValue = 'unknown';

                try {
                    returnValue = eval(exp);
                } catch(e) {
                    return 'can\'t';
                }

                respond(exp + '=' + returnValue);
            }
        }
    ];
}

kotu.prototype.analyze = function(tokens) {
    var response = {
        succeeded: false
    };

    this.rules.some(function(rule) {
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


kotu.prototype.replaceAliases = function(tokens) {
    var response = {
        succeeded: false
    };

    this.aliases.forEach(function(alias) {

        alias.match.some(function(pattern) {
            for(var a = 0; a < tokens.length-pattern.length; a++) {
                var tokensSliced = tokens.slice(a);

                var offset = 0;
                var matchedTokenCount = 0;
                for(var i = 0; i < pattern.length && i < tokensSliced.length; i++) {

                    var token = tokensSliced[i+offset];
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
                            rule: alias,
                            pattern: pattern,
                            tokens: tokens,
                            matchingStartsAt: a,
                            matchedTokenLength: i+1,
                            matchedTokenCount: matchedTokenCount
                        };
                        break;
                    }
                };

            }

            return response.succeeded;
        });

        if(response.succeeded) {
            console.log(response);

            tokens.splice(response.matchingStartsAt, response.matchedTokenLength, {value: response.rule.replace, replaced: true});
            //Array.prototype.splice.apply(tokens, [response.matchingStartsAt, reponse.matchedTokenCount].concat(diff));

            response = {succeeded:false};
        }

    });

    return tokens;

};

kotu.prototype.reply = function(result) {
    var defer = Q.defer();

    if(this.isFunction(result.rule.return)) {
        result.rule.return(result.tokens, function(value) {
            defer.resolve(value);
        });
    } else {
        setTimeout(function() {
            defer.resolve(result.rule.return);
        });
    }
    return defer.promise;
};

kotu.prototype.isFunction = function(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}


kotu.prototype.understand = function(exp) {
    var defer = Q.defer();

    var tokens = this.tz.execute(exp).map(function(token) {
        return {
            value: token.value,
            type: nat.util.getType(token.type)
        };
    });

    var result = this.analyze(tokens);

    if(result.succeeded) {
        this.reply(result).then(function(replyText) {
            result.reply = replyText;
            defer.resolve(result);
        });
    }

    return defer.promise;
};

