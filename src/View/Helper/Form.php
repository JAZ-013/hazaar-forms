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
class Form extends \Hazaar\View\Helper {

    function import(){

        $this->requires('jQuery');

        $this->requires('bootstrap');

    }

    function init($view, $args = array()){

        $view->requires($this->application->url('hazaar/forms', 'file/interact.js'));

        $view->link($this->application->url('hazaar/forms', 'file/interact.css'));

    }

}