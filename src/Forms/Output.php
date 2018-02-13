<?php

namespace Hazaar\Forms;

interface Output_Interface {

    public function render();

}

abstract class Output implements Output_Interface {

    protected $model;

    final function __construct(\Hazaar\Forms\Model $model){

        $this->model = $model;

        $this->init($model);

    }

    public function init(\Hazaar\Forms\Model $model){

        //Do nothing

    }

}