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
class Model extends \Hazaar\Model\Strict {

    private $__form_name;

    private $__form = array();

    private $__items = array();

    function __construct($form_name){

        $app = \Hazaar\Application::getInstance();

        $file = $form_name . '.json';

        if(!($source = $app->filePath('forms', $file, true)))
            throw new \Exception('Form model source not found: ' . $file, 404);

        $source_file = new \Hazaar\File($source);

        if(!$source_file->exists())
            throw new \Exception('Form model source file not found!', 500);

        $this->__form_name = $source_file->name();

        if(!($this->__form = $source_file->parseJSON()))
            throw new \Exception('An error ocurred parsing the form definition \'' . $source_file->name() . '\'');

        if(!array_key_exists('name', $this->__form))
            throw new \Exception('Form definition does have a name!');

        if(!array_key_exists('pages', $this->__form))
            throw new \Exception('Form definition does have any pages defined!');

        if(!array_key_exists('fields', $this->__form))
            throw new \Exception('Form definition does not contain any fields!');

        //If fields is an array, then it is importing one or more field defs from other files.
        if(is_array($this->__form->fields)){

            $fields = array();

            foreach($this->__form->fields as $ext_fields){

                $ext_fields_file = $ext_fields . '.json';

                if(!($source = $app->filePath('forms', $ext_fields_file, true)))
                    throw new \Exception('Form include file not found: ' . $ext_fields_file, 404);

                $include_file = new \Hazaar\File($source);

                if(!($include_fields = $include_file->parseJSON(true)))
                    throw new \Exception('An error ocurred parsing the form definition \'' . $include_file->name() . '\'');

                $fields = array_merge($fields, $include_fields);

            }

            $this->__form->fields = $fields;

        }else{

            //Make sure the fields property is an array otherwise strict models will have a tanty.
            $this->__form->fields = (array)$this->__form->fields;

            array_walk_recursive($this->__form->fields, function(&$array){
                $array = (array)$array;
            });

        }

        parent::__construct();

    }

    public function init(){

        if(!(property_exists($this->__form, 'fields') && is_array($this->__form->fields)))
            $this->__form->fields == array();

        return $this->__form->fields;

    }


    public function getName(){

        return $this->__form_name;

    }

    public function getForm(){

        return $this->__form;

    }

    public function getOutputStyle(){

        if(!(property_exists($this->__form, 'pdf') && property_exists($this->__form->pdf, 'style')))
            return null;

        return $this->__form->pdf->style;

    }

    public function getOutputLogo(){

        if(!(property_exists($this->__form, 'pdf') && property_exists($this->__form->pdf, 'logo')))
            return null;

        return $this->__form->pdf->logo;


    }

    public function resolve(){

        $form = $this->getForm();

        $out = array('name' => $form->name, 'pages' => array());

        if(is_array($form->pages)){

            foreach($form->pages as $page_no => $page)
                $out['pages'][$page_no] = $this->__page($page);

        }

        return $out;

    }

    private function __page($page){

        if(!is_object($page))
            return null;

        if(is_array($page->sections)){

            foreach($page->sections as $section_no => $section)
                $page->sections[$section_no] = $this->__section($section);

        }

        return $page;

    }

    private function __section($section){

        if(!is_object($section))
            return null;

        if(is_array($section->fields)){

            foreach($section->fields as $row_no => $row)
                $section->fields[$row_no] = $this->__group($row);

        }

        return $section;

    }

    private function __group($fields){

        if(is_array($fields)){

            foreach($fields as $index => $item)
                $fields[$index] = $this->__group($item);

            return $fields;

        }

        return $this->__field($fields);

    }

    private function __field($field){

        if(is_string($field)){

            if(!array_key_exists($field, $this->__form->fields))
                return null;

            $field = array_merge($this->__form->fields[$field], array('name' => $field));

        }elseif(is_array($field)){

            dump($field);

            $items = $this->__group($field);

        }elseif(is_object($field)){

            if(!property_exists($field, 'name'))
                return null;

            $field = array_merge(ake($this->__form->fields, $field->name, array()), (array)$field);

        }else{

            return null;

        }

        if($show = str_replace(' ', '', ake($field, 'show', ''))){

            if(!$this->evaluate($show))
                return null;

        }

        $field_key = $field['name'];

        $value = $this->get($field_key);

        if($options = ake($field, 'options')){

            if(is_string($options))
                $options = $this->items($this->parseTarget($options));

            $value = ake((array)$options, $value);

        }

        $field['value'] = $value;

        return $field;

    }

    public function evaluate($code){

        $parts = preg_split('/(\&\&|\|\|)/', $code, -1, PREG_SPLIT_DELIM_CAPTURE);

        $count = count($parts);

        for($i = 0; $i<$count; $i+=2){

            if(!preg_match('/([\w\.]+)([=\!\<\>]+)(.+)/', $parts[$i], $matches))
                throw new \Exception('Invalid show script: ' + show);

            $parts[$i] = $this->fixCodeItem($matches[1]) . ' ' . $matches[2] . ' ' . $this->fixCodeItem($matches[3]);

        }

        $func = function($values, $evaluate){

            $code = '';

            foreach($values as $key => $value){

                if (is_string($value))
                    $value = "'" . $value . "'";
                elseif(is_bool($value))
                    $value = strbool($value);
                elseif(is_null($value))
                    $value = 'null';
                elseif (is_array($value) || is_object($value))
                    $value = json_encode($value);

                $code .= '$' . $key . ' = ' . $value . ";\n";

            }

            $code .= "return ( " . $evaluate . " );\n";

            return eval($code);

        };

        try{

            $result = $func($this->values, implode(' ', $parts));

        }
        catch(\Exception $e){

            $result = false;

        }

        return $result;

    }

    private function fixCodeItem($item){

        $keywords = array('true', 'false', 'null');

        if(!($item[0] == "'" && $item[-1] == "'") && !in_array(strtolower($item), $keywords))
            $item = '$' . $item;

        return $item;

    }

    public function items($target){

        $key = md5($target);

        if(array_key_exists($key, $this->__items))
            return $this->__items[$key];

        $url = new \Hazaar\Application\Url($target);

        if(($out = json_decode(file_get_contents((string)$url), true)) === false)
            throw new \Exception('Form API call failed.  Invalid response!');

        $this->__items[$key] = $out;

        return $out;

    }

    public function parseTarget($target){

        while (preg_match('/\{\{(\w+)\}\}/', $target, $match))
            $target = str_replace($match[0], $this->get($match[1]), $target);

        return $target;

    }

}