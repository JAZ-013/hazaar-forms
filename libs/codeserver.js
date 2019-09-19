/*
 * Hazaar Forms JS Code Execution Server
 */
const http = require('http');
const port = process.argv[2] ? process.argv[2] : 3000;
var dataBinder = function (data, name, parent) {
    this._init(data, name, parent);
};
var dataBinderArray = function (data, name, parent) {
    if (this === window) return new dataBinderArray(data, name, parent);
    this._init(data, name, parent);
};
var dataBinderValue = function (name, value, label, parent) {
    this._name = name;
    this.value = parent.__nullify(value);
    this.label = label;
    this.other = null;
    this.parent = parent;
};
dataBinderValue.prototype.__name = function () {
    return this.parent._attr_name(this._name);
};
dataBinderValue.prototype.toString = function () {
    return this.label || this.value || this.other;
};
dataBinderValue.prototype.valueOf = function () {
    return this.value;
};
dataBinderValue.prototype.set = function (value, label, other) {
    value = this.parent.__nullify(value);
    if (value !== null && typeof value === 'object'
        || (value === this._value && update !== true) && label === this._label
        && (typeof other === 'undefined' || other === this._other)) return;
    var attr_name = this.parent._attr_name(this._name);
    this.value = value;
    this.label = label;
    if (typeof other !== 'undefined') this.other = other;
    return this;
};
dataBinderValue.prototype.save = function (no_label) {
    if ((this.value !== null && this.label !== null && this.label !== '' || this.value === null && this.other !== null) && no_label !== true)
        return { "__hz_value": this.value, "__hz_label": this.label, "__hz_other": this.other };
    return this.value;
};
dataBinderValue.prototype.empty = function (update) {
    return this.set(null, null, null, update);
};
dataBinderValue.prototype.update = function () { };
dataBinderValue.prototype.enabled = function (value) { };
dataBinder.prototype._init = function (data, name, parent) {
    this._name = name;
    this.parent = parent;
    this._attributes = {};
    if (Object.keys(data).length > 0) for (var key in data) this.add(key, data[key]);
};
dataBinder.prototype.__name = function () {
    return this._attr_name();
};
dataBinder.prototype.__nullify = function (value) {
    if (typeof value === 'string' && value === '') value = null;
    return value;
};
dataBinder.prototype.__convert_type = function (key, value, parent) {
    if (typeof parent === 'undefined') parent = this;
    value = this.__nullify(value);
    if (Array.isArray(value))
        value = new dataBinderArray(value, key, parent);
    else if (value !== null && typeof value === 'object' && '__hz_value' in value) {
        if (typeof value.__hz_value === 'string' && value.__hz_value === '') value = null;
        else {
            let dba = new dataBinderValue(key, value.__hz_value, value.__hz_label, parent);
            if ('__hz_other' in value) dba.other = value.__hz_other;
            value = dba;
        }
    } else if (value !== null && !(value instanceof dataBinder
        || value instanceof dataBinderArray
        || value instanceof dataBinderValue)) {
        if (value !== null && typeof value === 'object' && value.constructor.name === 'Object') value = new dataBinder(value, key, parent);
        else if (typeof value !== 'object') value = new dataBinderValue(key, value, null, parent);
    }
    return value;
};
dataBinder.prototype.add = function (key, value) {
    this._attributes[key] = this.__convert_type(key, value);
    this._defineProperty(key);
};
dataBinder.prototype._defineProperty = function (key) {
    Object.defineProperty(this, key, {
        configurable: true,
        set: function (value) {
            var attr = this._attributes[key];
            if (value instanceof dataBinder) value = value.save(); //Export so that we trigger an import to reset the value names
            value = this.__convert_type(key, value);
            if (value === null && attr && attr.other) attr.other = null;
            else if (value === null && attr instanceof dataBinder
                || (attr instanceof dataBinderValue ? attr.value : attr) === (value instanceof dataBinderValue ? value.value : value)
                && (attr && (!(attr instanceof dataBinderValue) || !(value instanceof dataBinderValue) || attr.label === value.label && attr.other === value.other)))
                return; //If the value or label has not changed, then bugger off.
            this._attributes[key] = value;
            if (attr instanceof dataBinder && value instanceof dataBinder) value._parent = this;
        },
        get: function () {
            if (!this._attributes[key]) this._attributes[key] = new dataBinderValue(key, null, null, this);
            return this._attributes[key];
        }
    });
};
dataBinder.prototype.remove = function (key) {
    if (!(key in this._attributes)) return;
    delete this._attributes[key];
};
dataBinder.prototype._attr_name = function (attr_name) {
    if (!this.parent) return attr_name;
    return this.parent._attr_name(this._name) + (typeof attr_name === 'undefined' ? '' : '.' + attr_name);
};
dataBinder.prototype.save = function (no_label) {
    var attrs = {};
    for (let x in this._attributes) {
        if (this._attributes[x] instanceof dataBinder
            || this._attributes[x] instanceof dataBinderArray
            || this._attributes[x] instanceof dataBinderValue)
            attrs[x] = this._attributes[x].save(no_label);
        else attrs[x] = this._attributes[x];
    }
    return attrs;
};
dataBinder.prototype.keys = function () {
    return Object.keys(this._attributes);
};
dataBinder.prototype.populate = function (items) {
    this._attributes = {};
    for (let x in items) {
        if (key in this._attributes) continue;
        this.add(items[x]);
    }
};
dataBinder.prototype.extend = function (items) {
    for (let x in items) {
        if (x in this._attributes) {
            if (this._attributes[x] instanceof dataBinder)
                this[x].extend(items[x]);
            else if (this._attributes[x] instanceof dataBinderArray)
                this[x].populate(items[x]);
            else
                this[x] = items[x];
        } else
            this.add(x, items[x]);
    }
};
dataBinder.prototype.get = function (key) {
    if (key in this._attributes)
        return this._attributes[key];
};
dataBinder.prototype.empty = function () {
    for (x in this._attributes)
        if (this._attributes[x] instanceof dataBinder
            || this._attributes[x] instanceof dataBinderArray
            || this._attributes[x] instanceof dataBinderValue)
            this._attributes[x].empty();
        else this._attributes[x] = null;
};
dataBinder.prototype.compare = function (value) {
    if (typeof value !== 'object' || !value instanceof dataBinder || value.constructor.name !== 'Object') return false;
    for (x in value) if (!(x in this._attributes)
        || (this._attributes[x] instanceof dataBinderValue ? this._attributes[x].value : this._attributes[x]) !== value[x]) return false;
    for (x in this._attributes) if (!(x in value)) return false;
    return true;
};
dataBinderArray.prototype._init = function (data, name, parent) {
    if (!parent) throw "dataBinderArray requires a parent!";
    this._name = name;
    this.parent = parent;
    this._elements = [];
    if (Array.isArray(data) && data.length > 0) for (let x in data) this.push(data[x]);
    Object.defineProperties(this, {
        "length": {
            get: function () {
                return this._elements.length;
            }
        }
    });
};
dataBinderArray.prototype.__name = function () {
    return this._attr_name();
};
dataBinderArray.prototype._attr_name = function (attr_name) {
    if (!this.parent) return attr_name;
    return this.parent._attr_name(this._name) + (typeof attr_name === 'undefined' ? '' : '[' + attr_name + ']');
};
dataBinderArray.prototype.pop = function () {
    var index = this._elements.length - 1;
    var element = this._elements[index];
    this.unset(index);
    return element;
};
dataBinderArray.prototype.__convert_type = function (key, value) {
    return this.parent.__convert_type(key, value, this);
};
dataBinderArray.prototype.push = function (element, no_update) {
    var key = this._elements.length;
    if (!Object.getOwnPropertyDescriptor(this, key)) {
        Object.defineProperty(this, key, {
            set: function (value) {
                this._elements[key] = this.__convert_type(key, value);
            },
            get: function () {
                return this._elements[key];
            }
        });
    }
    this._elements[key] = this.__convert_type(key, element);
    return key;
};
dataBinderArray.prototype.indexOf = function (search) {
    if (typeof search === 'function') {
        for (x in this._elements) if (search(this._elements[x], x) === true) return parseInt(x);
    } else {
        if (search instanceof dataBinderValue) search = search.value;
        for (let i in this._elements) {
            if (this._elements[i] instanceof dataBinder && this._elements[i].compare(search) === true
                || (this._elements[i] instanceof dataBinderValue ? this._elements[i].value : this._elements[i]) === search)
                return parseInt(i);
        }
    }
    return -1;
};
dataBinderArray.prototype.remove = function (value, no_update) {
    return this.unset(this.indexOf(value instanceof dataBinderValue ? value.value : value), no_update);
};
dataBinderArray.prototype.unset = function (index, no_update) {
    if (index < 0 || typeof index !== 'number') return;
    var element = this._elements[index];
    if (typeof element === 'undefined') return;
    this._cleanupItem(index);
    return element;
};
dataBinderArray.prototype.save = function (no_label) {
    var elems = this._elements.slice();
    for (let x in elems) {
        if (elems[x] instanceof dataBinder
            || elems[x] instanceof dataBinderArray
            || elems[x] instanceof dataBinderValue)
            elems[x] = elems[x].save(no_label);
    }
    return elems;
};
dataBinderArray.prototype._cleanupItem = function (index) {
    if (!(index in this._elements)) return;
    for (var i = index + 1; i < this._elements.length; i++) {
        var new_i = i - 1;
        if (i in this._elements && (this._elements[i] instanceof dataBinder || this._elements[i] instanceof dataBinderArray))
            this._elements[i].resync(new_i);
    }
    var elem = this._elements.splice(index, 1);
    return elem;
};
dataBinderArray.prototype.populate = function (elements) {
    this._elements = [];
    if (!elements || typeof elements !== 'object') return;
    else if (!Array.isArray(elements))
        elements = Object.values(elements);
    for (let x in elements) {
        if (elements[x] instanceof dataBinder || elements[x] instanceof dataBinderArray || this._elements.indexOf(elements[x]) < 0)
            this.push(elements[x]);
    }
};
dataBinderArray.prototype.filter = function (cb) {
    var list = [];
    for (let x in this._elements) {
        var value = this._elements[x] instanceof dataBinderValue ? this._elements[x].value : this._elements[x];
        if (cb(value)) list.push(this._elements[x]);
    }
    return list;
};
dataBinderArray.prototype.reduce = function (cb) {
    for (let x in this._elements) if (cb(this._elements[x]) === false) this._elements.splice(x, 1);
    return this;
};
dataBinderArray.prototype.__nullify = function (value) {
    return this.parent.__nullify(value);
};
dataBinderArray.prototype.empty = function () {
    for (x in this._elements)
        this._elements[x].empty();
    this._elements = [];
};
dataBinderArray.prototype.each = function (callback) {
    for (x in this._elements) callback(this._elements[x]);
};
dataBinderArray.prototype.find = function (callback) {
    var elements = [];
    for (x in this._elements)
        if (callback(this._elements[x]) === true) elements.push(this._elements[x]);
    return elements;
};
var _get_data_item = function (data, name, isArray, value) {
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
};
http.createServer((req, res) => {
    let body = [];
    req.on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        try {
            let result = eval(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('ERROR: ' + e.toString());
        }
    });
}).listen(port, () => { console.log('Code execution server ready on port ' + port); });
