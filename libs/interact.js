//Object.assign() Polyfill
if (typeof Object.assign !== 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) { // .length of function is 2
            'use strict';
            if (target === null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }
            var to = Object(target);
            for (let index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];

                if (nextSource !== null) { // Skip over if undefined or null
                    for (let nextKey in nextSource) {
                        // Avoid bugs when hasOwnProperty is shadowed
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

Array.fromObject = function (object) {
    if (typeof object !== 'object') return null;
    var array = [];
    for (let x in object) array.push(object[x]);
    return array;
};

Date.getLocalDateFormat = function () {
    let format = [], parts = [], sep = '/', matches = null;
    let date = (new Date(2001, 4, 9)).toLocaleDateString(); //Month is MONTH INDEX so 0 is January
    if ((matches = date.match(/\W/)) !== false) sep = matches[0];
    parts = date.split(sep);
    if (parseInt(parts[0]) === 2001) { //Check ISO format first
        format = ['yyyy', 'mm', 'dd'];
        sep = '-';
    } else {
        for (x in parts) {
            let zp = false, value = parseInt(parts[x]);
            if (parts[x][0] === "0") zp = true;
            if (value === 9) format.push(zp ? 'dd' : 'd');
            else if (value === 5) format.push(zp ? 'mm' : 'm');
            else if (value === 1) format.push('yy');
            else if (value === 2001) format.push('yyyy');
        }
    }
    return format.join(sep);
};

(function ($) {

    //Error capture method
    function _error(error) {
        if (typeof error === 'string') error = { str: error };
        else if (error instanceof Error) error = { status: 'JavaScript Error', str: error.message, line: error.lineNumber, file: error.fileName };
        else if ('done' in error) {
            if (!('responseJSON' in error)) error.responseJSON = JSON.parse(error.responseText);
            error = error.responseJSON.error;
        }
        $('<div>').css('text-align', 'left').html([
            $('<h4>').html(error.status),
            $('<div>').html(error.str).css({ 'font-weight': 'bold', 'margin-bottom': '15px' }),
            error.line ? $('<div>').html('Line: ' + error.line) : null,
            error.file ? $('<div>').html('File: ' + error.file) : null
        ]).popup({
            title: 'An error ocurred!',
            icon: 'danger',
            buttons: [
                { label: "OK", "class": "btn btn-default" }
            ]
        });
    }

    function _kv(obj, key) {
        return key.split('.').reduce(function (o, i) { return o[i]; }, obj);
    }

    function _is_int(def, value) {
        if (!('type' in def)) return value;
        var type = def.type.toLowerCase();
        if (type === 'array' && 'arrayOf' in def) type = def.arrayOf.toLowerCase();
        return type === 'int' || type === 'integer' ? value === '' ? null : parseInt(value) : value;
    }

    function _url(host, target) {
        target = _match_replace(host, target, null, true);
        return target.match(/^https?:\/\//) ? target : hazaar.url(target);
    }

    function _sort_data(data, field, labelKey, spacerKey) {
        if (!Array.isArray(data)) {
            console.warn('Attempting to sort object.  Sorting is only supported by arrays.');
            return data;
        }
        if (typeof field === 'string') {
            data.sort(function (a, b) {
                return a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
            });
        } else if (Array.isArray(field)) {
            var newdata = [];
            for (let x in field) {
                let newIndex = data.findIndex(function (element, index, array) {
                    return element[labelKey] === field[x];
                });
                if (newIndex !== -1) {
                    newdata.push(data[newIndex]);
                    data.splice(newIndex, 1);
                }
            }
            if (data.length > 0 && spacerKey) {
                let spacer = {};
                spacer[spacerKey] = '__spacer__';
                spacer[labelKey] = Array(10).join('&#x2500;');
                newdata.push(spacer);
            }
            data = newdata.concat(_sort_data(data, labelKey));
        }
        return data;
    }

    function _convert_data(data, valueKey, labelKey, def) {
        for (let x in data) {
            if (typeof data[x] !== 'object') {
                let newitem = {};
                newitem[valueKey] = _is_int(def, x);
                newitem[labelKey] = data[x];
                data[x] = newitem;
            }
        }
        if (!Array.isArray(data)) data = Array.fromObject(data);
        return data;
    }

    function _eval_code(host, evaluate, item_data, lvalue, no_return) {
        if (typeof evaluate === 'boolean') return evaluate;
        let code = '', values = host.data.save(true), keys = Object.keys(values).sort();
        for (let i in keys) {
            let key = keys[i];
            if (key === 'form') continue;
            var value = values[key];
            if (typeof value === 'string') value = '"' + value.replace(/"/g, '\\"').replace("\n", "\\n") + '"';
            else if (typeof value === 'object' || Array.isArray(value)) value = JSON.stringify(value);
            code += 'var ' + key + " = " + value + ";\n";
        }
        if (no_return !== true) code += "return ( " + evaluate.replace(/[\;\s]+$/, '') + " );";
        else code += evaluate;
        try {
            return new Function('form', 'tags', 'item', 'value', code)(host.data, host.tags, item_data, lvalue);
        } catch (e) {
            console.error('Failed to evaluate condition: ' + e);
            console.log(code);
        }
        return false;
    }

    function _eval(host, script, default_value, item_data, value) {
        if (typeof script === 'boolean') return script;
        if (typeof script === 'undefined') return typeof default_value === 'undefined' ? false : default_value;
        if (script.indexOf(';') !== -1)
            return _eval_code(host, script, item_data, value);
        var parts = script.split(/\s*(\&\&|\|\|)\s*/);
        for (let x = 0; x < parts.length; x += 2) {
            var matches = null;
            if (!(matches = parts[x].match(/([\w\.\(\)\'\"]+)\s*([=\!\<\>]+)\s*(.+)/))) {
                alert('Invalid evaluation script: ' + script);
                return;
            }
            parts[x] = matches[1] + ' ' + matches[2] + ' ' + matches[3];
        }
        return _eval_code(host, parts.join(' '), item_data, value);
    }

    function _nullify(host, def) {
        if (typeof def !== 'object' || def.protected || def.keep) return;
        if (typeof def.name === 'string') {
            let item_data = _get_data_item(host.data, def.name);
            if (item_data instanceof dataBinderValue) item_data.set(def.default || null, def.placeholder || null);
            else if (item_data instanceof dataBinder) item_data.empty();
        } else if ('fields' in def) {
            for (let x in def.fields) {
                var sdef = def.fields[x];
                if (sdef instanceof Array) {
                    _nullify(host, { fields: sdef });
                } else if (typeof sdef === 'string') {
                    let item_data = _get_data_item(host.data, sdef);
                    if (item_data instanceof dataBinderValue) item_data.set(def.default || null, def.placeholder || null);
                }
            }
        }
    }

    function _toggle_show(host, obj) {
        host.working = true;
        var toggle = _eval(host, obj.data('show'), true, obj.data('item')), def = obj.data('def');
        obj.toggle(toggle);
        if (!toggle) _nullify(host, def);
        host.working = false;
    }

    function _match_replace(host, str, extra, force, use_html) {
        if (!str) return null;
        while ((match = str.match(/\{\{([\W]*)([\w\.]+)\}\}/)) !== null) {
            var modifiers = match[1].split(''), value = host ? _get_data_item(host.data, match[2]) : null;
            if (value === null) value = match[2].substr(0, 5) === 'this.'
                ? _get_data_item(host.settings, match[2].substr(5))
                : _get_data_item(extra, match[2]);
            if (modifiers.indexOf('!') === -1
                && (value instanceof dataBinderValue ? value.value : value) === null
                && force !== true) return false;
            if (modifiers.indexOf('>') !== -1) use_html = false;
            var text = value instanceof dataBinderValue ? use_html === true && modifiers.indexOf(':') === -1 ? value : value.value : value;
            var out = use_html ? '<span data-bind="' + match[2] + '" data-bind-label="' + (modifiers.indexOf(':') === -1 ? 'true' : 'false') + '">' + text + '</span>' : text || '';
            str = str.replace(match[0], out);
        }
        return str;
    }

    function _get_data_item(data, name, isArray, value) {
        if (!(name && data)) return null;
        var parts = name.split(/[\.\[]/), item = data;
        for (let x in parts) {
            var key = parts[x];
            if (parts[x].slice(-1) === ']') key = parseInt(key.slice(0, -1));
            if (!(key in item)) {
                if (typeof value === 'undefined') return null;
                item[key] = parseInt(x) + 1 < parts.length ? {} : value;
            }
            if (isArray === true && item[key] instanceof dataBinderValue) item[key] = [];
            item = item[key];
        }
        return item;
    }

    function _make_required(host, def, field) {
        field.data('required', def.required)
            .toggleClass('required', _eval(host, def.required, true, field.data('item')))
            .children('label.control-label')
            .append($('<i class="fa fa-exclamation-circle form-required" title="Required">'));
        if (typeof def.required !== 'boolean') host.events.required.push(field);
    }

    function _make_showable(host, def, field) {
        field.data('show', def.show);
        if (typeof def.show !== 'boolean') host.events.show.push(field);
        _toggle_show(host, field);
    }

    //Input events
    function _input_event_change(host, input) {
        var def = input.data('def');
        var item_data = _get_data_item(host.data, input.attr('data-bind'));
        if (!item_data) return false;
        if (input.is('[type=checkbox]')) {
            let value = input.is(':checked');
            item_data.set(value, value ? 'Yes' : 'No');
        } else if (input.is('select')) {
            let value = input.val();
            if (value === '__hz_other') {
                item_data.set(null, null, item_data.other);
                var group = $('<div>').addClass(host.settings.styleClasses.inputGroup);
                var oInput = $('<input type="text" placeholder="Enter other option...">')
                    .addClass(host.settings.styleClasses.input)
                    .data('def', def)
                    .val(item_data.other)
                    .attr('data-bind', input.attr('data-bind'))
                    .attr('data-bind-other', true)
                    .change(function (event) { return _input_event_change(host, $(event.target)); })
                    .on('update', function (event, key, value) {
                        input.show();
                        group.remove();
                    }).appendTo(group);
                var button = $('<button class="btn btn-secondary" type="button">')
                    .html($('<i class="fa fa-times">'))
                    .click(function (e) {
                        group.remove();
                        item_data.other = null;
                        input.val('').show();
                    });
                if ('format' in def) oInput.inputmask(def.format);
                $('<span class="input-group-btn">').html(button).appendTo(group);
                input.hide().after(group);
                oInput.focus();
            } else item_data.set(_is_int(def, value));
        } else if (def.type === 'date' && 'format' in def) {
            var date = input.datepicker('getDate');
            item_data.set(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(), input.datepicker('getFormattedDate'));
        } else if (def.other === true) item_data.other = input.val();
        else item_data.value = _is_int(def, input.val());
        if (item_data.enabled() === false) return false;
        $(host).trigger('change', [item_data]);
        return false;
    }

    function _input_event_update(host, input, skip_validate) {
        var def = _form_field_lookup(host.def, typeof input === 'string' ? input : input.attr('data-bind'));
        if (!def) return;
        var update = def.update, cb_done = null, item_data = _get_data_item(host.data, def.name);
        if (typeof update === 'string') update = { "url": update };
        if (typeof input === 'object') {
            if (item_data && input.is('select') && item_data.enabled() === true && input.val() !== '__hz_other') {
                let other = input.children('option[value="' + item_data.value + '"]').data('other') || null;
                item_data.enabled(false);
                item_data.set(item_data.value, input.children('option:selected').text(), other);
            } else if (typeof update === 'boolean' || update && ('url' in update || host.settings.update === true)) {
                var options = {
                    originator: def.name,
                    form: host.data.save()
                };
                var check_api = function (host, update) {
                    var url = null;
                    if (typeof update === 'boolean')
                        return update;
                    if (typeof update !== 'object') return false;
                    if (!('enabled' in update)) update.enabled = true;
                    if ('when' in update) update.enabled = _eval(host, update.when, false, item_data.parent, item_data.value);
                    if (update.enabled) {
                        if (!('url' in update)) return true;
                        if ((url = _match_replace(host, update.url)) !== false) {
                            options.api = url;
                            return true;
                        }
                    }
                    return false;
                };
                if (check_api(host, update)) cb_done = function () {
                    _post(host, 'update', options, false).done(function (response) {
                        if (response.ok) {
                            host.data.extend(response.updates);
                            _validate_input(host, input);
                        }
                    }).fail(_error);
                };
            }
            if (skip_validate !== true) _validate_input(host, input);
        }
        if (item_data && item_data.enabled() && def.change) _eval_code(host, def.change, item_data.parent, item_data.value, true);
        if (!host.working && host.events.show && host.events.show.length > 0) {
            for (let x in host.events.show)
                _toggle_show(host, host.events.show[x]);
        }
        if (host.events.required && host.events.required.length > 0) {
            for (let x in host.events.required) {
                var field = host.events.required[x];
                field.toggleClass('required', _eval(host, field.data('required'), false, item_data.parent, item_data.value));
            }
        }
        if (host.events.disabled && host.events.disabled.length > 0) {
            for (let x in host.events.disabled) {
                var i = host.events.disabled[x];
                var disabled = _eval(host, i.data('disabled'), false, item_data.parent, item_data.value);
                i.prop('disabled', disabled);
            }
        }
        if (item_data) item_data.enabled(true);
        if ('save' in def && _eval(host, def.save, false)) _save(host, false).done(cb_done);
        else if (typeof cb_done === 'function') cb_done();
    }

    function _input_event_focus(host, input) {
        var def = input.data('def'), item_data = _get_data_item(host.data, input.attr('data-bind'));
        if (def.focus) _eval_code(host, def.focus, item_data.parent, item_data.value, true);
    }

    function _input_event_blur(host, input) {
        var def = input.data('def'), item_data = _get_data_item(host.data, input.attr('data-bind'));
        if (def.blur) _eval_code(host, def.blur, item_data.parent, item_data.value, true);
    }

    function _input_button(host, def) {
        var group = $('<div class="form-group-nolabel">').addClass(host.settings.styleClasses.group).data('def', def);
        var btn = $('<button type="button" class="btn">')
            .addClass(host.settings.styleClasses.input)
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
                var action = def.action ? def.action : def.change ? def.change : def.click;
                btn.click(function () { _eval_code(host, action, null, null, true); });
                break;
        }
        return group;
    }

    function _input_select_multi_items(host, data, container) {
        var def = container.data('def'), item_data = _get_data_item(host.data, def.name);
        if (data === null || Array.isArray(data) && data.length === 0) {
            item_data.empty();
            item_data.enabled(false);
            _input_event_update(host, def.name, true);
            return container.parent().hide();
        }
        var values = item_data.save(true);
        if (values) {
            var remove = values.filter(function (i) { return !(i in data); });
            for (let x in remove) item_data.remove(remove[x]);
        }
        var fChange = function () {
            var def = $(this.childNodes[0]).data('def'), value = _is_int(def, this.childNodes[0].value);
            var item_data = _get_data_item(host.data, def.name);
            var index = item_data.indexOf(value);
            if (this.childNodes[0].checked && index === -1)
                item_data.push({ '__hz_value': value, '__hz_label': this.childNodes[1].textContent });
            else
                item_data.unset(index);
        };
        var value = _get_data_item(host.data, def.name, true), items = [];
        var valueKey = def.options.value || 'value', labelKey = def.options.label || 'label';
        var disabled = def.protected === true || _eval(host, def.disabled, false);
        data = _convert_data(data, valueKey, labelKey, def);
        if ('sort' in def.options) {
            if (typeof def.options.sort === 'boolean') def.options.sort = labelKey;
            data = _sort_data(data, def.options.sort, labelKey);
        }
        if (def.buttons === true) {
            var btnClass = def.class || 'primary';
            for (let x in data) {
                let x_value = _is_int(def, data[x][valueKey]), label = data[x][labelKey];
                let active = item_data.indexOf(x_value) > -1, name = def.name + '_' + x_value;
                items.push($('<label class="btn">').addClass('btn-' + btnClass).html([
                    $('<input type="checkbox" autocomplete="off">')
                        .attr('name', name)
                        .attr('value', x_value)
                        .prop('checked', active)
                        .toggleClass('active', active)
                        .prop('disabled', disabled)
                        .attr('data-bind-value', x_value)
                        .data('def', def), label
                ]).toggleClass('active', active).change(fChange));
            }
            return container.addClass('btn-group').addClass('btn-group-toggle').html(items).parent().show();
        }
        if (!('columns' in def)) def.columns = 1;
        if (def.columns > 6) def.columns = 6;
        var col_width = Math.floor(12 / def.columns), per_col = Math.ceil(Object.keys(data).length / def.columns);
        var cols = $('<div class="row">'), column = 0;
        for (let col = 0; col < def.columns; col++)
            items.push($('<div>').addClass('col-md-' + col_width).toggleClass('custom-controls-stacked', def.inline));
        for (let x in data) {
            let iv = _is_int(def, data[x][valueKey]), il = data[x][labelKey];
            let active = value instanceof dataBinderArray && value.indexOf(iv) > -1, name = def.name + '_' + iv;
            let label = $('<div>').addClass(host.settings.styleClasses.chkDiv).html([
                $('<input type="checkbox">')
                    .addClass(host.settings.styleClasses.chkInput)
                    .attr('id', '__field_' + name)
                    .attr('value', iv)
                    .prop('checked', active)
                    .prop('disabled', disabled)
                    .data('def', def),
                $('<label>').addClass(host.settings.styleClasses.chkLabel)
                    .html(il)
                    .attr('for', '__field_' + name)
            ]).attr('data-bind-value', iv).change(fChange);
            if ('css' in def) label.css(def.css);
            items[column].append(label);
            if (items[column].children().length >= per_col) column++;
        }
        if ('cssClass' in def) cols.addClass(def.cssClass);
        item_data.enabled(true);
        _input_event_update(host, def.name, true);
        return container.html(cols.html(items)).parent().show();
    }

    function _input_select_multi_populate_ajax(host, options, container, track) {
        var postops = {};
        Object.assign(postops, options);
        if ((postops.url = _match_replace(host, postops.url, { "site_url": hazaar.url() })) === false) {
            return _input_select_multi_items(host, null, container);
        }
        if (track === true) _track(host);
        postops.url = _url(host, postops.url);
        $.ajax(postops).done(function (data) {
            if (typeof container.data('def') !== 'object') return _ready(host);
            _input_select_multi_items(host, data, container);
            _ready(host);
        }).fail(_error);
        return true;
    }

    function _input_select_multi_populate(host, options, container, track) {
        if (options !== null && typeof options === 'object' && 'url' in options) {
            var matches = options.url.match(/\{\{[\w\.]+\}\}/g), def = container.data('def');
            for (let x in matches) {
                var match = matches[x].substr(2, matches[x].length - 4);
                if (!(match in def.watchers)) def.watchers[match] = [];
                def.watchers[match].push(host.data.watch(match, function (key, value, container) {
                    _input_select_multi_populate_ajax(host, options, container, false);
                }, container));
            }
            return _input_select_multi_populate_ajax(host, options, container, track);
        }
        if (options instanceof dataBinderValue) {
            let o = typeof options.value === 'object' ? options.value : typeof options.other === 'object' ? options.other : null;
            return _input_select_multi_items(host, o, container);
        }
        _input_select_multi_items(host, options, container);
        return true;
    }

    function _input_select_multi(host, def) {
        var group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def), options = {};
        var label = $('<label>').addClass(host.settings.styleClasses.label)
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var container = $('<div>').data('def', def).appendTo(group);
        if (def.buttons === true) {
            $('<div>').html(container.addClass('btn-group')
                .attr('data-bind', def.name)
                .attr('data-toggle', 'buttons')
                .toggleClass('btn-group-justified', def.justified === true)
            ).appendTo(group);
        } else {
            container.attr('data-bind', def.name).attr('data-toggle', 'checks');
        }
        def.watchers = {};
        if (typeof def.options === 'string') {
            let match = def.options.match(/^\{\{([\w\.]+)\}\}$/);
            if (match !== null) {
                host.data.watch(match[1], function (key, item, container) {
                    _input_select_multi_populate(host, typeof item.value === 'object' ? item.value : typeof item.other === 'object' ? item.other : null, container);
                }, container);
                def.options = _get_data_item(host.data, match[1]);
            } else def.options = { url: def.options };
        }
        _input_select_options(host, def, container, null, function (select, options) {
            _input_select_multi_populate(host, options, select, true);
        });
        return group;
    }

    function _input_select_items(host, options, data, select, no_nullify) {
        var item_data = _get_data_item(host.data, select.attr('data-bind')), def = select.data('def');
        select.prop('disabled', !(def.disabled !== true && def.protected !== true));
        if (data === null || typeof data !== 'object' || Array.isArray(data) && data.length === 0 || Object.keys(data).length === 0) {
            if (no_nullify !== true) _nullify(host, def);
            if (item_data) item_data.enabled(false);
            _input_event_update(host, def.name, true);
            return select.empty().prop('disabled', true);
        }
        var valueKey = options.value || 'value', labelKey = options.label || 'label';
        select.empty().append($('<option>').attr('value', '').html(_match_replace(host, def.placeholder, null, true, true)));
        data = _convert_data(data, valueKey, labelKey, def);
        if ('sort' in options) {
            if (typeof options.sort === 'boolean') options.sort = labelKey;
            data = _sort_data(data, options.sort, labelKey, valueKey);
        }
        var default_item = item_data && item_data.value === null && 'default' in options ? options.default : null;
        for (let x in data) {
            if ('filter' in options && options.filter.indexOf(data[x][labelKey]) === -1) {
                delete data[x];
                continue;
            }
            var option = $('<option>').attr('value', data[x][valueKey])
                .html(labelKey.indexOf('{{') > -1
                    ? _match_replace(null, labelKey, data[x], true)
                    : data[x][labelKey]).appendTo(select);
            if (data[x][valueKey] === '__spacer__') option.prop('disabled', true).addClass('form-select-spacer');
            if ('other' in options && typeof options.other === 'string')
                option.data('other', options.other.indexOf('{{') > -1
                    ? _match_replace(null, options.other, data[x], true)
                    : data[x][options.other]);
            if (default_item !== null && data[x][labelKey] === default_item)
                item_data.set(data[x][valueKey], data[x][labelKey], data[x][options.other]);
        }
        if (item_data) {
            if ('other' in def && _eval(host, def.other) === true) {
                select.append($('<option>').attr('value', '__hz_other').html("Other"));
                if (item_data.value === null && item_data.other !== null)
                    select.val('__hz_other').change();
            }
            if (item_data.value && data.find(function (e, index, obj) {
                return e && e[valueKey] === item_data.value;
            })) {
                select.val(item_data.value);
                _input_event_update(host, select);
            } else {
                item_data.value = null;
                if (Object.keys(data).length === 1 && options.single === true) {
                    var item = data[Object.keys(data)[0]], key = _is_int(def, item[valueKey]);
                    if (item_data.value !== key) {
                        item_data.set(key, labelKey.indexOf('{{') > -1 ? _match_replace(null, labelKey, item, true) : item[labelKey]);
                        if ('other' in options && options.other in item) item_data.other = item[options.other];
                    }
                }
            }
            item_data.enabled(true);
        }
        return select;
    }

    function _input_select_populate_ajax(host, options, select, track, item_data) {
        var postops = {};
        Object.assign(postops, options);
        if ((postops.url = _match_replace(host, postops.url, item_data)) === false)
            return _input_select_items(host, options, null, select);
        if (track !== false) select.prop('disabled', true).html($('<option value selected>').html('Loading...'));
        postops.url = _url(host, postops.url);
        return $.ajax(postops).done(function (data) {
            if (typeof select.data('def') !== 'object') return;
            _input_select_items(host, options, data, select);
        }).fail(_error);
    }

    function _input_select_populate(host, options, select, track, item_data) {
        if (typeof options === 'string') {
            let match = options.match(/^\{\{([\w\.]+)\}\}$/);
            if (match !== null) {
                host.data.watch(match[1], function (key, item, select) {
                    _input_select_populate(host, item, select, track, item_data);
                }, select);
                options = _get_data_item(host.data, match[1]);
            } else options = { url: options };
        }
        if (options instanceof dataBinderValue) {
            let o = typeof options.value === 'object' ? options.value : typeof options.other === 'object' ? options.other : null;
            return _input_select_items(host, {}, o, select, o ? false : true);
        }
        if (!(options !== null && typeof options === 'object' && 'url' in options))
            return _input_select_items(host, options, options, select);
        var matches = options.url.match(/\{\{[\w\.]+\}\}/g), def = select.data('def');
        for (let x in matches) {
            var match = matches[x].substr(2, matches[x].length - 4);
            if (!(match in def.watchers)) def.watchers[match] = [];
            if (typeof item_data === 'undefined') item_data = host.data;
            def.watchers[match].push(item_data.watch(match, function (key, value, select) {
                _input_select_populate_ajax(host, options, select, true, item_data);
            }, select));
        }
        return _input_select_populate_ajax(host, options, select, track, item_data);
    }

    function _input_select_options(host, def, select, item_data, cb) {
        if (!('options' in def)) return false;
        var options = {};
        if (Array.isArray(def.options)) {
            for (let x in def.options) {
                if (!(typeof def.options[x] === 'object' && 'when' in def.options[x])) continue;
                if (_eval(host, def.options[x].when, null, item_data, item_data ? item_data.value : null)) {
                    options = 'items' in def.options[x] ? def.options[x].items : def.options[x];
                    break;
                }
            }
            if (select && 'watch' in def) {
                var watch_func = function (key, value, obj) {
                    _get_data_item(item_data, def.name).value = null;
                    if (typeof cb === 'function') cb(select, _input_select_options(host, def, null, this));
                };
                if (def.watch.substr(0, 5) === 'item.' && item_data)
                    item_data.watch(def.watch.substr(5), watch_func);
                else {
                    item_data = host.data;
                    host.data.watch(def.watch, watch_func);
                }
            }
        } else options = def.options;
        if (typeof cb === 'function') cb(select, options);
        return options;
    }

    function _input_select(host, def, populate) {
        var group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def);
        var label = $('<label>').addClass(host.settings.styleClasses.label)
            .attr('for', def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var select = $('<select>').addClass(host.settings.styleClasses.input)
            .attr('name', def.name)
            .data('def', def)
            .appendTo(group)
            .attr('data-bind', def.name);
        if (def.protected)
            select.prop('disabled', true);
        else select.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event) { return _input_event_update(host, $(event.target)); });
        def.watchers = {};
        if (!("placeholder" in def)) def.placeholder = host.settings.placeholder;
        if ('css' in def) select.css(def.css);
        if ('cssClass' in def) select.addClass(def.cssClass);
        _check_input_disabled(host, select, def);
        if (populate !== false) _input_select_options(host, def, select, null, function (select, options) {
            _input_select_populate(host, options, select);
        });
        return group;
    }

    function _input_checkbox(host, def) {
        var group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def);
        if ('title' in def) $('<label>').html(def.title).appendTo(group);
        var div = $('<div>').addClass(host.settings.styleClasses.chkDiv).appendTo(group);
        var item_data = _get_data_item(host.data, def.name);
        var input = $('<input type="checkbox">').addClass(host.settings.styleClasses.chkInput)
            .attr('name', def.name)
            .attr('id', '__hz_field_' + def.name)
            .attr('data-bind', def.name)
            .attr('checked', item_data ? item_data.value : false)
            .data('def', def)
            .appendTo(div);
        if (def.protected) input.prop('disabled', true);
        else input.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event) { return _input_event_update(host, $(event.target)); });
        $('<label>').addClass(host.settings.styleClasses.chkLabel)
            .html(_match_replace(host, def.label, null, true, true))
            .attr('for', '__hz_field_' + def.name)
            .appendTo(div);
        if ('css' in def) input.css(def.css);
        if ('cssClass' in def) input.addClass(def.cssClass);
        _check_input_disabled(host, input, def);
        return group;
    }

    function _input_datetime(host, def) {
        var item_data = _get_data_item(host.data, def.name);
        var group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def);
        var label = $('<label>').addClass(host.settings.styleClasses.label)
            .attr('for', '__hz_field_' + def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var input_group = $('<div class="date">').addClass(host.settings.styleClasses.inputGroup);
        var input = $('<input>').addClass(host.settings.styleClasses.input)
            .attr('type', def.type === 'datetime' ? 'datetime-local' : 'date')
            .attr('name', def.name)
            .attr('id', '__hz_field_' + def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .val(item_data)
            .appendTo(input_group);
        if (def.protected) input.prop('disabled', true);
        else input.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event) { return _input_event_update(host, $(event.target)); });
        var glyph = $('<div>').addClass(host.settings.styleClasses.inputGroupAppend)
            .html($('<span style="cursor: pointer;">').addClass(host.settings.styleClasses.inputGroupText)
                .html($('<i class="fa fa-calendar">')
                    .click(function () { input.focus(); })))
            .appendTo(input_group);
        if (def.format) {
            if (def.format === 'local') def.format = Date.getLocalDateFormat();
            def.__datepicker_options = $.extend({
                format: def.format,
                autoclose: true,
                forceParse: true,
                language: 'en',
                clearBtn: 'required' in def ? _eval(host, def.required) : false !== true,
                todayHighlight: true,
                updateViewDate: true
            }, def.dateOptions);
            input.attr('type', 'text')
                .attr('data-bind-label', 'true')
                .datepicker(def.__datepicker_options);
            if (item_data && item_data.value) {
                item_data.enabled(false);
                input.datepicker('setDate', new Date(item_data.value));
                item_data.enabled(true);
            }
            if (!def.placeholder) def.placeholder = def.format;
        }
        if (def.placeholder) input.attr('placeholder', def.placeholder);
        _check_input_disabled(host, input, def);
        if ('css' in def) input.css(def.css);
        if ('cssClass' in def) input.addClass(def.cssClass);
        return group.append(input_group);
    }

    function _input_file(host, def) {
        var item_data = _get_data_item(host.data, def.name);
        var group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def);
        var label = $('<label>').addClass(host.settings.styleClasses.label)
            .attr('for', '__hz_field_' + def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var input = $('<div>').attr('data-bind', def.name).data('def', def).attr('name', def.name).fileUpload({
            name: def.name,
            multiple: def.multiple || false,
            btnClass: def.btnClass || "btn btn-default",
            btnLabel: def.btnLabel || "Select",
            height: def.height || null,
            accept: def.accept || null,
            maxSize: def.maxSize || host.settings.maxUploadSize || null,
            autoAdd: false,
            autoRemove: false,
            select: function (files) {
                for (let x in files) {
                    host.deloads = host.deloads.filter(function (item) {
                        if (!(item.field === def.name && item.file.name === files[x].name))
                            return item;
                    });
                    host.uploads.push({ "field": def.name, "file": files[x] });
                    item_data.push(_objectify_file(files[x]), true);
                }
                _input_event_update(host, input);
            },
            remove: function (file) {
                file = _objectify_file(file);
                host.uploads = host.uploads.filter(function (item) {
                    if (!(item.field === def.name && item.file.name === file.name))
                        return item;
                });
                host.deloads.push({ "field": def.name, "file": file.name });
                item_data.unset(item_data.indexOf(function (item) { return item.name.value === file.name; }), true);
                _input_event_update(host, input);
                return true;
            }
        }).appendTo(group).on('push', function (event, field_name, value) {
            input.fileUpload('add', value.save());
        }).on('pop', function (event, field_name, value) {
            input.fileUpload('remove', value.save());
        });
        _post(host, 'fileinfo', { 'field': def.name }, true).done(function (response) {
            if (!response.ok) return;
            var item_data = _get_data_item(host.data, response.field);
            item_data.empty();
            for (let x in response.files) if (host.deloads.findIndex(function (e) {
                return e.field === response.field && e.file === response.files[x].name;
            }) < 0) item_data.push(_objectify_file(response.files[x]));
            for (let x in host.uploads) if (host.uploads[x].field === response.field) item_data.push(_objectify_file(host.uploads[x].file));
        }).fail(_error);
        return group;
    }

    function _input_lookup(host, def) {
        var item_data = _get_data_item(host.data, def.name);
        var group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def);
        var label = $('<label>').addClass(host.settings.styleClasses.label)
            .attr('for', '__hz_field_' + def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var input_group = $('<div>').addClass(host.settings.styleClasses.inputGroup)
            .appendTo(group);
        var input = $('<input type="text">').addClass(host.settings.styleClasses.input)
            .attr('data-bind', def.name)
            .attr('data-bind-label', true)
            .data('def', def)
            .attr('id', '__hz_field_' + def.name)
            .attr('autocomplete', 'off')
            .appendTo(input_group);
        if (def.protected)
            input.prop('disabled', true);
        else input.focus(function (event) { _input_event_focus(host, $(event.target)); })
            .on('blur', function (event) {
                var input = $(this), popup = input.parent().parent().children('.form-lookup-popup');
                var item_data = _get_data_item(host.data, input.attr('data-bind'));
                if (!item_data) item_data = input.parent().parent().parent().parent().data('item')[input.next().attr('name')];
                if (popup.length > 0) {
                    popup.css({ "opacity": "0" });
                    setTimeout(function () {
                        popup.hide().empty();
                        input.val(item_data.label);
                    }, 500);
                } else input.val(item_data.label);
            });
        var value_input = $('<input type="hidden">')
            .attr('data-bind', def.name)
            .attr('name', def.name)
            .data('def', def)
            .appendTo(input_group)
            .on('update', function (event) { _input_event_update(host, $(event.target)); });
        if ('css' in def) input.css(def.css);
        if ('cssClass' in def) input.addClass(def.cssClass);
        _check_input_disabled(host, input, def);
        if (def.lookup && 'url' in def.lookup) {
            input.on('keyup', function (event) {
                var input = $(this);
                if (event.keyCode > 47) {
                    delay(function () {
                        var query = '', popup = input.parent().parent().children('.form-lookup-popup');
                        var item_data = _get_data_item(host.data, input.attr('data-bind'));
                        var valueKey = def.lookup.value || 'value', labelKey = def.lookup.label || 'label';
                        if (!item_data) item_data = input.parent().parent().parent().parent().data('item')[input.next().attr('name')];
                        if (event.target.value === '')
                            return item_data.set(null);
                        if (popup.length === 0) {
                            popup = $('<div class="form-lookup-popup card">')
                                .appendTo(input.parent().parent())
                                .on('click', function (event) {
                                    var target = $(event.target), data = target.data('lookup');
                                    if (!(target.is('.list-group-item') && typeof target.attr('data-value') === 'string'))
                                        return false;
                                    item_data.set(target.attr('data-value'), target.text(),
                                        'other' in def.lookup && def.lookup.other in data ? data[def.lookup.other] : null);
                                    popup.hide();
                                });
                        }
                        if ('startlen' in def.lookup && event.target.value.length < def.lookup.startlen)
                            return popup.hide();
                        var values = { '__input__': event.target.value };
                        var listDIV = $('<ul class="list-group">').html($('<li class="list-group-item">').html('Loading results...'));
                        if ((url = _match_replace(host, def.lookup.url, values)) === false) return;
                        if ('query' in def.lookup && (query = _match_replace(host, def.lookup.query, values)) === false) return;
                        popup.css({ "min-width": input.parent().outerWidth(), "opacity": "1" })
                            .html(listDIV)
                            .show();
                        $.ajax({
                            method: def.lookup.method || 'GET',
                            url: _url(host, url),
                            data: query
                        }).always(function () {
                            listDIV.empty();
                        }).done(function (data) {
                            data = _convert_data(data, valueKey, labelKey, def);
                            if (Object.keys(data).length > 0) {
                                for (let x in data) {
                                    listDIV.append($('<li class="list-group-item">')
                                        .html(_kv(data[x], labelKey))
                                        .attr('data-value', _kv(data[x], valueKey))
                                        .data('lookup', data[x]));
                                }
                            } else listDIV.html($('<li class="list-group-item">').html('No results...'));
                        }).fail(function (r) {
                            listDIV.html($('<li class="list-group-item">').html('Error ' + r.status + ': ' + r.statusText));
                        });
                    }, host.settings.lookup.delay);
                } else {
                    var sClass = 'bg-primary';
                    var list = input.parent().parent().children('.form-lookup-popup').children('.list-group');
                    var selected = list.children('.' + sClass);
                    switch (event.key) {
                        case 'ArrowDown':
                            if (selected.length > 0) {
                                if (selected.next().length > 0) selected.removeClass(sClass).next().addClass(sClass);
                            } else list.children().first().addClass(sClass);
                            break;
                        case 'ArrowUp':
                            if (selected.prev().length > 0) selected.removeClass(sClass).prev().addClass(sClass);
                            else selected.addClass(sClass);
                            break;
                        case 'Home':
                            selected.removeClass(sClass);
                            list.children().first().addClass(sClass);
                            break;
                        case 'End':
                            selected.removeClass(sClass);
                            list.children().last().addClass(sClass);
                            break;
                        case 'Enter':
                            selected.click();
                            break;
                        case 'Escape':
                            list.parent().hide().empty();
                            break;
                        case 'Backspace':
                            if (input.val() !== '') break;
                        //falls through
                        case 'Delete':
                            item_data.empty();
                            break;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                }
            });
        }
        if ('placeholder' in def) input.attr('placeholder', def.placeholder);
        if (!def.protected) input_group.append($('<div>').addClass(host.settings.styleClasses.inputGroupAppend)
            .html($('<span>').addClass(host.settings.styleClasses.inputGroupText).html($('<i class="fa fa-search">'))));
        return group;
    }

    function _input_std(host, type, def) {
        var group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def);
        var label = $('<label>').addClass(host.settings.styleClasses.label)
            .attr('for', '__hz_field_' + def.name)
            .html(_match_replace(host, def.label, null, true, true))
            .appendTo(group);
        var input = null, item_data = _get_data_item(host.data, def.name);
        if (def.multiline) {
            input = $('<textarea>').addClass(host.settings.styleClasses.input);
            if ('height' in def) input.css('height', def.height);
        } else input = $('<input>').addClass(host.settings.styleClasses.input).attr('type', type);
        input.attr('name', def.name)
            .attr('id', '__hz_field_' + def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .val(item_data);
        if (def.protected) input.prop('disabled', true);
        else input.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event) { return _input_event_update(host, $(event.target)); });
        if (type === 'text' && 'validate' in def && 'maxlen' in def.validate) input.attr('maxlength', def.validate.maxlen);
        if ('format' in def) input.attr('type', 'text').inputmask(def.format);
        if ('placeholder' in def) input.attr('placeholder', def.placeholder);
        if ('css' in def) input.css(def.css);
        if ('cssClass' in def) input.addClass(def.cssClass);
        _check_input_disabled(host, input, def);
        if ('prefix' in def || 'suffix' in def) {
            var inputDIV = $('<div>').addClass(host.settings.styleClasses.inputGroup)
                .appendTo(group);
            if (def.prefix) inputDIV.append($('<div>')
                .addClass(host.settings.styleClasses.inputGroupPrepend)
                .html($('<span>').addClass(host.settings.styleClasses.inputGroupText)
                    .html(_match_replace(host, def.prefix, null, true, true))));
            inputDIV.append(input);
            if (def.suffix) inputDIV.append($('<div>').addClass(host.settings.styleClasses.inputGroupAppend)
                .html($('<span>').addClass(host.settings.styleClasses.inputGroupText)
                    .html(_match_replace(host, def.suffix, null, true, true))));
        } else group.append(input);
        if (item_data && item_data.value) _validate_input(host, input);
        return group;
    }

    function _field_to_html(layout, name) {
        if (Array.isArray(layout)) {
            for (let x in layout) layout[x] = _field_to_html(layout[x]);
            return layout;
        } else if ('fields' in layout) {
            for (let x in layout.fields) layout.fields[x] = _field_to_html(layout.fields[x], (name || layout.name) + '.' + x);
            return layout;
        }
        return { html: '<div data-bind="' + (name || layout.name) + '">', weight: layout.weight || 1 };
    }

    function _input_list(host, def) {
        var item_data = _get_data_item(host.data, def.name);
        var group = $('<div class="itemlist">').addClass(host.settings.styleClasses.group).data('def', def);
        if (!(item_data instanceof dataBinderArray)) return group;
        $('<h4>').addClass(host.settings.styleClasses.label).html(_match_replace(host, def.label, null, true, true)).appendTo(group);
        var layout = _resolve_field_layout(host, def.fields, def.layout);
        var template = $('<div class="itemlist-item">');
        if (_eval(host, def.allow_remove, true)) {
            template.append($('<div class="itemlist-item-rm">')
                .html($('<button type="button" class="btn btn-danger btn-sm">').html($('<i class="fa fa-minus">'))));
        }
        if (_eval(host, def.allow_add, true)) {
            var btn = $('<button type="button" class="btn btn-success btn-sm">')
                .html($('<i class="fa fa-plus">'));
            var fieldDIV = _form_field(host, { fields: layout })
                .addClass('itemlist-newitem')
                .attr('data-field', def.name);
            var sub_host = _get_empty_host(), new_item = new dataBinder(_define(def.fields));
            sub_host.data = new_item;
            sub_host.def = { fields: def.fields };
            fieldDIV.data('item', new_item).find('input').removeAttr('data-bind');
            fieldDIV.find('select').each(function (index, item) {
                var select = $(item), def = select.data('def');
                select.off('change').on('change', function () {
                    return _input_event_change(sub_host, $(this));
                }).off('update').on('update', function () {
                    return _input_event_update(sub_host, $(this));
                });
                if ('options' in def) _input_select_options(sub_host, def, select, new_item, function (select, options) {
                    _input_select_populate(sub_host, options, select);
                });
            });
            group.append($('<div class="itemlist-newitems">').html([$('<div class="itemlist-newitem-add">').html(btn), fieldDIV]));
            btn.click(function () {
                var data = fieldDIV.data('item'), valid = true;
                fieldDIV.find('input,select,textarea').each(function (index, item) {
                    if (!item.name) return;
                    var input = $(item), value = input.val(), def = input.data('def');
                    if (def.required && !value) {
                        input.toggleClass('is-invalid', true);
                        valid = false;
                        return;
                    }
                    if (input.is('select')) value = { __hz_value: value, __hz_label: input.children('option:selected').text() };
                    else if (def.type === 'date' && 'format' in def) {
                        let date = input.datepicker('getDate');
                        value = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
                    }
                    if (value) {
                        var sub_item_data = _get_data_item(data, item.name, false, value);
                        if (sub_item_data) sub_item_data.set(value);
                    }
                });
                if (!valid) return;
                item_data.push(data.save());
                fieldDIV.find('input,select,textarea').each(function (index, item) { $(item).val('').removeClass('is-invalid'); });
                _validate_input(host, group);
            });
        }
        if (_eval(host, def.allow_edit, false) !== true) layout = _field_to_html(layout);
        template.append(_form_field(host, { fields: layout }, null, false, false));
        item_data.watch(function (item) {
            var item_name = item.attr('data-bind'), item_data = _get_data_item(host.data, item_name);
            item.find('select,input').each(function (index, item) {
                var input = $(item), def = input.data('def');
                if (input.is('select')) {
                    if ('options' in def) _input_select_options(host, def, input, item_data, function (select, options) {
                        _input_select_populate(host, options, select, false, item_data);
                    });
                } else if (def.type === 'date' && 'format' in def) {
                    var child_item_data = item_data[def.name];
                    input.data('datepicker', null);
                    input.datepicker(def.__datepicker_options);
                    if (child_item_data && child_item_data.value) input.datepicker('setDate', new Date(child_item_data.value));
                }
            });
            $(item).find('.form-group').each(function (index, input) {
                var group = $(input), def = group.data('def');
                group.data('name', item_name + '.' + def.name)
                    .data('item', _get_data_item(host.data, item.attr('data-bind')));
                group.find('label').each(function (index, item) {
                    item.attributes['for'].value = item_name.replace(/\[|\]/g, '_') + def.name;
                });
                if ('required' in def) _make_required(host, def, group);
                if ('show' in def) _make_showable(host, def, group);
            });
        });
        group.append($('<div class="itemlist-items" data-bind-template="o">')
            .attr('data-bind', def.name)
            .data('template', template))
            .on('click', '.btn-danger', function (event) {
                var index = Array.from(this.parentNode.parentNode.parentNode.children).indexOf(this.parentNode.parentNode);
                item_data.unset(index);
            });
        return group;
    }

    function _check_input_disabled(host, input, def) {
        if (!('disabled' in def) || def.protected) return false;
        var item_data = _get_data_item(host.data, $(input).attr('data-bind'));
        input.prop('disabled', _eval(host, def.disabled, false, item_data ? item_data.parent : null));
        if (typeof def.disabled === 'string') host.events.disabled.push(input.data('disabled', def.disabled));
    }

    function _form_field_lookup(def, info) {
        if (info instanceof Object) def = 'name' in info ? $.extend({}, _form_field_lookup(def, info.name), info) : info;
        else {
            var parts = info.split(/[\.\[]/);
            for (let x in parts) {
                if (parts[x].slice(-1) === ']') continue;
                if (!("fields" in def && parts[x] in def.fields)) return null;
                def = def.fields[parts[x]];
            }
            def = $.extend({}, def, { name: info });
        }
        return def;
    }

    function _fix_subfield_options(name, field) {
        let rx = /\{\{(\w*)\}\}/g, replacer = function (match, item) {
            return '{{' + name + '.' + item + '}}';
        };
        if (Array.isArray(field.options))
            for (let x in field.options) _fix_subfield_options(name, field.options);
        else if (typeof field.options === 'object' && 'url' in field.options)
            field.options.url = field.options.url.replace(rx, replacer);
        else if (typeof field.options === 'string') field.options = field.options.replace(rx, replacer);
    }

    function _resolve_field_layout(host, fields, layout, name, a) {
        if (!layout) layout = Array.isArray(fields) ? $.extend(true, [], fields) : Object.keys(fields);
        for (let x in layout) {
            if (typeof layout[x] === 'string') layout[x] = { name: layout[x] };
            if (typeof layout[x] !== 'object') continue;
            if (Array.isArray(layout[x])) {
                layout[x] = { fields: _resolve_field_layout(host, fields, layout[x], name, a) };
            } else if ('name' in layout[x]) {
                var field = layout[x].name in fields ? fields[layout[x].name] : layout[x].name in host.def.fields ? host.def.fields[layout[x].name] : null;
                if (!field || field.hidden === true) continue;
                layout[x] = $.extend(true, {}, field, layout[x]);
                if (name) {
                    layout[x].name = name + (a ? '[' + layout[x].name + ']' : '.' + layout[x].name);
                    if ('options' in layout[x]) _fix_subfield_options(name, layout[x]);
                }
            } else if ('fields' in layout[x]) {
                if (!('layout' in layout[x])) layout[x].layout = Array.isArray(layout[x].fields) ? $.extend(true, [], layout[x].fields) : Object.keys(fields);
                layout[x].fields = _resolve_field_layout(host, fields, layout[x].layout, name, a);
            }
        }
        return layout;
    }

    function _form_field(host, info, p, populate, apply_rules, parent_item) {
        var def = null, field = null;
        if (info instanceof Array)
            info = { fields: info };
        if (!(def = _form_field_lookup(host.def, info))) return;
        if ('name' in def && 'default' in def) {
            let item_data = _get_data_item(host.data, def.name);
            if (item_data instanceof dataBinderArray && item_data.value === null) item_data.value = def.default;
        }
        if ('horizontal' in def) p = def.horizontal;
        if ('render' in def) {
            let item_data = _get_data_item(host.data, def.name);
            field = new Function('field', 'form', def.render)($.extend({}, def, { value: item_data.save(true) }), host);
            host.pageInputs.push(field);
        } else if ('fields' in def && def.type !== 'array') {
            var layout = _resolve_field_layout(host, def.fields, 'layout' in def ? $.extend(true, [], def.layout) : null, def.name);
            var length = layout.length, fields = [], col_width;
            var item_data = def.name ? _get_data_item(host.data, def.name) : parent_item;
            if (typeof p === 'undefined' || p === null) p = !('layout' in def && def.layout);
            for (let x in layout) {
                var item = layout[x];
                if (typeof item === 'string') item = _form_field_lookup(host.def, item);
                if (!item) continue;
                if (p && !Array.isArray(item)) {
                    if (!('weight' in item)) item.weight = 1;
                    length = length + (item.weight - 1);
                }
                if (info.protected === true && typeof item === 'object' && !Array.isArray(item)) item.protected = true;
                fields.push(item);
            }
            col_width = 12 / length;
            field = $('<div>').toggleClass('row', p).data('def', def);
            if ('label' in def) field.append($('<div class="col-md-12">').html($('<h5>').html(def.label)));
            for (let x in fields) {
                var field_width = col_width, child_field = _form_field(host, fields[x], !p, populate, apply_rules, item_data);
                if (fields[x] instanceof Object && 'weight' in fields[x])
                    field_width = Math.round(field_width * fields[x].weight);
                field.append($('<div>').toggleClass('col-lg-' + field_width, p).html(child_field));
            }
        } else if ('options' in def) {
            if (def.type === 'array')
                field = _input_select_multi(host, def);
            else
                field = _input_select(host, def, populate);
            host.pageInputs.push(field);
        } else if ('lookup' in def && def.type !== 'array') {
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
                case 'datetime':
                    field = _input_datetime(host, def);
                    break;
                case 'file':
                    field = _input_file(host, def);
                    break;
                case 'text':
                case 'string':
                default:
                    field = _input_std(host, def.type, def);
                    break;
            }
            host.pageInputs.push(field);
        } else {
            field = $('<div>');
        }
        if (parent_item) field.data('item', parent_item);
        if ('tip' in def) {
            field.children('label.control-label').append($('<i class="fa fa-question-circle form-tip">')
                .attr('data-title', def.tip)
                .tooltip({ placement: 'auto', html: true }))
                .on('show.bs.tooltip', function (e) {
                    var o = $(this).children('.form-tip');
                    o.attr('data-original-title', _match_replace(host, o.attr('data-title'), null, true, false)).tooltip('_fixTitle');
                });
        }
        if ('required' in def && apply_rules !== false) _make_required(host, def, field);
        if ('invalid' in def) field.append($('<div class="invalid-feedback">').html(def.invalid));
        if ('width' in def) field.width(def.width);
        if ('html' in def) {
            var html = def.html;
            if ('label' in def && field.children().length === 0) field.append($('<label>').addClass(host.settings.styleClasses.label).html(def.label));
            field.append($('<div>').html(_match_replace(host, html, null, true, true)));
        }
        if ('show' in def && apply_rules !== false) _make_showable(host, def, field);
        if ('hint' in def) field.append($('<small class="form-text text-muted">').html(_match_replace(host, def.hint, null, true, true)));
        if ('watch' in def) {
            if (!Array.isArray(def.watch)) def.watch = [def.watch];
            for (let x in def.watch) host.data.watch(def.watch[x], function (field) { _input_event_update(host, field); });
        }
        return field;
    }

    //Render a page section
    function _section(host, section, p) {
        var group = $('<div>');
        if (Array.isArray(section)) {
            var col_width = null;
            if (typeof p === 'undefined') p = true;
            if (p) {
                group.addClass('row');
                var length = section.length;
                for (let x in section) {
                    if (typeof section[x] !== 'object' || Array.isArray(section[x])) continue;
                    if (!('weight' in section[x])) section[x].weight = 1;
                    length = length + (section[x].weight - 1);
                }
                col_width = 12 / length;
            }
            for (let x in section)
                group.append($('<div>').toggleClass('col-lg-' + Math.round((section[x].weight || 1) * col_width), p).html(_section(host, section[x], !p)));
            return group;
        }
        if (typeof section !== 'object') return null;
        var fieldset = $('<fieldset class="col col-12">').data('def', section).appendTo(group);
        if (section.label)
            fieldset.append($('<legend>').html(_match_replace(host, section.label, null, true, true)));
        for (let x in section.fields)
            fieldset.append(_form_field(host, section.fields[x]));
        if ('show' in section) _make_showable(host, section, fieldset);
        return group.addClass('row');
    }

    //Render a page
    function _page(host, page) {
        if (typeof page !== 'object') return null;
        var form = $('<div>').addClass(host.settings.styleClasses.page).data('def', page), sections = [];
        if (page.label) form.append($('<h1>').html(_match_replace(host, page.label, null, true, true)));
        for (let x in page.sections) sections.push(_section(host, page.sections[x]));
        if (host.events.show.length > 0) for (let x in host.events.show) _toggle_show(host, host.events.show[x]);
        return form.append(sections);
    }

    function _page_init(host, pageno) {
        host.page = pageno;
        host.events = {
            show: [],
            required: [],
            disabled: [],
            change: {}
        };
        host.pageInputs = [];
        host.data.unwatchAll();
    }

    //Render the whole form
    function _render(host, data) {
        host.objects = {
            loader: $('<div class="forms-loader-container">').html($('<div>').addClass(host.settings.loaderClass)),
            container: $('<div>').addClass(host.settings.styleClasses.container).hide()
        };
        $(host).html([host.objects.loader, host.objects.container]);
    }

    //Navigate to a page
    function _nav(host, pageno, cbComplete, force) {
        if (force !== true && pageno === host.page) return false;
        var _page_nav = function (host, pageno) {
            _track(host);
            host.objects.container.empty();
            if (host.settings.singlePage) {
                _page_init(host, 0);
                for (let x in host.def.pages) host.objects.container.append(_page(host, host.def.pages[x]));
            } else {
                _page_init(host, pageno);
                host.objects.container.append(_page(host, host.def.pages[pageno]));
                $(host).trigger('nav', [host.page + 1, host.def.pages.length]);
            }
            host.data.resync();
            _ready(host);
            if (typeof cbComplete === 'function') cbComplete();
        };
        if (host.page !== null && pageno > host.page) {
            var page = host.def.pages[host.page];
            if ('validate' in page) {
                _validate_page(host).done(function (result, errors) {
                    if (result === true) {
                        if ('save' in page && _eval(host, page.save, false)) {
                            _save(host, false).done(function () { _page_nav(host, pageno); });
                        } else _page_nav(host, pageno);
                    } else $(host).trigger('validate', [result, errors]);
                });
                return;
            } else if ('save' in page && _eval(host, page.save, false)) {
                _save(host, false).done(function () { _page_nav(host, pageno); });
                return;
            }
        }
        return _page_nav(host, pageno);
    }


    function _validate_input(host, input) {
        var name = input.attr('data-bind');
        if (!name) return;
        return _validate_field(host, name).done(function (event, result, response) {
            input.toggleClass('is-invalid', result !== true)
                .toggleClass('border-warning', result === true && typeof response === 'object' && response.warning === true);
            $(host).trigger('validate_field', [name, result === true, result]);
        });
    }

    function _validation_error(name, def, status) {
        var error = { name: name, field: $.extend({}, def), status: status };
        return error;
    }

    function _validate_rule(host, name, item, def) {
        if (!(item && def)) return true;
        if ('show' in def) if (!_eval(host, def.show)) return true;
        var required = 'required' in def ? _eval(host, def.required) : false;
        var value = item instanceof dataBinderArray && item.length > 0 ? item : def.other && !item.value ? item.other : item.value;
        if (required && !value) return _validation_error(name, def, "required");
        if (typeof value === 'undefined' || value === null) return true; //Return now if there is no value and the field is not required!
        if ('format' in def && value && def.type !== 'date') {
            if (!Inputmask.isValid(String(value), def.format))
                return _validation_error(name, def, "bad_format");
        }
        if ('validate' in def) {
            for (let type in def.validate) {
                var data = def.validate[type];
                switch (type) {
                    case 'min':
                        if (parseInt(value) < data)
                            return _validation_error(name, def, "too_small");
                        break;
                    case 'max':
                        if (parseInt(value) > data)
                            return _validation_error(name, def, "too_big");
                        break;
                    case 'with':
                        var reg = new RegExp(data);
                        if (!(typeof value === 'string' && value.match(reg)))
                            return _validation_error(name, def, "regex_failed");
                        break;
                    case 'equals':
                        if (value !== data)
                            return _validation_error(name, def, "not_equal");
                        break;
                    case 'minlen':
                        if (item instanceof dataBinderValue && (!value || value.length < data)
                            || (!item || item.length < data))
                            return _validation_error(name, def, "too_short");
                        break;
                    case 'maxlen':
                        if (item instanceof dataBinderValue && (!value || value.length > data)
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
    }

    function _validate_field(host, name, extra) {
        var callbacks = [];
        setTimeout(function () {
            var def = typeof name === 'object' ? name : _form_field_lookup(host.def, name);
            if (def) {
                var item = _get_data_item(host.data, def.name);
                if (!item) return;
                if (def.protected || 'disabled' in def && _eval(host, def.disabled, false, item.parent)) {
                    for (let x in callbacks) callbacks[x](def.name, true, extra);
                } else if ('fields' in def) {
                    let childItems = def.type === 'array' ? item.save() : [item], childQueue = [], itemResult = [];
                    let result = _validate_rule(host, def.name, item, def);
                    if (result !== true || childItems.length === 0) {
                        for (let x in callbacks) callbacks[x](def.name, result, extra);
                    } else {
                        for (let i in childItems) {
                            for (let x in def.fields) {
                                if (!('name' in def.fields[x])) def.fields[x].name = x;
                                let fullName = def.name + '[' + i + '].' + x;
                                childQueue.push(fullName);
                                _validate_field({ data: item[i], def: def.fields, monitor: {} }, def.fields[x], fullName)
                                    .done(function (childName, result, fullName) {
                                        var index = childQueue.indexOf(fullName);
                                        if (index >= 0) childQueue.splice(index, 1);
                                        itemResult.push({ name: fullName, result: result });
                                        if (childQueue.length === 0) for (let x in callbacks) callbacks[x](def.name, itemResult, extra);
                                    });
                            }
                        }
                    }
                } else {
                    let result = _validate_rule(host, def.name, item, def);
                    if (item.value && result === true && 'validate' in def && 'url' in def.validate) {
                        var url = _match_replace(host, def.validate.url, { "__input__": item.value }, true);
                        _post(host, 'api', {
                            target: [url, { "name": def.name, "value": item.value }]
                        }, false).done(function (response) {
                            var result = response.ok === true ? true : _validation_error(def.name, def, response.reason || "api_failed(" + def.validate.url + ")");
                            if (callbacks.length > 0) for (let x in callbacks) callbacks[x](def.name, result, response);
                        }).fail(_error);
                    } else if (callbacks.length > 0) for (let x in callbacks) callbacks[x](def.name, result, extra);
                    if (def.name in host.monitor) for (let x in host.monitor[def.name]) host.monitor[def.name][x](result);
                }
            } else for (let x in callbacks) callbacks[x](name, false, extra);
        });
        return { done: function (callback) { if (typeof callback === 'function') callbacks.push(callback); return this; } };
    }

    function _validate_nav_field(field, error) {
        if (Array.isArray(field)) {
            for (let x in field)
                if (_validate_nav_field(field[x], error)) return true;
        } else {
            var name = typeof field === 'string' ? field : field.name;
            if (error.name === name) return true;
        }
        return false;
    }

    function _validate_nav(host, errors) {
        for (let p in host.def.pages) {
            for (let s in host.def.pages[p].sections) {
                for (let f in host.def.pages[p].sections[s].fields) {
                    for (let x in errors) {
                        if (_validate_nav_field(host.def.pages[p].sections[s].fields[f], errors[x])) {
                            var page = parseInt(p);
                            if (host.page !== page)
                                _nav(host, page, function () { _validate_page(host); });
                            return;
                        }
                    }
                }
            }
        }
    }

    //Run the data validation
    function _validate(host, fields) {
        var callbacks = [];
        setTimeout(function () {
            var queue = [], errors = [];
            if (typeof fields === 'undefined') {
                if (!('def' in host && 'fields' in host.def)) return;
                var _resolve_fields = function (def) {
                    if (!('fields' in def)) return;
                    var fields = [];
                    for (let x in def.fields) {
                        if ('fields' in def.fields[x] && def.fields[x].type !== 'array') {
                            var child_fields = _resolve_fields(def.fields[x]);
                            for (let y in child_fields) fields.push(x + '.' + child_fields[y]);
                        } else fields.push(x);
                    }
                    return fields;
                };
                fields = _resolve_fields(host.def);
            }
            for (let key in fields) {
                queue.push(fields[key]);
                _validate_field(host, fields[key]).done(function (name, result, response) {
                    var index = queue.indexOf(name);
                    if (index >= 0) queue.splice(index, 1);
                    if (!Array.isArray(result)) result = [{ name: name, result: result }];
                    for (let x in result) {
                        if (result[x].result !== true) errors.push(result[x].result);
                        $('[data-bind="' + result[x].name + '"]')
                            .toggleClass('is-invalid', result[x].result !== true)
                            .toggleClass('border-warning', result[x].result === true && typeof response === 'object' && response.warning === true);
                    }
                    if (queue.length === 0) for (let x in callbacks) callbacks[x](errors.length === 0, errors);
                });
            }
        });
        return { done: function (callback) { if (typeof callback === 'function') callbacks.push(callback); } };
    }

    function _validate_page(host) {
        var fields = [];
        for (let x in host.pageInputs) {
            var def = host.pageInputs[x].data('def');
            if (!def) continue;
            fields.push(def.name);
        }
        return _validate(host, fields);
    }

    //Signal that we're loading something and should show the loader.  MUST call _ready() when done.
    function _track(host) {
        host.objects.container.hide();
        host.objects.loader.show();
        host.loading++;
    }

    //Signal that everything is ready to go
    function _ready(host) {
        host.loading--;
        if (host.loading > 0 || host.page === null)
            return;
        host.objects.loader.hide();
        host.objects.container.show();
        $(host).trigger('ready', [host.def]);
    }

    //Save form data back to the controller
    //By default calls validation and will only save data if the validation is successful
    function _save(host, validate, extra) {
        var callbacks = { done: null };
        var save_data = function (host, extra) {
            var data = host.data.save();
            for (let x in host.def.fields) if (host.def.fields[x].protected === true) delete data[x];
            var params = { params: extra || {}, form: data };
            if ('saveURL' in host.settings) params.url = host.settings.saveURL;
            $(host).trigger('saving', [data, params]);
            _post(host, 'post', params, false).done(function (response) {
                if (!response.ok) {
                    return $(host).trigger('saverror', [{
                        error: { str: response.reason || "An unknown error occurred while saving the form!" }
                    }, params]);
                }
                if (response.params)
                    $.extend(host.settings.params, response.params);
                host.posts = {}; //Reset the post cache so we get clean data after 
                if (host.uploads.length > 0 || host.deloads.length > 0) {
                    $(host).trigger('attachStart', [host.uploads, host.deloads]);
                    _upload_files(host, function (result, queue) {
                        $(host).trigger('attachDone', [queue]);
                        if (result) {
                            $(host).trigger('save', [result, host.settings.params]);
                            if (callbacks.done) callbacks.done();
                        } else $(host).trigger('saverror', [{ error: { str: 'File upload failed' } }, params, queue]);
                    });
                } else {
                    $(host).trigger('save', [response.result, host.settings.params]);
                    if (callbacks.done) callbacks.done();
                }
            }).fail(function (error) {
                $(host).trigger('saverror', [error.responseJSON, params]);
            });
        };
        if (validate === true || typeof validate === 'undefined')
            _validate(host).done(function (result, errors) {
                if (result) save_data(host, extra);
                else {
                    $(host).trigger('saverror', [{ error: { str: "Validation failed!" }, validation: errors }]);
                    $(host).trigger('validate', [result, errors]);
                    if (host.settings.validateNav) _validate_nav(host, errors);
                }
            });
        else save_data(host, extra);
        return { done: function (callback) { if (typeof callback === 'function') callbacks.done = callback; } };
    }

    //Register events that are used to control the form functions
    function _registerEvents(host) {
        var errors = [];
        $(host).on('submit', function (e) {
            e.preventDefault();
            return false;
        });
    }

    function _objectify_file(file) {
        if (file instanceof File) {
            file = {
                lastModified: file.lastModified,
                lastModifiedDate: file.lastModifiedDate,
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file)
            };
        } else if (Array.isArray(file)) for (x in file) file[x] = _objectify_file(file[x]);
        else {
            let filename = /[^/]*$/.exec(file.url)[0];
            file.url = file.url.substr(0, file.url.length - filename.length) + encodeURIComponent(filename);
        }
        return file;
    }

    function _upload_files(host, done_callback) {
        if (host.deloads.length > 0) {
            let data = { name: host.settings.form, params: host.settings.params, remove: host.deloads };
            $.ajax({
                url: hazaar.url(host.settings.controller, 'detach'),
                method: 'POST',
                data: JSON.stringify(data),
                contentType: 'application/json'
            }).done(function (response) {
                if ('removed' in response)
                    host.deloads = host.deloads.filter(function (file) { return response.removed.indexOf(file.file) === false; });
                if (host.uploads.length === 0) done_callback(response.ok);
            });
        }
        if (host.uploads.length > 0) {
            var queue = { pending: [], working: [], attached: [], failed: [] };
            host.uploads.sort(function (a, b) {
                if (a.file.name === b.file.name) return 0;
                return a.file.name < b.file.name ? -1 : 1;
            });
            queue.pending = Object.assign([], host.uploads);
            _upload_file(host, queue, done_callback);
        }
    }

    function _upload_file(host, queue, done_callback) {
        while (queue.working.length < host.settings.concurrentUploads) {
            var fd = new FormData(), current = queue.pending.shift();
            if (!current) break;
            queue.working.push(current);
            fd.append('name', host.settings.form);
            fd.append('params', JSON.stringify(host.settings.params));
            fd.append('attachment[field]', current.field);
            fd.append('attachment[file]', current.file);
            $(host).trigger('fileStart', [current]);
            $.ajax({
                type: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                url: hazaar.url(host.settings.controller, 'attach'),
                upload_file: current,
                xhr: function () {
                    xhr = new XMLHttpRequest();
                    xhr.upload.onprogress = function (progress) {
                        $(host).trigger('fileProgress', [this.file, progress]);
                    };
                    xhr.upload.file = this.upload_file;
                    return xhr;
                }
            }).done(function (response) {
                var w = this.upload_file;
                host.uploads = host.uploads.filter(function (file) { return !(w.field === file.field && w.file.name === file.file.name); });
                $(host).trigger('fileDone', [w, response]);
            }).fail(function (xhr) {
                this.upload_file.failed = true;
                this.upload_file.response = xhr.responseJSON;
                $(host).trigger('fileError', [this.upload_file, xhr]);
            }).always(function () {
                var w = this.upload_file;
                queue.working = queue.working.filter(function (file) { return !(w.field === file.field && w.file.name === file.file.name); });
                if (w.failed === true) queue.failed.push(w); else queue.attached.push(w);
                if (queue.pending.length > 0) _upload_file(host, queue, done_callback);
                else if (queue.working.length === 0) done_callback(queue.failed.length === 0, queue);
            });
        }
    }

    function _post(host, action, postdata, track, sync) {
        if (track === true) _track(host);
        var params = $.extend(true, {}, {
            name: host.settings.form,
            params: host.settings.params
        }, postdata);
        return $.ajax({
            method: "POST",
            url: hazaar.url(host.settings.controller, 'interact/' + action),
            async: sync !== true,
            contentType: "application/json",
            data: JSON.stringify(params)
        }).always(function (response) {
            if (track === true) _ready(host);
            if ('data' in response) console.log(response.data);
        });
    }

    function _define(values) {
        if (!values) return;
        var data = {};
        for (let x in values) {
            if ("fields" in values[x] && values[x].type !== 'array') {
                data[x] = _define(values[x].fields);
            } else {
                if (!values[x].default) {
                    if (values[x].type === 'array' || values[x].type === 'file')
                        values[x].default = [];
                }
                data[x] = values[x].default ? values[x].default : null;
            }
        }
        return data;
    }

    function _prepare_field_definitions(host, fields, extra) {
        var prop_fields = ["disabled", "protected", "required", "change", "focus", "blur"]; //Fields that propagate
        for (let x in fields) {
            let itemExtra = extra ? $.extend(true, {}, extra) : null;
            if (typeof fields[x] === 'string') fields[x] = { type: fields[x], label: x };
            if (!('type' in fields[x]) && ('options' in fields[x] || 'lookup' in fields[x])) {
                fields[x].type = 'text';
            } else if ('type' in fields[x] && 'types' in host.def && fields[x].type in host.def.types) {
                let source_type = host.def.types[fields[x].type];
                fields[x] = jQuery.extend(true, {}, source_type, itemExtra, fields[x]);
                fields[x].type = source_type.type;
                fields[x].horizontal = false;
                //Propagate some field options
                itemExtra = {};
                for (i in prop_fields) if (prop_fields[i] in fields[x]) itemExtra[prop_fields[i]] = fields[x][prop_fields[i]];
            } else if (itemExtra) fields[x] = jQuery.extend(true, {}, itemExtra, fields[x]);
            if ('fields' in fields[x]) _prepare_field_definitions(host, fields[x].fields, itemExtra);
        }
    }

    function _load_scripts(host, scripts) {
        if (!Array.isArray(scripts)) scripts = [scripts];
        for (let x in scripts) {
            jQuery.ajax({
                url: hazaar.url(host.settings.controller, 'script/' + scripts[x]),
                dataType: 'script'
            }).fail(_error);
        }
    }

    function _load_definition(host) {
        return _post(host, 'init').done(function (response) {
            if (!response.ok) return;
            if ('form' in response) host.def = response.form;
            if ('tags' in response) host.tags = response.tags;
            if ('scripts' in host.def) _load_scripts(host, host.def.scripts);
            _prepare_field_definitions(host, host.def.fields);
            host.data = new dataBinder(_define(host.def.fields));
            $(host).trigger('load', [host.def]);
        }).fail(_error);
    }

    //Load all the dynamic bits
    function _load(host) {
        _load_definition(host).done(function (response) {
            _post(host, 'load').done(function (response) {
                if (!response.ok) return;
                host.data.extend(response.form);
                $(host).trigger('data', [host.data.save()]);
                _nav(host, 0);
            }).fail(_error);
        }).fail(_error);
    }

    function _get_empty_host(host) {
        if (typeof host === 'undefined') host = {};
        host.data = {};
        host.events = {};
        host.posts = {};
        host.page = null;
        host.working = false;
        host.pageInputs = [];
        host.loading = 0;
        host.uploads = [];
        host.deloads = [];
        host.monitor = {};
        return host;
    }

    function __initialise(host, settings) {
        //Define the default object properties
        _get_empty_host(host);
        host.settings = $.extend({}, $.fn.hzForm.defaults, settings);
        if (host.settings.concurrentUploads < 1) host.settings.concurrentUploads = 1;
        $(host).trigger('init');
        _registerEvents(host);
        _render(host);
        _load(host);
        form = host;
    }

    $.fn.hzForm = function () {
        var args = arguments;
        var host = this.get(0);
        switch (args[0]) {
            case 'info':
                var data = host.data.save(), info = {};
                for (let x in data)
                    info[x] = { label: host.def.fields[x].label, value: data[x] };
                return info;
            case 'data':
                return host.data;
            case 'def':
                return host.def;
        }
        return this.each(function (index, host) {
            if (host.settings) {
                switch (args[0]) {
                    case 'reload':
                        if (args[1] === true) _load(host);
                        else {
                            var values = host.data.save();
                            _load_definition(host).done(function () {
                                for (let x in values)
                                    host.data[x] = values[x];
                                _nav(host, host.page, null, true);
                            });
                        }
                        break;
                    case 'nav':
                    case 'navigate':
                    case 'page':
                        _nav(host, args[1]);
                        break;
                    case 'prev':
                        if (host.page > 0)
                            _nav(host, host.page - 1);
                        break;
                    case 'next':
                        if (host.page < host.def.pages.length - 1)
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
                            if ((typeof args[1] === 'undefined' && host.settings.validateNav === true
                                || args[1] !== false)
                                && !result) _validate_nav(host, errors);
                        });
                        break;
                    case 'monitor':
                        if (typeof args[2] === 'function') {
                            host.monitor[args[1]] = [args[2]];
                            _validate_field(host, args[1]);
                        }
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
        "loaderClass": "forms-loader",
        "validateNav": true,
        "lookup": { "delay": 300 },
        "concurrentUploads": 2,
        "styleClasses": {
            "container": "forms-container",
            "page": "form-page",
            "group": "form-group",
            "label": "control-label",
            "input": "form-control",
            "inputGroup": "input-group",
            "inputGroupPrepend": "input-group-prepend",
            "inputGroupText": "input-group-text",
            "inputGroupAppend": "input-group-append",
            "chkDiv": "custom-control custom-checkbox",
            "chkInput": "custom-control-input",
            "chkLabel": "custom-control-label"
        }
    };

})(jQuery);

$.fn.fileUpload = function () {
    var host = this.get(0);
    if (host.options) {
        switch (arguments[0]) {
            case 'add':
                host._add(arguments[1]);
                break;
            case 'remove':
                host._remove(arguments[1]);
                break;
            case 'list':
                return host.files;
        }
        return this;
    }
    host.files = [];
    host.options = $.extend({
        name: 'file',
        multiple: false,
        btnClass: 'btn btn-default',
        maxSize: 0,
        autoAdd: true,
        autoRemove: true
    }, arguments[0]);
    host._isIE = function () {
        return !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
    };
    host._add = function (file) {
        if (Array.isArray(file)) {
            if (host.options.multiple === true) for (let x in file) this._add(file[x]);
            return;
        } else if (typeof file !== 'object') file = { name: file, type: "text/text" };
        if (!('lastModifiedDate' in file)) file.lastModifiedDate = new Date(file.lastModified * 1000);
        host.files.push(file);
        if (host.o.dzwords) host.o.dzwords.hide();
        host.o.list.append($('<div class="dz-item">').html([
            host._preview(file),
            $('<div class="dz-size">').html(humanFileSize(file.size)),
            $('<div class="dz-detail">').html($('<a>').attr('href', file.url).attr('target', '_blank').html(file.name).attr('title', file.name)),
            $('<div class="dz-remove">').html($('<i class="fa fa-times">')).click(function (e) {
                var item = $(this).parent();
                if (typeof host.options.remove === 'function') host.options.remove(file);
                if (host.options.autoRemove) host._remove(item.data('file'));
                e.stopPropagation();
            })
        ]).data('file', file).click(function (e) { e.stopPropagation(); }));
    };
    host._remove = function (file) {
        this.files = this.files.filter(function (item) {
            return item.name !== file.name;
        });
        host.o.list.children().each(function (index, o) {
            var item = $(o), data = item.data('file');
            if (data && data.name === file.name) item.remove();
        });
        if (this.files.length === 0 && this.o.dzwords) this.o.dzwords.show();
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
            o.addClass('fileicon').attr('data-type', file.type.replace(/\./g, '_').replace(/\//g, '-'));
        return o;
    };
    host._checkexists = function (file) {
        for (let x in host.files) if (host.files[x].name === file.name) return true;
        return false;
    };
    host._checksize = function (file) {
        if (host.options.maxSize === 0 || file.size < host.options.maxSize)
            return true;
        return false;
    };
    host._add_files = function (fileArray) {
        var added = [], failed = [];
        if (!host.options.multiple && host.files.length > 0) return;
        for (let x = 0; x < fileArray.length; x++) {
            let file = fileArray[x];
            if (host._checkexists(file)) return;
            if (host._checksize(file)) {
                if (host.options.autoAdd) host._add(file);
                added.push(file);
            } else {
                failed.push(file);
            }
        }
        host.o.input.val(null);
        if (added.length > 0 && typeof host.options.select === 'function')
            host.options.select(added);
        if (failed.length > 0) {
            var filesP = $('<p>');
            for (let x in failed)
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
        if (this.o.dropzone) {
            this.o.dropzone.click(function (e) {
                if (!host.options.multiple && host.files.length > 0) return;
                host.o.input.click();
            });
            this.o.dropzone.on('dragenter', function (e) {
                e.preventDefault();
                e.stopPropagation();
            });
            this.o.dropzone.on('dragover', function (e) {
                host.o.dropzone.addClass('drag');
                e.preventDefault();
                e.stopPropagation();
            });
            this.o.dropzone.on('dragleave', function (e) {
                e.preventDefault();
                e.stopPropagation();
                host.o.dropzone.removeClass('drag');
            });
            this.o.dropzone.on('drop', function (e) {
                e.preventDefault();
                e.stopPropagation();
                host.o.dropzone.removeClass('drag');
                if (!host.options.multiple && host.files.length > 0) return;
                host._add_files(e.originalEvent.dataTransfer.files);
            });
        }
        //Fuck you Internet Explorer.  Why the fuck do people still use this piece of shit?
        if (host._isIE()) {
            host.o.input.click(function () {
                setTimeout(function () {
                    if (host.o.input.val().length > 0) host.o.input.change();
                }, 0);
            });
        }
        this.o.input.change(function (e) {
            if (!host.options.multiple && host.files.length > 0) return;
            host._add_files(e.target.files);
        });
        if (!this.options.multiple) {
            this.o.dzwords.click(function () {
                host.o.input.click();
            });
        }
    };
    host._render = function (host) {
        $(this).addClass('form-fileupload');
        this.o = {};
        this.o.input = $('<input type="file" class="form-control">').appendTo(host);
        if (host.options.accept) this.o.input.attr('accept', host.options.accept);
        this.o.list = $('<div class="dz-items">');
        if (host.options.multiple) {
            this.o.input.prop('multiple', true);
            host.o.dzwords = $('<div class="form-dropzone-words">').html('Drop files here or click to upload.');
            this.o.dropzone = $('<div class="form-dropzone">')
                .html([this.o.dzwords, this.o.list])
                .appendTo($(host).addClass('multiple'))
                .toggleClass('single', !host.options.multiple);
            if (host.options.height) this.o.dropzone.height(host.options.height);
        } else {
            host.o.dzwords = $('<button>').addClass(host.options.btnClass).html(host.options.btnLabel).appendTo($(host));
            this.o.list.appendTo($(host).addClass('single'));
        }
    };
    host._render(host);
    host._registerEvents();
    return this;
};

if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        value: function (predicate) {
            if (this === null) throw new TypeError('"this" is null or not defined');
            var o = Object(this), len = o.length >>> 0;
            if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
            var thisArg = arguments[1], k = 0;
            while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) return kValue;
                k++;
            }
            return undefined;
        },
        configurable: true,
        writable: true
    });
}

if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
        value: function (predicate) {
            if (this === null) throw new TypeError('"this" is null or not defined');
            var o = Object(this), len = o.length >>> 0;
            if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
            var thisArg = arguments[1], k = 0;
            while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) return k;
                k++;
            }
            return -1;
        },
        configurable: true,
        writable: true
    });
}