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

        $this->requires('cdnjs');

        $this->requires('jQuery');

        $this->requires('bootstrap');

        $this->requires('fontawesome');

    }

    function init(\Hazaar\View\Layout $view, $args = array()){

        $this->cdnjs->load('bootstrap-datepicker', null, 'css/bootstrap-datepicker.min.css');

        $this->cdnjs->load('jquery.inputmask');

        //Link required stylesheets
        $view->link($this->application->url('hazaar/forms', 'file/interact.css'));

        $view->requires($this->application->url('hazaar/forms', 'file/interact.js'));

    }

}