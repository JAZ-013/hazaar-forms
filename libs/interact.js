﻿(function ($) {

    //Error capture method
    function _error(xhr, textStatus, errorThrown) {
        var error = xhr.responseJSON.error;
        $('<div>').html([
            $('<h4>').html(error.status),
            $('<div>').html(error.str).css({ 'font-weight': 'bold', 'margin-bottom': '15px' }),
            $('<div>').html('Line: ' + error.line),
            $('<div>').html('File: ' + error.file)
        ]).popup({
            title: 'An error ocurred!',
            icon: 'danger',
            buttons: [
                { label: "OK", "class": "btn btn-default" }
            ]
        });
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

    function _is_visible(host, show) {
        var show = show.replace(/\s/g, '');
        var parts = show.split(/(\&\&|\|\|)/);
        for (var x = 0; x < parts.length; x += 2) {
            var matches = null;
            if (!(matches = parts[x].match(/([\w\.]+)([=\!\<\>]+)(.+)/))) {
                alert('Invalid show script: ' + show)
                return;
            }
            parts[x] = matches[1] + ' ' + matches[2] + ' ' + matches[3];
        }
        return (function (values, evaluate) {
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
    };

    function _toggle(host, obj) {
        var toggle = _is_visible(host, obj.data('show'));
        obj.toggle(toggle);
        if (!toggle) _nullify(host, obj.data('def'));
    };

    //Input events
    function _input_event_change(host, input) {
        var value = null, name = input.attr('name');
        var def = host.def.fields[name];
        if (input.is('[type=checkbox]'))
            value = input.is(':checked');
        else
            value = input.val();
        if (value === '') value = null;
        host.data[name] = value;
        if (def.update && (typeof def.update == 'string' || host.settings.update === true)) {
            var options = {
                "originator": name,
                "form": host.data.save()
            };
            if (typeof def.update == 'string') options.api = def.update;
            _post(host, 'update', options, false).done(function (response) {
                for (x in response)
                    host.data[x] = response[x];
            });
        }
        if (host.events.show.length > 0) {
            for (x in host.events.show)
                _toggle(host, host.events.show[x]);
        }
        input.trigger('update');
    };

    function _input_event_update(host, input) {
        var def = input.data('def'), name = input.attr('name');
        if (def.change)
            _eval(host, def.change);
        _validate_input(host, input);
    }

    function _input_event_focus(host, input) {
        var def = input.data('def');
        if (def.focus)
            _eval(host, def.focus);
    };

    function _input_event_blur(host, input) {
        var def = input.data('def');
        if (def.blur)
            _eval(host, def.blur);
    };

    function _input_select_populate(host, select, track) {
        var def = select.data('def');
        var options = def.options;
        while (match = options.match(/\{\{(\w+)\}\}/))
            options = options.replace(match[0], host.data[match[1]]);
        select.html($('<option>').html('Loading...'));
        _post(host, 'items', { target: options }, track).done(function (data) {
            select.empty();
            if (def.placeholder && (!def.required || host.data[field] == null))
                select.append($('<option>').attr('value', '').html(def.placeholder).prop('disabled', (def.required == true)));
            for (x in data)
                select.append($('<option>').attr('value', x).html(data[x]));
            select.val(host.data[select.attr('name')]);
        });
        return true;
    }

    function _input_select_multi(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(def.label)
            .appendTo(group);
        var btnGroup = $('<div class="btn-group" data-toggle="buttons">').appendTo(group);
        var btnClass = def.class || 'default';
        for (x in def.options) {
            var active = (host.data[def.name].indexOf(x) > -1);
            var btn = $('<label class="btn btn-' + btnClass + ' ">')
                .toggleClass('active', active)
                .html([$('<input type="checkbox">').attr('value', x).prop('checked', active), def.options[x]])
                .appendTo(btnGroup);
            btn.change(function () {
                var value = this.childNodes[0].value;
                var index = host.data[def.name].indexOf(value);
                if (this.childNodes[0].checked && index == -1)
                    host.data[def.name].push(value);
                else
                    host.data[def.name].remove(index);
            });
        }
        return group;
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
                .change(function (event) { _input_event_change(host, $(event.target)); })
                .on('update', function (event) { _input_event_update(host, $(event.target)); }),
            def.label
        ]).appendTo(group);
        return group;
    }

    function _input_date(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(def.label)
            .appendTo(group);
        var input_group = $('<div class="input-group date">');
        var input = $('<input class="form-control">')
            .attr('type', 'date')
            .attr('name', def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .val(host.data[def.name])
            .appendTo(input_group)
            .focus(function (event) { _input_event_focus(host, $(event.target)); })
            .blur(function (event) { _input_event_blur(host, $(event.target)); })
            .change(function (event) { _input_event_change(host, $(event.target)); })
            .on('update', function (event) { _input_event_update(host, $(event.target)); });
        var glyph = $('<span class="input-group-addon">')
            .html($('<i class="fa fa-calendar">'))
            .appendTo(input_group);
        if (def.format) {
            var options = {
                format: def.format,
                autoclose: true,
                forceParse: true,
                language: 'en',
                clearBtn: (def.required !== true),
                todayHighlight: true
            };
            if (host.data[def.name])
                options.defaultViewDate = host.data[def.name];
            input.attr('type', 'text');
            input_group.datepicker($.extend({}, options, def.dateOptions));
            if (!def.placeholder)
                def.placeholder = def.format;
        }
        if (def.placeholder) input.attr('placeholder', def.placeholder);
        return group.append(input_group);
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
            .change(function (event) { _input_event_change(host, $(event.target)); })
            .on('update', function (event) { _input_event_update(host, $(event.target)); });
        if (def.format) input.attr('type', 'text').inputmask(def.format);
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
        if (host.data[def.name]) _validate_input(host, input);
        return group;
    }

    function _input_list(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<h4 class="control-label">')
            .html(def.label)
            .appendTo(group);
        var btn = $('<button type="button" class="btn btn-success btn-sm">')
            .html($('<i class="fa fa-plus">'));
        var fields = [], template = $('<div>');
        var t_container = $('<div class="row">').css({ 'margin-right': '100px' });
        var col_width = 12 / Object.keys(def.fields).length;
        template.append($('<div style="float: right;">')
            .html($('<button type="button" class="btn btn-danger btn-sm">').html($('<i class="fa fa-minus">')))).append(t_container);
        for (x in def.fields) {
            fields.push($.extend(def.fields[x], { name: x }));
            t_container.append($('<div>').addClass('col-lg-' + col_width).attr('data-bind', x));
        }
        group.append($('<div style="float: right; padding-top: 25px;">').html(btn));
        group.append(_form_field(host, { fields: fields }).addClass('itemlist-newitems').css({ 'margin-right': '100px' }))
        btn.click(function () {
            var parent = $(this).parent().parent();
            var data = {};
            parent.children('.itemlist-newitems').children().each(function (index_0, item_0) {
                $(item_0).find('input,select,textarea').each(function (index_1, item_1) {
                    var value = $(item_1).val();
                    data[item_1.name] = value;
                    $(item_1).val('');
                });
            });
            host.data[def.name].push(data);
        });
        group.append($('<div class="itemlist-items">').attr('data-bind', def.name).html($('<template>' + template[0].outerHTML + '</template>')))
            .click(function (event) {
                var target = $(event.target);
                if (target.is('.btn-danger'))
                    target.parent().parent().remove();
            });
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
        if (def.fields && def.type != 'array') {
            var col_width = (12 / def.fields.length);
            field = $('<div class="row">').data('def', def);
            for (x in def.fields)
                field.append($('<div>').addClass('col-lg-' + col_width).html(_form_field(host, def.fields[x])));
        } else if ('options' in def) {
            if (def.type == 'array')
                field = _input_select_multi(host, def);
            else
                field = _input_select(host, def);
        } else if (def.type) {
            switch (def.type) {
                case 'array':
                    field = _input_list(host, def);
                    break;
                case 'boolean':
                    field = _input_checkbox(host, def);
                    break;
                case 'int':
                case 'integer':
                case 'number':
                    field = _input_std(host, 'number', def);
                    break;
                case 'date':
                    field = _input_date(host, def);
                    break;
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
        var form = $('<div class="form-container">').data('def', page), sections = [];
        host.events = {
            show: [],
            change: {}
        };
        host.data.unwatch();
        if (page.label) form.append($('<h1>').html(page.label));
        for (x in page.sections)
            sections.push(_section(host, page.sections[x]));
        if (host.events.show.length > 0) {
            for (x in host.events.show)
                _toggle(host, host.events.show[x]);
        }
        host.objects.container.html(form.html(sections));
        host.data.resync();
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

    function _validate_input(host, input) {
        var name = input.attr('name'), def = host.def.fields[name];
        if (!def) return true;
        _validate_field(host, name, true).done(function (result) {
            if ((def.valid = result) !== true)
                input.parent().addClass('has-error');
            else
                input.parent().removeClass('has-error');
        });
    }

    function _validate_field(host, name, sync) {
        var value = host.data[name], def = host.def.fields[name];
        if (sync === true) {
            delete def.valid;
            return {
                done: function (callback) {
                    var result = _validate_field(host, name);
                    if (result === true && 'validate' in def && 'api' in def.validate) {
                        _post(host, 'api', { "target": def.validate.api, "params": { "name": name, "value": value, "def": def } }, false).done(function (response) {
                            var result = (response.ok === true) ? true : { "field": name, "status": response.reason || "api_failed(" + def.api + ")" };
                            callback(result);
                        });
                    } else {
                        callback(result);
                    }
                    return this;
                }
            }
        }
        if ('show' in def) {
            if (!((typeof def.show == 'boolean') ? def.show : _is_visible(host, def.show)))
                return true;
        }
        if ('required' in def && !value)
            return { "field": name, "status": "required" };
        if ('format' in def) {
            if (!Inputmask.isValid(String(value), def.format))
                return { "field": name, "status": "bad_format", "format": def.format };
        }
        if ('validate' in def) {
            for (type in def.validate) {
                var data = def.validate[type];
                switch (type) {
                    case 'min':
                        if (parseInt(value) < data)
                            return { "field": name, "status": "too_small" };
                        break;
                    case 'max':
                        if (parseInt(value) > data)
                            return { "field": name, "status": "too_big" };
                        break;
                    case 'with':
                        var reg = new RegExp(data);
                        if (!value.match(reg))
                            return { "field": name, "status": "regex_failed", "pattern": data };
                        break;
                    case 'equals':
                        if (value !== data)
                            return { "field": name, "status": "not_equal" };
                        break;
                    case 'minlen':
                        if (value.length < data)
                            return { "field": name, "status": "too_short" };
                        break;
                    case 'maxlen':
                        if (value.length > data)
                            return { "field": name, "status": "too_long" };
                        break;
                    case 'custom':
                        if (!_eval(host, data))
                            return { "field": name, "status": "custom" };
                        break;
                }
            }
        }
        if ('valid' in def)
            return def.valid;
        return true;
    }

    //Run the data validation
    function _validate(host) {
        if (!('def' in host && 'fields' in host.def))
            return false;
        var errors = [];
        for (key in host.def.fields) {
            var result = _validate_field(host, key);
            if (result !== true) errors.push(result);
        }
        $(host).trigger('validate', [(errors.length == 0), errors]);
        if (errors.length > 0) return errors;
        return true;
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
    //By default calls validation and will only save data if the validation is successful
    function _save(host, validate, extra) {
        if (!(validate === false || ((validate === true || typeof validate == 'undefined') && _validate(host) === true)))
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

    function _define(values) {
        if (!values) return;
        var data = {};
        for (x in values) {
            if (values[x].type == 'array' && !values[x].default) values[x].default = [];
            data[x] = values[x].default ? values[x].default : null;
        }
        return data;
    }

    //Load all the dynamic bits
    function _load(host) {
        $.get(hazaar.url('hazaar/forms', 'load', { form: host.settings.form }, host.settings.encode)).done(function (response) {
            host.def = response;
            host.data = new dataBinder(_define(host.def.fields));
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
        host.settings = $.extend({}, $.fn.hzForm.defaults, settings);
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

    $.fn.hzForm = function () {
        var args = arguments;
        var host = this.get(0);
        if (args[0] == 'info') {
            var data = host.data.save(), info = {};
            for (x in data)
                info[x] = { label: host.def.fields[x].label, value: data[x] };
            return info;
        } else if (args[0] == 'data') {
            return host.data;
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
                    case 'validate':
                        _validate(host);
                        break;
                    case 'save':
                        return _save(host, args[1], args[2]);
                }
            } else {
                initialise(host, args[0]);
            }
        });
    }

    $.fn.hzForm.defaults = {
        "form": "default",
        "controller": "index",
        "encode": true,
        "cachedActions": ["api"]
    };

})(jQuery);

