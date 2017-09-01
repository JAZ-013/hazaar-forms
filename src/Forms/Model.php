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

    private $name;

    private $data = array();

    function __construct(\Hazaar\File $source_file){

        if(!$source_file->exists())
            throw new \Exception('Form model source file not found!', 500);

        $this->name = $source_file->name();

        $this->data = $source_file->parseJSON(true);

    }

    public function getName(){

        return $this->name;

    }

    public function get(){

        return $this->data;

    }

    public function set($data){
        
        $this->data = $data;

    }

}