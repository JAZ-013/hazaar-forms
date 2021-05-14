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

    protected function __resolve_field_layout($fields, $layout) {

        if(!$fields)
            return [];

        foreach($layout as &$layout_item) {

            if (is_string($layout_item))
                $layout_item = (object)[ 'name' => $layout_item ];

            if (is_array($layout_item)) {

                $layout_item = $this->__resolve_field_layout($fields, $layout_item);

            } else if ($item_name = ake($layout_item, 'name')) {

                $field = ake($fields, $item_name);

                if (!$field || ake($field, 'hidden') === true){

                    $layout_item = null;

                    continue;

                }

                $layout_item = (object)array_merge((array)$field, (array)$layout_item);

            } else if ($sub_layout = ake($layout_item, 'fields')) {

                $layout_item->fields = $this->__resolve_field_layout($fields, $sub_layout);

            }

        }

        return $layout;

    }

}