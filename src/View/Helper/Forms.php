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

    private $model;

    function import(){

        $this->requires('cdnjs');

        $this->requires('html');

        $this->requires('jQuery');

        $this->requires('bootstrap');

        $this->requires('fontawesome');

    }

    function init(\Hazaar\View\Layout $view, $args = array()){

        $this->cdnjs->load('bootstrap-datepicker', null, 'css/bootstrap-datepicker.min.css');

        $this->cdnjs->load('jquery.inputmask');

        //Link required stylesheets
        $view->link($this->application->url('hazaar/forms', 'file/interact.css'));

        $view->link($this->application->url('hazaar', 'file/css/fileicons.css'));

        $view->requires($this->application->url('hazaar/forms', 'file/interact.js'));

        $this->model = ake($args, 'model');

    }

    public function __get($key){

        if($this->model && $this->model->has($key))
            return $this->model->get($key);

        return parent::__get($key);

    }

    public function btnValidate($label = 'Validate'){

        $id = 'btn_' . uniqid();

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('validate'); });");

        return $this->html->button($label)->id($id);

    }

    public function btnSave($label = 'Save', $validation = true, $params = array()){

        $id = 'btn_' . uniqid();

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('save', "
            . strbool($validation)
            . ($params?', ' . json_encode($params):'') . "); });");

        return $this->html->button($label)->id($id);

    }

    public function btnNext($label = 'Next'){

        $id = 'btn_' . uniqid();

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('next'); });");

        return $this->html->button($label)->id($id);

    }

    public function btnPrevious($label = 'Previous'){

        $id = 'btn_' . uniqid();

        $this->jquery->exec("$('#$id').click(function(){ hzForm.hzForm('prev'); });");

        return $this->html->button($label)->id($id);

    }

}