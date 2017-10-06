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

        $this->requires('cdnjs');

        $this->cdnjs->load('bootstrap-datepicker', null, 'css/bootstrap-datepicker.min.css');

        $this->cdnjs->load('jquery.inputmask');

    }

    function init($view, $args = array()){

        //Link required stylesheets
        $view->link($this->application->url('hazaar/forms', 'file/interact.css'));

        $view->requires($this->application->url('hazaar/forms', 'file/interact.js'));

    }

}