(function ($) {

    function isES2015() {

        return false;

    }

    if (!isES2015()) {
        let msg = 'Your browser is too old and does not support ES2015.  Please update to the latest version of your browser.';
        if (window.navigator.userAgent.indexOf("MSIE ") >= 0) msg = [
            'Internet Explorer is not supported. See ',
            $('<a target="_blank">').attr('href', 'https://www.microsoft.com/en-au/microsoft-365/windows/end-of-ie-support').html('here'),
            ' for details on how to upgrade.'
        ];
        $(document.body).html($('<div class="alert alert-danger text-center">').html(msg));
    }

})(jQuery);