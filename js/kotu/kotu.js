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
                    if (txtFile.readyState === 4 && txtFile.status === 200) {
                        console.log(that.htmlToJson(txtFile.responseText));
                        respond(txtFile.responseText);
                    } else
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
};

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

kotu.prototype.parseHtml = function(html) {
    var results = '';
    this.HTMLParser(html, {
        start: function(tag, attrs, unary) {
            results += '<' + tag;
            for (var i = 0; i < attrs.length; i++) {
                results += ' ' + attrs[i].name + '="' + attrs[i].escaped + '"';
            }
            results += (unary ? '/' : '') + '>';
        },
        end: function(tag) {
            results += '</' + tag + '>';
        },
        chars: function(text) {
            results += text;
        },
        comment: function(text) {
            results += '<!--' + text + '-->';
        }
    });
    return results;
};

kotu.prototype.makeMap = function(str) {
    var obj = {}, items = str.split(',');
    for (var i = 0; i < items.length; i++) {
        obj[items[i]] = true;
    }
    return obj;
};

kotu.prototype.html2json = function(html) {
    // Inline Elements - HTML 4.01
    var inline = this.makeMap('a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var');
    // but I want to handle some tag like block tag
    inline.textarea = false;
    inline.input = false;
    inline.img = false;

    var bufArray = [];
    var results = {};
    var inlineBuf = [];
    bufArray.last = function() {
        return this[ this.length - 1];
    };
    HTMLParser(html, {
        start: function(tag, attrs, unary) {
            if (inline[tag]) {
                // inline tag is melted into text
                // because syntacs higlight became dirty
                // if support it.
                // 'hoge <inline>tag</inline> fuga'
                inlineBuf.push('<' + tag + '>');
            } else {
                var buf = {}; // buffer for single tag
                buf.tag = tag;
                if (attrs.length !== 0) {
                    var attr = {};
                    for (var i = 0; i < attrs.length; i++) {
                        var attr_name = attrs[i].name;
                        var attr_value = attrs[i].value;
                        if (attr_name === 'class') {
                            attr_value = attr_value.split(' ');
                        }
                        attr[attr_name] = attr_value;
                    }
                    buf['attr'] = attr;
                }
                if (unary) {
                    // if this tag don't has end tag
                    // like <img src="hoge.png"/>
                    // add last parents
                    var last = bufArray.last();
                    if (!(last.child instanceof Array)) {
                        last.child = [];
                    }
                    last.child.push(buf);
                } else {
                    bufArray.push(buf);
                }
            }
        },
        end: function(tag) {
            if (inline[tag]) {
                // if end of inline tag
                // inlineBuf is now '<inline>tag'
                // melt into last node text
                var last = bufArray.last();
                inlineBuf.push('</' + tag + '>');
                // inlineBuf became '<inline>tag</inline>'
                if (!last.text) last.text = '';
                last.text += inlineBuf.join('');
                // clear inlineBuf
                inlineBuf = [];
            } else {
                // if block tag
                var buf = bufArray.pop();
                if (bufArray.length === 0) {
                    return results = buf;
                }
                var last = bufArray.last();
                if (!(last.child instanceof Array)) {
                    last.child = [];
                }
                last.child.push(buf);
            }
        },
        chars: function(text) {
            if (inlineBuf.length !== 0) {
                // if inlineBuf exists
                // this cace inlineBuf is maybe like this
                // 'hoge <inline>tag</inline>'
                // so append to last
                inlineBuf.push(text);
            } else {
                var last = bufArray.last();
                if (!last.text) {
                    last.text = '';
                }
                last.text += text;
            }
        },
        comment: function(text) {
            // results += "<!--" + text + "-->";
        }
    });
    return results;
};

kotu.prototype.json2html = function(json) {
    var html = '';
    var tag = json.tag;
    var text = json.text;
    var children = json.child;
    var buf = [];
    var that = this;
    // Empty Elements - HTML 4.01
    var empty = this.makeMap('area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed');

    var buildAttr = function(attr) {
        for (var k in attr) {
            buf.push(' ' + k + '="');
            if (attr[k] instanceof Array) {
                buf.push(attr[k].join(' '));
            } else {
                buf.push(attr[k]);
            }
            buf.push('"');
        }
    }

    buf.push('<');
    buf.push(tag);
    json.attr ? buf.push(buildAttr(json.attr)) : null;
    if (empty[tag]) buf.push('/');
    buf.push('>');
    text ? buf.push(text) : null;
    if (children) {
        for (var j = 0; j < children.length; j++) {
            buf.push(that.json2html(children[j]));
        }
    }
    if (!empty[tag]) buf.push('</' + tag + '>');
    return buf.join('');
};
