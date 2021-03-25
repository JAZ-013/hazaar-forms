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

    public $model;

    function import(){

        $this->requires('cdnjs');

        $this->requires('html');

        $this->requires('jQuery');

        $this->requires('bootstrap');

    }

    function init(\Hazaar\View\Layout $view, $args = array()){

        $this->cdnjs->load('bootstrap-datepicker', null, array(
            'css/bootstrap-datepicker.min.css',
            'js/bootstrap-datepicker.min.js'
        ));

        $this->cdnjs->load('jquery.inputmask');

        $debug = $this->application->config->app->debug;

        $css = 'interact' . (($debug === true) ? '' : '.min') . '.css';

        $js =  'interact' . (($debug === true) ? '' : '.min') . '.js';

        $view->link($this->application->url('hazaar/forms', 'file/' . $css));

        $view->requires($this->application->url('hazaar/forms', 'file/check.js'));

        $view->requires($this->application->url('hazaar/forms', 'file/' . $js));

        $view->link($this->application->url('hazaar', 'file/css/fileicons.css'));

        $this->model = ake($args, 'model');

    }

    public function __get($key){

        if($this->model && $this->model->has($key))
            return $this->model->get($key);

        return parent::__get($key);

    }

    public function btnReload($label = 'Reload'){

        $id = 'btn_' . md5(random_bytes(8));

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('reload'); });");

        return $this->html->button($label)->id($id);

    }

    public function btnValidate($label = 'Validate'){

        $id = 'btn_' . md5(random_bytes(8));

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('validate'); });");

        return $this->html->button($label)->id($id);

    }

    public function btnSave($label = 'Save', $validation = true, $params = array()){

        $id = 'btn_' . md5(random_bytes(8));

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('save', "
            . strbool($validation)
            . ($params?', ' . json_encode($params):'') . "); });");

        return $this->html->button($label)->id($id);

    }

    public function btnNext($label = 'Next'){

        $id = 'btn_' . md5(random_bytes(8));

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('next'); });");

        return $this->html->button($label)->id($id);

    }

    public function btnPrevious($label = 'Previous'){

        $id = 'btn_' . md5(random_bytes(8));

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('prev'); });");

        return $this->html->button($label)->id($id);

    }

    public function btnReset($label = 'Reset'){

        $id = 'btn_' . md5(random_bytes(8));

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('reset'); });");

        return $this->html->button($label)->id($id);

    }

    public function controller($controller, $form, $params = array(), $tags = null){

        $controller = \Hazaar\Loader::getInstance()->loadController($controller);

        $controller->__initialize($this->application->request);

        $controller->form($form, $params, $tags);

        return $controller;

    }

    public function layout($name, $data = array(), $def = array(), $options = array()){

        $settings = new \Hazaar\Map(array(
            'def' => $def,
            'data' => $data,
            'singlePage' => true,
            'endpoints' => array(
                'save' => (string)$this->view->url()
            )
        ));

        $settings->extend($options);

        $this->view->jquery->exec("var hzForm = $('#$name').hzForm(" . $settings->toJSON() . ");\n", 1);

        return $this->html->div()->id($name);

    }

}