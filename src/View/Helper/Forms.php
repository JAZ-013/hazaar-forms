<?php

namespace Hazaar\View\Helper;

/**
 * Form short summary.
 *
 * Form description.
 *
 * @version 1.0
 * @author jamiec
 */
class Forms extends \Hazaar\View\Helper {

    function import(){

        $this->requires('jQuery');

        $this->requires('bootstrap');

        $this->requires('fontawesome');

    }

    function init($view, $args = array()){

        $view->requires($this->application->url('hazaar/forms', 'file/interact.js'));

        $view->link($this->application->url('hazaar/forms', 'file/interact.css'));

        $view->link('https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.7.1/css/bootstrap-datepicker.min.css');

        $view->requires('https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.7.1/js/bootstrap-datepicker.min.js');

        $view->requires('https://cdnjs.cloudflare.com/ajax/libs/jquery.inputmask/3.3.4/jquery.inputmask.bundle.min.js');

    }

}