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

    }

    function init($view, $args = array()){

        $view->requires($this->application->url('hazaar/forms', 'file/interact.js'));

        $view->link($this->application->url('hazaar/forms', 'file/interact.css'));

    }

    public function render($form_name, $args = array()){

        $settings = new \Hazaar\Map($args, array(
            'name' => $form_name,
            'url' => (string)$this->application->url('hazaar/forms', 'load')
        ));

        $id = 'frm' . ucfirst($form_name);

        $this->jquery->exec("$('#$id').form(" . $settings->toJSON() . ");");

        return $this->html->div()->id($id);

    }
}