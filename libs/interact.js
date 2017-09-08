(function ($) {
    $.fn.form = function (settings) {
        var host = this.get(0);
        if (host._render) {
            switch (arguments[0]) {
                case 'page':
                    host._nav(arguments[1]);
                    break;
                case 'prev':
                    if (host.page > 0)
                        host._nav(host.page - 1);
                    break;
                case 'next':
                    if (host.page < (host.def.pages.length - 1))
                        host._nav(host.page + 1);
                    break;
                case 'save':
                    return host._save(arguments[1], arguments[2]);
                case 'get':
                    return host.data;
            }
            return this;
        }
        //Define the default object properties
        host.settings = $.extend({}, $.fn.form.defaults, settings);
        host.data = {};
        host.events = {};
        host.posts = {};
        host.page = null;
        host.loading = 0;
        //Error capture method
        host._error = function (xhr, textStatus, errorThrown) {
            var error = xhr.responseJSON.error;
            host.o.loader.html(error.str);
            $(host).trigger('error', [error]);
        };
        host._exec = function (type, field) {
            if (!(type in this.events && field in this.events[type]))
                return false;
            var obj = host.events[type][field];
            (function (data, code) {
                return eval(code);
            })(host.data, obj.data(type));
        };
        host._toggle = function (obj) {
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
                    code += 'var ' + key + " = " + value + ";\n";
                }
                code += "( " + evaluate + " );";
                return eval(code);
            })(host.data.save(), parts.join(''));
            if ((name = obj.data('name')) && toggle === false) host.data[name] = null;
        };
        //Input events
        host._focus = function (e) {
            $(e.target).parent().removeClass('has-error');
        };
        host._change = function (e) {
            var value = null, input = $(e.target);
            var def = input.data('def');
            if (input.is('[type=checkbox]'))
                value = input.is(':checked');
            else
                value = input.val();
            if (value === '') value = null;
            host.data[e.target.name] = value;
            if (host.events.show.length > 0) {
                for (x in host.events.show)
                    host._toggle(host.events.show[x]);
            }
            host._exec('change', e.target.name);
        };
        host._blur = function (e) {
            var input = $(e.target);
            var def = input.data('def');
            if (def.required && input.val() == '')
                input.parent().addClass('has-error');
        };
        host._populate = function (select, track) {
            var def = select.data('def');
            var options = def.options;
            while (match = options.match(/\{\{(\w+)\}\}/))
                options = options.replace(match[0], host.data[match[1]]);
            select.html($('<option>').html('Loading...'));
            this._post('api', { target: options }, track).done(function (data) {
                select.empty();
                if (def.placeholder && (!def.required || this.data[field] == null))
                    select.append($('<option>').attr('value', '').html(def.placeholder).prop('disabled', (def.required == true)));
                for (x in data)
                    select.append($('<option>').attr('value', x).html(data[x]));
                select.val(host.data[select.attr('name')]);
            });
            return true;
        }
        //Render a field
        host._field = function (field) {
            var def = null;
            if (typeof field == 'object') {
                def = $.extend({}, host.def.fields[field.name], field);
                field = def.name;
            } else {
                def = host.def.fields[field];
            }
            if (!def)
                return;
            var form_group = $('<div class="form-group">').html($('<label class="col-lg-3">').attr('for', field).html(def.label)).data('name', field);
            var form_control = $('<div class="col-lg-9">').appendTo(form_group);
            if (def.options) {
                var select = $('<select class="form-control">')
                    .attr('name', field)
                    .attr('data-bind', field)
                    .data('name', field)
                    .data('def', def);
                if (typeof def.options == 'string') {
                    var matches = def.options.match(/\{\{\w+\}\}/g);
                    for (x in matches) {
                        var match = matches[x].substr(2, matches[x].length - 4);
                        host.data.watch(match, function (key, value, select) {
                            host._populate(select, false);
                        }, select);
                    }
                    host._populate(select.change(this._change));
                } else {
                    if (def.placeholder && (!def.required || host.data[field] == null))
                        select.append($('<option>').attr('value', '').html(def.placeholder).prop('disabled', (def.required == true)));
                    for (x in def.options)
                        select.append($('<option>').attr('value', x).html(def.options[x]));
                    select.val(host.data[field]).change(host._change);
                }
                select.appendTo(form_control);
            } else {
                switch (def.type) {
                    case 'string':
                    case 'text':
                        var input = $('<input type="text" class="form-control">')
                            .attr('name', field)
                            .attr('data-bind', field)
                            .data('name', field)
                            .data('def', def)
                            .val(host.data[field])
                            .focus(host._focus)
                            .change(host._change)
                            .blur(host._blur);
                        if (def.placeholder) input.attr('placeholder', def.placeholder);
                        if (def.prefix || def.prefix) {
                            var group = $('<div class="input-group">').appendTo(form_control);
                            if (def.prefix) group.append($('<span class="input-group-addon">').html(def.prefix));
                            group.append(input);
                            if (def.suffix) group.append($('<span class="input-group-addon">').html(def.suffix));
                        } else {
                            input.appendTo(form_control);
                        }
                        break;
                    case 'int':
                    case 'integer':
                    case 'number':
                        var input = $('<input type="number" class="form-control">')
                            .attr('name', field)
                            .attr('data-bind', field)
                            .data('name', field)
                            .data('def', def)
                            .val(host.data[field])
                            .change(host._change)
                            .appendTo(form_control);
                        if (def.placeholder) input.attr('placeholder', def.placeholder);
                        break;
                    case 'date':
                        $('<input type="date" class="form-control">')
                            .attr('name', field)
                            .attr('data-bind', field)
                            .data('name', field)
                            .data('def', def)
                            .val(host.data[field])
                            .change(host._change)
                            .appendTo(form_control);
                        break;
                    case 'boolean':
                        $('<input type="checkbox">')
                            .attr('name', field)
                            .attr('data-bind', field)
                            .data('name', field)
                            .data('def', def)
                            .attr('checked', host.data[field])
                            .change(host._change)
                            .appendTo(form_control);
                        break;
                }
            }
            if (def.html)
                form_control.append(def.html);
            if (def.show)
                this.events.show.push(form_group.data('show', def.show));
            if (def.change)
                this.events.change[field] = form_group.data('change', def.change);
            return form_group;
        };
        //Render a page section
        host._section = function (section) {
            var fieldset = $('<fieldset>');
            if (section.label)
                fieldset.append($('<legend>').html(section.label));
            for (x in section.fields) {
                var field = this._field(section.fields[x]);
                if (field) field.appendTo(fieldset);
            }
            return fieldset;
        };
        //Render a page
        host._page = function (page) {
            var form = $('<div class="form-container">');
            host.events = {
                show: [],
                change: {}
            };
            host.data.unwatch();
            if (page.label) form.append($('<h1>').html(page.label));
            for (x in page.sections)
                this._section(page.sections[x]).appendTo(form);
            host.o.container.html(form);
            if (this.events.show.length > 0) {
                for (x in this.events.show)
                    this._toggle(this.events.show[x]);
            }
        };
        //Render the whole form
        host._render = function (data) {
            this.o = {
                loader: $('<div class="forms-loader-container">').html($('<div class="forms-loader">')),
                container: $('<div class="forms-container">').hide()
            };
            $(this).addClass('form-horizontal').html([this.o.loader, this.o.container]);
        };
        //Navigate to a page
        host._nav = function (pageno) {
            this.loading++;
            host.page = pageno;
            host._page(host.def.pages[pageno]);
            $(host).trigger('nav', [pageno + 1, host.def.pages.length]);
            this._ready();
        };
        //Run the data validation
        host._validate = function () {
            console.log('Validation not yet implemented!');
            return false;
        };
        //Signal that everything is ready to go
        host._ready = function () {
            this.loading--;
            if (this.loading > 0 || this.page === null)
                return;
            host.o.loader.hide();
            host.o.container.show();
            $(host).trigger('ready', [host.def]);
        };
        //Save form data back to the controller
        host._save = function (validate, extra) {
            if (!(validate === false || ((validate === true || typeof validate == 'undefined') && this._validate())))
                return false;
            var data = $.extend({}, this.settings.params, extra);
            data.form = this.data.save();
            $(host).trigger('saving', [data]);
            this._post('post', $.extend({}, this.settings.params, data), false).done(function (response) {
                if (response.form) {
                    for (x in response.form)
                        host.data[x] = response.form[x];
                }
                host.posts = {}; //Reset the post cache so we get clean data after 
                $(host).trigger('saved', [response]);
            }).fail(this._error);
            return true;
        };
        //Register events that are used to control the form functions
        host._registerEvents = function () {

        }
        host._post = function (action, postdata, track) {
            if (this.settings.cachedActions.indexOf(action) != -1) {
                var index = btoa(action + JSON.stringify(postdata));
                if (index in this.posts)
                    return { done: function (callback) { callback(host.posts[index]); } };
            }
            if (track !== false) {
                host.o.container.hide();
                host.o.loader.show();
                this.loading++;
            }
            return $.ajax({
                method: "POST",
                url: hazaar.url(host.settings.controller, 'interact/' + action),
                contentType: "application/json",
                data: (typeof postdata == 'object' ? JSON.stringify(postdata) : null)
            }).always(function (response) {
                if (host.settings.cachedActions.indexOf(action) != -1)
                    host.posts[index] = response;
                host._ready();
            }).fail(this._error);
        };
        //Load all the dynamic bits
        host._load = function () {
            $.get(hazaar.url('hazaar/forms', 'load', { form: host.settings.form }, host.settings.encode)).done(function (response) {
                var data = {};
                host.def = response;
                if (host.def.fields) {
                    for (x in host.def.fields)
                        data[x] = host.def.fields[x].default ? host.def.fields[x].default : null;
                }
                host.data = new dataBinder(data);
                host._post('load', host.settings.params).done(function (response) {
                    if (typeof response == 'object' && Object.keys(response).length > 0) {
                        for (x in response)
                            host.data[x] = response[x];
                        $(host).trigger('data', [host.data.save()]);
                    }
                    host._nav(0);
                });
            }).fail(this._error);
        };
        $(this).trigger('init');
        host._registerEvents();
        host._render();
        host._load(host.settings.url);
        return this;
    };

    $.fn.form.defaults = {
        "form": "default",
        "controller": "index",
        "encode": true,
        "cachedActions": ["api"]
    };

})(jQuery);
