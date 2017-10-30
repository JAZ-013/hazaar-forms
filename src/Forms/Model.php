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

    public function resolve(){

        $form = $this->getForm();

        if(is_array($form->pages)){

            $pages = array();

            foreach($form->pages as $page){

                if($page = $this->__page($page))
                    $pages[] = $page;

            }

            $form->pages = $pages;

        }

        return $form;

    }

    private function __page($page){

        if(!is_object($page) || (property_exists($page, 'show') && !$this->evaluate($page->show)))
            return null;

        if(is_array($page->sections)){

            $sections = array();

            foreach($page->sections as $section){

                if($section = $this->__section($section))
                    $sections[] = $section;

            }

            $page->sections = $sections;

        }

        return $page;

    }

    private function __section($section){

        if(!is_object($section) || (property_exists($section, 'show') && !$this->evaluate($section->show)))
            return null;

        if(is_array($section->fields)){

            $fields = array();

            foreach($section->fields as $row){

                if($row = $this->__group($row))
                    $fields[] = $row;

            }

            $section->fields = $fields;

        }

        return $section;

    }

    private function __group($fields){

        if(is_array($fields)){

            $items = array();

            foreach($fields as $item){

                if($item = $this->__group($item))
                    $items[] = $item;

            }

            return $items;

        }elseif($fields instanceof \stdClass && property_exists($fields, 'fields')){

            if(property_exists($fields, 'show') && !$this->evaluate($fields->show))
                return null;

            $items = array();

            foreach($fields->fields as $field_item){

                if($item = $this->__group($field_item))
                    $items[] = $item;

            }

            return $items;

        }

        return $this->__field($fields);

    }

    private function __field($field){

        if(is_string($field)){

            if(!array_key_exists($field, $this->__form->fields))
                return null;

            $field = (object)array_merge($this->__form->fields[$field], array('name' => $field));

        }elseif(is_object($field)){

            if(!property_exists($field, 'name'))
                return $field;

            $field = (object)array_merge(ake($this->__form->fields, $field->name, array()), (array)$field);

        }else{

            return null;

        }

        $field_key = $field->name;

        $value = ake($field, 'value', $this->get($field_key));

        $output = ake($field, 'output', array('empty' => true));

        if(!$value && ake($output, 'empty', true) === false)
            return null;

        if(!$this->evaluate(ake($field, 'show')))
            return null;

        if(ake($field, 'type') == 'array'){

            if(property_exists($field, 'fields') && is_array($field->fields)){

                $items = array();

                foreach($value as $id => $item){

                    foreach(ake($field, 'fields', array()) as $key => $def){

                        $def->name = $key;

                        $def->value = ake($item, $key);

                        $items[$id][$key] = $this->__field($def);

                    }

                }

                $value = $items;

            }else{

                if($options = ake($field, 'options')){

                    if(is_string($options))
                        $options = $this->api($this->matchReplace($options));

                }

                foreach($value as &$item){

                    if(($item instanceof \Hazaar\Model\dataBinderValue) && $label = $item->label)
                        $item = $item->label;
                    else
                        $item = ake((array)$options, (($item instanceof \Hazaar\Model\dataBinderValue)?$item->value:$item));

                }

            }

        }elseif ($value instanceof \Hazaar\Model\dataBinderValue && $value->label){

            $value = $value->label;

        }elseif($options = ake($field, 'options')){

            if(is_string($options))
                $options = $this->api($this->matchReplace($options));

            $value = ake((array)$options, (($value instanceof \Hazaar\Model\dataBinderValue)?$value->value:$value));

        }

        $field->value = $value;

        return $field;

    }

    public function evaluate($code){

        if(is_bool($code))
            return $code;

        if(!($code = str_replace(' ', '', $code)))
            return true;

        $parts = preg_split('/(\&\&|\|\|)/', $code, -1, PREG_SPLIT_DELIM_CAPTURE);

        $count = count($parts);

        for($i = 0; $i < $count; $i+=2){

            if(!preg_match('/([\w\.]+)([=\!\<\>]+)(.+)/', $parts[$i], $matches))
                throw new \Exception('Invalid show script: ' . $parts[$i]);

            $parts[$i] = $this->fixCodeItem($matches[1]) . ' ' . $matches[2] . ' ' . $this->fixCodeItem($matches[3]);

        }

        $func = function($values, $evaluate){

            $export = function($export, &$value, $quote = true){

                if($value instanceof \Hazaar\Model\dataBinderValue)
                    $value = $value->value;

                if (is_string($value) && $quote)
                    $value = "'" . $value . "'";
                elseif(is_bool($value))
                    $value = strbool($value);
                elseif(is_null($value))
                    $value = 'null';
                elseif (is_array($value)){

                    foreach($value as &$subValue)
                        $subValue = $export($export, $subValue, false);

                    $value = var_export($value, true);

                }

                return $value;
            };

            $code = '';

            foreach($values as $key => $value)
                $code .= '$' . $key . ' = ' . $export($export, $value) . ";\n";

            $code .= "return ( " . $evaluate . " );\n";

            try{

                return eval($code);

            }
            catch(ParseError $e){

                die($code);

            }

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

        if(!($item[0] == "'" && $item[-1] == "'") && !in_array(strtolower($item), $keywords) && !is_numeric($item))
            $item = '$' . $item;

        return $item;

    }

    public function matchReplace($string, $use_label = false){

        while (preg_match('/\{\{(\w+)\}\}/', $string, $match)){

            $item = $this->get($match[1]);

            $string = str_replace($match[0], ((!$use_label && $item instanceof \Hazaar\Model\dataBinderValue) ? $item->value : (string)$item), $string);

        }

        return $string;

    }

    public function api($target, $args = array()){

        if(strpos($target, ':') !== false){

            $url = new \Hazaar\Application\Url($target);

            if($args)
                $url->setParams($args);

            if(!($result = json_decode(file_get_contents((string)$url), true)))
                throw new \Exception('Form API call failed.  Invalid response!');

        }else{

            list($controller,) = explode('/', $target, 2);

            if(!$controller)
                throw new \Exception('Invalid application endpoint: ' . $target);

            $loader = \Hazaar\Loader::getInstance();

            if(!($controller = $loader->loadController($controller)))
                throw new \Exception("Controller for target '$target' could not be found!", 404);

            $request = new \Hazaar\Application\Request\HTTP(\Hazaar\Application::getInstance()->config, $args);

            $request->evaluate($target);

            $controller->setRequest($request);

            $controller->__initialize($request);

            $response = $controller->__run();

            if(!$response instanceof \Hazaar\Controller\Response\Json)
                throw new \Exception('Only JSON API responses are currently supported!');

            if($response->getStatus()!= 200)
                throw new \Exception('API endpoint returned status code ' . $response->getStatus() . '. ' . $response->getContent());

            $result = $response->toArray();

        }

        return $result;

    }
}