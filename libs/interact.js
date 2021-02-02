var ud = undefined;

//Object.assign() Polyfill
if (typeof Object.assign !== 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) { // .length of function is 2
            'use strict';
            if (target === null) { // TypeError if undefined or null
                throw new TypeError('Cannot convert undefined or null to object');
            }
            let to = Object(target);
            for (let index = 1; index < arguments.length; index++) {
                let nextSource = arguments[index];

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

var hzIcons = {
    "exclamation-circle": [512, 512, "M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zm-248 50c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"],
    "question-circle": [512, 512, "M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zM262.655 90c-54.497 0-89.255 22.957-116.549 63.758-3.536 5.286-2.353 12.415 2.715 16.258l34.699 26.31c5.205 3.947 12.621 3.008 16.665-2.122 17.864-22.658 30.113-35.797 57.303-35.797 20.429 0 45.698 13.148 45.698 32.958 0 14.976-12.363 22.667-32.534 33.976C247.128 238.528 216 254.941 216 296v4c0 6.627 5.373 12 12 12h56c6.627 0 12-5.373 12-12v-1.333c0-28.462 83.186-29.647 83.186-106.667 0-58.002-60.165-102-116.531-102zM256 338c-25.365 0-46 20.635-46 46 0 25.364 20.635 46 46 46s46-20.636 46-46c0-25.365-20.635-46-46-46z"],
    "times": [352, 512, "M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"],
    "minus": [448, 512, "M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"],
    "plus": [448, 512, "M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"],
    "calendar": [448, 512, "M12 192h424c6.6 0 12 5.4 12 12v260c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V204c0-6.6 5.4-12 12-12zm436-44v-36c0-26.5-21.5-48-48-48h-48V12c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v52H160V12c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v52H48C21.5 64 0 85.5 0 112v36c0 6.6 5.4 12 12 12h424c6.6 0 12-5.4 12-12z"],
    "search": [512, 512, "M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"],
    "check-square": [448, 512, "M400 480H48c-26.51 0-48-21.49-48-48V80c0-26.51 21.49-48 48-48h352c26.51 0 48 21.49 48 48v352c0 26.51-21.49 48-48 48zm-204.686-98.059l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.248-16.379-6.249-22.628 0L184 302.745l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.25 16.379 6.25 22.628.001z"],
};

function _hz_icon(name, title, icons) {
    if (!icons) icons = hzIcons;
    if (!(name in icons)) return null;
    let icon = icons[name], svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "forms-icon");
    svg.setAttribute("viewBox", "0 0 " + icon[0] + " " + icon[1]);
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", icon[2]);
    svg.appendChild(path);
    if (title) svg.setAttribute('title', title);
    return $(svg);
}

Array.fromObject = function (object) {
    if (typeof object !== 'object') return null;
    let array = [];
    for (let x in object) array.push(object[x]);
    return array;
};

String.prototype.hash = function () {
    let hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
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
        for (let x in parts) {
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

dataBinder.prototype._commit = dataBinderArray.prototype._commit = function (items) {
    this._default = {};
    for (let x in items) {
        let value = items[x];
        if (value instanceof dataBinder || value instanceof dataBinderArray)
            value = items[x].commit();
        else if (value instanceof dataBinderValue)
            value = value.save();
        this._default[x] = value;
    }
    return this._default;
};

dataBinder.prototype.commit = function () {
    return this._commit(this._attributes);
};

dataBinderArray.prototype.commit = function () {
    return this._commit(this._elements);
};

dataBinder.prototype.reset = function () {
    if (!this._default) return false;
    for (let x in this._attributes) if (!(x in this._default)) this.remove(x);
    for (let x in this._default) {
        if (this._attributes[x] instanceof dataBinder || this._attributes[x] instanceof dataBinderArray)
            this._attributes[x].reset();
        else this[x] = this._default[x];
    }
    return true;
};

dataBinderArray.prototype.reset = function () {
    if (!this._default) return false;
    this._elements = [];
    for (let x in this._default) this._elements[x] = this.__convert_type(x, this._default[x]);
    this.resync();
    return true;
};

dataBinder.prototype.diff = function (data, callback) {
    if (data === null || typeof data !== 'object') return;
    if (!(data instanceof dataBinder)) data = new dataBinder(data, null, null, 'form-differential-analysis');
    for (let key in this._attributes) {
        let value = (!(key in data)) ? null : data[key].value;
        if (this._attributes[key] instanceof dataBinder || this._attributes[key] instanceof dataBinderArray) this._attributes[key].diff(value, callback);
        else if (this._attributes[key] instanceof dataBinderValue && this._attributes[key].value !== value) callback(this._attributes[key], value);
    }
};

dataBinderArray.prototype.diff = function (data, callback) {
    if (!(data && typeof data === 'object')) return;
    for (let key in this._elements) {
        if (!(key in data)) data[key] = null;
        if (this._elements[key] instanceof dataBinder) this._elements[key].diff(data[key], callback);
    }
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

    function _guid() {
        return 'yxxx-yxxx-yxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0, v = c === 'x' ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    }

    function _kv(obj, key) {
        return key.split('.').reduce(function (o, i) { return o[i]; }, obj);
    }

    function _is_object(o) {
        return o !== null && typeof o === 'object' && !Array.isArray(o);
    }

    function _strbool(value) {
        if (_is_object(value)) return false;
        value = value.toString().trim().toLowerCase();
        if (value === 't' || value === 'true' || value === 'on' || value === 'yes' || value === 'y' || value === 'ok') return 'true';
        else if (RegExp('/^(\!|not)\s*null$/').test(value)) return 'true';
        else if (parseInt(value) === 1) return 'true';
        return 'false';
    }

    function _boolify(value) {
        return _strbool(value) === 'true' ? true : false;
    }

    function _copy_to_clipboard(input, target) {
        let i = input.get(0);
        let o = document.createElement('INPUT');
        o.style.position = 'absolute';
        o.style.left = -999;
        document.body.appendChild(o);
        o.setAttribute('value', i.value);
        o.select();
        document.execCommand("copy");
        o.parentNode.removeChild(o);
        let tip = $(target).tooltip({ title: "Copied!", trigger: "manual" }).tooltip('show');
        setTimeout(function () { tip.tooltip('dispose'); }, 3000);
    }

    function _icon(host, name, title) {
        return _hz_icon(name, title, host.settings.icons);
    }

    function _convert_data_type(def, value) {
        if (!('type' in def)) return value;
        let type = def.type.toLowerCase();
        if (type === 'array' && 'arrayOf' in def) type = def.arrayOf.toLowerCase();
        if (typeof value === 'string' && value === '') return null;
        if (type === 'int' || type === 'integer')
            value = parseInt(value);
        else if (type === 'text' || type === 'string')
            value = value.toString().trim();
        else if (type === 'bool' || type === 'boolean')
            value = _boolify(value);
        else if (type === 'float' || type === 'number' || type === 'double' || type === 'money')
            value = parseFloat(value.replace(/\,/g, ''));
        return value;
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
            let newdata = [];
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

    function _convert_data(dataIn, valueKey, labelKey, def, index) {
        if ('options' in def && _is_object(def.options) && 'in' in def.options) dataIn = _get_data_item(dataIn, def.options.in);
        if (dataIn === null || typeof dataIn !== 'object' || Array.isArray(dataIn) && dataIn.length === 0 || Object.keys(dataIn).length === 0) return null;
        if (!Array.isArray(dataIn) && typeof dataIn[Object.keys(dataIn)[0]] !== 'string') {
            let nd = [];
            def.options = { data: dataIn, group: { key: 'group', data: {} } };
            for (let g in dataIn) {
                def.options.group.data[g] = g;
                for (let x in dataIn[g]) nd.push({ [valueKey]: _convert_data_type(def, x), [labelKey]: dataIn[g][x], group: g });
            }
            dataIn = nd;
        }
        let group = ('options' in def && _is_object(def.options) && 'group' in def.options && 'key' in def.options.group) ? def.options.group : null, dataOut = group ? {} : [];
        for (let x in dataIn) {
            let newitem = {};
            if (dataIn[x] && _is_object(dataIn[x])) newitem = dataIn[x];
            else {
                newitem[valueKey] = _convert_data_type(def, x);
                newitem[labelKey] = dataIn[x];
            }
            if (group) {
                let key = group.data && newitem[group.key] in group.data ? group.data[newitem[group.key]] : newitem[group.key];
                if (!(key in dataOut)) dataOut[key] = [];
                dataOut[key].push(newitem);
            } else dataOut.push(newitem);
            if (_is_object(index)) index[newitem[valueKey]] = newitem[labelKey];
        }
        return dataOut;
    }

    function _eval_code(host, evaluate, item_data, key, inc_return) {
        let code = '';
        if (typeof host.eval_cache === 'string') code = host.eval_cache;
        else {
            let values = host.data.save(true), keys = Object.keys(values).sort();
            for (let i in keys) {
                let key = keys[i];
                if (key === 'form') continue;
                let value = values[key];
                if (typeof value === 'string') value = '"' + value.replace(/"/g, '\\"').replace("\n", "\\n") + '"';
                else if (typeof value === 'object' || Array.isArray(value)) value = JSON.stringify(value);
                code += 'let ' + key + " = " + value + ";\n";
            }
            if (host.eval_cache === true) host.eval_cache = code;
        }
        if (item_data) {
            code += 'let value = ' + JSON.stringify(item_data.save(true)) + ";\n";
            code += 'let item = ' + JSON.stringify(item_data.parent.save(true)) + ";\n";
        }
        if (inc_return === true) code += "return ( " + evaluate.replace(/[\;\s]+$/, '') + " );";
        else code += evaluate;
        try {
            let eval_host = host.parent ? host.parent : host;
            return (new Function('form', 'tags', 'formValue', 'formItem', 'key', code))
                .call(this, eval_host.data, eval_host.tags, item_data ? item_data : null, item_data ? item_data.parent : null, key);
        } catch (e) {
            console.error('Failed to evaluate condition: ' + evaluate);
            console.error(e);
        }
        return false;
    }

    function _eval(host, script, default_value, item_data, key) {
        if (typeof script === 'boolean') return script;
        if (typeof script === 'undefined') return typeof default_value === 'undefined' ? false : default_value;
        return _eval_code(host, script, item_data, key, true);
    }

    function _nullify(host, def) {
        if (typeof def !== 'object' || def.protected || def.keep) return;
        if (typeof def.name === 'string') {
            let item_data = _get_data_item(host.data, def.name);
            if (item_data instanceof dataBinderValue) item_data.set(def.default || null, def.placeholder || null);
            else if (item_data instanceof dataBinder) item_data.empty();
        } else if ('fields' in def) {
            for (let x in def.fields) {
                let sdef = def.fields[x];
                if (sdef instanceof Array) {
                    _nullify(host, { fields: sdef });
                } else if (typeof sdef === 'string') {
                    let item_data = _get_data_item(host.data, sdef);
                    if (item_data instanceof dataBinderValue) item_data.set(def.default || null, def.placeholder || null);
                }
            }
        }
    }

    function _match_replace(host, str, extra, force, use_html) {
        if (typeof str !== 'string') return str;
        let mhost = host && host.parent ? host.parent : host;
        while ((match = str.match(/\{\{([\W]*)([\w\.]+)\}\}/)) !== null) {
            let modifiers = match[1].split(''), value = mhost ? _get_data_item(mhost.data, match[2]) : null;
            if (value === null) value = match[2].substr(0, 5) === 'this.'
                ? _get_data_item(mhost.settings, match[2].substr(5))
                : extra ? _get_data_item(extra, match[2]) : null;
            if (modifiers.indexOf('!') === -1
                && (value instanceof dataBinderValue ? value.value : value) === null
                && force !== true) return false;
            if (modifiers.indexOf('>') !== -1) use_html = false;
            let filter = function (value) { if (Array.isArray(value)) { value.filter(filter); return value.length > 0; } return value !== null; };
            let text = (function (o, m, h) {
                if (o instanceof dataBinder) return JSON.stringify(o.save(true));
                else if (o instanceof dataBinderArray) return JSON.stringify(o.save(true).filter(filter));
                else if (o instanceof dataBinderValue) return h === true && m.indexOf(':') === -1 ? o : o.value;
                return o;
            })(value, modifiers, use_html);
            let out = use_html ? '<span data-bind="' + match[2] + '" data-bind-label="' + (modifiers.indexOf(':') === -1 ? 'true' : 'false') + '">' + text + '</span>' : text || '';
            str = str.replace(match[0], out);
        }
        return str;
    }

    function _get_data_item(data, name, isArray, value) {
        if (name instanceof dataBinder || name instanceof dataBinderArray || name instanceof dataBinderValue) return name;
        else if (!(typeof name === 'string' && _is_object(data))) return null;
        let parts = name.split(/[\.\[]/), item = data;
        for (let x in parts) {
            let key = parts[x];
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

    function _make_required(host, def, input) {
        if (!('required' in def)) return;
        if (typeof def.required !== 'boolean') host.events.required.push(input);
        return _eval_required(host, input, false);
    }

    function _eval_required(host, input, default_required) {
        let def = input.data('def');
        if (!def) return false;
        let label = input.children('label.control-label'), i = label.children('svg.form-required');
        let item_data = _get_data_item(host.data, input.data('item'));
        let ac = host.required[item_data.attrName] = _eval(host, def.required, typeof default_required === 'undefined' ? false : default_required, item_data, def.name);
        if (ac !== true) i.remove();
        else if (i.length === 0) label.append(_icon(host, 'exclamation-circle', 'Required').addClass('form-required'));
        if ('fields' in def) input.children('div.form-section,div.form-group').each(function (index, item) { let o = $(item); if (o.data('item')) _eval_required(host, o, ac); });
        return ac;
    }

    function _make_disabled(host, def, input, func) {
        if (!('disabled' in def) || def.protected === true) return;
        if (typeof func === 'function') input.data('disabled_func', func);
        if (typeof def.disabled === 'string') host.events.disabled.push(input);
        return _eval_disabled(host, input, func);
    }

    function _eval_disabled(host, input, default_disabled) {
        let def = input.data('def');
        if (!def) return false;
        let item_data = _get_data_item(host.data, input.data('item'));
        let ac = host.disabled[item_data.attrName] = _eval(host, def.disabled, typeof default_disabled === 'undefined' ? false : default_disabled, item_data, def.name);
        input.find('input,textarea,select,button').prop('disabled', ac).data('ed', ac);
        if ('fields' in def) input.children('div.form-section,div.form-group').each(function (index, item) { let o = $(item); if (o.data('item')) _eval_disabled(host, o, ac); });
        return ac;
    }

    function _make_showable(host, def, input) {
        input.data('show', def.show);
        if (typeof def.show !== 'boolean') host.events.show.push(input);
        _toggle_show(host, input);
    }

    function _toggle_show(host, input) {
        let def = input.data('def');
        if (!def) return false;
        host.working = true;
        let item_data = _get_data_item(host.data, input.data('item'));
        let toggle = _eval(host, input.data('show'), true, item_data, def ? def.name : null);
        input.toggle(toggle);
        if (!toggle) _nullify(host, def);
        host.working = false;
    }

    //Input events
    function _input_event_change(host, input) {
        let def = input.data('def'), name = input.attr('data-bind');
        let item_data = _get_data_item(host.data, name);
        if (!item_data) return false;
        if (input.is('[type=checkbox]')) {
            let value = input.is(':checked');
            item_data.set(value, value ? 'Yes' : 'No');
        } else if (input.is('select')) {
            let value = input.val();
            if (value === '__hz_other') {
                if (item_data && item_data.value !== null) item_data.set(null, null, item_data.other);
                let group = $('<div>').addClass(host.settings.styleClasses.inputGroup);
                let oInput = $('<input type="text" placeholder="Enter other option...">')
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
                let button = $('<button class="btn btn-secondary" type="button">')
                    .html(_icon(host, 'times'))
                    .click(function (e) {
                        group.remove();
                        item_data.other = null;
                        input.val('').show();
                    });
                if ('format' in def) oInput.inputmask(def.format);
                $('<span class="input-group-btn">').addClass(host.settings.styleClasses.inputGroupAppend).html(button).appendTo(group);
                input.hide().after(group);
                oInput.focus();
            } else item_data.set(_convert_data_type(def, value));
        } else if (def.type === 'date' && 'format' in def) {
            let date = input.datepicker('getDate');
            item_data.set(date ? date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() : null, input.datepicker('getFormattedDate'));
        } else if (def.other === true) {
            item_data.other = input.val();
            _input_event_update(host, input, false, item_data);
        } else {
            let value = _convert_data_type(def, input.val());
            if (item_data instanceof dataBinder) item_data.populate(value);
            else item_data.set(value);
        }
        if (item_data.enabled() === false) return false;
        $(host).trigger('change', [item_data]);
        return false;
    }

    function _input_event_update(host, input, skip_validate, item_data) {
        let def = _form_field_lookup(host.def, typeof input === 'string' ? input : input.attr('data-bind'));
        if (!def) return;
        let update = def.update, cb_done = null;
        if (!item_data) item_data = _get_data_item(host.data, def.name);
        host.eval_cache = true;
        if (typeof update === 'string') update = { "url": update };
        if (_is_object(input)) {
            if (item_data && input.is('select') && input.val() !== '__hz_other') {
                let other = input.children('option[value="' + item_data.value + '"]').data('other') || null;
                item_data.enabled(false);
                item_data.set(item_data.value, input.children('option:selected').text(), other, false);
                item_data.enabled(true);
            } else if (item_data && input.is('input[type="radio"]') && item_data.enabled() === true) {
                item_data.set(item_data.value, input.next().text());
            } else if (typeof update === 'boolean' || update && ('url' in update || host.settings.update === true)) {
                let options = {
                    originator: def.name,
                    form: host.data.save()
                };
                let check_api = function (host, update) {
                    let url = null;
                    if (typeof update === 'boolean') return update;
                    else if (typeof update !== 'object') return false;
                    if (!('enabled' in update)) update.enabled = true;
                    if ('when' in update) update.enabled = _eval(host, update.when, false, item_data, def.name);
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
        if (item_data && item_data.enabled() && def.change) _eval_code(host, def.change, item_data, def.name);
        if (!host.working) {
            if (host.events.show && host.events.show.length > 0) for (let x in host.events.show) _toggle_show(host, host.events.show[x]);
            _eval_form_pages(host, host.def.pages);
        }
        if (host.events.required && host.events.required.length > 0)
            for (let x in host.events.required) _eval_required(host, host.events.required[x], false);
        if (host.events.disabled && host.events.disabled.length > 0) {
            for (let x in host.events.disabled) _eval_disabled(host, host.events.disabled[x]);
        }
        if ('save' in def && _eval(host, def.save, false, item_data, def.name)) _save(host, false).done(cb_done);
        else if (typeof cb_done === 'function') cb_done();
        if (item_data && item_data.parent && item_data.parent.attrName) _input_event_update(host, item_data.parent.attrName, skip_validate, item_data.parent);
    }

    function _input_event_focus(host, input) {
        let def = input.data('def'), item_data = _get_data_item(host.data, input.attr('data-bind'));
        if (def.focus) _eval_code(host, def.focus, item_data, def.name);
    }

    function _input_event_blur(host, input) {
        let def = input.data('def'), item_data = _get_data_item(host.data, input.attr('data-bind'));
        if (def.blur) _eval_code(host, def.blur, item_data, def.name);
    }

    function _input_button(host, def) {
        if ('buttons' in def) {
            let group = $('<div>').addClass(host.settings.styleClasses.buttonGroup), defaults = Object.assign({}, def);
            delete defaults.buttons;
            for (let x in def.buttons) group.append(_input_button(host, $.extend({}, defaults, def.buttons[x])));
            return group;
        }
        let btn = $('<button type="button">').addClass(host.settings.styleClasses.button)
            .addClass(def.class || 'btn-default')
            .data('def', def);
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
                let action = def.action ? def.action : def.change ? def.change : def.click;
                btn.click(function () { _eval_code.call(this, host, action, null, def.name); });
                break;
        }
        def.nolabel = true;
        return btn;
    }

    function _input_select_multi_items(host, data, container) {
        let def = container.empty().data('def'), item_data = _get_data_item(host.data, def.name), data_index = {};
        let valueKey = def.options.value || 'value', labelKey = def.options.label || 'label';
        data = _convert_data(data, valueKey, labelKey, def, data_index);
        if (data === null || (Array.isArray(data) && data.length === 0)) {
            item_data.empty();
            item_data.enabled(false);
            _input_event_update(host, def.name, true);
            return container.parent().hide();
        }
        let values = item_data.save(true);
        if (values) {
            let remove = values.filter(function (i) { return !(i in data_index); });
            for (let x in remove) item_data.remove(remove[x]);
        }
        let fChange = function () {
            let def = $(this.childNodes[0]).data('def'), value = _convert_data_type(def, this.childNodes[0].value);
            let item_data = _get_data_item(host.data, def.name);
            let index = item_data.indexOf(value);
            if (this.childNodes[0].checked) {
                if (index === -1) item_data.push({ '__hz_value': value, '__hz_label': this.childNodes[1].textContent });
            } else item_data.unset(index);
        };
        let value = _get_data_item(host.data, def.name, true);
        let disabled = def.protected === true || _eval(host, def.disabled, false, item_data, def.name);
        if ('sort' in def.options) {
            if (typeof def.options.sort === 'boolean') def.options.sort = labelKey;
            data = _sort_data(data, def.options.sort, labelKey);
        }
        if (def.buttons === true) {
            let btnClass = def.class || 'primary', items = [];
            for (let x in data) {
                let x_value = _convert_data_type(def, data[x][valueKey]), label = data[x][labelKey];
                let active = item_data.indexOf(x_value) > -1, name = def.name + '_' + x_value;
                items.push($('<label class="btn">').addClass('btn-' + btnClass).html([
                    $('<input type="checkbox" autocomplete="off">')
                        .attr('name', name)
                        .attr('value', x_value)
                        .prop('checked', active)
                        .toggleClass('active', active)
                        .prop('disabled', disabled)
                        .attr('data-bind-value', x_value)
                        .data('def', def), $('<span>').html(label)
                ]).toggleClass('active', active).change(fChange));
            }
            return container.addClass('btn-group').addClass('btn-group-toggle').attr('role', 'group').attr('aria-label', def.label).html(items).parent().show();
        }
        if (!('columns' in def)) def.columns = 1;
        if (def.columns > 6) def.columns = 6;
        let do_ops = function (data, c) {
            let col_width = Math.floor(12 / def.columns), per_col = Math.ceil(Object.keys(data).length / def.columns);
            let cols = $('<div class="row">').appendTo(c), column = 0, items = [];;
            for (let col = 0; col < def.columns; col++)
                items.push($('<div>').addClass('col-md-' + col_width).toggleClass('custom-controls-stacked', def.inline));
            for (let x in data) {
                if ('filter' in def.options && def.options.filter.indexOf(data[x][labelKey]) === -1) {
                    delete data[x];
                    continue;
                }
                let iv = _convert_data_type(def, data[x][valueKey]), il = data[x][labelKey], id = _guid();
                let active = value instanceof dataBinderArray && value.indexOf(iv) > -1, name = def.name + '_' + iv;
                let label = $('<div>').addClass(host.settings.styleClasses.chkDiv).html([
                    $('<input type="checkbox">')
                        .addClass(host.settings.styleClasses.chkInput)
                        .attr('id', id)
                        .attr('value', iv)
                        .prop('checked', active)
                        .prop('disabled', disabled)
                        .data('def', def),
                    $('<label>').addClass(host.settings.styleClasses.chkLabel)
                        .html(il)
                        .attr('for', id)
                ]).attr('data-bind-value', iv).change(fChange);
                if ('css' in def) label.css(def.css);
                items[column].append(label);
                if (items[column].children().length >= per_col) column++;
            }
            cols.html(items);
        }
        if (!Array.isArray(data)) for (let g in data) do_ops(data[g], $('<div class="mb-1">').html($('<label class="group-label">').html([
            $('<strong class="mr-1">').html(g),
            (def.selectAll === true) ? _icon(host, 'check-square').addClass('text-primary').click(function () {
                let cbs = $(this).parent().parent().find('input[type=checkbox]'), m = (cbs.length === cbs.filter(':checked').length);
                cbs.each(function (index, item) { if ($(item).is(':checked') === m) $(item).click(); });
                return false;
            }) : ''
        ])).appendTo(container));
        else do_ops(data, container);
        item_data.enabled(true);
        _input_event_update(host, def.name, true);
        return container.parent().show();
    }

    function _input_select_multi_populate_ajax(host, options, container, track) {
        let postops = $.extend(true, {}, options);
        if ((postops.url = _match_replace(host, postops.url, { "site_url": hazaar.url() })) === false) {
            return _input_select_multi_items(host, null, container);
        }
        if (track === true) _track(host);
        postops.url = _url(host, postops.url);
        if ('data' in postops) for (let x in postops.data) postops.data[x] = _match_replace(host, postops.data[x]);
        $.ajax(postops).done(function (data) {
            if (typeof container.data('def') !== 'object') return _ready(host);
            _input_select_multi_items(host, data, container);
            _ready(host);
        }).fail(_error);
        return true;
    }

    function _input_select_multi_populate(host, options, container, track) {
        if (!options) return false;
        if (_is_object(options) && 'url' in options) {
            let matches = options.url.match(/\{\{[\w\.]+\}\}/g), def = container.data('def');
            if (matches !== null) {
                for (let x in matches) {
                    let match = matches[x].substr(2, matches[x].length - 4);
                    if (!(match in def.watchers)) def.watchers[match] = [];
                    def.watchers[match].push(host.data.watch(match, function (key, item_data, container) {
                        if (item_data.enabled() === false) return;
                        _input_select_multi_populate_ajax(host, options, container, false);
                    }, container));
                }
            }
            return _input_select_multi_populate_ajax(host, options, container, track);
        }
        if (options instanceof dataBinderValue) {
            let o = _is_object(options.value) ? options.value : _is_object(options.other) ? options.other : null;
            return _input_select_multi_items(host, o, container);
        }
        _input_select_multi_items(host, ('data' in options) ? options.data : options, container);
        return true;
    }

    function _input_select_multi(host, def) {
        let group = $('<div>').data('def', def), item_data = _get_data_item(host.data, def.name);
        if (def.selectAll === true) def.label = [$('<span class="mr-1">').html(def.label), _icon(host, 'check-square').addClass('text-primary').click(function () {
            let cbs = $(this).parent().parent().find('input[type=checkbox]'), m = (cbs.length === cbs.filter(':checked').length);
            cbs.each(function (index, item) { if ($(item).is(':checked') === m) $(item).click(); });
            return false;
        })];
        if (def.buttons === true) group.addClass('btn-group').attr('data-bind', def.name).attr('data-toggle', 'buttons').toggleClass('btn-group-justified', def.justified === true);
        else group.attr('data-bind', def.name).attr('data-toggle', 'checks');
        def.watchers = {};
        if (typeof def.options === 'string') def.options = { url: def.options };
        _input_options(host, def, group, null, function (select, options) {
            _input_select_multi_populate(host, options, select, true);
        });
        group.on('pop', function (e, name, item) {
            group.find('div[data-bind-value="' + item.value + '"]').children('input[type=checkbox]').prop('checked', false);
        });
        if (item_data) item_data.watch(function (item) {
            if (item) {
                let o = group.find('[data-bind-value="' + item.value + '"]');
                if (o.is('input')) {
                    if (!item.label) item.label = o.parent().children('span').html();
                    o.prop('checked', true).parent().addClass('active');
                } else if (o.is('div')) {
                    if (!item.label) item.label = o.children('label').html();
                    o.children('input[type=checkbox]').prop('checked', true);
                }
            }
            return _input_event_update(host, group, false, item);
        });
        return group;
    }

    function _input_radio_items(host, options, data, group, no_nullify) {
        let def = group.data('def'), valueKey = options.value || 'value', labelKey = options.label || 'label';
        data = _convert_data(data, valueKey, labelKey, def);
        for (let x in data) {
            if (('filter' in options && options.filter.indexOf(data[x][labelKey]) === -1) || data[x][valueKey] === '__spacer__') {
                delete data[x];
                continue;
            }
            let id = _guid(), radio = $('<input type="radio" class="custom-control-input">')
                .attr('id', id)
                .attr('name', def.name)
                .attr('value', data[x][valueKey])
                .attr('data-bind', def.name)
                .data('def', def);
            let option = $('<div class="custom-control custom-radio">').html([
                radio,
                $('<label class="custom-control-label">').attr('for', id).html(labelKey.indexOf('{{') > -1 ? _match_replace(null, labelKey, data[x], true) : data[x][labelKey])
            ]).appendTo(group);
            if (def.horizontal === true) option.addClass('custom-control-inline');
            radio.change(function (event) { return _input_event_change(host, $(event.target)); })
                .on('update', function (event, key, value, item_data) { return _input_event_update(host, $(event.target), false, item_data); });
        }
        return group;
    }

    function _input_select_items(host, options, data, select, no_nullify) {
        let item_data = _get_data_item(host.data, select.attr('data-bind')), def = select.data('def');
        let valueKey = options.value || 'value', labelKey = options.label || 'label';
        select.prop('disabled', !(def.disabled !== true && def.protected !== true && select.data('ed') !== true));
        data = _convert_data(data, valueKey, labelKey, def);
        if (!data) {
            if (no_nullify !== true) _nullify(host, def);
            if (item_data) item_data.enabled(false);
            _input_event_update(host, def.name, true);
            return select.empty().prop('disabled', true);
        }
        select.empty().append($('<option>').attr('value', '').html(_match_replace(host, def.placeholder, null, true, true)));
        let do_ops = function (data, container) {
            if ('sort' in options) {
                if (typeof options.sort === 'boolean') options.sort = labelKey;
                data = _sort_data(data, options.sort, labelKey, valueKey);
            }
            let default_item = item_data && item_data.value === null && 'default' in options ? options.default : null;
            for (let x in data) {
                if ('filter' in options && options.filter.indexOf(data[x][labelKey]) === -1) {
                    delete data[x];
                    continue;
                }
                let option = $('<option>').attr('value', data[x][valueKey])
                    .html(labelKey.indexOf('{{') > -1 ? _match_replace(null, labelKey, data[x], true) : data[x][labelKey])
                    .appendTo(container);
                if (data[x][valueKey] === '__spacer__') option.prop('disabled', true).addClass('form-select-spacer');
                if ('other' in options && typeof options.other === 'string')
                    option.data('other', options.other.indexOf('{{') > -1
                        ? _match_replace(null, options.other, data[x], true)
                        : data[x][options.other]);
                if (default_item !== null && data[x][labelKey] === default_item)
                    item_data.set(data[x][valueKey], data[x][labelKey], data[x][options.other]);
            }
            return data;
        };
        if (!Array.isArray(data) && Array.isArray(data[Object.keys(data)[0]])) {
            for (let group in data) data[group] = do_ops(data[group], $('<optgroup>').attr('label', group).appendTo(select));
        } else data = do_ops(data, select);
        if (item_data) {
            if ('other' in def && _eval(host, def.other, null, item_data, def.name) === true) {
                select.append($('<option>').attr('value', '__hz_other').html("Other"));
                if (item_data.value === null && item_data.other !== null)
                    select.val('__hz_other').change();
            }
            let value = item_data.value !== null ? item_data.value.toString() : null, findVal = function (e, index, obj) {
                if (Array.isArray(e)) return e.find(findVal);
                return e && e[valueKey].toString() === value;
            };
            if (!Array.isArray(data)) data = Array.fromObject(data);
            if (value && data.find(findVal)) {
                select.val(value);
                _input_event_update(host, select);
            } else {
                item_data.value = null;
                if (Object.keys(data).length === 1 && options.single === true) {
                    let item = data[Object.keys(data)[0]], key = _convert_data_type(def, item[valueKey]);
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

    function _input_options_populate_ajax(host, options, select, track, item_data, callback) {
        let postops = $.extend(true, {}, options);
        if ((postops.url = _match_replace(host, postops.url, item_data)) === false)
            return callback(host, options, null, select);
        if (track !== false) select.prop('disabled', true).html($('<option value selected>').html('Loading...'));
        postops.url = _url(host, postops.url);
        if ('data' in postops) for (let x in postops.data) postops.data[x] = _match_replace(host, postops.data[x]);
        return $.ajax(postops).done(function (data) {
            if (typeof select.data('def') !== 'object') return;
            callback(host, options, data, select);
        }).fail(_error);
    }

    function _input_options_populate(host, options, select, track, item_data, callback) {
        if (typeof options === 'string') {
            let match = options.match(/^\{\{([\w\.]+)\}\}$/);
            if (match !== null) {
                host.data.watch(match[1], function (key, item, select) {
                    _input_options_populate(host, item, select, track, item_data);
                }, select);
                options = _get_data_item(host.data, match[1]);
            } else options = { url: options };
        }
        if (typeof callback !== 'function') callback = _input_select_items;
        if (options instanceof dataBinderValue) {
            let o = _is_object(options.value) ? options.value : _is_object(options.other) ? options.other : null;
            return callback(host, {}, o, select, o ? false : true);
        }
        if (!(_is_object(options) && ('url' in options)))
            return callback(host, options, ('data' in options) ? options.data : options, select);
        let matches = options.url.match(/\{\{[\w\.]+\}\}/g), def = select.data('def');
        for (let x in matches) {
            let match = matches[x].substr(2, matches[x].length - 4);
            if (!(match in def.watchers)) def.watchers[match] = [];
            if (typeof item_data === 'undefined') item_data = host.data;
            def.watchers[match].push(item_data.watch(match, function (key, item_data, select) {
                if (item_data.enabled() === false) return;
                _input_options_populate_ajax(host, options, select, true, item_data, callback);
            }, select));
        }
        return _input_options_populate_ajax(host, options, select, track, item_data, callback);
    }

    function _input_options(host, def, select, item_data, cb) {
        if (!('options' in def)) return false;
        let options = {};
        if (Array.isArray(def.options)) {
            for (let x in def.options) {
                if (!(_is_object(def.options[x]) && 'when' in def.options[x])) continue;
                if (_eval(host, def.options[x].when, null, item_data, def.name)) {
                    options = 'items' in def.options[x] ? def.options[x].items : def.options[x];
                    break;
                }
            }
            if (select && 'watch' in def) {
                let watch_func = function (key, value, args) {
                    _get_data_item(item_data, def.name).value = null;
                    if (typeof cb === 'function') cb(select, _input_options(host, def, null, value));
                };
                for (let x in def.watch) {
                    if (def.watch[x].substr(0, 5) === 'item.' && item_data) item_data.watch(def.watch[x].substr(5), watch_func);
                    else {
                        item_data = host.data;
                        host.data.watch(def.watch[x], watch_func);
                    }
                }
            }
        } else options = def.options;
        if (typeof cb === 'function') cb(select, options);
        return options;
    }

    function _input_select(host, def, populate) {
        if (def.radios === true) {
            let group = $('<div>').addClass(host.settings.styleClasses.group).data('def', def);
            if (populate !== false) _input_options(host, def, group, ud, function (group, options) {
                _input_options_populate(host, options, group, ud, ud, _input_radio_items);
            });
            return group;
        }
        let group = $('<div class="input-group">');
        let select = $('<select>').addClass(host.settings.styleClasses.input)
            .attr('name', def.name)
            .data('def', def)
            .attr('data-bind', def.name)
            .appendTo(group);
        if (def.protected)
            select.prop('disabled', true);
        else select.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event, key, value, item_data) { return _input_event_update(host, $(event.target), false, item_data); });
        def.watchers = {};
        if (!("placeholder" in def)) def.placeholder = host.settings.placeholder;
        if (populate !== false) _input_options(host, def, select, null, function (select, options) {
            _input_options_populate(host, options, select);
        });
        return group;
    }

    function _input_checkbox(host, def) {
        let item_data = _get_data_item(host.data, def.name), group = $('<div>').addClass(host.settings.styleClasses.chkDiv), id = _guid();
        let input = $('<input type="checkbox">').addClass(host.settings.styleClasses.chkInput)
            .attr('name', def.name)
            .attr('id', id)
            .attr('data-bind', def.name)
            .attr('checked', item_data ? item_data.value : false)
            .data('def', def)
            .appendTo(group);
        if (def.protected) input.prop('disabled', true);
        else input.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event, key, value, item_data) { return _input_event_update(host, $(event.target), false, item_data); });
        $('<label>').addClass(host.settings.styleClasses.chkLabel)
            .html(_match_replace(host, def.label, null, true, true))
            .attr('for', id)
            .appendTo(group);
        def.nolabel = true;
        return group;
    }

    function _input_datetime(host, def) {
        let item_data = _get_data_item(host.data, def.name);
        let group = $('<div class="date">').addClass(host.settings.styleClasses.inputGroup);
        let input = $('<input>').addClass(host.settings.styleClasses.input)
            .attr('type', def.type === 'datetime' ? 'datetime-local' : 'date')
            .attr('name', def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .val(item_data)
            .appendTo(group);
        if (def.protected) input.prop('disabled', true);
        else input.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event, key, value, item_data) { return _input_event_update(host, $(event.target), false, item_data); });
        if (def.suffix !== false)
            $('<div>').addClass(host.settings.styleClasses.inputGroupAppend)
                .html($('<span style="cursor: pointer;">').addClass(host.settings.styleClasses.inputGroupText)
                    .html(_icon(host, 'calendar').click(function () { input.focus(); })))
                .appendTo(group);
        if (def.format) {
            if (def.format === 'local') def.format = Date.getLocalDateFormat();
            def.__datepicker_options = $.extend({
                format: def.format,
                autoclose: true,
                forceParse: true,
                language: 'en',
                clearBtn: 'required' in def ? _eval(host, def.required, false, item_data) : false !== true,
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
        return group;
    }

    function _input_file(host, def) {
        let item_data = _get_data_item(host.data, def.name);
        let input = $('<div>').attr('data-bind', def.name).data('def', def).attr('name', def.name).fileUpload({
            name: def.name,
            multiple: def.multiple || false,
            btnClass: def.btnClass || "btn btn-default",
            btnLabel: def.btnLabel || "Select",
            height: def.height || null,
            thumbnail: def.thumbnail || (def.multiple ? 120 : 32),
            accept: def.accept || null,
            maxSize: def.maxSize || host.settings.maxUploadSize || null,
            autoAdd: false,
            autoRemove: false,
            select: function (files) {
                for (let f of files) {
                    let index = item_data.push(_objectify_file(f), true);
                    if (host.standalone) {
                        let r = new FileReader();
                        r.onload = function (event) { item_data[index].url = event.target.result; };
                        r.readAsDataURL(f);
                    } else {
                        host.deloads = host.deloads.filter(function (item) {
                            if (!(item.field === def.name && item.file.name === f.name))
                                return item;
                        });
                        host.uploads.push({ "field": def.name, "file": f });
                    }
                }
                _input_event_update(host, input);
            },
            remove: function (file) {
                if (host.standalone) {
                    file = _objectify_file(file);
                    host.uploads = host.uploads.filter(function (item) {
                        if (!(item.field === def.name && item.file.name === file.name))
                            return item;
                    });
                    host.deloads.push({ "field": def.name, "file": file.name });
                }
                item_data.unset(item_data.indexOf(function (item) { return item.name.value === file.name; }), true);
                _input_event_update(host, input);
                return true;
            }
        }).on('push', function (event, field_name, value) {
            input.fileUpload('add', value.save());
        }).on('pop', function (event, field_name, value) {
            input.fileUpload('remove', value.save());
        });
        if (host.standalone) {
            for (let f of item_data) input.fileUpload('add', f.save());
        } else {
            _post(host, 'fileinfo', { 'field': def.name }, true).done(function (response) {
                if (!response.ok) return;
                let item_data = _get_data_item(host.data, response.field);
                item_data.empty();
                for (let x in response.files) if (host.deloads.findIndex(function (e) {
                    return e.field === response.field && e.file === response.files[x].name;
                }) < 0) item_data.push(_objectify_file(response.files[x]));
                for (let x in host.uploads) if (host.uploads[x].field === response.field) item_data.push(_objectify_file(host.uploads[x].file));
            }).fail(_error);
        }
        return input;
    }

    function _input_lookup(host, def) {
        let item_data = _get_data_item(host.data, def.name);
        let group = $('<div>').addClass(host.settings.styleClasses.inputGroup);
        let input = $('<input type="text">').addClass(host.settings.styleClasses.input)
            .attr('data-bind', def.name)
            .attr('data-bind-label', true)
            .data('def', def)
            .attr('autocomplete', 'off')
            .appendTo(group);
        if (def.protected)
            input.prop('disabled', true);
        else input.focus(function (event) { _input_event_focus(host, $(event.target)); })
            .on('blur', function (event) {
                let input = $(this), popup = input.parent().parent().children('.form-lookup-popup');
                let def = input.data('def'); item_data = _get_data_item(host.data, input.attr('data-bind'));
                if (!item_data) item_data = _get_data_item(host.data, input.parent().parent().parent().parent().data('item').attrName)[input.next().attr('name')];
                if (popup.length > 0) {
                    popup.css({ "opacity": "0" });
                    setTimeout(function () {
                        popup.hide().empty();
                        if (def.lookup.autocomplete !== true) input.val(item_data.label);
                    }, 500);
                } else if (def.lookup.autocomplete !== true) input.val(item_data.label);
            });
        $('<input type="hidden">')
            .attr('data-bind', def.name)
            .attr('name', def.name)
            .data('def', def)
            .appendTo(group)
            .on('update', function (event, key, value, item_data) { _input_event_update(host, $(event.target), false, item_data); });
        if (def.lookup && 'url' in def.lookup) {
            input.on('keyup', function (event) {
                if (event.keyCode === 32) return;
                let input = $(this), item_data = _get_data_item(host.data, input.attr('data-bind'));
                if (event.target.value === '') return item_data.empty();
                if (def.lookup.autocomplete === true) item_data.set(input.val(), input.val());
                if (event.keyCode > 47) {
                    delay(function () {
                        let query = '', popup = input.parent().parent().children('.form-lookup-popup');
                        let item_data = _get_data_item(host.data, input.attr('data-bind'));
                        let valueKey = def.lookup.value || 'value', labelKey = def.lookup.label || 'label';
                        if (!item_data) item_data = _get_data_item(host.data, input.parent().parent().parent().parent().data('item').attrName)[input.next().attr('name')];
                        if (popup.length === 0) {
                            popup = $('<div class="form-lookup-popup card">').hide().appendTo(input.parent().parent())
                                .on('click', function (event) {
                                    let target = $(event.target), data = target.data('lookup');
                                    if (!(target.is('.list-group-item') && typeof target.attr('data-value') === 'string'))
                                        return false;
                                    item_data.set(target.attr('data-value'), target.text(),
                                        'other' in def.lookup && def.lookup.other in data ? data[def.lookup.other] : null);
                                    popup.hide();
                                });
                        }
                        if ('startlen' in def.lookup && event.target.value.length < def.lookup.startlen) return popup.hide();
                        let values = { '__input__': event.target.value };
                        let listDIV = popup.children('ul');
                        if (listDIV.length === 0) listDIV = $('<ul class="list-group">').appendTo(popup);
                        if ((url = _match_replace(host, def.lookup.url, values)) === false) return;
                        if ('query' in def.lookup && (query = _match_replace(host, def.lookup.query, values)) === false) return;
                        popup.css({ "min-width": input.parent().outerWidth(), "opacity": "1" });
                        if (def.lookup.autocomplete !== true) listDIV.html($('<li class="list-group-item">').html('Loading results...'));
                        if (listDIV.children().length > 0) popup.show();
                        $.ajax({
                            method: def.lookup.method || 'GET',
                            url: _url(host, url),
                            data: query
                        }).always(function () {
                            if (def.lookup.autocomplete !== true) listDIV.empty();
                        }).done(function (data) {
                            if ('dataKey' in def.lookup && def.lookup.dataKey in data) data = _form_field_lookup(data, def.lookup.dataKey, true);
                            data = _convert_data(data, valueKey, labelKey, def);
                            if ('extra' in def.lookup) $.merge(data, def.lookup.extra);
                            if (Object.keys(data).length > 0) {
                                if (def.lookup.autocomplete === true) listDIV.empty();
                                for (let x in data) {
                                    listDIV.append($('<li class="list-group-item">')
                                        .html(labelKey.indexOf('{{') > -1 ? _match_replace(null, labelKey, data[x], true) : data[x][labelKey])
                                        .attr('data-value', _kv(data[x], valueKey))
                                        .data('lookup', data[x]));
                                }
                                if (Object.keys(data).length === 1) listDIV.children().first().click();
                                else if (def.lookup.autocomplete === true) popup.show();
                            } else if (def.lookup.autocomplete === true) {
                                listDIV.empty();
                                popup.hide();
                            } else listDIV.html($('<li class="list-group-item">').html('No results...'));
                        }).fail(function (r) {
                            listDIV.html($('<li class="list-group-item">').html('Error ' + r.status + ': ' + r.statusText));
                        });
                    }, host.settings.lookup.delay);
                } else {
                    let sClass = 'bg-primary';
                    let list = input.parent().parent().children('.form-lookup-popup').children('.list-group');
                    let selected = list.children('.' + sClass);
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
        if (!def.protected) group.append($('<div>').addClass(host.settings.styleClasses.inputGroupAppend)
            .html($('<span>').addClass(host.settings.styleClasses.inputGroupText).html(_icon(host, 'search'))));
        return group;
    }

    function _input_money(host, def) {
        let item_data = _get_data_item(host.data, def.name), symbol = '$';
        let input = $('<input type="text">').addClass(host.settings.styleClasses.input);
        let inputDIV = $('<div>').addClass(host.settings.styleClasses.inputGroup);
        let prefixDIV = $('<div>').addClass(host.settings.styleClasses.inputGroupPrepend);
        let suffixDIV = $('<div>').addClass(host.settings.styleClasses.inputGroupAppend);
        input.attr('name', def.name)
            .attr('data-bind', def.name + '.amt')
            .data('def', def)
            .val(item_data.amt)
            .inputmask('currency', { prefix: "" });
        if ('currencies' in def) {
            let current = def.currencies.find(function (value, index, o) { if (value.currencycode === item_data.currency.value) return true; });
            symbol = current.symbol;
        }
        inputDIV.append([prefixDIV.html($('<span>').addClass(host.settings.styleClasses.inputGroupText).html(symbol)), input, suffixDIV]);
        if ('currencies' in def && def.currencies.length > 1) {
            let currencySELECT = $('<div class="dropdown-menu">');
            def.currencies.sort(function (a, b) { return a.code === b.code ? 0 : a.code < b.code ? -1 : 1; });
            for (let x of def.currencies) currencySELECT.append($('<div class="dropdown-item">').html(x.code + ' - ' + x.name).attr('data-currency', x.code));
            suffixDIV.html([
                $('<button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown">').html(item_data.currency.value),
                currencySELECT
            ]);
            currencySELECT.on('click', function (event) {
                let item_data = _get_data_item(host.data, $(this).parent().parent().children('input').attr('data-bind'));
                if (!item_data) return false;
                let currency = $(event.target).attr('data-currency');
                $(this).parent().children('button').html(currency);
                item_data.parent.currency = currency;
            });
            item_data.watch('currency', function (key, value) {
                let info = def.currencies.find(function (value, index, o) { if (value.code === item_data.currency.value) return true; });
                prefixDIV.children('span').html(info.symbol);
            });
        } else suffixDIV.html($('<span>').addClass(host.settings.styleClasses.inputGroupText).html(item_data.currency.value));
        if (def.protected) input.prop('disabled', true);
        else input.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event, key, value, item_data) { return _input_event_update(host, $(event.target), false, item_data); });
        return inputDIV;
    }

    function _input_multitext(host, def) {
        let group = $('<div class="form-multi-text">'), item_data = _get_data_item(host.data, def.name), container;
        let _rm_multitext_item = function (e) {
            let value = $(e.currentTarget.parentNode).children('span').text();
            item_data.remove(_convert_data_type(def, value));
        };
        let _add_multitext_item = function (item) {
            $('<div class="input-mt-item">').html([
                $('<span>').html(item.toString()),
                $('<div class="input-mt-item-rm">').html(_icon(host, 'times', 'Remove')).click(function (e) { _rm_multitext_item(e); })
            ]).data('item', item).appendTo(container);
        };
        let inputDef = Object.assign({}, def, { name: '__hz_input_mt_' + def.name, type: def.arrayOf });
        if ('format' in def && 'validate' in def) { delete inputDef.validate.minlen; delete inputDef.validate.maxlen; }
        if (!('hint' in def) || def.hint === true) def.hint = 'Press ENTER to add item to list.';
        _input_std(_get_empty_host(ud, host), def.arrayOf, inputDef, true).appendTo(group).on('keypress', function (e) {
            if (e.which !== 13) return;
            let value = _convert_data_type(def, $(this).val());
            if (!value || item_data.indexOf(value) >= 0 || _validate_rule(host, inputDef.name, item_data, inputDef, def, value) !== true) return;
            item_data.push(value);
            $(this).val('');
        });
        container = $('<div class="input-mt-items">')
            .attr('data-bind', def.name)
            .appendTo(group)
            .on('push', function (e, name, item) { _add_multitext_item(item); })
            .on('pop', function (e, name, item) {
                $(this).children().each(function (index, o) { if ($(o).data('item') === item) $(o).remove(); })
            });
        if (item_data.length > 0) for (let x of item_data) _add_multitext_item(x);
        return group;
    }

    function _input_std(host, type, def, no_group) {
        let input = null, item_data = _get_data_item(host.data, def.name);
        if (type === 'int' || type === 'integer') type = 'number';
        if (def.multiline) {
            input = $('<textarea>').addClass(host.settings.styleClasses.input);
            if ('height' in def) input.css('height', def.height);
        } else input = $('<input>').addClass(host.settings.styleClasses.input).attr('type', def.password ? 'password' : type);
        input.attr('name', def.name)
            .attr('data-bind', def.name)
            .data('def', def)
            .val(item_data instanceof dataBinderValue ? item_data.value : item_data);
        if (def.protected) input.prop('disabled', true);
        else input.focus(function (event) { return _input_event_focus(host, $(event.target)); })
            .blur(function (event) { return _input_event_blur(host, $(event.target)); })
            .change(function (event) { return _input_event_change(host, $(event.target)); })
            .on('update', function (event, key, value, item_data) { return _input_event_update(host, $(event.target), false, item_data); });
        if (type === 'text' && 'validate' in def && 'maxlen' in def.validate) input.attr('maxlength', def.validate.maxlen);
        if ('format' in def) input.attr('type', 'text').inputmask(def.format);
        if ('placeholder' in def) input.attr('placeholder', def.placeholder);
        if (no_group === true) return input;
        let group = $('<div>').addClass(host.settings.styleClasses.inputGroup);
        if (def.prefix) {
            $('<div>').addClass(host.settings.styleClasses.inputGroupPrepend).appendTo(group)
                .html(((def.type === 'text' && (sf = _form_field_lookup(host.def, def.prefix)) !== null && def.name !== sf.name)
                    ? _input(host, sf, null, null, true).css('text-align', 'left')
                    : $('<span>').html(_match_replace(host, def.prefix, null, true, true))).addClass(host.settings.styleClasses.inputGroupText));
        }
        if (def.suffix || def.copy === true || def.reveal === true) {
            let suffix = $('<div>').addClass(host.settings.styleClasses.inputGroupAppend).appendTo(group);
            if (def.suffix) {
                suffix.html(((def.type === 'text' && (sf = _form_field_lookup(host.def, def.suffix)) !== null && def.name !== sf.name)
                    ? _input(host, sf, null, null, true).css('text-align', 'left')
                    : $('<span>').html(_match_replace(host, def.suffix, null, true, true))).addClass(host.settings.styleClasses.inputGroupText));
            }
            if (def.password === true && def.reveal === true) suffix.append($('<span class="input-group-text">').click(function (event) {
                let i = $(this).children('i'), r = false;
                if (r = input.is('[type=password]')) input.attr('type', 'text');
                else input.attr('type', 'password');
                i.toggleClass('fa-eye-slash', r).toggleClass('fa-eye', !r);
            }).html($('<i class="fa fa-eye"">').attr('title', 'Toggle ' + def.label.toLowerCase())));
            if (def.copy === true) suffix.append($('<span class="input-group-text">').click(function (event) { _copy_to_clipboard(input, this); })
                .html($('<i class="fa fa-copy" title="Copy to clipboard">')));
        }
        if (item_data && item_data.value) _validate_input(host, input);
        return group.append(input);
    }

    function _input(host, def, populate, item_data, no_group) {
        let input;
        if (host.viewmode === true) {
            if (item_data instanceof dataBinderArray) input = _input_list(host, def);
            else if (def.type === 'button') return;
            else input = $('<span>').attr('data-bind', item_data ? item_data.attrName : '').html(item_data ? item_data.toString() : '');
        } else if (def.type === 'array' && !('options' in def)) {
            input = ('arrayOf' in def) ? _input_multitext(host, def) : _input_list(host, def);
        } else if (def.type) {
            if ('options' in def) {
                input = def.type === 'array' ? _input_select_multi(host, def) : _input_select(host, def, populate);
            } else if ('lookup' in def && def.type !== 'array') {
                if (typeof def.lookup === 'string') def.lookup = { url: def.lookup };
                input = _input_lookup(host, def);
            } else {
                switch (def.type) {
                    case 'button':
                        input = _input_button(host, def);
                        break;
                    case 'boolean':
                        input = _input_checkbox(host, def);
                        break;
                    case 'date':
                    case 'datetime':
                        input = _input_datetime(host, def);
                        break;
                    case 'file':
                        input = _input_file(host, def);
                        break;
                    case 'money':
                        input = _input_money(host, def);
                        break;
                    case 'text':
                    case 'string':
                    default:
                        input = _input_std(host, def.type, def);
                        break;
                }
            }
        }
        if (no_group === true && input.is('.' + host.settings.styleClasses.inputGroup)) {
            input = input.children();
            if ('width' in def) input.css('width', def.width);
        }
        return input;
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
        let item_data = _get_data_item(host.data, def.name);
        let group = $('<div class="itemlist">').addClass(host.settings.styleClasses.group);
        if (!(item_data instanceof dataBinderArray)) return group;
        if ('label' in def) {
            $('<h4>').addClass(host.settings.styleClasses.label).html(_match_replace(host, def.label, null, true, true)).appendTo(group);
            def.nolabel = true;
        }
        if (!('fields' in def)) return group;
        let bump = def.fields && 'label' in def.fields[Object.keys(def.fields)[0]];
        let layout = _resolve_field_layout(host, def.fields, def.layout);
        let template = $('<div class="itemlist-item">');
        if (host.viewmode !== true && _eval(host, def.allow_remove, true, item_data, def.name)) {
            template.append($('<div class="itemlist-item-rm">').html([
                def.allow_edit === true && bump ? $('<label>').html('&nbsp;').addClass(host.settings.styleClasses.label) : '',
                $('<button type="button" class="btn btn-danger btn-sm">').html(("btnLabels" in def && "remove" in def.btnLabels ? def.btnLabels.remove : _icon(host, 'minus')))
            ]));
        }
        if (host.viewmode !== true && _eval(host, def.allow_add, true, item_data, def.name)) {
            let sub_host = _get_empty_host(ud, host), new_item = new dataBinder(_define(def.fields), def.name, null, def.name);
            sub_host.settings = $.extend({}, $.fn.hzForm.defaults, host.settings);
            sub_host.validate = false;
            sub_host.data = new_item;
            sub_host.def = { fields: def.fields };
            let btn = $('<button type="button" class="btn btn-success btn-sm">').html(("btnLabels" in def && "add" in def.btnLabels ? def.btnLabels.add : _icon(host, 'plus')));
            let fieldDIV = _form_field(sub_host, { fields: layout, row: true }, true, ud, ud, ud, true)
                .addClass('itemlist-newitem')
                .attr('data-field', def.name);
            fieldDIV.find('input,textarea,select').attr('data-bind-ns', def.name).keypress(function (event) {
                if (event.which === 13) $(event.target).parent().parent().parent().children('.itemlist-newitem-add').children('button').click();
            });
            fieldDIV.find('select').each(function (index, item) {
                let select = $(item), def = select.data('def');
                select.off('change').on('change', function () {
                    return _input_event_change(sub_host, $(this));
                }).off('update').on('update', function (event, key, value, item_data) {
                    return _input_event_update(sub_host, $(this), false, item_data);
                });
                if ('options' in def) _input_options(sub_host, def, select, new_item, function (select, options) {
                    _input_options_populate(sub_host, options, select);
                });
            });
            group.append($('<div class="itemlist-newitems">').html([$('<div class="itemlist-newitem-add">').html([
                bump ? $('<label>').html('&nbsp;').addClass(host.settings.styleClasses.label) : '',
                btn
            ]), fieldDIV]));
            btn.click(function () {
                let valid = true;
                fieldDIV.find('input,select,textarea').each(function (index, item) {
                    if (!item.name) return;
                    let input = $(item), value = null, def = input.data('def'), item_data = _get_data_item(sub_host.data, input.attr('data-bind'));
                    if (input.is('[type=checkbox]')) value = input.is(':checked');
                    else value = input.val();
                    if (item_data && item_data.attrName in sub_host.required && sub_host.required[item_data.attrName] === true && !value) {
                        input.toggleClass('is-invalid', true);
                        valid = false;
                        return;
                    }
                    if (input.is('select')) value = { __hz_value: value, __hz_label: input.children('option:selected').text() };
                    else if (def.type === 'date' && 'format' in def) {
                        let date = input.datepicker('getDate');
                        value = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
                    }
                    let sub_item_data = _get_data_item(sub_host.data, item.name, false, value);
                    if (sub_item_data) sub_item_data.set(value, null, null, false);
                });
                if (valid !== true) return;
                item_data.push(sub_host.data.save());
                sub_host.data.empty();
            });
        }
        if (host.viewmode === true || _eval(host, def.allow_edit, false, item_data, def.name) !== true) layout = _field_to_html(layout);
        template.append(_form_field(host, { fields: layout, row: true }, true, false, false, ud, true));
        item_data.watch(function (item_data, o) {
            if (!item_data) return;
            let item_name = item_data.attrName;
            item_data.extend(_define(def.fields), true);
            o.find('select,input').each(function (index, item) {
                let input = $(item), def = input.data('def');
                if (input.is('select')) {
                    if ('options' in def) _input_options(host, def, input, item_data, function (select, options) {
                        _input_options_populate(host, options, select, false, item_data);
                    });
                } else if (def.type === 'date' && 'format' in def) {
                    let child_item_data = item_data[def.name];
                    input.data('datepicker', null);
                    input.datepicker(def.__datepicker_options);
                    if (child_item_data && child_item_data.value) input.datepicker('setDate', new Date(child_item_data.value));
                }
            });
            $(o).find('.form-group,.form-section').each(function (index, input) {
                let group = $(input), def = group.data('def');
                if (!(def && def.name)) return;
                let sub_item_data = _get_data_item(item_data, def.name);
                if (!sub_item_data) return;
                group.data('name', item_name + '.' + def.name)
                    .data('item', sub_item_data.attrName);
                group.find('label').each(function (index, item) {
                    item.attributes['for'].value = item_name.replace(/\[|\]/g, '_') + def.name;
                });
                if ('disabled' in def) _make_disabled(host, def, group);
                if ('required' in def) _make_required(host, def, group);
                if ('show' in def) _make_showable(host, def, group);
            });
            if ('disabled' in def) _make_disabled(host, def, $(o).parent().parent());
        });
        group.append($('<div class="itemlist-items" data-bind-template="o">')
            .attr('data-bind', def.name)
            .data('template', template))
            .data('def', def)
            .data('item', item_data)
            .on('click', '.btn-danger', function (event) {
                let index = Array.from(this.parentNode.parentNode.parentNode.children).indexOf(this.parentNode.parentNode);
                let list = $(event.currentTarget.parentNode.parentNode.parentNode);
                item_data.unset(index);
                list.find('input,textarea,select').each(function (index, item) {
                    let input = $(item);
                    input.parent().data('item', input.attr('data-bind'));
                });
            });
        return group;
    }

    function _form_field_lookup(def, info, raw_mode) {
        if (info instanceof Object) def = 'name' in info ? $.extend(_form_field_lookup(def, info.name), info) : info;
        else {
            let parts = info.split(/[\.\[]/);
            for (let x in parts) {
                if (def && 'type' in def && def.type === 'money' && parts[x] === 'amt') break;
                if (parts[x].slice(-1) === ']') continue;
                if (raw_mode !== true) {
                    if (!("fields" in def)) return null;
                    def = def.fields;
                }
                if (!(parts[x] in def)) return null;
                def = def[parts[x]];
            }
            if (raw_mode !== true) def = $.extend(true, def, { name: info });
        }
        return def;
    }

    function _fix_subfield_options(name, field) {
        let rx = /\{\{(\w*)\}\}/g, replacer = function (match, item) {
            return '{{' + name + '.' + item + '}}';
        };
        if (Array.isArray(field.options))
            for (let x in field.options) _fix_subfield_options(name, field.options);
        else if (_is_object(field.options) && 'url' in field.options)
            field.options.url = field.options.url.replace(rx, replacer);
        else if (typeof field.options === 'string') field.options = field.options.replace(rx, replacer);
    }

    function _resolve_field_layout(host, fields, layout, name, a) {
        if (!fields) return [];
        if (!layout) layout = Array.isArray(fields) ? $.extend(true, [], fields) : Object.keys(fields);
        for (let x in layout) {
            if (typeof layout[x] === 'string') layout[x] = { name: layout[x] };
            if (typeof layout[x] !== 'object') continue;
            if (Array.isArray(layout[x])) {
                layout[x] = { fields: _resolve_field_layout(host, fields, layout[x], name, a) };
            } else if ('name' in layout[x]) {
                let field = layout[x].name in fields ? fields[layout[x].name] : layout[x].name in host.def.fields ? host.def.fields[layout[x].name] : null;
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

    function _form_field(host, info, p, populate, apply_rules, item_data, hidden) {
        let def = null, field = null;
        if (info instanceof Array)
            info = { fields: info };
        if (!(def = _form_field_lookup(host.def, info))) return;
        if (!item_data && 'name' in def && def.name) item_data = _get_data_item(host.data, def.name);
        if ('name' in def && 'default' in def && item_data instanceof dataBinderArray && item_data.value === null) item_data.value = def.default;
        if ('horizontal' in def) p = def.horizontal;
        if ('render' in def) {
            field = _eval_code(host, def.render, item_data, def.name);
            if (!field) return;
            if (hidden !== true && def.name) host.pageFields.push(def.name);
        } else if ('fields' in def && def.type !== 'array') {
            let layout = _resolve_field_layout(host, def.fields, 'layout' in def ? $.extend(true, [], def.layout) : null, def.name);
            let length = layout.length, fields = [], col_width;
            if (typeof p === 'undefined' || p === null) p = host.settings.horizontal ? false : !('layout' in def && def.layout);
            for (let x in layout) {
                let item = layout[x];
                if (typeof item === 'string') item = _form_field_lookup(host.def, item);
                if (!item) continue;
                if (p && !Array.isArray(item)) {
                    if (!('weight' in item)) item.weight = 1;
                    length = length + (item.weight - 1);
                }
                if (info.protected === true && _is_object(item)) item.protected = true;
                fields.push(item);
            }
            col_width = 12 / length;
            field = $('<div class="form-section">').toggleClass('row', p).data('def', def);
            if ('label' in def) field.append($('<div>').toggleClass('col-md-12', p).html($('<h5>').html(def.label)));
            for (let x in fields) {
                let item = 'name' in fields[x] ? (item_data instanceof dataBinder ? item_data[fields[x].name] : undefined) : item_data;
                if (def.horizontal === true) fields[x].row = true;
                let field_width = col_width, child_field = _form_field(host, fields[x], !p, populate, apply_rules, item, hidden);
                if (!child_field) continue;
                if (fields[x] instanceof Object && 'weight' in fields[x]) field_width = Math.round(field_width * fields[x].weight);
                field.append(child_field.toggleClass('col-md-' + field_width, p));
                if (p && def.row !== true) child_field.removeClass('row');
            }
        } else {
            def.nolabel = false;
            let col = $('<div class="form-field">'), input = _input(host, def, populate, item_data);
            if (host.settings.horizontal) {
                if (def.nolabel !== true && def.label) col.addClass('col-sm-' + host.settings.hz.right);
                else col.addClass('col-sm-12').toggleClass('row', def.row === true);
            }
            if (hidden !== true && def.name) host.pageFields.push(def.name);
            field = $('<div>').addClass(host.settings.styleClasses.group)
                .toggleClass('row', host.settings.horizontal)
                .data('def', def);
            if (def.title || (def.nolabel !== true && def.label)) field.append($('<label>')
                .addClass(host.settings.styleClasses.label)
                .toggleClass('col-sm-' + host.settings.hz.left, host.settings.horizontal)
                .attr('for', '__hz_field_' + def.name)
                .html(_match_replace(host, 'title' in def ? def.title : def.label, null, true, true)));
            if (input) {
                col.html(input);
                if ('hint' in def) col.append($('<small class="form-text text-muted">').html(_match_replace(host, def.hint, null, true, true)));
                if ('css' in def) input.css(def.css);
                if ('cssClass' in def) input.addClass(def.cssClass);
                field.append(col);
            }
        }
        field.data('def', def).data('item', item_data ? item_data : null);
        if ('width' in def) field.width(def.width);
        if ('max-width' in def) field.css('max-width', def['max-width']);
        if ('height' in def) field.css('height', def.height);
        if ('max-height' in def) field.css('max-height', def['max-height']);
        if ('html' in def) {
            let html = def.html;
            if ('label' in def && field.children().length === 0) field.append($('<label>').addClass(host.settings.styleClasses.label).html(def.label));
            field.append($('<div>').html(_match_replace(host, html, null, true, true)));
        }
        if ('header' in def) field.prepend(def.header);
        if ('footer' in def) field.append(def.footer);
        if ('show' in def && apply_rules !== false) _make_showable(host, def, field);
        if ('watch' in def) for (let x in def.watch) host.data.watch(def.watch[x], function (field) { _input_event_update(host, field); });
        if (host.viewmode === true) return field;
        if ('tip' in def) {
            field.children('label.control-label').append(_icon(host, 'question-circle')
                .addClass('form-tip')
                .attr('data-title', def.tip)
                .tooltip({ placement: 'auto', html: true }))
                .on('show.bs.tooltip', function (e) {
                    let o = $(this).children('.form-tip');
                    o.attr('data-original-title', _match_replace(host, o.attr('data-title'), null, true, false)).tooltip('_fixTitle');
                });
        }
        if ('required' in def && apply_rules !== false) _make_required(host, def, field);
        if ('disabled' in def && apply_rules !== false) _make_disabled(host, def, field);
        if ('invalid' in def) field.append($('<div class="invalid-feedback">').html(def.invalid));
        return field;
    }

    //Render a page section
    function _section(host, section, p) {
        let group = $('<div>');
        if (Array.isArray(section)) {
            let col_width = null;
            if (typeof p === 'undefined') p = true;
            if (p) {
                group.addClass('row');
                let length = section.length;
                for (let x in section) {
                    if (typeof section[x] !== 'object' || Array.isArray(section[x])) continue;
                    if (!('weight' in section[x])) section[x].weight = 1;
                    length = length + (section[x].weight - 1);
                }
                col_width = 12 / length;
            }
            for (let x in section)
                group.append($('<div>').toggleClass('col-md-' + Math.round((section[x].weight || 1) * col_width), p).html(_section(host, section[x], !p)));
            return group;
        }
        if (typeof section !== 'object') return null;
        let fieldset = $('<fieldset class="col col-12">').data('def', section).appendTo(group);
        if (section.label)
            fieldset.append($('<legend>').html(_match_replace(host, section.label, null, true, true)));
        for (let x in section.fields)
            fieldset.append(_form_field(host, section.fields[x]));
        if ('show' in section) _make_showable(host, section, fieldset);
        return group.addClass('row');
    }

    //Render a page
    function _page(host, page) {
        if (typeof page !== 'object' || ('show' in page && _eval(host, page.show, true) !== true)) return null;
        let container = $('<div>'), sections = [];
        for (let x in page.sections) sections.push(_section(host, page.sections[x]));
        if (host.events.show.length > 0) for (let x in host.events.show) _toggle_show(host, host.events.show[x]);
        if (host.settings.cards === true) {
            container.addClass('card');
            if (page.label) container.append($('<div class="card-header">').html(_match_replace(host, page.label, null, true, true)));
            container.append($('<div class="card-body">').addClass(host.settings.styleClasses.page).data('def', page).append(sections));
            if (host.settings.singlePage === true) container.addClass('mb-5');
        } else {
            container.addClass(host.settings.styleClasses.page);
            if (page.label) container.append($('<h1>').html(_match_replace(host, page.label, null, true, true)));
            container.append(sections);
        }
        return container.data('def', page);
    }

    function _page_init(host, pageno) {
        host.page = pageno;
        host.events = {
            show: [],
            required: [],
            disabled: [],
            change: {}
        };
        host.eval_cache = null;
        host.pageFields = [];
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
        if (typeof pageno !== 'number') pageno = parseInt(pageno);
        if (force !== true && pageno === host.page) return false;
        let _page_nav = function (host, pageno) {
            _track(host);
            host.objects.container.empty();
            if (host.settings.singlePage) {
                _page_init(host, 0);
                for (let x in host.pages) host.objects.container.append(_page(host, host.pages[x]));
            } else {
                _page_init(host, pageno);
                host.objects.container.append(_page(host, host.pages[pageno]));
                $(host).trigger('nav', [host.page + 1, host.pages.length]);
            }
            host.data.resync();
            _ready(host);
            if (typeof cbComplete === 'function') cbComplete();
        };
        if (host.page !== null && pageno > host.page) {
            let page = host.pages[host.page];
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


    function _validate_input(host, input, remove_only) {
        if (!input.is('input,select,textarea'))
            return input.children('input,select,textarea').each(function (index, item) { _validate_input(host, $(item), remove_only); });
        let name = input.attr('data-bind');
        if (!name) return;
        return _validate_field(host, name, { required: false, disabled: false }).done(function (event, result, response) {
            if (result !== true && remove_only === true) return;
            input.toggleClass('is-invalid', result !== true)
                .toggleClass('border-warning', result === true && _is_object(response) && response.warning === true);
            $(host).trigger('validate_field', [name, result === true, result]);
        });
    }

    function _validation_error(name, def, status) {
        let error = { name: name, field: $.extend({}, def), status: status };
        return error;
    }

    function _validate_rule(host, name, item, def, d, value) {
        if (!(item && def) || host.validate !== true) return true;
        if ('show' in def) if (!_eval(host, def.show, true, item, def.name)) return true;
        if (typeof value === 'undefined') value = item instanceof dataBinderArray ? item.length > 0 ? item : null : def.other && !item.value ? item.other : item.value;
        if (!(name in host.required)) host.required[name] = _eval(host, def.required, d.required, item, name);
        d.required = host.required[name];
        if (d.required && value === null) return _validation_error(name, def, "required");
        if (typeof value === 'undefined' || value === null) return true; //Return now if there is no value and the field is not required!
        if ('format' in def && value instanceof dataBinderValue && def.type !== 'date') {
            if (!Inputmask.isValid(String(value), def.format))
                return _validation_error(name, def, "bad_format");
        }
        if ('validate' in def) {
            for (let type in def.validate) {
                let data = def.validate[type];
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
                        let reg = new RegExp(data);
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
                        if (!_eval(host, data, true))
                            return _validation_error(name, def, "custom");
                        break;
                }
            }
        }
        return true;
    }

    function _validate_field(host, name, d, extra) {
        let callbacks = [];
        setTimeout(function () {
            let def = _is_object(name) ? name : _form_field_lookup(host.def, name);
            if (def) {
                let item = _get_data_item(host.data, def.name);
                if (!item) def.disabled = true;
                if (!(def.name in host.disabled)) host.disabled[def.name] = 'disabled' in def ? _eval(host, def.disabled, d.disabled, item, def.name) : false;
                d.disabled = host.disabled[def.name];
                let result = (def.protected || d.disabled) ? true : _validate_rule(host, def.name, item, def, d);
                if ('fields' in def && (item instanceof dataBinder || item instanceof dataBinderArray)) {
                    let childItems = def.type === 'array' ? item.save() : [item];
                    if (result !== true || childItems.length === 0) {
                        for (let x in callbacks) callbacks[x](def.name, result, extra);
                    } else {
                        for (let i in childItems) {
                            for (let x in def.fields) {
                                if (!('name' in def.fields[x])) def.fields[x].name = x;
                                let fullName = def.type === 'array' ? def.name + '[' + i + '].' + x : def.name + '.' + x;
                                host.queue.push(fullName);
                                _validate_field(host, fullName, { required: d.required, disabled: d.disabled }, extra).done(function (fullName, result) {
                                    for (let x in callbacks) callbacks[x](fullName, result, extra);
                                });
                            }
                        }
                    }
                }
                if (item && item instanceof dataBinderValue && item.value && result === true && 'validate' in def && 'url' in def.validate) {
                    let url = _match_replace(host, def.validate.url, { "__input__": item.value }, true);
                    let request = { target: [url, { "name": def.name, "value": item.value }] };
                    let indexKey = JSON.stringify(request).hash();
                    let apiDone = function (response) {
                        if (!(indexKey in host.apiCache)) host.apiCache[indexKey] = response;
                        let result = response.ok === true ? true : _validation_error(def.name, def, response.reason || "api_failed(" + def.validate.url + ")");
                        if (callbacks.length > 0) for (let x in callbacks) callbacks[x](def.name, result, response);
                    };
                    if (indexKey in host.apiCache) apiDone(host.apiCache[indexKey]);
                    else if (host.standalone === true) $.ajax({
                        method: def.validate.method || 'POST',
                        url: def.validate.url,
                        contentType: "application/json",
                        data: JSON.stringify(request.target[1])
                    }).done(apiDone).fail(_error);
                    else _post(host, 'api', request, false).done(apiDone).fail(_error);
                } else if (callbacks.length > 0) for (let x in callbacks) callbacks[x](def.name, result, extra);
                if (def.name in host.monitor) for (let x in host.monitor[def.name]) host.monitor[def.name][x](result);
            } else for (let x in callbacks) callbacks[x](name, true, extra);
        });
        return { done: function (callback) { if (typeof callback === 'function') callbacks.push(callback); return this; } };
    }

    function _validate_nav_field(field, error) {
        if (Array.isArray(field)) {
            for (let x in field)
                if (_validate_nav_field(field[x], error)) return true;
        } else {
            let name = typeof field === 'string' ? field : field.name;
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
                            let page = parseInt(p);
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
        let callbacks = [];
        host.queue = [];
        host.required = [];
        setTimeout(function () {
            let errors = [];
            if (typeof fields === 'undefined') {
                if (!('def' in host && 'fields' in host.def)) return;
                fields = Object.keys(host.def.fields);
            }
            for (let key in fields) {
                host.queue.push(fields[key]);
                _validate_field(host, fields[key], { required: false, disabled: false }).done(function (name, result, response) {
                    let index = host.queue.indexOf(name);
                    if (index >= 0) host.queue.splice(index, 1);
                    if (!Array.isArray(result)) result = [{ name: name, result: result }];
                    for (let x in result) {
                        if (result[x].result !== true) errors.push(result[x].result);
                        $('[data-bind="' + result[x].name + '"]')
                            .toggleClass('is-invalid', result[x].result !== true)
                            .toggleClass('border-warning', result[x].result === true && _is_object(response) && response.warning === true);
                    }
                    if (host.queue.length === 0) for (let x in callbacks) callbacks[x](errors.length === 0, errors);
                });
            }
        });
        return { done: function (callback) { if (typeof callback === 'function') callbacks.push(callback); } };
    }

    function _validate_page(host) {
        return _validate(host, host.pageFields);
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
        let callbacks = { done: null };
        let save_data = function (host, extra) {
            let data = host.data.save((host.standalone === true));
            for (let x in host.def.fields) if (host.def.fields[x].protected === true) delete data[x];
            let params = host.standalone ? data : { params: extra || {}, form: data };
            if ((events = jQuery._data(host, 'events')) && 'submit' in events && $(host).triggerHandler('submit', [data, params]) !== true) return;
            if ('saveURL' in host.settings) params.url = host.settings.saveURL;
            $(host).trigger('saving', [data, params]);
            host.data.commit();
            _post(host, 'save', params, false).done(function (response) {
                if (!response.ok) {
                    return $(host).trigger('saverror', host.standalone ? response : [{
                        error: { str: response.reason || "An unknown error occurred while saving the form!" }
                    }, response.params]);
                }
                host.posts = {}; //Reset the post cache so we get clean data after 
                if (!host.standalone && (host.uploads.length > 0 || host.deloads.length > 0)) {
                    $(host).trigger('attachStart', [host.uploads, host.deloads]);
                    _upload_files(host, function (result, queue) {
                        $(host).trigger('attachDone', [queue]);
                        if (result) {
                            $(host).trigger('save', [response.result, response.params]);
                            if (callbacks.done) callbacks.done();
                        } else $(host).trigger('saverror', [{ error: { str: 'File upload failed' } }, response.params, queue]);
                    });
                } else {
                    $(host).trigger('save', host.standalone ? response : [response.result, response.params]);
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
        } else if (Array.isArray(file)) for (let x in file) file[x] = _objectify_file(file[x]);
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
            let queue = { pending: [], working: [], attached: [], failed: [] };
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
            let fd = new FormData(), current = queue.pending.shift();
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
                let w = this.upload_file;
                host.uploads = host.uploads.filter(function (file) { return !(w.field === file.field && w.file.name === file.file.name); });
                $(host).trigger('fileDone', [w, response]);
            }).fail(function (xhr) {
                this.upload_file.failed = true;
                this.upload_file.response = xhr.responseJSON;
                $(host).trigger('fileError', [this.upload_file, xhr]);
            }).always(function () {
                let w = this.upload_file;
                queue.working = queue.working.filter(function (file) { return !(w.field === file.field && w.file.name === file.file.name); });
                if (w.failed === true) queue.failed.push(w); else queue.attached.push(w);
                if (queue.pending.length > 0) _upload_file(host, queue, done_callback);
                else if (queue.working.length === 0) done_callback(queue.failed.length === 0, queue);
            });
        }
    }

    function _post(host, action, postdata, track, sync) {
        if (track === true) _track(host);
        let params = {}, url = "";
        if (host.standalone === true) {
            if (!(action in host.settings.endpoints)) return $(host).trigger('error', ['Host endpoint ' + action + ' is unknown!']);
            url = host.settings.endpoints[action];
            params = postdata;
        } else {
            url = hazaar.url(host.settings.controller, "interact/" + action);
            params = $.extend(true, {}, {
                name: host.settings.form,
                params: host.settings.params
            }, postdata);
        }
        return $.ajax({
            method: "POST",
            url: url,
            async: sync !== true,
            contentType: "application/json",
            data: JSON.stringify(params)
        }).always(function (response) {
            if (track === true) _ready(host);
            if ('data' in response) console.log(response.data);
        });
    }

    function _diff(host, data) {
        if (typeof data === 'string') return $.get(data).done(function (response) { _diff(host, response) });
        $(host).find('.is-different').removeClass('is-different');
        host.data.diff(data, function (item) { item.find().addClass('is-different'); });
    }

    function _define(values) {
        if (!values) return;
        let data = {};
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
        let prop_fields = ["disabled", "protected", "focus", "blur"]; //Fields that propagate
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
                for (let i in prop_fields) if (prop_fields[i] in fields[x]) itemExtra[prop_fields[i]] = fields[x][prop_fields[i]];
            } else if ('type' in fields[x] && fields[x].type === 'array') {
                if ('arrayOf' in fields[x] && 'types' in host.def && fields[x].arrayOf in host.def.types) {
                    fields[x].fields = host.def.types[fields[x].arrayOf].fields;
                    delete fields[x].arrayOf;
                }
                if ('default' in fields[x] && !Array.isArray(fields[x].default)) fields[x].default = [fields[x].default];
            } else if (itemExtra) fields[x] = jQuery.extend(true, {}, itemExtra, fields[x]);
            if ('watch' in fields[x] && !Array.isArray(fields[x].watch)) fields[x].watch = [fields[x].watch];
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
        }).fail(_error);
    }

    function _fix_plain_data(host, data, p) {
        if (!data) return {};
        for (let x in data) {
            let key = (p ? p + '.' : '') + x, def = null;
            if (_is_object(data[x]) && !('__hz_value' in data[x])) _fix_plain_data(host, data[x], key);
            else if (typeof data[x] === 'boolean') data[x] = { '__hz_value': data[x], '__hz_label': data[x] ? 'Yes' : 'No' };
            else if (host.viewmode === true && (def = _form_field_lookup(host.def, key)) !== null && 'options' in def) {
                _input_options(host, def, $('<i>').data('def', def), null, function (s, options) {
                    if (_is_object(options) && !('url' in options)) data[x] = { '__hz_value': data[x], '__hz_label': options[data[x]] };
                    else {
                        _input_options_populate(host, options, s, false, null, function (host, o, d, s) {
                            let item_data = _get_data_item(host.data, key);
                            if (item_data) item_data.label = d[data[x]];
                        });
                    }
                });
            }
        }
        return data;
    }

    function _convert_simple_form(def) {
        let _convert_simple_form_fields = function (def, layout, fields) {
            let i = null;
            if (Array.isArray(def)) {
                i = [];
                for (let x in def) _convert_simple_form_fields(def[x], i, fields);
            }
            else if (_is_object(def)) {
                if ('sections' in def) _convert_simple_form_fields(def.sections, i = [], fields);
                else if ('fields' in def) _convert_simple_form_fields(def.fields, i = [], fields);
                else if ('name' in def) {
                    let parts = def.name.split('.');
                    for (let x = 1; x <= parts.length; x++) {
                        let part = parts[x - 1];
                        if (x < parts.length) {
                            fields[part] = { fields: {} };
                            fields = fields[part].fields;
                        } else if (!(part in fields)) fields[part] = def;
                    }
                    i = def.name;
                }
            }
            layout.push(i);
        }
        if (!Array.isArray(def)) return false;
        let layout = [], fields = {};
        _convert_simple_form_fields(def, layout, fields);
        return { "name": "Simple Form", "pages": [{ "sections": [{ "fields": layout }] }], "fields": fields };
    }

    //Evals the pages and returns true if something has changed, false if nothing has changed.
    function _eval_form_pages(host, pages) {
        let changed = false, pageno = 'pages' in host && host.pages[host.page] ? host.pages[host.page].id : host.page;
        host.pages = [];
        if (!('pstate' in host)) host.pstate = [];
        for (let x in pages) {
            let state = ('show' in pages[x]) ? _eval(host, pages[x].show, true) : true;
            pages[x].id = parseInt(x);
            if (changed !== true && host.pstate[x] !== state) changed = true;
            host.pstate[x] = state;
            if (host.pstate[x] !== true) continue;
            let y = host.pages.push(pages[x]);
            if (pages[x].id === pageno) host.page = y - 1; //Store the new page number
        }
        if (changed) {
            let pages = [];
            for (num in host.pages) pages[num] = { label: _match_replace(host, host.pages[num].label, null, true, true) };
            $(host).trigger('pages', [pages, host.page]).trigger('nav', [host.page + 1, host.pages.length]);
        }
        return changed;
    }

    //Load all the dynamic bits
    function _load(host, initUrl) {
        let p = function (response) {
            if (!response.ok) return;
            if ('horizontal' in host.def) host.settings.horizontal = host.def.horizontal;
            host.data.extend(_fix_plain_data(host, response.form));
            host.data.commit();
            _eval_form_pages(host, host.def.pages);
            $(host).trigger('data', [host.data.save()]);
            _nav(host, host.page, null, true);
        };
        if (initUrl) host.settings.endpoints.init = initUrl;
        if (host.standalone === true || (host.standalone = ('def' in host.settings)) === true) {
            let i = function (response) {
                host.def = response;
                if (Array.isArray(host.def)) host.def = _convert_simple_form(host.def);
                _prepare_field_definitions(host, host.def.fields);
                host.data = new dataBinder(_define(host.def.fields));
                $(host).trigger('load', [host.def]);
                if ('load' in host.settings.endpoints) _post(host, 'load').done(p).fail(_error);
                else if (typeof host.settings.data === 'string') $.get(host.settings.data).done(function (r) { p({ ok: true, form: r }); }).fail(_error);
                else p({ ok: true, form: host.settings.data });
            };
            if ('init' in host.settings.endpoints) _post(host, 'init').done(i).fail(_error);
            else i(host.settings.def);
            delete host.settings.def;
            delete host.settings.data;
        } else {
            _load_definition(host).done(function (response) {
                $(host).trigger('load', [host.def]);
                _post(host, 'load').done(p).fail(_error);
            });
        }
    }

    function _get_empty_host(host, parent_host) {
        if (typeof host === 'undefined') host = {};
        host.data = {};
        host.events = {
            show: [],
            required: [],
            disabled: [],
            change: {}
        };
        host.posts = {};
        host.viewmode = false;
        host.page = 0;
        host.working = false;
        host.validate = true;
        host.standalone = false;
        host.pageFields = [];
        host.queue = [];
        host.loading = 0;
        host.uploads = [];
        host.deloads = [];
        host.monitor = {};
        host.apiCache = {};
        host.required = {};
        host.disabled = {};
        if (parent_host) {
            host.parent = parent_host;
            host.settings = parent_host.settings;
        }
        return host;
    }

    function __initialise(host, settings) {
        //Define the default object properties
        _get_empty_host(host);
        host.settings = $.extend(true, {}, $.fn.hzForm.defaults, settings);
        host.viewmode = host.settings.viewmode;
        if (host.settings.concurrentUploads < 1) host.settings.concurrentUploads = 1;
        $(host).trigger('init');
        _render(host);
        _load(host);
        form = host;
    }

    $.fn.hzForm = function () {
        let args = arguments;
        let host = this.get(0);
        switch (args[0]) {
            case 'info':
                let data = host.data.save(), info = {};
                for (let x in data)
                    info[x] = { label: host.def.fields[x].label, value: data[x] };
                return info;
            case 'data':
                return host.data;
            case 'def':
                return host.def;
            case 'load':
                if (host.settings) _load(host, args[1]);
                return;
        }
        return this.each(function (index, host) {
            if (host.settings) {
                switch (args[0]) {
                    case 'reload':
                        if (args[1] === true) _load(host);
                        else {
                            let values = host.data.save();
                            _load_definition(host).done(function () {
                                for (let x in values)
                                    host.data[x] = values[x];
                                _eval_form_pages(host, host.def.pages);
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
                        if (host.page < host.pages.length - 1)
                            _nav(host, host.page + 1);
                        break;
                    case 'save':
                        _save(host, args[1], args[2]).done(function () {
                            if (host.settings.viewmode === true) {
                                host.viewmode = true;
                                _nav(host, host.page, null, true);
                            }
                        });
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
                    case 'reset':
                        host.data.reset();
                        break;
                    case 'edit':
                        host.viewmode = false;
                        _nav(host, host.page, null, true);
                        break;
                    case 'view':
                        host.viewmode = true;
                        _nav(host, host.page, null, true);
                        break;
                    case 'toggleEdit':
                        host.viewmode = (1 in args && typeof args[1] === 'boolean') ? args[1] : !host.viewmode;
                        _nav(host, host.page, null, true);
                        break;
                    case 'monitor':
                        if (typeof args[2] === 'function') {
                            host.monitor[args[1]] = [args[2]];
                            _validate_field(host, args[1], { required: false, disabled: false });
                        }
                        break;
                    case 'diff':
                        _diff(host, args[1]);
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
        "endpoint": "interact",
        "encode": true,
        "singlePage": false,
        "cards": false,
        "horizontal": false,
        "viewmode": false,
        "hz": { "left": 3, "right": 9 },
        "placeholder": "Please select...",
        "loaderClass": "forms-loader",
        "validateNav": true,
        "lookup": { "delay": 300, "startlen": 0, "autocomplete": false },
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
            "chkLabel": "custom-control-label",
            "button": "btn",
            "buttonGroup": "btn-group"
        },
        "endpoints": {},
        "icons": hzIcons
    };

})(jQuery);

$.fn.fileUpload = function () {
    let host = this.get(0);
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
        thumbnail: 120,
        maxSize: null,
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
            $('<div class="dz-remove">').html(_hz_icon('times')).click(function (e) {
                let item = $(this).parent();
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
            let item = $(o), data = item.data('file');
            if (data && data.name === file.name) item.remove();
        });
        if (this.files.length === 0 && this.o.dzwords) this.o.dzwords.show();
        return true;
    };
    host._preview = function (file) {
        let o = $('<div class="dz-preview">').css({ width: host.options.thumbnail, height: host.options.thumbnail });
        if (file.preview) o.append($('<img>').attr('src', file.preview));
        else if (typeof file.type === 'string') {
            if (file.type.substr(0, 5) === 'image') {
                if (file.url) o.append($('<img>').attr('src', file.url));
                else if (file instanceof File && file.type.substr(0, 5) === 'image') {
                    let reader = new FileReader();
                    reader.onload = function (event) {
                        o.append($('<img>').attr('src', event.target.result));
                    };
                    reader.readAsDataURL(file);
                }
            } else o.addClass('fileicon').attr('data-type', file.type.replace(/\./g, '_').replace(/\//g, '-'));
        }
        return o;
    };
    host._checkexists = function (file) {
        for (let x in host.files) if (host.files[x].name === file.name) return true;
        return false;
    };
    host._checksize = function (file) {
        if (typeof host.options.maxSize !== 'integer' || host.options.maxSize <= 0 || file.size < host.options.maxSize)
            return true;
        return false;
    };
    host._add_files = function (fileArray) {
        let added = [], failed = [];
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
            let filesP = $('<p>');
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
            let o = Object(this), len = o.length >>> 0;
            if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
            let thisArg = arguments[1], k = 0;
            while (k < len) {
                let kValue = o[k];
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
            let o = Object(this), len = o.length >>> 0;
            if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
            let thisArg = arguments[1], k = 0;
            while (k < len) {
                let kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) return k;
                k++;
            }
            return -1;
        },
        configurable: true,
        writable: true
    });
}