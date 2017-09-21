(function ($) {

    //Error capture method
    function _error(xhr, textStatus, errorThrown) {
        alert('Fix this error handler!');
        var error = xhr.responseJSON.error;
        host.o.loader.html(error.str);
        $(host).trigger('error', [error]);
    };

    function _exec(host, type, field) {
        if (!(type in host.events && field in host.events[type]))
            return false;
        var obj = host.events[type][field];
        return _eval(host, obj.data(type));
    };

    function _eval(host, evaluate) {
        return (function (form, evaluate) {
            var code = (evaluate.indexOf(';') < 0) ? "( " + evaluate + " )" : '(function(form){' + evaluate + '})(form)';
            try {
                return eval(code);
            } catch (error) {
                console.log(error);
            }
            return false;
        })(host.data, evaluate);
    }

    function _nullify(host, def) {
        if (!typeof def === 'object')
            return;
        if (def.name)
            host.data[def.name] = null;
        if (def.fields) {
            for (x in def.fields) {
                var sdef = def.fields[x];
                if (sdef instanceof Array)
                    _nullify(host, { fields: sdef });
                else if (typeof sdef == 'object')
                    host.data[sdef.name] = null;
                else if (typeof sdef == 'string')
                    host.data[sdef] = null;
            }
        }
    }

    function _toggle(host, obj) {
        var show = obj.data('show').replace(/\s/g, '');
        var parts = show.split(/(\&\&|\|\|)/);
        for (var x = 0; x < parts.length; x += 2) {
            var matches = null;
            if (!(matches = parts[x].match(/([\w\.]+)([=\!\<\>]+)(.+)/))) {
                alert('Invalid show script: ' + show)
                return;
            }
            parts[x] = matches[1] + ' ' + matches[2] + ' ' + matches[3];
        }
        var toggle = (function (values, evaluate) {
            var code = '';
            for (key in values) {
                var value = values[key];
                if (typeof value == 'string') value = "'" + value + "'";
                else if (typeof value == 'object' || typeof value == 'array') value = JSON.stringify(value);
                code += 'var ' + key + " = " + value + ";\n";
            }
            code += "( " + evaluate + " );";
            return eval(code);
        })(host.data.save(), parts.join(''));
        obj.toggle(toggle);
        if (!toggle) _nullify(host, obj.data('def'));
    };

    //Input events
    function _input_event_change(host, input) {
        var value = null, name = input.attr('name');
        var def = input.data('def');
        if (input.is('[type=checkbox]'))
            value = input.is(':checked');
        else
            value = input.val();
        if (value === '') value = null;
        host.data[name] = value;
        if (host.events.show.length > 0) {
            for (x in host.events.show)
                _toggle(host, host.events.show[x]);
        }
        if (def.change)
            _eval(host, def.change);
    };

    function _input_event_focus(host, input) {
        var def = input.data('def');
        input.parent().removeClass('has-error');
        if (def.focus)
            _eval(host, def.focus);
    };

    function _input_event_blur(host, input) {
        var def = input.data('def');
        if (def.required && input.val() == '')
            input.parent().addClass('has-error');
        if (def.blur)
            _eval(host, def.blur);
    };

    function _input_select_populate(host, select, track) {
        var def = select.data('def');
        var options = def.options;
        while (match = options.match(/\{\{(\w+)\}\}/))
            options = options.replace(match[0], host.data[match[1]]);
        select.html($('<option>').html('Loading...'));
        _post(host, 'api', { target: options }, track).done(function (data) {
            select.empty();
            if (def.placeholder && (!def.required || host.data[field] == null))
                select.append($('<option>').attr('value', '').html(def.placeholder).prop('disabled', (def.required == true)));
            for (x in data)
                select.append($('<option>').attr('value', x).html(data[x]));
            select.val(host.data[select.attr('name')]);
        });
        return true;
    }

    function _input_select(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(def.label)
            .appendTo(group);
        var select = $('<select class="form-control">')
            .attr('name', def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .focus(function (event) { _input_event_focus(host, $(event.target)); })
            .blur(function (event) { _input_event_blur(host, $(event.target)); })
            .appendTo(group);
        if (typeof def.options == 'string') {
            var matches = def.options.match(/\{\{\w+\}\}/g);
            for (x in matches) {
                var match = matches[x].substr(2, matches[x].length - 4);
                host.data.watch(match, function (key, value, select) {
                    _input_select_populate(host, select, false);
                }, select);
            }
            _input_select_populate(host, select.change(function (event) { _input_event_change(host, $(event.target)); }));
        } else {
            if (def.placeholder && (!def.required || host.data[def.name] == null))
                select.append($('<option>').attr('value', '').html(def.placeholder).prop('disabled', (def.required == true)));
            for (x in def.options)
                select.append($('<option>').attr('value', x).html(def.options[x]));
            select.val(host.data[def.name]).change(function (event) { _input_event_change(host, $(event.target)); });
        }
        return group;
    }

    function _input_checkbox(host, def) {
        var group = $('<div class="checkbox">').data('def', def);
        var label = $('<label>').html([
            $('<input type="checkbox">')
                .attr('name', def.name)
                .attr('data-bind', def.name)
                .attr('checked', host.data[def.name])
                .data('def', def)
                .focus(function (event) { _input_event_focus(host, $(event.target)); })
                .blur(function (event) { _input_event_blur(host, $(event.target)); })
                .change(function (event) { _input_event_change(host, $(event.target)); }),
            def.label
        ]).appendTo(group);
        return group;
    }

    function _input_std(host, type, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(def.label)
            .appendTo(group);
        var input = $('<input class="form-control">')
            .attr('type', type)
            .attr('name', def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .val(host.data[def.name])
            .focus(function (event) { _input_event_focus(host, $(event.target)); })
            .blur(function (event) { _input_event_blur(host, $(event.target)); })
            .change(function (event) { _input_event_change(host, $(event.target)); });
        if (def.placeholder) input.attr('placeholder', def.placeholder);
        if (def.prefix || def.suffix) {
            var inputDIV = $('<div class="input-group">')
                .appendTo(group);
            if (def.prefix) inputDIV.append($('<span class="input-group-addon">').html(def.prefix));
            inputDIV.append(input);
            if (def.suffix) inputDIV.append($('<span class="input-group-addon">').html(def.suffix));
        } else {
            group.append(input);
        }
        return group;
    }

    function _form_field(host, info) {
        var def = null, field = null;
        if (info instanceof Array)
            info = { fields: info };
        if (info instanceof Object)
            def = $.extend({}, host.def.fields[info.name], info);
        else
            def = $.extend({}, host.def.fields[info], { name: info });
        if (!def) return;
        if (def.fields) {
            var col_width = (12 / def.fields.length);
            field = $('<div class="row">').data('def', def);
            for (x in def.fields)
                field.append($('<div>').addClass('col-lg-' + col_width).html(_form_field(host, def.fields[x])));
        } else if (def.options) {
            field = _input_select(host, def);
        } else if (def.type) {
            switch (def.type) {
                case 'boolean':
                    field = _input_checkbox(host, def);
                    break;
                case 'int':
                case 'integer':
                case 'number':
                    field = _input_std(host, 'number', def);
                    break;
                case 'date':
                case 'text':
                default:
                    field = _input_std(host, def.type, def);
                    break;
            }
        } else {
            field = $('<div>');
        }
        if ('html' in def)
            field.append(def.html);
        if ('show' in def) {
            if (typeof def.show == 'boolean')
                field.toggle(def.show);
            else
                host.events.show.push(field.data('show', def.show));
        }
        return field;
    }

    //Render a page section
    function _section(host, section) {
        var fieldset = $('<fieldset>').data('def', section);
        if (section.label)
            fieldset.append($('<legend>').html(section.label));
        for (x in section.fields)
            fieldset.append(_form_field(host, section.fields[x]));
        if ('show' in section) {
            if (typeof section.show == 'boolean')
                fieldset.toggle(section.show);
            else
                host.events.show.push(fieldset.data('show', section.show));
        }
        return fieldset;
    };

    //Render a page
    function _page(host, page) {
        var form = $('<div class="form-container">').data('def', page);
        host.events = {
            show: [],
            change: {}
        };
        host.data.unwatch();
        if (page.label) form.append($('<h1>').html(page.label));
        for (x in page.sections)
            _section(host, page.sections[x]).appendTo(form);
        if ('show' in page) {
            if (typeof page.show == 'boolean')
                page.toggle(page.show);
            else
                host.events.show.push(page.data('show', page.show));
        }
        host.objects.container.html(form);
        if (host.events.show.length > 0) {
            for (x in host.events.show)
                _toggle(host, host.events.show[x]);
        }
    };

    //Render the whole form
    function _render(host, data) {
        host.objects = {
            loader: $('<div class="forms-loader-container">').html($('<div class="forms-loader">')),
            container: $('<div class="forms-container">').hide()
        };
        $(host).html([host.objects.loader, host.objects.container]).css('min-height', '200px');
    };

    //Navigate to a page
    function _nav(host, pageno) {
        host.loading++;
        host.page = pageno;
        _page(host, host.def.pages[pageno]);
        $(host).trigger('nav', [pageno + 1, host.def.pages.length]);
        _ready(host);
    };

    //Run the data validation
    function _validate(host) {
        console.log('Validation not yet implemented!');
        return false;
    };

    //Signal that everything is ready to go
    function _ready(host) {
        host.loading--;
        if (host.loading > 0 || host.page === null)
            return;
        host.objects.loader.hide();
        host.objects.container.show();
        $(host).trigger('ready', [host.def]);
    };

    //Save form data back to the controller
    function _save(host, validate, extra) {
        if (!(validate === false || ((validate === true || typeof validate == 'undefined') && _validate(host))))
            return false;
        var data = $.extend({}, host.settings.params, extra);
        data.form = host.data.save();
        $(host).trigger('saving', [data]);
        _post(host, 'post', $.extend({}, host.settings.params, data), false).done(function (response) {
            if (response.form) {
                for (x in response.form)
                    host.data[x] = response.form[x];
            }
            host.posts = {}; //Reset the post cache so we get clean data after 
            $(host).trigger('saved', [response]);
        }).fail(_error);
        return true;
    };

    //Register events that are used to control the form functions
    function _registerEvents(host) {

    }

    function _post(host, action, postdata, track) {
        if (host.settings.cachedActions.indexOf(action) != -1) {
            var index = btoa(action + JSON.stringify(postdata));
            if (index in host.posts)
                return { done: function (callback) { callback(host.posts[index]); } };
        }
        if (track !== false) {
            host.objects.container.hide();
            host.objects.loader.show();
            host.loading++;
        }
        return $.ajax({
            method: "POST",
            url: hazaar.url(host.settings.controller, 'interact/' + action),
            contentType: "application/json",
            data: (typeof postdata == 'object' ? JSON.stringify(postdata) : null)
        }).always(function (response) {
            if (host.settings.cachedActions.indexOf(action) != -1)
                host.posts[index] = response;
            _ready(host);
        }).fail(_error);
    };

    //Load all the dynamic bits
    function _load(host) {
        $.get(hazaar.url('hazaar/forms', 'load', { form: host.settings.form }, host.settings.encode)).done(function (response) {
            var data = {};
            host.def = response;
            if (host.def.fields) {
                for (x in host.def.fields)
                    data[x] = host.def.fields[x].default ? host.def.fields[x].default : null;
            }
            host.data = new dataBinder(data);
            $(host).trigger('load', [host.data.save()]);
            _post(host, 'load', host.settings.params).done(function (response) {
                if (typeof response == 'object' && Object.keys(response).length > 0) {
                    for (x in response)
                        host.data[x] = response[x];
                    $(host).trigger('data', [host.data.save()]);
                }
                _nav(host, 0);
            });
        }).fail(_error);
    };

    function initialise(host, settings) {
        //Define the default object properties
        host.settings = $.extend({}, $.fn.form.defaults, settings);
        host.data = {};
        host.events = {};
        host.posts = {};
        host.page = null;
        host.loading = 0;
        $(host).trigger('init');
        _registerEvents(host);
        _render(host);
        _load(host, host.settings.url);
    };

    $.fn.form = function () {
        var args = arguments;
        if (args[0] == 'info') {
            var host = this.get(0);
            var data = host.data.save(), info = {};
            for (x in data)
                info[x] = { label: host.def.fields[x].label, value: data[x] };
            return info;
        }
        return this.each(function (index, host) {
            if (host.settings) {
                switch (args[0]) {
                    case 'page':
                        _nav(host, args[1]);
                        break;
                    case 'prev':
                        if (host.page > 0)
                            _nav(host, host.page - 1);
                        break;
                    case 'next':
                        if (host.page < (host.def.pages.length - 1))
                            _nav(host, host.page + 1);
                        break;
                    case 'save':
                        return _save(host, args[1], args[2]);
                }
            } else {
                initialise(host, args[0]);
            }
        });
    }

    $.fn.form.defaults = {
        "form": "default",
        "controller": "index",
        "encode": true,
        "cachedActions": ["api"]
    };

    //$.getScript(hazaar.url('hazaar/forms', 'file/inputs/text.js'), function () {
    //    $.fn.form.initialise();
    //});

})(jQuery);

