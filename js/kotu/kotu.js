function kotu() {
    this.tz = new nat.tokenizer();

    this.aliases = [
        {
            match: [
                ['open', 'parenthesis'],
                ['open', 'brackets'],
                ['open', 'bracket']
            ],
            replace: '('
        },
        {
            match: [
                ['close', 'parenthesis'],
                ['close', 'brackets'],
                ['close', 'bracket']
            ],
            replace: ')'
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
                ['evaluate'],
                ['calculate'],
                ['run'],
                ['eval'],
                ['calc']
            ],
            return: function(tokens) {
                var rem = replaceAliases(tokens.slice(1));
                var exp = rem.join('');

                var returnValue = 'unknown';

                try {
                    returnValue = eval(exp);
                } catch(e) {
                    return 'can\'t';
                }

                return exp + '=' + returnValue;
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
                            rule: rule,
                            pattern: pattern,
                            tokens: tokens,
                            matchedTokenCount: matchedTokenCount
                        };
                        break;
                    }
                };

            }

            return response.succeeded;
        });


        console.log(response);
    });

    return response;

};

kotu.prototype.reply = function(result) {
    if(this.isFunction(result.rule.return)) {
        return result.rule.return(result.tokens);
    } else {
        return result.rule.return;
    }
};

kotu.prototype.isFunction = function(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}


kotu.prototype.understand = function(exp) {
    var tokens = this.tz.execute(exp).map(function(token) {
        return {
            value: token.value,
            type: nat.util.getType(token.type)
        };
    });

    var result = this.analyze(tokens);

    if(result.succeeded) {
        result.reply = this.reply(result);
    }

    return result;
};

