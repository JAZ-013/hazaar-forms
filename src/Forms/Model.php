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

    private $__tags = array();

    function __construct($form_name, $form = null){

        $this->__form_name = $form_name;

        if($form) $this->load($form);

    }

    public function load($form){

        $this->__form = $form;

        if(!array_key_exists('name', $this->__form))
            throw new \Exception('Form definition does have a name!');

        if(!array_key_exists('pages', $this->__form))
            throw new \Exception('Form definition does have any pages defined!');

        if(!array_key_exists('fields', $this->__form))
            throw new \Exception('Form definition does not contain any fields!');

        foreach($this->__form as $name => $item){

            if(is_object($item) && property_exists($item, 'import')){

                $ext = null;

                if(!is_array($item->import))
                    $item->import = array($item->import);

                foreach($item->import as $ext_item){

                    if(strtolower(substr($ext_item, -5)) !== '.json')
                        $ext_item .= '.json';

                    if(!($source = \Hazaar\Application::getInstance()->filePath('forms', $ext_item)))
                        throw new \Exception('Form include file not found: ' . $ext_item, 404);

                    $include_file = new \Hazaar\File($source);

                    if(!($include_items = $include_file->parseJSON()))
                        throw new \Exception('An error ocurred parsing the form definition \'' . $include_file->name() . '\'');

                    if(!$ext && is_object($include_items)){

                        $ext = new \stdClass;

                        foreach($include_items as $key => $value)
                            $ext->$key = $value;

                    }else{

                        $ext = array();

                        foreach($include_items as $key => $value)
                            $ext[$key] = $value;

                    }

                }

                $this->__form->$name = $ext;

            }

        }

        //If fields is an array, then it is importing one or more field defs from other files.
        if(!is_array($this->__form->fields)){

            settype($this->__form->fields, 'array');

            array_walk_recursive($this->__form->fields, function(&$array){
                $array = (array)$array;
            });

        }

        return parent::__construct();

    }

    public function init(){

        if(!(property_exists($this->__form, 'fields') && is_array($this->__form->fields)))
            $this->__form->fields == array();

        return $this->__form->fields;

    }

    public function setTags($tags){

        if(!is_array($tags))
            $tags = array($tags);

        $this->__tags = $tags;

    }


    public function getName(){

        return $this->__form_name;

    }

    public function getForm(){

        //Remove any tagged fields
        foreach($this->__form->fields as $name => $field){

            if(!($tags = ake($field, 'tag')))
                continue;

            if(!is_array($tags))
                $tags = array($tags);

            if(count(array_intersect($tags, $this->__tags)) === 0)
                unset($this->__form->fields[$name]);

        }

        return $this->__form;

    }

    /**
     * Return the form data to send to the client frontend
     *
     * This method returns forms data with fields stripped if they are tagged and those tags are not set.
     *
     * @param mixed $disable_callbacks
     * @param mixed $depth
     * @param mixed $show_hidden
     * @return mixed
     */
    public function toFormArray(){

        $array = parent::toArray();

        foreach($this->__form->fields as $name => $field){

            if(!($tags = ake($field, 'tag')))
                continue;

            if(!is_array($tags))
                $tags = array($tags);

            if(count(array_intersect($tags, $this->__tags)) === 0)
                unset($array[$name]);

        }

        return $array;

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

        if(is_array($section)){

            $group = array();

            foreach($section as $s)
                $group[] = $this->__section($s);

            return $group;

        }

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

        if($value === null){

            $value = ake($output, 'content');

        }elseif(ake($field, 'type') == 'array'){

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

    public function matchReplace($string, $use_label = false, $params = array()){

        while (preg_match('/\{\{(\w+)\}\}/', $string, $match)){

            $item = $this->get($match[1]);

            $string = str_replace($match[0], ((!$use_label && $item instanceof \Hazaar\Model\dataBinderValue) ? $item->value : (string)$item), $string);

        }

        if(is_array($params) && count($params) > 0){

            while (preg_match('/\$([a-zA-Z]\S+)/', $string, $match))
                $string = str_replace($match[0], ake($params, $match[1], 'null'), $string);

        }

        return $string;

    }

    public function api($target, $args = array()){

        if(!is_array($args))
            $args = array();

        $args['form'] = $this->toArray();

        if(strpos($target, ':') !== false){

            $url = new \Hazaar\Application\Url($target);

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

    public function getTitle($params = null){

        if(!(property_exists($this->__form, 'pdf')
            && property_exists($this->__form->pdf, 'title')))
            return 'Form Document';

        return $this->matchReplace($this->__form->pdf->title, true, $params);

    }

}