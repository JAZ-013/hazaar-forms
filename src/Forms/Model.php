<?php

namespace Hazaar\Forms;

/**
 * Model short summary.
 *
 * Model description.
 *
 * @version 1.0
 * @author jamiec
 */
class Model {

    private $source;

    private $data = array();

    function __construct(\Hazaar\File $source_file){

        if(!$source_file->exists())
            throw new \Exception('Form model source file not found!', 500);

        $this->data = $source_file->parseJSON(true);

    }

    public function getName(){

        return ake($this->data, 'name');

    }

    public function get(){

        return $this->data;

    }

}