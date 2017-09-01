﻿$.fn.form = function (settings) {
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
    host.settings = $.extend({ "form": "default", "controller": "index", "encode": false }, settings);
    host.data = {};
    host.page = null;
    //Error capture method
    host._error = function (xhr, textStatus, errorThrown) {
        var error = xhr.responseJSON.error;
        host.o.loader.html(error.str);
        $(host).trigger('error', [error]);
    };
    host._trigger = function (obj) {
        var toggle = eval('host.data.' + obj.data('if'));
        obj.toggle(toggle);
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
        host.data[e.target.name] = value;
        $(host).find('[data-validate="true"]').each(function (index, item) {
            host._trigger($(item));
        });
    };
    host._blur = function (e) {
        var input = $(e.target);
        var def = input.data('def');
        if (def.required && input.val() == '')
            input.parent().addClass('has-error');
    };
    //Render an input field
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
        var form_group = $('<div class="form-group">').html($('<label class="col-lg-3">').attr('for', field).html(def.label));
        var form_control = $('<div class="col-lg-9">').appendTo(form_group);
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
            case 'select':
                var select = $('<select class="form-control">')
                    .attr('name', field)
                    .attr('data-bind', field)
                    .data('name', field)
                    .data('def', def);
                for (x in def.options)
                    select.append($('<option>').attr('value', x).html(def.options[x]));
                select.val(host.data[field])
                    .change(host._change)
                    .appendTo(form_control);
                break;
        }
        if (def.show) {
            form_group.attr('data-validate', true).data('if', def.show);
            this._trigger(form_group);
        }
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
        if (page.label) form.append($('<h1>').html(page.label));
        for (x in page.sections)
            this._section(page.sections[x]).appendTo(form);
        $(host).html(form);
    };
    //Render the whole form
    host._render = function (data) {
        this.o = {};
        this.o.loader = $('<div class="forms-loader-container">').html($('<div class="forms-loader">'));
        $(this).addClass('form-horizontal').html(this.o.loader);
    };
    //Navigate to a page
    host._nav = function (pageno) {
        host.page = pageno;
        host._page(host.def.pages[pageno]);
        $(host).trigger('nav', [pageno + 1, host.def.pages.length]);
    };
    //Run the data validation
    host._validate = function () {
        console.log('Validation not yet implemented!');
        return false;
    };
    //Signal that everything is ready to go
    host._ready = function (def) {
        host.o.loader.hide();
        $(host).trigger('ready', [host.def]);
        host._nav(0);
    };
    host._post = function (action, postdata) {
        return $.ajax({
            method: "POST",
            url: hazaar.url(host.settings.controller, 'interact/' + action),
            contentType: "application/json",
            data: JSON.stringify(postdata)
        });
    };
    //Save form data back to the controller
    host._save = function (validate, extra) {
        if (!(validate === false || ((validate === true || typeof validate == 'undefined') && this._validate())))
            return false;
        var data = $.extend({}, this.settings.params, extra);
        data.form = this.data.save();
        $(host).trigger('saving', [data]);
        this._post('post', $.extend({}, this.settings.params, data)).done(function (response) {
            if (response.form) {
                for (x in response.form)
                    host.data[x] = response.form[x];
            }
            $(host).trigger('saved', [response]);
        }).fail(this._error);
        return true;
    };
    //Register events that are used to control the form functions
    host._registerEvents = function () {

    }
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
                host._ready();
            }).fail(this._error);
        }).fail(this._error);
    };
    $(this).trigger('init');
    host._registerEvents();
    host._render();
    host._load(host.settings.url);
    return this;
}

