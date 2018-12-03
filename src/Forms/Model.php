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

    /**
     * The name of the form
     * @var string
     */
    private $__form_name;

    /**
     * The path to use for includes;
     * @var mixed
     */
    private $__form_import_path;

    /**
     * The current form definition
     * @var array
     */
    private $__form = array();

    private $__items = array();

    private $__tags = array();

    private $__locked = false;

    private $__controller;

    function __construct($form_name, $form = null, $tags = null, \Hazaar\File\Dir $form_include_path = null){

        $this->__form_name = $form_name;

        $this->__form_import_path = $form_include_path;

        $this->setTags($tags);

        if($form) $this->load($form);

    }

    public function registerController(\Hazaar\Controller\Form $controller){

        $this->__controller = $controller;

    }

    public function load($form){

        $this->__form = $form;

        if(!array_key_exists('name', $this->__form))
            throw new \Exception('Form definition does not have a name!');

        if(!array_key_exists('pages', $this->__form))
            throw new \Exception('Form definition does not have any pages defined!');

        if(!array_key_exists('fields', $this->__form))
            throw new \Exception('Form definition does not contain any fields!');

        foreach($this->__form as $name => &$item){

            if(is_object($item) && property_exists($item, 'import')){

                if(!$this->__form_import_path instanceof \Hazaar\File\Dir)
                    throw new \Exception('No import path set on this form model.  Imports are not supported.');

                if(!is_array($item->import))
                    $item->import = array($item->import);

                foreach($item->import as $ext_item){

                    if(strtolower(substr($ext_item, -5)) !== '.json')
                        $ext_item .= '.json';

                    if(!($source = $this->__form_import_path->get($ext_item)))
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
        foreach($fields as $key => &$def)
            $this->convert_definition($def);

        $this->__initialised = true;

        return $fields;

    }

    private function convert_definition(&$def){

        if($type = ake($def, 'type')){

            switch($type){
                case 'date':

                    $def['type'] = 'Hazaar\Date';

                    break;

                case 'file':

                    $def['type'] = 'array';

                    $def['arrayOf'] = 'string';

                    $def['file'] = true;

                    break;

                default:

                    if(property_exists($this->__form, 'types') && ($customType = ake($this->__form->types, $def['type']))){

                        $def = array_merge_recursive((array)$customType, $def);

                        $def['type'] = ake($customType, 'type', 'text');

                        $def['horizontal'] = false;

                    }

            }

        }else{

            $def['type'] = 'text';

        }

        if(array_key_exists('fields', $def) && !array_key_exists('arrayOf', $def)){

            if(ake($def, 'type') === 'array'){

                $target = 'arrayOf';

            }else{

                $def['type'] = 'model';

                $target = 'items';

            }

            settype($def['fields'], 'array');

            akr($def, 'fields', $target);

            //Field defs need to be arrays.  Their contents do not however.
            array_walk($def[$target], function(&$array){
                if(is_string($array)) $array = array('type' => $array);
                elseif(is_object($array)) settype($array, 'array');
            });

            if(ake($def, 'type') !== 'array'){

                foreach($def[$target] as &$field)
                    $this->convert_definition($field);

            }

        }

        if(array_key_exists('value', $def) && !($def['type'] === 'array' || $def['type'] === 'object')
            && array_key_exists('value', $def)
            && is_array($def['value'])){

            $def['value'] = new \Hazaar\Model\DataBinderValue(ake($def['value'], 0), ake($def['value'], 1), ake($def['value'], 2));

        }

    }

    public function setTags($tags){

        if($tags === null)
            return;

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

        return parent::set($key, $value, false);

    }

    private function filterItems(&$items, $no_reindex = false, $sub = null){

        if($sub && !is_array($sub)) $sub = array($sub);

        //Remove any tagged fields where the tag is not set
        foreach($items as $name => &$item){

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

                    if(is_object($items))
                        unset($items->$name);
                    if(is_array($items))
                        unset($items[$name]);

                    continue;

                }

            }

            if($tagParams = ake($item, 'tagParams')){

                if(is_object($tagParams))
                    $tagParams = get_object_vars($tagParams);

                unset($item['tagParams']);

                $tags = array_intersect(array_keys($tagParams), $this->__tags);

                if(count($tags) === 0 && array_key_exists('default', $tagParams))
                    $tags = array('default');

                foreach($tags as $tag)
                    $items[$name] = array_merge($item, get_object_vars($tagParams[$tag]));

            }

            if(is_array($sub) && (is_array($item) || is_object($item))){

                if(is_object($item))
                    $vars = array_keys(get_object_vars($item));
                else
                    $vars = array_keys($item);

                if($subs = array_intersect($vars, $sub)){

                    foreach($subs as $key){

                        $sub_item = ake($item, $key);

                        $this->filterItems($sub_item, $no_reindex, $sub);

                        if(is_object($item))
                            $item->$key = $sub_item;
                        if(is_array($item))
                            $item[$key] = $sub_item;

                    }

                }

            }

        }

        if($no_reindex !== true)
            $items = array_values($items);

        return $items;

    }

    public function getFormDefinition(){

        $form = clone $this->__form;

        $this->filterItems($form->fields, true, array('fields'));

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
    public function toFormArray($array = null, $fields = null){

        if($array === null)
            $array = parent::toArray(false, null, true, true);

        if($fields === null)
            $fields = $this->__form->fields;

        foreach($fields as $name => $field){

            if(is_array($field) && array_key_exists('fields', $field)){

                if(ake($field, 'type') === 'array'){

                    foreach($array[$name] as $index => $item)
                        $array[$name][$index] = $this->toFormArray($array[$name][$index], $field['fields']);

                }else
                    $array[$name] = $this->toFormArray($array[$name], $field['fields']);

            }elseif(is_object($field) && property_exists($field, 'fields')){

                if(ake($field, 'type') === 'array'){

                    foreach($array[$name] as $index => $item)
                        $array[$name][$index] = $this->toFormArray($array[$name][$index], $field->fields);

                }else
                    $array[$name] = $this->toFormArray($array[$name], $field->fields);

            }else{

                if($tags = ake($field, 'tag')){

                    if(!is_array($tags))
                        $tags = array($tags);

                    if(count(array_intersect($tags, $this->__tags)) === 0){

                        unset($array[$name]);

                        continue;

                    }

                }

                $this->exportField($name, $field, $array);

            }

        }

        return $array;

    }

    private function exportField($name, $field, &$array){

        if(!(is_array($array) && array_key_exists($name, $array))) return;

        if($field instanceof \stdClass)
            $field = (array)$field;

        if(is_array($field)){

            //Look into sub-fields
            if(array_key_exists('fields', $field)){

                settype($field['fields'], 'array');

                foreach($field['fields'] as $sub_name => $sub_field){

                    if(is_array($array[$name]))
                        $this->exportField($sub_name, (array)$sub_field, $array[$name]);
                    else
                        $array[$name] = array(); //Ensure list fields are always an array

                }

            }

            //Format date for output to the form
            if(array_key_exists('type', $field)
                && $field['type'] == 'date'
                && $array[$name] instanceof \Hazaar\Date)
                $array[$name] = $array[$name]->format('Y-m-d');

            /*
             * Only format the field if the format specifier is a string/number formatter (has A/9 values).
             * This will ignore format keywords such as 'email' or 'url'
             */
            if(array_key_exists('format', $field)
                && preg_match('/^[A9\s]+$/', $field['format'])
                && $array[$name]){

                $format_map = array(
                    'A' => '%s',
                    '9' => '%d'
                );

                $format = preg_replace_callback('/./', function($match) use($format_map){
                    if(array_key_exists($match[0], $format_map))
                        return $format_map[$match[0]];
                    return $match[0];
                }, $field['format']);

                $args = str_split(str_replace(' ', '', $array[$name]));

                array_unshift($args, $format);

                @$array[$name] = call_user_func_array('sprintf', $args); //If the format fails let it do so silently.

            }

        }

    }

    public function export($array = null){

        if($array === null)
            $array = $this->values;

        foreach($array as $key => $value){

            if($value instanceof \Hazaar\Model\ChildArray)
                $value = $this->export($value)->toArray();
            elseif($value instanceof \Hazaar\Model\ChildModel)
                $value = $this->export($value)->toArray(false, 0);
            elseif($value instanceof \Hazaar\Model\DataBinderValue)
                $value = $value->export();

            $array[$key] = $value;

        }

        return $array;

    }

    public function resolve(){

        $form = $this->getFormDefinition();

        foreach($form->fields as $key => &$def)
            $this->convert_definition($def);

        if(is_array($form->pages)){

            $pages = array();

            foreach($form->pages as $num => $page){

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

    private function __resolve_field_layout($name, $layout, $fields) {

        foreach($layout as $object_key => &$field) {

            if (is_array($field)) {

                $field = $this->__resolve_field_layout($name, $field, $fields);

            }elseif(is_string($field) && array_key_exists($field, $fields)){

                if (!property_exists($fields[$field], 'name'))
                    $fields[$field]->name = $name . '.' . $field;

                $field = $fields[$field];

            }elseif($field instanceof \stdClass){

                if (!property_exists($field, 'name'))
                    $field->name = $name . '.' . $object_key;

            }

        }

        return $layout;

    }

    private function __field($field, $form, $evaluate = true){

        if(is_string($field)){

            if(!(property_exists($form, 'fields') && array_key_exists($field, $form->fields)))
                return null;

            $field = (object)array_replace($form->fields[$field], array('name' => $field));

        }elseif(is_object($field) || is_array($field)){

            if(ake($field, 'name') === null)
                return $field;

            $field = (object)array_replace(ake($form->fields, ake($field, 'name'), array()), (array)$field);

        }else{

            return null;

        }

        $field_key = $field->name;

        $value = ake($field, 'value', $this->get($field_key));

        $output = ake($field, 'output', array('empty' => true));

        if(!$value && ake($output, 'empty', true) === false)
            return null;

        if($evaluate === true && (!is_object($field) || (property_exists($field, 'show') && !$this->evaluate($field->show))))
            return null;

        if($value === null){

            $value = ake($output, 'content');

        }elseif(ake($field, 'type') == 'array'){

            if(property_exists($field, 'arrayOf') && is_array($field->arrayOf)){

                $items = array();

                foreach($value as $id => $item){

                    $keys = ake($field, 'arrayOf', array());

                    foreach($keys as $key => $def){

                        $def['name'] = $key;

                        $def['value'] = ake($item, $key);

                        $items[$id][$key] = $this->__field($def, $form, false);

                    }

                }

                $value = $items;

            }elseif(ake($field, 'file') === true){

                $files = $this->__controller->__attachments($field->name);

                $value = array();

                foreach($files as $file){

                    $value[] = array(
                        'name' => $file->basename(),
                        'url' => (string)$file->media_uri()
                    );
                }

            }elseif($options = ake($field, 'options')){

                if(is_string($options))
                    $options = $this->api($this->matchReplace($options));

                $values = array();

                foreach($value as $key => $item){

                    if(($item instanceof \Hazaar\Model\dataBinderValue) && ($label = $item->label))
                        $values[$key] = $label;
                    else
                        $values[$key] = ake((array)$options, (($item instanceof \Hazaar\Model\dataBinderValue)?$item->value:$item));

                }

                $value = $values;

            }

        }elseif(property_exists($field, 'items')){

            $field->fields = array();

            foreach($field->items as $key => $item)
                $field->fields[$key] = (object)$item;

            $layout = $this->__resolve_field_layout($field->name, (property_exists($field, 'layout') ? $field->layout : $field->fields), $field->fields);

            $field->fields = $this->__group($layout, $field);

            return $field;

        }elseif ($value instanceof \Hazaar\Model\dataBinderValue && $value->label){

            $value = $value->label;

        }elseif($options = ake($field, 'options')){

            if(is_string($options))
                $options = $this->api($this->matchReplace($options));

            if($value instanceof \Hazaar\Model\dataBinderValue){
                $value = (string)$value;
            }else
                $value = ake((array)$options, $value);

        }

        $field->value = $value;

        //Look for subfields
        if(property_exists($field, 'fields') && ake($field, 'type') !== 'array'){

            foreach($field->fields as $key => &$sub_field){

                $sub_field->name = $field->name . '.' . $key;

                $sub_field->value = ake($value, $key);

                $sub_field = $this->__field($sub_field, $form);

            }

        }

        return $field;

    }

    public function evaluate($code){

        if(is_bool($code))
            return $code;

        $tokens = token_get_all('<?php ' . $code);

        $code = '';

        foreach($tokens as $i => $token){

            if(is_array($token)){

                switch($token['0']){

                    case T_OPEN_TAG: continue;

                    case T_STRING:

                        if(!($token[1] === 'true' || $token[1] === 'false')){

                            $code .= ((!isset($tokens[$i-1]) || $tokens[$i-1] !== '.') ? '$' : '' ) . $token[1];

                            break;

                        }

                    default:
                        $code .= $token[1];

                }

            }elseif($token === '.'){

                $code .= '->';

            }else{

                $code .= $token;

            }

        }

        $func = function($values, $evaluate){

            $export = function(&$export, &$value, $quote = true){

                if($value instanceof \Hazaar\Model\dataBinderValue)
                    $value = $value->value;
                elseif($value instanceof \Hazaar\Model\ChildModel)
                    $value = $value->toArray();
                elseif($value instanceof \Hazaar\Model\ChildArray){

                    $values = array();

                    foreach($value as $key => $subValue)
                        $values[$key] = $export($export, $subValue, false);

                    $value = $values;

                }

                if($value instanceof \Hazaar\Date)
                    $value = $value->sec();
                elseif(is_bool($value))
                    $value = strbool($value);
                elseif(is_null($value))
                    $value = 'null';
                elseif (is_array($value) && $quote)
                    $value = var_export($value, true);
                elseif ((is_string($value) || is_object($value)) && $quote)
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

                $tags = $this->__tags;

                return @eval($code);

            }
            catch(ParseError $e){

                die($code);

            }

        };

        try{

            ob_start();

            $result = $func($this->values, $code);

            if($buf = ob_get_clean()){

                echo $buf;

                var_dump($code);

            }

        }
        catch(\Exception $e){

            $result = false;

        }

        return $result;

    }

    public function matchReplace($string, $use_label = false, $params = array()){

        $settings = array_to_dot_notation(array('params' => $params));

        while (preg_match('/\{\{([\W]*)([\w\.]+)\}\}/', $string, $match)){

            $modifiers = ($match[1] ? str_split($match[1]) : array());

            $value = $this->get($match[2]);

            if (substr($match[2], 0, 5) === 'this.') $value = ake($settings, substr($match[2], 5));

            if(is_object($value) && !$value instanceof \Hazaar\Model\dataBinderValue)
                $value = '';

            $value = ((in_array(':', $modifiers) || !$use_label) && $value instanceof \Hazaar\Model\dataBinderValue) ? $value->value : (string)$value;

            $string = str_replace($match[0], $value, $string);

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

        $args['def'] = $this->getFormDefinition();

        $args['name'] = $this->getName();

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
                throw new \Exception('API endpoint returned status code ' . $response->getStatus() . ' - ' . $response->getStatusMessage());

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