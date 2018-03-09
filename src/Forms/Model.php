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

    private $__locked = false;

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

        foreach($this->__form as $name => &$item){

            if(is_object($item) && property_exists($item, 'import')){

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

                    if(is_object($include_items)){

                        foreach($include_items as $key => $value){

                            if(property_exists($this->__form->$name, $key))
                                $value = (object)replace_recursive((array)$value, (array)$this->__form->$name->$key);

                            $this->__form->$name->$key = $value;

                        }

                    }

                }

                unset($this->__form->$name->import);

            }

        }

        //Convert the fields def to an array for \Hazaar\Model\Strict compatibility.
        settype($this->__form->fields, 'array');

        //Field defs need to be arrays.  Their contents do not however.
        array_walk($this->__form->fields, function(&$array){
            if(is_string($array)) $array = array('type' => $array);
            elseif(is_object($array)) settype($array, 'array');
        });

        $states = array('protect' => true, 'unprotect' => false);

        //Process field protection
        foreach($states as $state => $value){

            if(!array_key_exists($state, $this->__form->fields))
                continue;

            $fields = array();

            if(is_bool($this->__form->fields[$state]))
                $fields = array_keys($this->__form->fields);
            elseif(is_array($this->__form->fields[$state]))
                $fields = $this->__form->fields[$state];

            $fields = array_diff($fields, array_keys($states));

            unset($this->__form->fields[$state]);

            foreach($fields as $key){

                if(!array_key_exists($key, $this->__form->fields))
                    continue;

                $this->__form->fields[$key]['protected'] = $value;

            }

        }

        return parent::__construct();

    }

    public function init(){

        if(!(property_exists($this->__form, 'fields') && is_array($this->__form->fields)))
            $this->__form->fields == array();

        $fields = $this->__form->fields;

        //Make any changes to the field defs for use in strict models.
        foreach($fields as $name => &$def){

            switch(ake($def, 'type')){
                case 'date':

                    $def['type'] = 'Hazaar\Date';

                    break;

                case 'array':

                    if(array_key_exists('arrayOf', $def))
                        continue;

                    settype($def['fields'], 'array');

                    akr($def, 'fields', 'arrayOf');

                    //Field defs need to be arrays.  Their contents do not however.
                    array_walk($def['arrayOf'], function(&$array){
                        if(is_string($array)) $array = array('type' => $array);
                        elseif(is_object($array)) settype($array, 'array');
                    });

                    break;

            }

        }

        return $fields;

    }

    public function setTags($tags){

        if(!is_array($tags))
            $tags = array($tags);

        $this->__tags = $tags;

    }


    public function getName(){

        return $this->__form_name;

    }

    public function getTitle(){

        return $this->__form->name;

    }

    public function lock(){

        $this->__locked = true;

    }

    public function unlock(){

        $this->__locked = false;

    }

    public function set($key, $value, $exec_filters = true){

        if($this->__locked && ake(ake($this->fields, $key), 'protected', false) === true)
            return null;

        return parent::set($key, $value, $exec_filters);

    }

    private function filterItems(&$items, $no_reindex = false, $sub = null){

        if($sub && !is_array($sub)) $sub = array($sub);

        //Remove any tagged fields where the tag is not set
        foreach($items as $name => $item){

            if(!(is_object($item) || is_array($item)))
                continue;

            if(!is_object($item) && $no_reindex !== true){

                $items[$name] = $this->filterItems($item, $no_reindex, $sub);

                continue;

            }

            if($tags = ake($item, 'tag')){

                if(!is_array($tags))
                    $tags = array($tags);

                if(count(array_intersect($tags, $this->__tags)) === 0){

                    unset($items[$name]);

                    continue;

                }

            }

            if(!is_object($item))
                continue;

            if($subs = array_intersect(array_keys(get_object_vars($item)), $sub)){

                foreach($subs as $key)
                    $items[$name]->$key = $this->filterItems($item->$key, $no_reindex, $sub);

            }

        }

        if($no_reindex !== true)
            $items = array_values($items);

        return $items;

    }

    public function getFormDefinition(){

        $form = clone $this->__form;

        $this->filterItems($form->fields, true);

        $this->filterItems($form->pages, false, array('sections', 'fields'));

        return $form;

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

            if(array_key_exists('type', $field) && $field['type'] == 'date' && $array[$name] instanceof \Hazaar\Date)
                $array[$name] = $array[$name]->format('Y-m-d');

            if(!($tags = ake($field, 'tag')))
                continue;

            if(!is_array($tags))
                $tags = array($tags);

            if(count(array_intersect($tags, $this->__tags)) === 0)
                unset($array[$name]);

        }

        return $array;

    }

    public function export($array = null){

        if($array === null)
            $array = $this->values;

        foreach($array as $key => $value){

            if($value instanceof \Hazaar\Model\ChildArray)
                $value = $this->export($value->toArray());
            elseif($value instanceof \Hazaar\Model\ChildModel)
                $value = $this->export($value->toArray(false, 0));
            elseif($value instanceof \Hazaar\Model\DataBinderValue)
                $value = $value->value;

            $array[$key] = $value;

        }

        return $array;

    }

    public function resolve(){

        $form = $this->getFormDefinition();

        if(is_array($form->pages)){

            $pages = array();

            foreach($form->pages as $page){

                if($page = $this->__page($page, $form))
                    $pages[] = $page;

            }

            $form->pages = $pages;

        }

        return $form;

    }

    private function __page($page, &$form){

        if(!is_object($page) || (property_exists($page, 'show') && !$this->evaluate($page->show)))
            return null;

        if(is_array($page->sections)){

            $sections = array();

            foreach($page->sections as $section){

                if($section = $this->__section($section, $form))
                    $sections[] = $section;

            }

            $page->sections = $sections;

        }

        return $page;

    }

    private function __section($section, &$form){

        if(is_array($section)){

            $group = array();

            foreach($section as $s)
                $group[] = $this->__section($s, $form);

            return $group;

        }

        if(!is_object($section) || (property_exists($section, 'show') && !$this->evaluate($section->show)))
            return null;

        if(property_exists($section, 'fields') && is_array($section->fields)){

            $fields = array();

            foreach($section->fields as $row){

                if($row = $this->__group($row, $form))
                    $fields[] = $row;

            }

            $section->fields = $fields;

        }

        return $section;

    }

    private function __group($fields, &$form){

        if(is_array($fields)){

            $items = array();

            foreach($fields as $item){

                if($item = $this->__group($item, $form))
                    $items[] = $item;

            }

            return $items;

        }elseif($fields instanceof \stdClass && property_exists($fields, 'fields')){

            if(property_exists($fields, 'show') && !$this->evaluate($fields->show))
                return null;

            $items = array();

            foreach($fields->fields as $field_item){

                if($item = $this->__group($field_item, $form))
                    $items[] = $item;

            }

            return $items;

        }

        return $this->__field($fields, $form);

    }

    private function __field($field, &$form){

        if(is_string($field)){

            if(!array_key_exists($field, $form->fields))
                return null;

            $field = (object)array_replace($form->fields[$field], array('name' => $field));

        }elseif(is_object($field)){

            if(!property_exists($field, 'name'))
                return $field;

            $field = (object)array_replace(ake($form->fields, $field->name, array()), (array)$field);

        }else{

            return null;

        }

        $field_key = $field->name;

        $value = ake($field, 'value', $this->get($field_key));

        $output = ake($field, 'output', array('empty' => true));

        if(!$value && ake($output, 'empty', true) === false)
            return null;

        if(!is_object($field) || (property_exists($field, 'show') && !$this->evaluate($field->show)))
            return null;

        if($value === null){

            $value = ake($output, 'content');

        }elseif(ake($field, 'type') == 'array'){

            if(property_exists($field, 'fields') && $field->fields instanceof \stdClass){

                $items = array();

                foreach($value as $id => $item){

                    foreach(ake($field, 'fields', array()) as $key => $def){

                        $def->name = $key;

                        $def->value = ake($item, $key);

                        $items[$id][$key] = $this->__field($def, $form);

                    }

                }

                $value = $items;

            }else{

                if($options = ake($field, 'options')){

                    if(is_string($options))
                        $options = $this->api($this->matchReplace($options));

                }

                $values = array();

                foreach($value as $key => $item){

                    if(($item instanceof \Hazaar\Model\dataBinderValue) && ($label = $item->label))
                        $values[$key] = $label;
                    else
                        $values[$key] = ake((array)$options, (($item instanceof \Hazaar\Model\dataBinderValue)?$item->value:$item));

                }

                $value = $values;

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

        $parts = preg_split('/\s*(\&{2}|\|{2})\s*/', $code, -1, PREG_SPLIT_DELIM_CAPTURE);

        $count = count($parts);

        for($i = 0; $i < $count; $i+=2){

            if(!preg_match('/([\w\.]+)\s*([=\!\<\>]+)\s*(.+)/', $parts[$i], $matches))
                throw new \Exception('Invalid show script: ' . $parts[$i]);

            $parts[$i] = $this->fixCodeItem($matches[1]) . ' ' . $matches[2] . ' ' . $this->fixCodeItem($matches[3]);

        }

        $func = function($values, $evaluate){

            $export = function($export, &$value, $quote = true){

                if($value instanceof \Hazaar\Model\dataBinderValue)
                    $value = $value->value;

                if($value instanceof \Hazaar\Date)
                    $value = $value->sec();
                elseif(is_bool($value))
                    $value = strbool($value);
                elseif(is_null($value))
                    $value = 'null';
                elseif($value instanceof \Hazaar\Model\ChildModel)
                    $value = $value->toArray();
                elseif (is_array($value) || $value instanceof \Hazaar\Model\ChildArray){

                    $values = array();

                    foreach($value as $key => $subValue)
                        $values[$key] = $export($export, $subValue, false);

                    $value = var_export($values, true);

                }elseif ((is_string($value) || is_object($value)) && $quote)
                    $value = "'" . addslashes((string)$value) . "'";

                return $value;
            };

            $code = '';

            foreach($values as $key => $value)
                $code .= '$' . $key . ' = ' . $export($export, $value) . ";\n";

            $code .= "return ( " . $evaluate . " );\n";

            try{

                //Form is also acessible in the evaluted code.
                $form = $this;

                return @eval($code);

            }
            catch(ParseError $e){

                die($code);

            }

        };

        try{

            ob_start();

            $result = $func($this->values, implode(' ', $parts));

            if($buf = ob_get_clean()){

                echo $buf;

                var_dump(implode(' ', $parts));

            }

        }
        catch(\Exception $e){

            $result = false;

        }

        return $result;

    }

    private function fixCodeItem($item){

        $keywords = array('true', 'false', 'null');

        if(strpos($item, '.') !== false)
            $item = str_replace('.', '->', $item);

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

    public function getPDFTitle($params = null){

        if(!(property_exists($this->__form, 'pdf')
            && property_exists($this->__form->pdf, 'title')))
            return 'Form Document';

        return $this->matchReplace($this->__form->pdf->title, true, $params);

    }

}