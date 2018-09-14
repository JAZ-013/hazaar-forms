<?php

namespace Hazaar\Forms;

interface Output_Interface {

    public function render();

}

abstract class Output implements Output_Interface {

    protected $model;

    protected $params = array();

    final function __construct(\Hazaar\Forms\Model $model, $params = array()){

        $this->model = $model;

        $this->params = $params;

        $this->init($model);

    }

    public function init(\Hazaar\Forms\Model $model){

        //Do nothing

    }

}