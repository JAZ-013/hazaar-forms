(function ($) {

    //Error capture method
    function _error(error) {
        if (typeof error === 'string') error = { str: error };
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

    function _url(host, target) {
        target = _match_replace(host, target, null, true);
        return (target.match(/^https?:\/\//) ? target : hazaar.url(target));
    };

    function _exec(host, type, field) {
        if (!(type in host.events && field in host.events[type]))
            return false;
        var obj = host.events[type][field];
        return _eval_code(host, obj.data(type));
    };

    function _eval_code(host, evaluate) {
        if (typeof evaluate === 'boolean') return evaluate;
        var code = '';
        if (evaluate.indexOf(';') < 0) {
            var values = host.data.save(true);
            for (var key in values) {
                if (key === 'form') continue;
                var value = values[key];
                if (typeof value === 'string') value = '"' + value.replace(/"/g, '\\"') + '"';
                else if (typeof value === 'object' || typeof value === 'array') value = JSON.stringify(value);
                code += 'var ' + key + " = " + value + ";\n";
            }
            return new Function('form', code + "\nreturn ( " + evaluate + " );")(host.data);
        }
        return new Function('form', evaluate)(host.data);
    };

    function _nullify(host, def) {
        if (typeof def !== 'object')
            return;
        if (def.name) {
            host.data[def.name] = (('default' in def) ? def.default : null);
            host.data[def.name].label = def.placeholder || '';
        }
        if (def.fields) {
            for (var x in def.fields) {
                var sdef = def.fields[x];
                if (sdef instanceof Array)
                    _nullify(host, { fields: sdef });
                else if (typeof sdef === 'object')
                    host.data[sdef.name] = null;
                else if (typeof sdef === 'string')
                    host.data[sdef] = null;
            }
        }
    };

    function _eval(host, script) {
        if (typeof script === 'boolean') return script;
        if (script.indexOf(';') != -1)
            return _eval_code(host, script);
        var parts = script.split(/(\&\&|\|\|)/);
        for (var x = 0; x < parts.length; x += 2) {
            var matches = null;
            if (!(matches = parts[x].match(/([\w\.]+)\s*([=\!\<\>]+)\s*(.+)/))) {
                alert('Invalid evaluation script: ' + script);
                return;
            }
            parts[x] = matches[1] + ' ' + matches[2] + ' ' + matches[3];
        }
        return _eval_code(host, parts.join(''));
    };

    function _toggle_show(host, obj) {
        var toggle = _eval(host, obj.data('show')), def = obj.data('def');
        obj.toggle(toggle);
        if (!toggle) _nullify(host, def);
    };

    function _match_replace(host, str, extra, force, use_html) {
        var values = $.extend({}, host.data.save(true), extra);
        while (match = str.match(/\{\{([\W]*)(\w+)\}\}/)) {
            var modifiers = match[1].split('');
            if (modifiers.indexOf('!') === -1
                && (!(match[2] in values) || values[match[2]] === null)
                && force !== true)
                return false;
            var out = (use_html ? '<span data-bind="' + match[2] + '">' + values[match[2]] + '</span>'
                : (modifiers.indexOf(':') === -1 ? values[match[2]] : host.data[match[2]]) || '');
            str = str.replace(match[0], out);
        }
        return str;
    };

    //Input events
    function _input_event_change(host, input) {
        var def = input.data('def');
        if (input.is('[type=checkbox]')) {
            var value = input.is(':checked');
            host.data[def.name].set(value, (value ? 'Yes' : 'No'));
        } else if (input.is('select')) {
            var value = input.val();
            if (value === '_hzForm_Other') {
                var group = $('<div class="input-group">');
                var oInput = $('<input type="text" class="form-control" placeholder="Enter other option...">')
                    .data('def', def)
                    .val(host.data[def.name].other)
                    .attr('data-bind', def.name)
                    .attr('data-bind-other', true)
                    .change(function (event) { _input_event_change(host, $(event.target)); })
                    .appendTo(group);
                var button = $('<button class="btn btn-secondary" type="button">')
                    .html($('<i class="fa fa-times">'))
                    .click(function (e) {
                        group.remove();
                        host.data[def.name] = null;
                        input.val('').show();
                    });
                if ('format' in def) oInput.inputmask(def.format);
                $('<span class="input-group-btn">').html(button).appendTo(group);
                input.hide().after(group);
                oInput.focus();
                host.data[def.name] = null;
            } else
                host.data[def.name].set(value, input.children('option:selected').text());
        } else if (def.other === true) {
            host.data[def.name].other = input.val();
        } else {
            host.data[def.name] = input.val();
        }
    };

    function _input_event_update(host, input) {
        var def = input.data('def');
        if (def.change)
            _eval_code(host, def.change);
        if (def.update && (typeof def.update === 'string' || host.settings.update === true)) {
            var options = {
                originator: def.name,
                form: host.data.save()
            };
            var check_api = function (api) {
                if (typeof api === 'string') {
                    if ((api = _match_replace(host, api)) === false)
                        return false;
                    options.api = api;
                }
                return true;
            };
            if (check_api(def.update)) {
                _post(host, 'update', options, false).done(function (response) {
                    if (response.ok)
                        host.data.extend(response.updates);
                }).fail(_error);
            }
        }
        if (host.events.show.length > 0) {
            for (var x in host.events.show)
                _toggle_show(host, host.events.show[x]);
        }
        if (host.events.required.length > 0) {
            for (var x in host.events.required) {
                var group = host.events.required[x];
                group.toggleClass('required', _eval_code(host, group.data('required')));
            }
        }
        if (host.events.disabled.length > 0) {
            for (var x in host.events.disabled) {
                var i = host.events.disabled[x];
                var disabled = _eval(host, i.data('disabled'));
                i.prop('disabled', disabled);
                if (disabled) i.val('').change();
            }
        }
        _validate_input(host, input);
    };

    function _input_event_focus(host, input) {
        var def = input.data('def');
        if (def.focus)
            _eval_code(host, def.focus);
    };

    function _input_event_blur(host, input) {
        var def = input.data('def');
        if (def.blur)
            _eval_code(host, def.blur);
    };

    function _input_button(host, def) {
        var group = $('<div class="form-group form-group-nolabel">').data('def', def);
        var btn = $('<button type="button" class="form-control btn">')
            .addClass(def.class || 'btn-default')
            .data('def', def)
            .appendTo(group);
        if (!('label' in def)) def.label = 'Button';
        btn.html(_match_replace(host, def.label, null, true, true));
        switch (def.action) {
            case "update":
                btn.click(function () { _input_event_update(host, btn); });
                break;
            case "link":
                btn.click(function () { document.location = _url(host, def.url); });
                break;
            default:
                btn.click(function () { _eval_code(host, def.action); });
                break;
        }
        return group;
    };

    function _input_select_multi_items(host, def, data) {
        var fChange = function () {
            var value = this.childNodes[0].value;
            var index = host.data[def.name].indexOf(value);
            if (this.childNodes[0].checked && index === -1)
                host.data[def.name].push({ '__hz_value': value, '__hz_label': this.childNodes[1].nodeValue });
            else
                host.data[def.name].remove(index);
        };
        var value = host.data[def.name], items = [];
        if (def.buttons === true) {
            var btnClass = def.class || 'primary';
            for (var x in data) {
                var active = (value instanceof dataBinderArray && value.indexOf(x) > -1), name = def.name + '_' + x;
                var label = $('<label class="btn">').addClass('btn-' + btnClass).html([
                    $('<input type="checkbox" autocomplete="off">')
                        .attr('value', x)
                        .prop('checked', active)
                        .attr('data-bind-value', x),
                    data[x]
                ]).toggleClass('active', active).change(fChange);
                items.push(label);
            }
            return items;
        }
        if (!('columns' in def)) def.columns = 1;
        if (def.columns > 6) def.columns = 6;
        var col_width = Math.floor(12 / def.columns), per_col = (Math.ceil(Object.keys(data).length / def.columns));
        var cols = $('<div class="row">'), column = 0;
        for (var col = 0; col < def.columns; col++)
            items.push($('<div>').addClass('col-md-' + col_width)
                .toggleClass('custom-controls-stacked', def.inline));
        for (var x in data) {
            var active = (value instanceof dataBinderArray && value.indexOf(x) > -1), name = def.name + '_' + x;
            var label = $('<label class="custom-control custom-checkbox">').html([
                $('<input class="custom-control-input" type="checkbox">').attr('value', x).prop('checked', active),
                $('<span class="custom-control-indicator">'),
                $('<span class="custom-control-description">').html(data[x])
            ]).attr('data-bind-value', x).change(fChange);
            items[column].append(label);
            if (items[column].children().length >= per_col) column++;
        }
        return cols.html(items);
    };

    function _input_select_multi_populate(host, container, track) {
        var def = container.data('def');
        var options = def.options;
        if ((options = _match_replace(host, options, { "site_url": hazaar.url() })) === false) {
            container.hide();
            host.data[def.name] = [];
            return;
        }
        if (track === true) _track(host);
        $.get(_url(host, options))
            .done(function (data) {
                var values = host.data[def.name].save(true);
                if (values) {
                    var remove = host.data[def.name].save(true).filter(function (i) { return !(i in data); });
                    for (var x in remove) host.data[def.name].remove(remove[x]);
                }
                container.html(_input_select_multi_items(host, def, data)).show();
                _ready(host);
            }).fail(_error);
        return true;
    };

    function _input_select_multi(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var container = $('<div>').data('def', def).appendTo(group);
        if (def.buttons === true) {
            $('<div>').html(container.addClass('btn-group')
                .attr('data-bind', def.name)
                .attr('data-toggle', 'buttons')
                .toggleClass('btn-group-justified', (def.justified === true))
            ).appendTo(group);
        } else {
            container.attr('data-bind', def.name).attr('data-toggle', 'checks');
        }
        if (typeof def.options === 'string') {
            var matches = def.options.match(/\{\{\w+\}\}/g);
            for (var x in matches) {
                var match = matches[x].substr(2, matches[x].length - 4);
                host.data.watch(match, function (key, value, container) {
                    _input_select_multi_populate(host, container, false);
                }, container);
            }
            _input_select_multi_populate(host, container, true);
        } else {
            container.empty().append(_input_select_multi_items(host, def, def.options));
        }
        return group;
    };

    function _input_select_populate(host, select, track) {
        var def = select.data('def'), options = def.options, postops = { url: null };
        if ((postops.url = _match_replace(host, options.url, { "site_url": hazaar.url() })) === false) {
            select.empty().prop('disabled', true);
            host.data[def.name] = (('default' in def) ? def.default : null);
            return;
        }
        select.html($('<option value selected>').html('Loading...'));
        postops.url = _url(host, postops.url);
        if ('method' in options) postops.method = options.method;
        if ('data' in options) postops.data = options.data;
        $.ajax(postops).done(function (data) {
            var item = host.data[def.name];
            var required = ('required' in def) ? _eval_code(host, def.required) : false;
            if (def.disabled !== true) select.empty().prop('disabled', false);
            select.append($('<option>').attr('value', '').html(def.placeholder));
            if ('value' in options || 'label' in options) {
                var valueKey = options.value || 'value', labelKey = options.label || 'label', newdata = {};
                for (var x in data) newdata[data[x][valueKey]] = data[x][labelKey];
                data = newdata;
            }
            for (var x in data)
                select.append($('<option>').attr('value', x).html(data[x]));
            if (def.other === true) {
                var otherOption = $('<option>').attr('value', '_hzForm_Other').html("Other");
                select.append(otherOption);
                if (item.value === null & item.other !== null)
                    select.val('_hzForm_Other').change();
            }
            if (item && (item.value in data)) select.val(item.value);
            else host.data[def.name] = null;
            if (Object.keys(data).length === 1 && def.options.single === true) host.data[def.name] = Object.keys(data)[0];
        }).fail(_error);
        return true;
    };

    function _input_select(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var select = $('<select class="form-control">')
            .attr('name', def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .focus(function (event) { _input_event_focus(host, $(event.target)); })
            .blur(function (event) { _input_event_blur(host, $(event.target)); })
            .on('update', function (event) { _input_event_update(host, $(event.target)); })
            .appendTo(group);
        if (!("placeholder" in def)) def.placeholder = host.settings.placeholder;
        _check_input_disabled(host, select, def);
        if (typeof def.options === 'string') def.options = { url: def.options };
        if ('url' in def.options) {
            var matches = def.options.url.match(/\{\{\w+\}\}/g);
            for (var x in matches) {
                var match = matches[x].substr(2, matches[x].length - 4);
                host.data.watch(match, function (key, value, select) {
                    _input_select_populate(host, select, false);
                }, select);
            }
            _input_select_populate(host, select.change(function (event) {
                _input_event_change(host, $(event.target));
            }));
        } else {
            var required = ('required' in def) ? _eval_code(host, def.required) : false;
            var value = host.data[def.name];
            var placeholder = $('<option>')
                .attr('value', '')
                .html(def.placeholder)
                .prop('selected', (value.value === null))
                .appendTo(select);
            for (var x in def.options)
                select.append($('<option>').attr('value', x).html(def.options[x]));
            select.change(function (event) { _input_event_change(host, $(event.target)); });
            if (def.other === true) {
                var otherOption = $('<option>').attr('value', '_hzForm_Other').html("Other");
                select.append(otherOption);
                if (value.value === null & value.other !== null)
                    select.val('_hzForm_Other').change();
            }
        }
        return group;
    };

    function _input_checkbox(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="custom-control custom-checkbox">').appendTo(group);
        var input = $('<input class="custom-control-input" type="checkbox">')
            .attr('name', def.name)
            .attr('data-bind', def.name)
            .attr('checked', host.data[def.name])
            .data('def', def)
            .focus(function (event) { _input_event_focus(host, $(event.target)); })
            .blur(function (event) { _input_event_blur(host, $(event.target)); })
            .change(function (event) { _input_event_change(host, $(event.target)); })
            .on('update', function (event) { _input_event_update(host, $(event.target)); })
            .appendTo(label);
        var indicator = $('<span class="custom-control-indicator">').appendTo(label);
        var label = $('<span class="custom-control-description">').html(_match_replace(host, def.label, null, true, true)).appendTo(label);
        _check_input_disabled(host, input, def);
        return group;
    };

    function _input_date(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
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
                clearBtn: ((('required' in def) ? _eval_code(host, def.required) : false) !== true),
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
        _check_input_disabled(host, input, def);
        return group.append(input_group);
    };

    function _input_file(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var input = $('<div>').fileUpload({
            name: def.name,
            multiple: def.multiple || false,
            btnClass: def.btnClass || null,
            height: def.height || null,
            maxSize: def.maxSize || host.settings.maxUploadSize || null,
            select: function (files) {
                for (var x in files)
                    host.uploads.push({ "field": def.name, "file": files[x] });
            },
            remove: function (file) {
                host.uploads = host.uploads.filter(function (item, index) {
                    if (!(item.field === def.name && item.file.name === file.name))
                        return item;
                });
                host.deloads.push({ "field": def.name, "file": file });
                return true;
            }
        }).appendTo(group);
        _post(host, 'fileinfo', { 'field': def.name }, true).done(function (response) {
            if (!response.ok) return;
            for (var x in response.files) input.fileUpload('add', response.files[x]);
        });
        return group;
    };

    function _input_lookup(host, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
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
                        popup.hide().empty();
                        input.val(host.data[def.name].label);
                    }
                }, 500);
            });
        var value_input = $('<input type="hidden">')
            .attr('data-bind', def.name)
            .attr('name', def.name)
            .data('def', def)
            .appendTo(input_group);
        _check_input_disabled(host, input, def);
        if (def.lookup && 'url' in def.lookup) {
            input.on('keyup', function (event) {
                var query = '', popup = input.parent().parent().children('.form-lookup-popup');
                var valueKey = def.lookup.value || 'value', labelKey = def.lookup.label || 'label';
                if (event.target.value === '')
                    return host.data[def.name].set(null);
                if ('startlen' in def.lookup && event.target.value.length < def.lookup.startlen)
                    return popup.hide();
                var values = { '__input__': event.target.value };
                if ((url = _match_replace(host, def.lookup.url, values)) === false) return;
                if ('query' in def.lookup && (query = _match_replace(host, def.lookup.query, values)) === false) return;
                popup.css({ "min-width": input.parent().outerWidth(), "opacity": "1" })
                    .html($('<ul class="list-group">').html($('<li class="list-group-item">').html('Loading results...')))
                    .show();
                $.ajax({
                    method: def.lookup.method || 'GET',
                    url: _url(host, url),
                    data: query
                }).done(function (items) {
                    var list = $('<div class="list-group">').appendTo(popup.empty());
                    if (items.length > 0) {
                        for (var x in items)
                            list.append($('<li class="list-group-item">')
                                .html(items[x][labelKey]).attr('data-value', items[x][valueKey]));
                    } else list.append($('<li class="list-group-item">').html('No results...'));
                });
            });
            var popup = $('<div class="form-lookup-popup card">')
                .hide()
                .appendTo(group).on('click', function (event) {
                    var target = $(event.target);
                    if (!(target.is('.list-group-item') && typeof target.attr('data-value') === 'string'))
                        return false;
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
    };

    function _input_std(host, type, def) {
        var group = $('<div class="form-group">').data('def', def);
        var label = $('<label class="control-label">')
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
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
        if (type === 'text' && 'validate' in def && 'maxlen' in def.validate) input.attr('maxlength', def.validate.maxlen);
        if ('format' in def) input.attr('type', 'text').inputmask(def.format);
        if ('placeholder' in def) input.attr('placeholder', def.placeholder);
        _check_input_disabled(host, input, def);
        if (('prefix' in def) || ('suffix' in def)) {
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
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var btn = $('<button type="button" class="btn btn-success btn-sm">')
            .html($('<i class="fa fa-plus">'));
        var fields = [], template = $('<div>');
        var t_container = $('<div class="row">').css({ 'margin-right': '100px' });
        var col_width = 12 / Object.keys(def.fields).length;
        template.append($('<div style="float: right;">')
            .html($('<button type="button" class="btn btn-danger btn-sm">').html($('<i class="fa fa-minus">')))).append(t_container);
        for (var x in def.fields) {
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
                    var input = $(item_1), value = input.val();
                    if (input.is('select')) value = { __hz_value: value, __hz_label: input.children('option:selected').text() };
                    data[item_1.name] = value;
                    $(item_1).val('');
                });
            });
            host.data[def.name].push(data);
        });
        group.append($('<div class="itemlist-items">').attr('data-bind', def.name).html($('<template>' + template[0].outerHTML + '</template>')))
            .on('click', '.btn-danger', function (event) {
                $(this).parent().parent().remove();
            });
        return group;
    };

    function _check_input_disabled(host, input, def) {
        if (!('disabled' in def)) return false;
        input.prop('disabled', _eval(host, def.disabled));
        if (typeof def.disabled === 'string')
            host.events.disabled.push(input.data('disabled', def.disabled));
    };

    function _form_field_lookup(host, info) {
        var def = null;
        if (info instanceof Object)
            def = $.extend({}, host.def.fields[info.name], info);
        else
            def = $.extend({}, host.def.fields[info], { name: info });
        return def;
    };

    function _form_field(host, info, p) {
        var def = null, field = null;
        if (info instanceof Array)
            info = { fields: info };
        if (!(def = _form_field_lookup(host, info))) return;
        if ('name' in def && 'default' in def && host.data[def.name].value === null)
            host.data[def.name] = def.default;
        if ('render' in def) {
            field = new Function('field', 'form', def.render)($.extend({}, def, { value: host.data[def.name].save(true) }), host);
            host.pageInputs.push(field);
        } else if (def.fields && def.type != 'array') {
            var length = def.fields.length, fields = [], col_width;
            if (typeof p === 'undefined') p = true;
            if (p) {
                for (var x in def.fields) {
                    var item;
                    if (Array.isArray(def.fields[x])) {
                        item = def.fields[x];
                    } else {
                        item = _form_field_lookup(host, def.fields[x]);
                        if (!item) continue;
                        if (!('weight' in item)) item.weight = 1;
                        length = length + (item.weight - 1);
                    }
                    fields.push(item);
                }
                col_width = (12 / length);
            } else fields = def.fields;
            field = $('<div>').toggleClass('row', p).data('def', def);
            for (var x in fields) {
                var field_width = col_width;
                if (fields[x] instanceof Object && ('weight' in fields[x]))
                    field_width = Math.round(field_width * fields[x].weight);
                field.append($('<div>').toggleClass('col-lg-' + field_width, p).html(_form_field(host, fields[x], !p)));
            }
        } else if ('options' in def) {
            if (def.type === 'array')
                field = _input_select_multi(host, def);
            else
                field = _input_select(host, def);
            host.pageInputs.push(field);
        } else if ('lookup' in def && def.type === 'text') {
            if (typeof def.lookup === 'string') def.lookup = { url: def.lookup };
            field = _input_lookup(host, def);
            host.pageInputs.push(field);
        } else if (def.type) {
            switch (def.type) {
                case 'button':
                    field = _input_button(host, def);
                    break;
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
            host.pageInputs.push(field);
        } else {
            field = $('<div>');
        }
        if ('tip' in def) {
            var item;
            if (def.type == 'boolean') item = field;
            else item = field.children('label');
            item.append($('<i class="fa fa-question-circle form-tip">')
                .attr('data-title', def.tip)
                .tooltip({ placement: 'auto', html: true }))
                .on('show.bs.tooltip', function (e) {
                    var o = $(this).children('.form-tip');
                    o.attr('data-original-title', _match_replace(host, o.attr('data-title'), null, true)).tooltip('_fixTitle');
                });
        }
        if ('required' in def) {
            field.children('label').append($('<i class="fa fa-exclamation-circle form-required" title="Required">'));
            if (_eval_code(host, def.required)) field.addClass('required');
            if (typeof def.required !== 'boolean') host.events.required.push(field.data('required', def.required));
        }
        if ('width' in def) field.width(def.width);
        if ('html' in def) {
            var html = def.html;
            while (match = html.match(/\{\{(\w+)\}\}/))
                html = html.replace(match[0], '<span data-bind="' + [match[1]] + '"></span>');
            field.append(html);
        }
        if ('show' in def) {
            if (typeof def.show === 'boolean')
                field.toggle(def.show);
            else
                host.events.show.push(field.data('show', def.show));
        }
        if ('hint' in def)
            field.append($('<small class="form-text text-muted">').html(_match_replace(host, def.hint, null, true, true)));
        return field;
    };

    //Render a page section
    function _section(host, section, p) {
        if (Array.isArray(section)) {
            var group = $('<div>'), col_width = null;
            if (typeof p === 'undefined') p = true;
            if (p) {
                group.addClass('row');
                var length = section.length;
                for (var x in section) {
                    if (typeof section[x] !== 'object' || Array.isArray(section[x])) continue;
                    if (!('weight' in section[x])) section[x].weight = 1;
                    length = length + (section[x].weight - 1);
                }
                col_width = (12 / length);
            }
            for (var x in section)
                group.append($('<div>').toggleClass('col-lg-' + Math.round((section[x].weight || 1) * col_width), p).html(_section(host, section[x], !p)));
            return group;
        }
        if (typeof section !== 'object') return null;
        var fieldset = $('<fieldset>').data('def', section);
        if (section.label)
            fieldset.append($('<legend>').html(_match_replace(host, section.label, null, true, true)));
        for (var x in section.fields)
            fieldset.append(_form_field(host, section.fields[x]));
        if ('show' in section) {
            if (typeof section.show === 'boolean')
                fieldset.toggle(section.show);
            else
                host.events.show.push(fieldset.data('show', section.show));
        }
        return fieldset;
    };

    //Render a page
    function _page(host, page) {
        if (typeof page !== 'object') return null;
        var form = $('<div class="form-page">').data('def', page), sections = [];
        host.events = {
            show: [],
            required: [],
            disabled: [],
            change: {}
        };
        host.pageInputs = [];
        host.data.unwatch();
        if (page.label) form.append($('<h1>').html(_match_replace(host, page.label, null, true, true)));
        for (var x in page.sections)
            sections.push(_section(host, page.sections[x]));
        if (host.events.show.length > 0) {
            for (var x in host.events.show)
                _toggle_show(host, host.events.show[x]);
        }
        return form.append(sections);
    };

    //Render the whole form
    function _render(host, data) {
        host.objects = {
            loader: $('<div class="forms-loader-container">').html($('<div>').addClass(host.settings.loaderClass)),
            container: $('<div class="forms-container">').hide()
        };
        $(host).html([host.objects.loader, host.objects.container]).css('min-height', '200px');
    };

    //Navigate to a page
    function _nav(host, pageno) {
        var _page_nav = function (host, pageno) {
            _track(host);
            host.objects.container.empty();
            if (host.settings.singlePage) {
                host.page = 0;
                for (var x in host.def.pages)
                    host.objects.container.append(_page(host, host.def.pages[x]));
            } else {
                host.page = pageno;
                host.objects.container.append(_page(host, host.def.pages[pageno]));
                $(host).trigger('nav', [host.page + 1, host.def.pages.length]);
            }
            host.data.resync();
            _ready(host);
        };
        if (host.page !== null && pageno > host.page) {
            var page = host.def.pages[host.page];
            if ('validate' in page) {
                _validate_page(host).done(function (result, errors) {
                    if (result === true) _page_nav(host, pageno);
                    else $(host).trigger('validate', [result, errors]);
                });
                return;
            }
        }
        return _page_nav(host, pageno);
    };


    function _validate_input(host, input) {
        var name = input.attr('name'), def = host.def.fields[name];
        if (!def) return true;
        _validate_field(host, name).done(function (name, result) {
            input.toggleClass('is-invalid', result !== true);
        });
    };

    function _validation_error(name, def, status) {
        var error = { name: name, field: $.extend({}, def), status: status };
        return error;
    };

    function _validate_rule(host, name, item, def) {
        if (!def) return true;
        if ('show' in def) if (!_eval(host, def.show)) return true;
        var required = ('required' in def) ? _eval_code(host, def.required) : false;
        if (required && !item.value && !(def.other && item.other)) return _validation_error(name, def, "required");
        if ('format' in def && item.value) {
            if (!Inputmask.isValid(String(item.value), def.format))
                return _validation_error(name, def, "bad_format");
        }
        if ('validate' in def) {
            for (var type in def.validate) {
                var data = def.validate[type];
                switch (type) {
                    case 'min':
                        if (parseInt(item.value) < data)
                            return _validation_error(name, def, "too_small");
                        break;
                    case 'max':
                        if (parseInt(item.value) > data)
                            return _validation_error(name, def, "too_big");
                        break;
                    case 'with':
                        var reg = new RegExp(data);
                        if (!(typeof item.value === 'string' && item.value.match(reg)))
                            return _validation_error(name, def, "regex_failed");
                        break;
                    case 'equals':
                        if (item.value !== data)
                            return _validation_error(name, def, "not_equal");
                        break;
                    case 'minlen':
                        if ((item instanceof dataBinderValue && (!item.value || item.value.length < data))
                            || (!item || item.length < data))
                            return _validation_error(name, def, "too_short");
                        break;
                    case 'maxlen':
                        if ((item instanceof dataBinderValue && (!item.value || item.value.length > data))
                            || (!item || item.length > data))
                            return _validation_error(name, def, "too_long");
                        break;
                    case 'custom':
                        if (!_eval_code(host, data))
                            return _validation_error(name, def, "custom");
                        break;
                }
            }
        }
        return true;
    };

    function _validate_field(host, name) {
        var callbacks = [];
        setTimeout(function () {
            var item = host.data[name], def = host.def.fields[name];
            var result = _validate_rule(host, name, item, def);
            if (result === true && 'validate' in def && 'api' in def.validate) {
                _post(host, 'api', {
                    target: [def.validate.url, { "name": name, "value": item.value }],
                }, false).done(function (response) {
                    var result = (response.ok === true) ? true : _validation_error(name, def, response.reason || "api_failed(" + def.validate.url + ")");
                    if (callbacks.length > 0) for (var x in callbacks) callbacks[x](name, result);
                });
            } else if (callbacks.length > 0) for (var x in callbacks) callbacks[x](name, result);
        });
        return { done: function (callback) { if (typeof callback === 'function') callbacks.push(callback); } };
    };

    function _validate_nav_field(field, error) {
        if (Array.isArray(field)) {
            for (var x in field)
                if (_validate_nav_field(field[x], error)) return true;
        } else {
            var name = (typeof field == 'string' ? field : field.name);
            if (error.name === name) return true;
        }
        return false;
    };

    function _validate_nav(host, errors) {
        for (var x in errors) {
            for (var p in host.def.pages) {
                for (var s in host.def.pages[p].sections) {
                    for (var f in host.def.pages[p].sections[s].fields) {
                        if (_validate_nav_field(host.def.pages[p].sections[s].fields[f], errors[x])) {
                            _nav(host, parseInt(p));
                            _validate_page(host);
                            return;
                        }
                    }
                }
            }
        }
    };

    //Run the data validation
    function _validate(host, fields) {
        var callbacks = [];
        setTimeout(function () {
            var queue = [], errors = [];
            if (typeof fields === 'undefined') {
                if (!('def' in host && 'fields' in host.def))
                    return;
                fields = Object.keys(host.def.fields);
            }
            for (var key in fields) {
                queue.push(fields[key]);
                _validate_field(host, fields[key]).done(function (name, result) {
                    var index = queue.indexOf(name);
                    if (index >= 0) queue.splice(index, 1);
                    if (result !== true) errors.push(result);
                    $('[data-bind="' + name + '"]').toggleClass('is-invalid', (result !== true));
                    if (queue.length === 0)
                        for (var x in callbacks) callbacks[x]((errors.length === 0), errors);
                });
            }
        });
        return { done: function (callback) { if (typeof callback === 'function') callbacks.push(callback); } };
    };

    function _validate_page(host) {
        var fields = [];
        for (var x in host.pageInputs) {
            var def = host.pageInputs[x].data('def');
            if (!def) continue;
            fields.push(def.name);
        }
        return _validate(host, fields);
    };

    //Signal that we're loading something and should show the loader.  MUST call _ready() when done.
    function _track(host) {
        host.objects.container.hide();
        host.objects.loader.show();
        host.loading++;
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
        var save_data = function (host, extra) {
            var data = host.data.save();
            var params = { params: extra, form: data };
            $(host).trigger('saving', [data]);
            _post(host, 'post', params, false).done(function (response) {
                if (response.ok) {
                    if (response.params)
                        $.extend(host.settings.params, response.params);
                    if (response.form) {
                        for (var x in response.form)
                            host.data[x] = response.form[x];
                    }
                    host.posts = {}; //Reset the post cache so we get clean data after 
                    if (host.uploads.length > 0 || host.deloads.length > 0) {
                        _upload_files(host).done(function (upload_response) {
                            if (upload_response.ok) {
                                host.uploads = [];
                                $(host).trigger('save', [host.settings.params]);
                            } else {
                                $('<div>').html(upload_response.reason).popup({
                                    title: 'Upload error',
                                    buttons: [{ label: 'OK', "class": "btn btn-default" }]
                                });
                                $(host).trigger('saverror', [upload_response.reason, params]);
                            }
                        }).fail(function (error) {
                            $(host).trigger('saverror', [error.responseJSON.error.str, params]);
                            _error(error);
                        });
                    } else {
                        $(host).trigger('save', [host.settings.params]);
                    }
                } else {
                    $('<div>').html(response.reason).popup({
                        title: 'Save error',
                        buttons: [{ label: 'OK', "class": "btn btn-default" }]
                    });
                    $(host).trigger('saverror', [response.reason, params]);
                }
            }).fail(function (error) {
                $(host).trigger('saverror', [error.responseJSON.error.str, params]);
                _error(error);
            });
        };
        if (validate === true || typeof validate === 'undefined')
            _validate(host).done(function (result, errors) {
                if (result) save_data(host, extra);
                else {
                    $(host).trigger('validate', [result, errors]);
                    _validate_nav(host, errors);
                }
            });
        else save_data(host, extra);
    };

    //Register events that are used to control the form functions
    function _registerEvents(host) {
        var errors = [];
        $(host).on('field_validation', function (e, name, result) {
            var index = host.validation.queue.indexOf(name);
            if (index >= 0) host.validation.queue.splice(index, 1);
            if (result !== true) errors.push(result);
            $('[data-bind="' + name + '"]').toggleClass('is-invalid', (result !== true));
            if (host.validation.queue.length === 0) {
                for (var x in host.validation.callbacks)
                    host.validation.callbacks[x](reulst);

                errors = [];
            }
        });
    };

    function _upload_files(host) {
        var fd = new FormData();
        fd.append('name', host.settings.form);
        fd.append('params', JSON.stringify(host.settings.params));
        if (host.deloads.length > 0)
            fd.append('remove', JSON.stringify(host.deloads));
        for (var x in host.uploads)
            fd.append(host.uploads[x].field + '[' + x + ']', host.uploads[x].file);
        return $.ajax({
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            url: hazaar.url(host.settings.controller, 'attach')
        });
    };

    function _post(host, action, postdata, track, sync) {
        if (track === true) _track(host);
        var params = $.extend(true, {}, {
            name: host.settings.form,
            params: host.settings.params,
        }, postdata);
        return $.ajax({
            method: "POST",
            url: hazaar.url(host.settings.controller, 'interact/' + action),
            async: (sync !== true),
            contentType: "application/json",
            data: JSON.stringify(params)
        }).always(function (response) {
            if (track === true) _ready(host);
        }).fail(_error);
    };

    function _define(values) {
        if (!values) return;
        var data = {};
        for (var x in values) {
            if (values[x].type === 'array' && !values[x].default) values[x].default = [];
            data[x] = values[x].default ? values[x].default : null;
        }
        return data;
    };

    function _load_definition(host) {
        return _post(host, 'init').done(function (response) {
            if (!response.ok) return;
            host.def = response.form;
            host.data = new dataBinder(_define(host.def.fields));
            $(host).trigger('load', [host.data.save()]);
        });
    };

    //Load all the dynamic bits
    function _load(host) {
        _load_definition(host).done(function (response) {
            _post(host, 'load').done(function (response) {
                if (!response.ok)
                    return;
                for (var x in response.form)
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
        host.pageInputs = [];
        host.loading = 0;
        host.uploads = [];
        host.deloads = [];
        $(host).trigger('init');
        _registerEvents(host);
        _render(host);
        _load(host);
    };

    $.fn.hzForm = function () {
        var args = arguments;
        var host = this.get(0);
        if (args[0] === 'info') {
            var data = host.data.save(), info = {};
            for (var x in data)
                info[x] = { label: host.def.fields[x].label, value: data[x] };
            return info;
        } else if (args[0] === 'data') {
            return host.data;
        }
        return this.each(function (index, host) {
            if (host.settings) {
                switch (args[0]) {
                    case 'reload':
                        var values = host.data.save();
                        _load_definition(host).done(function () {
                            for (var x in values)
                                host.data[x] = values[x];
                            _nav(host, host.page);
                        });
                        break;
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
                        _save(host, args[1], args[2]);
                        break;
                    case 'single':
                        host.settings.singlePage = Boolean(args[1]);
                        _nav(host, 0);
                        break;
                    case 'validate':
                        _validate(host).done(function (result, errors) {
                            $(host).trigger('validate', [result, errors]);
                            if (!result) _validate_nav(host, errors);
                        });
                        break;
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
        "singlePage": false,
        "placeholder": "Please select...",
        "loaderClass": "forms-loader"
    };

})(jQuery);

$.fn.fileUpload = function () {
    var host = this.get(0);
    if (host.options) {
        switch (arguments[0]) {
            case 'add':
                host._add(arguments[1]);
                break;
        }
        return this;
    }
    host.files = [];
    host.options = $.extend({ name: 'file', multiple: false, btnClass: 'btn-default', maxSize: 0 }, arguments[0]);
    host._add = function (file) {
        if (Array.isArray(file)) {
            if (host.options.multiple === true) for (var x in file) this._add(file[x]);
            return;
        }
        if (!('lastModifiedDate' in file)) file.lastModifiedDate = new Date(file.lastModified * 1000);
        host.files.push(file);
        host.o.dzwords.hide();
        host.o.list.append($('<div class="dz-item">').html([
            host._preview(file),
            $('<div class="dz-size">').html(humanFileSize(file.size)),
            $('<div class="dz-detail">').html(file.name),
            $('<div class="dz-remove">').html($('<i class="fa fa-times">')).click(function (e) {
                var item = $(this).parent();
                if (host._remove(item.data('file')))
                    item.remove();
                e.stopPropagation();
            })
        ]).data('file', file).click(function (e) { e.stopPropagation(); }));
    };
    host._remove = function (file) {
        if (!(typeof this.options.remove === 'function'
            && this.options.remove(file)))
            return false;
        this.files = this.files.filter(function (item) {
            return (item.name !== file.name);
        });
        if (this.files.length === 0) this.o.dzwords.show();
        return true;
    };
    host._preview = function (file) {
        var o = $('<div class="dz-preview">');
        if (file.preview)
            o.append($('<img>').attr('src', file.preview));
        else if (file instanceof File && file.type.substr(0, 5) === 'image') {
            var reader = new FileReader();
            reader.onload = function (event) {
                o.append($('<img>').attr('src', event.target.result));
            };
            reader.readAsDataURL(file);
        } else
            o.addClass('fileicon').attr('data-type', file.type.replace('/', '-'));
        return o;
    };
    host._checksize = function (file) {
        if (host.options.maxSize === 0 || file.size < host.options.maxSize)
            return true;
        return false;
    };
    host._add_files = function (array) {
        var fileArray = Array.from(array), added = [], failed = [];
        fileArray.forEach(function (file) {
            if (host._checksize(file)) {
                host._add(file);
                added.push(file);
            } else {
                failed.push(file);
            }
        });
        host.o.input.val(null);
        if (typeof host.options.select === 'function')
            host.options.select(added);

        if (failed.length > 0) {
            var filesP = $('<p>');
            for (var x in failed)
                filesP.append($('<strong>').html(failed[x].name));
            $('<div>').html([
                $('<p>').html('Failed to attach the following files:'),
                filesP,
                $('<p>').html('Files were too big as the maximum allowed file size is ' + humanFileSize(host.options.maxSize) + '.')
            ]).popup({
                title: "Bad Attachment",
                icon: "danger",
                buttons: [{ label: "OK", "class": "btn btn-danger" }]
            });
        }

    };
    host._registerEvents = function () {
        this.o.dropzone.click(function (e) {
            host.o.input.click();
        });
        this.o.dropzone.on('dragenter', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        this.o.dropzone.on('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        this.o.dropzone.on('drop', function (e) {
            host._add_files(e.originalEvent.dataTransfer.files);
            e.preventDefault();
            e.stopPropagation();
        });
        this.o.input.change(function (e) {
            host._add_files(e.target.files);
        });
    };
    host._render = function (host) {
        $(this).addClass('form-fileupload');
        this.o = {};
        this.o.input = $('<input type="file" class="form-control">').hide().appendTo(host);
        if (host.options.multiple) this.o.input.prop('multiple', true);
        host.o.dzwords = $('<div class="form-dropzone-words">').html('Drop files here or click to upload.');
        this.o.dropzone = $('<div class="form-dropzone">').html(this.o.dzwords).appendTo(host);
        if (host.options.height) this.o.dropzone.height(host.options.height);
        this.o.list = $('<div class="dz-items">').appendTo(this.o.dropzone);
    };
    host._render(host);
    host._registerEvents();
    return this;
};