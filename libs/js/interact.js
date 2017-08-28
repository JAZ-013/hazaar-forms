$.fn.form = function (settings) {
    var host = this.get(0);
    if (host._render)
        return this;
    host.settings = $.extend(settings, {});
    host.page = null;
    host.entities = {};
    host._load = function (event, url, data) {
        $.get(url, data).done(function (response) {
            switch (response.type) {
                case 'def':
                    host.def = response.data;
                    if (typeof host.def.entity !== 'object')
                        host.def.entity = [host.def.entity];
                    host.o.loader.html("Loading entities...");
                    for (x in host.def.entity)
                        $(host).trigger('load', [host.settings.url, { "type": "entity", "name": host.def.entity[x] }]);
                    break;
                case 'entity':
                    host.entities[response.name] = response.data;
                    break;
            }
            if (host.def.entity.length >= host.entities.length)
                host._ready();
        }).fail(this._error);
    };
    host._error = function (xhr, textStatus, errorThrown) {
        host.o.loader.html(xhr.responseJSON.error.str);
    };
    host._page = function (def) {
        console.log(def);
    };
    host._render = function (data) {
        this.o = {};
        if (typeof this.settings.header == 'function')
            this.o.hdr = this.settings.header('Loading...');
        this.o.loader = $('<div class="form-loading">').html('Initialising...');
        this.o.body = $('<div class="card-body">').html(this.o.loader);
        $(this).append(this.o.hdr, this.o.body);
    };

    host._ready = function () {
        host.o.loader.html('Done');
    };
    host._registerEvents = function () {
        $(this).on('load', this._load);
    }
    host._registerEvents();
    host._render();
    host.o.loader.html('Loading data...');
    $(this).trigger('load', [host.settings.url, { "type": "def", "name": settings.name }]);
    return this;
}