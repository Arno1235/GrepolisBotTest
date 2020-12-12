if (location.host.indexOf("grepolis.com", location.host.length - "grepolis.com".length) !== -1) {
    var less = {
        async: true,
        fileAsync: true
    };
    (function() {
        var ctx = {
            hash: "gm_",
            domain: "botsoft.org"
        };
        var eval_ctx = ctx.eval_ctx = function(js) {
            return (function() {
                return eval(js);
            }).call(ctx);
        };
        var bot = ctx.bot = {
            domain: "botsoft.org",
            ctx: ctx,
            version: "07.04.2019 #2",
            controls: {},
            templates: {},
            models: {},
            autoreload: {
                count: 0
            },
            ajax: "//botsoft.org/en/bot/ajaxv2/",
            active: false,
            requests: 0,
            failRequests: 0,
            lastTownId: null,
            ress: ["wood", "stone", "iron"],
            Filters: function(_bot) {
                var bot = _bot;
                this.items = {};
                this.add = function(code, filter) {
                    if (code in this.items) return false;
                    this.items[code] = filter;
                    ctx.log("debug", "Filter {0} loaded", code);
                    return code;
                };
                this.remove = function(code) {
                    if (!(code in this.items)) return false;
                    delete this.items[code];
                    return code;
                };
                this.checkModule = function(module) {
                    for (f in this.items) {
                        var filter = this.items[f],
                            result = filter(0, 0, 0, 0, 0, module);
                        //if (!result) return false;
                    }
                    return true;
                };
            },
            str: {
                format: function(text) {
                    var formatted = text;
                    for (var i = 1; i < arguments.length; i++) formatted = formatted.replace("{" + (i - 1) + "}", arguments[i]);
                    return formatted;
                }
            },
            runAtTown: function(town, f) {
                if (typeof f != "function") return;
                var prevTown = Game.townId,
                    ret;
                Game.townId = town;
                ret = f();
                Game.townId = prevTown;
                return ret;
            },
            inject: function() {
                var path = window.location.pathname,
                    world = /^([a-zA-Z]{2})\d+/i.exec(Game.world_id);
                if (!(typeof Game === "undefined" || typeof WMap === "undefined" || typeof Layout === "undefined" || typeof $ === "undefined" || typeof angular === "undefined" || (typeof world === "undefined")) && path.substring(0, 6) !== "/forum") {
                    world = world ? world[1] : "unkn";
                    var that = this,
                        box = $("body");
                    if (box.length > 0)
                        if ($("div#bbb54c9b4msgs").length == 0) box.append('<div id="bbb54c9b4msgs"></div>');
                    that.loader = new GPAjax(Layout, false);
                    that.hmsg = HumanMessage;
                    that.filters = new that.Filters(that);
                    that.url = window.url;
                    window.url = function(controller, action, parameters) {
                        var params = parameters || {},
                            i = action.indexOf("&town_id=");
                        if (i >= 0) {
                            params.town_id = action.substring(i + 9);
                            action = action.substring(0, i);
                        }
                        return that.url(controller, action, params);
                    };
                    ctx.account = [Game.player_name, "@", world].join("").toLowerCase();
                    this.request("bot:login", {
                        player: Game.player_name,
                        world: Game.world_id,
                        ref: that.ref
                    }, function(data) {
                        eval_ctx(data.result.js);
                    });
                } else setTimeout(function() {
                    bot.inject();
                }, 3000);
            },
            login: function(data) {
                for (var x in data.templates) bot.templates[x] = data.templates[x];
                if (Array.isArray(data.modules)) data.modules.forEach(function(x) {
                    var f = ctx.eval_ctx(x.js);
                    if (typeof f == "function") f(x.args);
                });
            },
            settings: function() {
                var dlg = $("div#bbb54c9b4bsettings"),
                    bot = this;
                if (dlg.length > 0) dlg.remove();
                else bot.request("settings:get", {}, function(data) {
                    eval_ctx(data.result.js);
                });
            },
            ajaxRequest: function(controller, action, params, callback, method, module) {
                var fcancel = "",
                    state = true,
                    bot = this;
                for (f in this.filters.items) {
                    var filter = this.filters.items[f],
                        result = filter(controller, action, params, callback, method, module);
                    if (result === false) {
                        state = false;
                        fcancel = f;
                    };
                }
                if (state === false) {
                    ctx.log("debug", "Request ({0}:{1}) canceled by filter: {2}", controller, action, fcancel);
                    return;
                }
                var that = this,
                    obj, callback_success = null,
                    callback_error = null;
                if (typeof callback == 'object') {
                    callback_success = callback.success ? callback.success : null;
                    callback_error = callback.error ? callback.error : null;
                } else callback_success = callback;
                if (!params) params = {
                    town_id: Game.townId
                };
                else if (!params.town_id) params.town_id = Game.townId;
                bot.lastTownId = params.town_id;
                HumanMessage = {
                    error: function(text) {
                        HumanMessage.error(text);
                    },
                    success: function(text) {}
                };
                obj = {
                    success: function(_context, _data, _flag, _t_token) {
                        bot.failRequests = 0;
                        HumanMessage = that.hmsg;
                        if (callback_success) {
                            _data.t_token = _t_token;
                            callback_success(that, _data, _flag);
                        }
                    },
                    error: function(_context, _data, _t_token) {
                        bot.failRequests++;
                        HumanMessage = that.hmsg;
                        if (callback_error) {
                            _data.t_token = _t_token;
                            callback_error(that, _data);
                        }
                        if (_data.error) {
                            if (_data.error.toLowerCase().indexOf("captcha") > -1) bot.captchaFails = isNaN(bot.captchaFails) ? 1 : bot.captchaFails + 1;
                            var text = bot.str.format("controler={0}, action={1}, params={2}, error={3}", controller, action, JSON.stringify(params), _data.error);
                            ctx.log("debug", text);
                            bot.request("bot:log", {
                                log: [{
                                    type: "fail",
                                    text: text
                                }]
                            });
                        }
                    }
                };
                action = bot.str.format("{0}&town_id={1}", action, params.town_id);
                that.requests++;
                if (method == 'get') that.loader.get(controller, action, params, false, obj, module);
                else if (method == 'post') that.loader.post(controller, action, params, false, obj, module);
            },
            ajaxRequestGet: function(controller, action, params, callback, module) {
                this.ajaxRequest(controller, action, params, callback, 'get', module);
            },
            ajaxRequestPost: function(controller, action, params, callback, module) {
                this.ajaxRequest(controller, action, params, callback, 'post', module);
            },
            isNumber: function(n) {
                return !isNaN(parseFloat(n)) && isFinite(n);
            },
            ts2text: function(ts) {
                var time = Timestamp.toDate(ts + Timestamp.localeGMTOffset()),
                    d = time.getUTCDate().toString(),
                    m = (time.getUTCMonth() + 1).toString(),
                    y = time.getUTCFullYear().toString(),
                    H = time.getUTCHours().toString(),
                    M = time.getUTCMinutes().toString(),
                    S = time.getUTCSeconds().toString();
                return (d.length == 1 ? "0" + d : d) + "." + (m.length == 1 ? "0" + m : m) + "." + y + " " + (H.length == 1 ? "0" + H : H) + ":" + (M.length == 1 ? "0" + M : M) + ":" + (S.length == 1 ? "0" + S : S);
            },
            request: function(method, data, cb) {
                var that = this;
                var params = {
                    key: that.key,
                    method: method,
                    data: data
                };
                $.post(that.ajax, JSON.stringify(params), function(data) {
                    data = JSON.parse(data);
                    if (data.error && method != "bot:log") {} else if (typeof cb == "function") cb(data);
                }, "text");
            }
        };
        setTimeout(function() {
            bot.inject();
        }, 3000);
        var lesscss = ["//botsoft.org/en/bot/bot.less?hash=bbb54c9b4", "//botsoft.org/static/bot/css/gfbot.less?rand=" + Math.random(), "//botsoft.org/static/grepo/css/bot.less?=" + Math.random()];
        lesscss.forEach(function(url) {
            var link = document.createElement("link"),
                head = document.getElementsByTagName("head")[0];
            link.href = window.location.protocol + url;
            link.rel = "stylesheet/less";
            (head || document.body).appendChild(link);
        });
        var js = [{
            name: "less",
            src: "//botsoft.org/static/js/less.min.js"
        }, {
            name: "angular",
            src: "//botsoft.org/static/js/angular.min.js"
        }];
        js.forEach(function(x) {
            var script = document.createElement("script"),
                head = document.getElementsByTagName("head")[0];
            script.src = x.src;
            (head || document.body).appendChild(script);
        });
    }());
}
