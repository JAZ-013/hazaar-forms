(function ($) {

    //Error capture method
    function _error(error) {
        if (typeof error == 'string') error = { str: error };
        else if (error instanceof Error) error = { status: 'JavaScript Error', str: error.message, line: error.lineNumber, file: error.fileName };
        else if ('done' in error) error = error.responseJSON.error;
        $('<div>').html([
            $('<h4>').html(error.status),
            $('<div>').html(error.str).css({ 'font-weight': 'bold', 'margin-bottom': '15px' }),
            (error.line ? $('<div>').html('Line: ' + error.line) : null),
            (error.file ? $('<div>').html('File: ' + error.file) : null)
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
        if (typeof evaluate === 'boolean') return evaluate;
        return (function (form, evaluate) {
            var code = '';
            if (evaluate.indexOf(';') < 0) {
                var values = form.save(true);
                for (key in values) {
                    var value = values[key];
                    if (typeof value == 'string') value = "'" + value + "'";
                    else if (typeof value == 'object' || typeof value == 'array') value = JSON.stringify(value);
                    code += 'var ' + key + " = " + value + ";\n";
                }
                code += "( " + evaluate + " );";
            } else {
                code = '(function(form){' + evaluate + '})(form)';
            }
            try {
                return eval(code);
            } catch (error) {
                _error(error);
            }
            return false;
        })(host.data, evaluate);
    };

    function _nullify(host, def) {
        if (!typeof def === 'object')
            return;
        if (def.name)
            host.data[def.name] = (('default' in def) ? def.default : null);
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
    };

    function _is_visible(host, show) {
        var show = show.replace(/\s/g, '');
        var parts = show.split(/(\&\&|\|\|)/);
        for (var x = 0; x < parts.length; x += 2) {
            var matches = null;
            if (!(matches = parts[x].match(/([\w\.]+)([=\!\<\>]+)(.+)/))) {
                alert('Invalid show script: ' + show);
                return;
            }
            parts[x] = matches[1] + ' ' + matches[2] + ' ' + matches[3];
        }
        return _eval(host, parts.join(''));
    };

    function _toggle(host, obj) {
        var toggle = _is_visible(host, obj.data('show')), def = obj.data('def');
        obj.toggle(toggle);
        if (!toggle) _nullify(host, def);
    };

    function _match_replace(str, values) {
        while (match = str.match(/\{\{(\w+)\}\}/)) {
            if (values[match[1]] === null)
                return false;
            str = str.replace(match[0], values[match[1]]);
        }
        return str;
    }

    //Input events
    function _input_event_change(host, input) {
        var value = null, def = input.data('def');
        if (input.is('[type=checkbox]')) {
            value = input.is(':checked');
            host.data[def.name].set(value, (value ? 'Yes' : 'No'));
        } else if (input.is('select')) {
            host.data[def.name].set(input.val(), input.children('option:selected').text());
        } else {
            value = input.val();
            host.data[def.name] = (value === '') ? null : value;
        }
    };

    function _input_event_update(host, input) {
        var def = input.data('def');
        if (def.change)
            _eval(host, def.change);
        if (def.update && (typeof def.update == 'string' || host.settings.update === true)) {
            var options = {
                originator: def.name,
                form: host.data.save()
            };
            if (typeof def.update == 'string') options.api = def.update;
            _post(host, 'update', options, false).done(function (response) {
                host.data.extend(response);
            });
        }
        if (host.events.show.length > 0) {
            for (x in host.events.show)
                _toggle(host, host.events.show[x]);
        }
        _validate_input(host, input);
    };

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
        var data = $.extend({}, host.data.save(true), { "site_url": hazaar.url() });
        if ((options = _match_replace(options, data)) === false) {
            select.empty().prop('disabled', true);
            host.data[def.name] = null;
            return;
        }
        select.html($('<option>').html('Loading...'));
        $.get((options.match(/^https?:\/\//) ? options : hazaar.url(options)))
            .done(function (data) {
                var item = host.data[def.name];
                var required = ('required' in def) ? _eval(host, def.required) : false;
                select.empty().prop('disabled', false);
                if (def.placeholder && (!required || item == null))
                    select.append($('<option>').attr('value', '').html(def.placeholder).prop('disabled', (required == true)));
                for (x in data)
                    select.append($('<option>').attr('value', x).html(data[x]));
                if (item && (item.value in data))
                    select.val(item.value);
                else
                    host.data[def.name] = null;
            }).error(_error);
        return true;
    };

    function _input_select_multi(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(def.label)
            .appendTo(group);
        var btnGroup = $('<div class="btn-group" data-toggle="buttons">')
            .attr('data-bind', def.name);
        var btnClass = def.class || 'default';
        for (x in def.options) {
            var active = (host.data[def.name].indexOf(x) > -1);
            var btn = $('<label class="btn btn-' + btnClass + ' ">')
                .toggleClass('active', active)
                .html([$('<input type="checkbox">').attr('value', x).prop('checked', active), def.options[x]])
                .attr('data-bind-value', x)
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
        if (def.justified) btnGroup.addClass('btn-group-justified');
        return group.append($('<div>').html(btnGroup));
    };

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
            .on('update', function (event) { _input_event_update(host, $(event.target)); })
            .appendTo(group);
        if (typeof def.options == 'string') {
            var matches = def.options.match(/\{\{\w+\}\}/g);
            for (x in matches) {
                var match = matches[x].substr(2, matches[x].length - 4);
                host.data.watch(match, function (key, value, select) {
                    _input_select_populate(host, select, false);
                }, select);
            }
            _input_select_populate(host, select.change(function (event) {
                _input_event_change(host, $(event.target));
            }));
        } else {
            var required = ('required' in def) ? _eval(host, def.required) : false;
            if (def.placeholder && (!required || host.data[def.name].value == null))
                select.append($('<option>')
                    .attr('value', '')
                    .html(def.placeholder)
                    .prop('disabled', (required == true)));
            for (x in def.options)
                select.append($('<option>')
                    .attr('value', x)
                    .html(def.options[x]));
            if (value = host.data[def.name])
                select.val(value.value).change(function (event) { _input_event_change(host, $(event.target)); });
        }
        return group;
    };

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
    };

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
                clearBtn: ((('required' in def) ? _eval(host, def.required) : false) !== true),
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
    };

    function _input_file(host, def) {
        var group = $('<div>').html('Not Yet!');
        return group;
    }

    function _input_lookup(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(def.label)
            .appendTo(group);
        var input_group = $('<div class="input-group">')
            .appendTo(group);
        var input = $('<input type="text" class="form-control">')
            .attr('data-bind', def.name)
            .attr('data-bind-label', true)
            .data('def', def)
            .attr('autocomplete', 'off')
            .appendTo(input_group)
            .focus(function (event) { _input_event_focus(host, $(event.target)); })
            .on('blur', function (event) {
                popup.css({ "opacity": "0" });
                setTimeout(function () {
                    if (popup.is(':visible')) {
                        popup.hide();
                        input.val(host.data[def.name].label);
                    }
                }, 500);
            });
        var value_input = $('<input type="hidden">')
            .attr('data-bind', def.name)
            .attr('name', def.name)
            .data('def', def)
            .appendTo(input_group);
        if (def.lookup && 'url' in def.lookup) {
            input.on('keyup', function (event) {
                var values = host.data.save(), query = '';
                var popup = input.parent().parent().children('.form-lookup-popup');
                var valueKey = def.lookup.value || 'id', labelKey = def.lookup.label || 'label';
                if (event.target.value == '') {
                    host.data[def.name].set(null);
                    return;
                }
                if ('startlen' in def.lookup && event.target.value.length < def.lookup.startlen) {
                    popup.hide();
                    return;
                }
                values[def.name] = event.target.value;
                if ((url = _match_replace(def.lookup.url, values)) === false) return;
                if ('query' in def.lookup && (query = _match_replace(def.lookup.query, values)) === false) return;
                popup.css({ "min-width": input.parent().outerWidth(), "opacity": "1" }).show();
                $.ajax({
                    method: def.lookup.method || 'GET',
                    url: (url.match(/^https?:\/\//) ? url : hazaar.url(url)),
                    data: query
                }).done(function (items) {
                    popup.empty();
                    if (items.length > 0) {
                        for (x in items)
                            popup.append($('<div class="form-lookup-item">').html(items[x][labelKey]).attr('data-value', items[x][valueKey]));
                    } else {
                        popup.append($('<div class="form-lookup-null">').html('No results...'));
                    }
                });
            });
            var popup = $('<div class="panel form-lookup-popup">')
                .html($('<div class="form-lookup-item">').html('Loading results...'))
                .hide()
                .appendTo(group).on('click', function (event) {
                    var target = $(event.target);
                    if (!target.is('.form-lookup-item'))
                        return;
                    host.data[def.name].set(target.attr('data-value'), target.text());
                    value_input.trigger('update');
                    popup.hide();
                });
        }
        if ('placeholder' in def)
            input.attr('placeholder', def.placeholder);
        input_group.append($('<div class="input-group-addon">')
            .html($('<i class="fa fa-search">')));
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
        if (host.data[def.name] && host.data[def.name].value) _validate_input(host, input);
        return group;
    };

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
        group.append(_form_field(host, { fields: fields }).addClass('itemlist-newitems').css({ 'margin-right': '100px' }));
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
    };

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
        } else if ('lookup' in def && def.type == 'text') {
            field = _input_lookup(host, def);

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
                case 'file':
                    field = _input_file(host, def);
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
    };

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
    };

    function _validate_field(host, name, sync) {
        var item = host.data[name], def = host.def.fields[name];
        if (sync === true) {
            delete def.valid;
            return {
                done: function (callback) {
                    var result = _validate_field(host, name);
                    if (result === true && 'validate' in def && 'api' in def.validate) {
                        _post(host, 'api', {
                            target: [def.validate.api, { "name": name, "value": item.value }],
                        }, false).done(function (response) {
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
        var required = ('required' in def) ? _eval(host, def.required) : false;
        if (required && !item)
            return { "field": name, "status": "required" };
        if ('format' in def && item) {
            if (!Inputmask.isValid(String(item.value), def.format))
                return { "field": name, "status": "bad_format", "format": def.format };
        }
        if ('validate' in def) {
            for (type in def.validate) {
                var data = def.validate[type];
                switch (type) {
                    case 'min':
                        if (parseInt(item.value) < data)
                            return { "field": name, "status": "too_small" };
                        break;
                    case 'max':
                        if (parseInt(item.value) > data)
                            return { "field": name, "status": "too_big" };
                        break;
                    case 'with':
                        var reg = new RegExp(data);
                        if (!(typeof item.value == 'string' && item.value.match(reg)))
                            return { "field": name, "status": "regex_failed", "pattern": data };
                        break;
                    case 'equals':
                        if (item.value !== data)
                            return { "field": name, "status": "not_equal" };
                        break;
                    case 'minlen':
                        if ((item instanceof dataBinderValue && (!item.value || item.value.length < data))
                            || (!item || item.length < data))
                            return { "field": name, "status": "too_short" };
                        break;
                    case 'maxlen':
                        if ((item instanceof dataBinderValue && (!item.value || item.value.length > data))
                            || (!item || item.length > data))
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
    };

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
        var data = host.data.save();
        $(host).trigger('saving', [data]);
        _post(host, 'post', { params: extra, form: data }, false).done(function (response) {
            if (response.ok) {
                if (response.params)
                    $.extend(host.settings.params, response.params);
                if (response.form) {
                    for (x in response.form)
                        host.data[x] = response.form[x];
                }
                host.posts = {}; //Reset the post cache so we get clean data after 
                $(host).trigger('saved', [response]);
            } else {
                $('<div>').html(response.reason).popup({
                    title: 'Save error',
                    buttons: [{ label: 'OK', "class": "btn btn-default" }]
                })
            }
        }).fail(_error);
        return true;
    };

    //Register events that are used to control the form functions
    function _registerEvents(host) {

    };

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
        var params = $.extend(true, {}, {
            name: host.settings.form,
            params: host.settings.params,
        }, postdata);
        return $.ajax({
            method: "POST",
            url: hazaar.url(host.settings.controller, 'interact/' + action),
            contentType: "application/json",
            data: JSON.stringify(params)
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
    };

    //Load all the dynamic bits
    function _load(host) {
        $.get(hazaar.url('hazaar/forms', 'load', { name: host.settings.form }, host.settings.encode)).done(function (response) {
            host.def = response;
            host.data = new dataBinder(_define(host.def.fields));
            $(host).trigger('load', [host.data.save()]);
            _post(host, 'load').done(function (response) {
                if (!response.ok)
                    return;
                for (x in response.form)
                    host.data[x] = response.form[x];
                $(host).trigger('data', [host.data.save()]);
                _nav(host, 0);
            });
        }).fail(_error);
    };

    function __initialise(host, settings) {
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
                __initialise(host, args[0]);
            }
        });
    };

    $.fn.hzForm.defaults = {
        "form": "default",
        "controller": "index",
        "encode": true,
        "cachedActions": ["api"]
    };

})(jQuery);

