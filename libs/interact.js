$.fn.form = function (settings) {
    var host = this.get(0);
    if (host._render)
        return this;
    host.settings = $.extend(settings, {
        panelClass: 'default'
    });
    host.page = null;
    host._error = function (xhr, textStatus, errorThrown) {
        var error = xhr.responseJSON.error;
        host.o.loader.html(error.str);
        $(host).tigger('error', [error]);
    };
    host._change = function (e) {
        console.log('Field Changed');
    };
    host._field = function (field) {
        var def = host.def.fields[field];
        var form_group = $('<div class="form-group">').html($('<label class="col-lg-2 control-label">').attr('for', field).html(def.label));
        var form_control = $('<div class="col-lg-10">').appendTo(form_group);
        switch (def.type) {
            case 'text':
                form_control.append($('<input type="text" class="form-control">').attr('name', field).data('name', field).change(host._change));
                break;
            case 'integer':
                form_control.append($('<input type="number" class="form-control">').attr('name', field).data('name', field).change(host._change));
                break;
            case 'date':
                form_control.append($('<input type="date" class="form-control">').attr('name', field).data('name', field).change(host._change));
                break;
        }
        return form_group;
    };
    host._section = function (section) {
        var fieldset = $('<fieldset>');
        if (section.label)
            fieldset.append($('<legend>').html(section.label));
        for (x in section.fields)
            this._field(section.fields[x]).appendTo(fieldset);
        return fieldset;
    }
    host._page = function (page) {
        var form = $('<form class="form-horizontal">');
        form.append($('<h1>').html(page.label));
        for (x in page.sections)
            this._section(page.sections[x]).appendTo(form);
        $(host).html(form);
    };
    host._nav = function (pageno) {
        var go = function (response) {
            host.page = pageno;
            host._page(host.def.pages[pageno]);
            $(host).trigger('nav', [pageno + 1, host.def.pages.length]);
        }
        if (this.settings.source) {
            $(host).trigger('save');
            $.post(this.settings.source, this.data).done(go);
        } else {
            go();
        }
    };
    host._ready = function (def) {
        host.o.loader.hide();
        $(host).trigger('ready', [host.def]);
        host._nav(0);
    };
    host._registerEvents = function () {
        $(this).on('load', this._load);
        $(this).on('prev', function () {
            if (host.page > 0)
                host._nav(host.page - 1);
        });
        $(this).on('next', function () {
            if (host.page < (host.def.pages.length - 1))
                host._nav(host.page + 1);
        });
    }
    host._render = function (data) {
        this.o = {};
        this.o.loader = $('<div class="forms-loader-container">').html($('<div class="forms-loader">'));
        $(this).html(this.o.loader);
    };
    host._load = function () {
        $.get(this.settings.url, { name: this.settings.name }).done(function (response) {
            if (!response.ok)
                return;
            host.def = response.data;
            host._ready();
        }).fail(this._error);
        if (host.settings.source) {
            $.get(host.settings.source).done(function (response) {
                if (typeof response == 'object') {
                    host.data = response;
                    $(host).trigger('data', [host.data]);
                }
            }).fail(this._error);
        }
    };
    $(this).trigger('init');
    host._registerEvents();
    host._render();
    host._load(host.settings.url);
    return this;
}