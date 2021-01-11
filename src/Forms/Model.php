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

    private $__form_imported = array();

    /**
     * The current form definition
     * @var array
     */
    private $__form = array();

    private $__items = array();

    private $__tags = array();

    private $__locked = false;

    private $__controller;

    private $__use_node = true;

    private $__script_server;

    private $__last_api_error = null;

    private $__initialised = false;

    function __construct($form_name, $form = null, $tags = null, \Hazaar\File\Dir $form_include_path = null){

        $this->__form_name = $form_name;

        $this->__form_import_path = $form_include_path;

        $this->setTags($tags);

        $this->__use_node = boolify(ake(\Hazaar\Application::getInstance()->config->forms, 'use_node', false));

        if($form) $this->load($form);

    }

    public function registerController(\Hazaar\Controller\Form $controller){

        $this->__controller = $controller;

    }

    public function load($form){

        if(is_array($form))
            $this->convertSimpleForm($form);

        $this->__form = $form;

        if(!property_exists($this->__form, 'name'))
            throw new \Exception('Form definition does not have a name!');

        if(!property_exists($this->__form, 'pages'))
            throw new \Exception('Form definition does not have any pages defined!');

        if(!property_exists($this->__form, 'fields'))
            throw new \Exception('Form definition does not contain any fields!');

        $this->import($this->__form);

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

    private function convertSimpleForm(&$form){

        if(!is_array($form))
            return false;

        $fields = (object)[];

        $this->convertSimpleFormFields($form, $fields);

        $form = (object)[
            'name' => '',
            'pages' => [
                (object)[
                    'sections' => [
                        (object)[
                            'fields' => $form
                        ]
                    ]
                ]
            ],
            'fields' => $fields
        ];

        return true;

    }

    private function convertSimpleFormFields(&$form, &$fields){

        foreach($form as &$item){

            if(is_array($item)) $this->convertSimpleFormFields($item, $fields);
            elseif(\property_exists($item, 'name')){

                $fields->{$item->name} = $item;

                $item = $item->name;

            }

        }

    }

    private function import(&$item, $path_prefix = null){

        if(!(is_object($item) || is_array($item)))
            return false;

        if($item instanceof \stdClass && property_exists($item, 'import')){

            if(!$this->__form_import_path instanceof \Hazaar\File\Dir)
                throw new \Exception('No import path set on this form model.  Imports are not supported.');

            $import = is_array($item->import) ? $item->import : array($item->import);

            unset($item->import);

            foreach($import as $ext_item)
                $this->importItem($item, ($path_prefix ? $path_prefix . '/' : '' ) . $ext_item);

        }

        foreach($item as &$field)
            $this->import($field, $path_prefix);

        return true;

    }

    private function importItem(&$item, $ext_item, $path_prefix = null){

        if(strtolower(substr($ext_item, -5)) !== '.json')
            $ext_item .= '.json';

        if(in_array($ext_item, $this->__form_imported))
            throw new \Exception($ext_item . ' has already been imported.  Cyclic reference?');

        if(!($import_file = $this->__form_import_path->get(($path_prefix ? $path_prefix . '/' : '' ) . $ext_item)))
            throw new \Exception('Form import file not found: ' . $ext_item, 404);

        if(!($import_items = $import_file->parseJSON()))
            throw new \Exception('An error ocurred parsing the form definition \'' . $import_file->name() . '\'');

        if(!is_object($import_items))
            throw new \Exception('Error importing from ' . $import_file);

        foreach($import_items as $key => $value){

            if(property_exists($item, $key))
                $value = (object)replace_recursive((array)$value, (array)$item->$key);

            $item->$key = $value;

            $this->import($item->$key, dirname($ext_item));

        }

        $this->__form_imported[] = $ext_item;

        return true;

    }

    public function init(){

        if(!(property_exists($this->__form, 'fields') && is_array($this->__form->fields)))
            $this->__form->fields == array();

        $fields = $this->__form->fields;

        //Make any changes to the field defs for use in strict models.
        foreach($fields as $index => &$def){

            $this->convert_definition($def);

            if($def === false)
                unset($fields[$index]);

        }

        $this->__initialised = true;

        return $fields;

    }

    private function convert_definition(&$def){

        if($type = ake($def, 'type')){

            if(property_exists($this->__form, 'types')){

                if($type === 'array' && array_key_exists('arrayOf', $def)
                    && ($customType = ake($this->__form->types, $def['arrayOf']))){

                    unset($def['arrayOf']);

                    $def['fields'] = ake($customType, 'fields');

                }elseif($customType = ake($this->__form->types, $type)){

                    $def = $this->array_merge_recursive_override($customType, $def);

                    $type = $def['type'] = ake($customType, 'type', 'text');

                    $def['horizontal'] = false;

                }

            }

            $def['org_type'] = $type;

            switch($type){
                case 'button':

                    $def = false;

                    return;

                case 'money':

                    $def['type'] = 'Hazaar\Money';

                    $def['read'] = function($value, $key) use ($def){
                        if(!$value) $value = new \Hazaar\Money(0, ake($def, 'defaultCurrency'));
                        return array('amt' => $value->toFloat(), 'currency' => $value->getCode());
                    };

                    $temp = new \Hazaar\Money(0);

                    if(!(array_key_exists('currencies', $def) && is_array($def['currencies'])))
                        $def['currencies'] = array($temp->getCurrencyCode());

                    foreach($def['currencies'] as &$currency)
                        $currency = $temp->getCurrencyInfo((is_object($currency) ? ake($currency, 'code', 'AUD') : $currency));

                    break;

                case 'date':
                case 'datetime':

                    $def['type'] = 'Hazaar\Date';

                    break;

                case 'file':

                    $def['type'] = 'array';

                    $def['arrayOf'] = 'model';

                    $def['file'] = true;

                    $def['prepare'] = function($items){
                        foreach($items as &$item) if(is_string($item)) $item = array('name' => $item, 'type' => 'text/text');
                        return $items;
                    };

                    break;

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

            foreach($def[$target] as &$field)
                $this->convert_definition($field);

        }

        if(array_key_exists('value', $def) && !($def['type'] === 'array' || $def['type'] === 'object')
            && array_key_exists('value', $def)
            && is_array($def['value'])){

            $def['value'] = new \Hazaar\Model\DataBinderValue(ake($def['value'], 0), ake($def['value'], 1), ake($def['value'], 2));

        }

    }

    /**
     * Merge multiple arrays into a single array with override priority
     *
     * @return \array
     */
    private function array_merge_recursive_override(){

        $array = array();

        foreach(func_get_args() as $arg){

            if(!(is_array($arg) || $arg instanceof \stdClass))
                continue;

            foreach($arg as $key => $value){

                if(is_array($value) || $value instanceof \stdClass)
                    $value = $this->array_merge_recursive_override((array_key_exists($key, $array) ? $array[$key] : array()), $value);

                $array[$key] = $value;

            }

        }

        return $array;

    }

    private function smart_merge_recursive_override(){

        $array = null;

        foreach(func_get_args() as $arg){

            if(!(is_array($arg) || $arg instanceof \stdClass))
                continue;

            if($array === null)
                $array = is_array($arg) ? array() : new \stdClass;

            foreach($arg as $key => $value){

                if(is_array($value) || $value instanceof \stdClass)
                    $value = $this->smart_merge_recursive_override(ake($array, $key), $value);

                if(is_array($array))
                    $array[$key] = $value;
                else
                    $array->$key = $value;

            }

        }

        return $array;

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

    public function getDescription(){

        return ake($this->__form, 'description');

    }

    public function getVersion(){

        return ake($this->__form, 'version');

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

            if(ake($item, 'type') === 'money'){

                $temp = new \Hazaar\Money(0);

                if(!(array_key_exists('currencies', $item) && is_array($item['currencies']))){

                    if(is_object($item))
                        $item->currencies = array($temp->getCurrencyCode());
                    elseif(is_array($item))
                        $item['currencies'] = array($temp->getCurrencyCode());

                }

                if(is_object($item)){

                    foreach($item->currencies as &$currency)
                        $currency = (object)$temp->getCurrencyInfo($currency);

                }elseif(is_array($item)){

                    foreach($item['currencies'] as &$currency)
                        $currency = (object)$temp->getCurrencyInfo($currency);

                }

            }

        }

        if($no_reindex !== true)
            $items = array_values($items);

        return $items;

    }

    public function getFormDefinition($secure = false){

        $form = clone $this->__form;

        if($secure === true){

            $this->filterItems($form->fields, true, array('fields'));

            $this->filterItems($form->pages, false, array('sections', 'fields'));

        }

        return $form;

    }

    public function getFormFieldDefinition($field, $secure = false){

        $def = $this->getFormDefinition($secure);

        $parts = explode('.', $field);

        foreach($parts as $part){

            if(!(($fields = ake($def, 'fields')) && ($sf = ake($fields, $part))))
                return null;

            $def = $sf;

        }

        return $def;

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
            $fields = $this->fields;

        foreach($fields as $name => $field){

            $type = ake($field, 'type');

            if($type === 'array' && is_array(ake($field, 'arrayOf'))){

                if(!ake($array, $name)) continue;

                foreach($array[$name] as $index => $item)
                    $array[$name][$index] = $this->toFormArray($array[$name][$index], ake($field, 'arrayOf'));

            }elseif($type === 'model'){

                $array[$name] = $this->toFormArray($array[$name], ake($field, 'items'));

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

        if(is_array($field) && $array[$name] !== null){

            //Look into sub-fields
            if(array_key_exists('items', $field)){

                settype($field['items'], 'array');

                foreach($field['items'] as $sub_name => $sub_field){

                    if(is_array($array[$name]))
                        $this->exportField($sub_name, (array)$sub_field, $array[$name]);
                    else
                        $array[$name] = array(); //Ensure list fields are always an array

                }

            }elseif((($options = ake($field, 'options')) || ($options = ake($field, 'lookup'))) 
                && !(is_array($array[$name]) && array_key_exists('__hz_value', $array[$name]))){

                if(is_string($options))
                    $options = (object)array('url' => $options);

                if($url = ake($options, 'url')){

                    if(!($data = $this->api($this->matchReplace($url), $options)))
                        return false;

                    $options = $this->__convert_data($data, ake($options, 'value', 'value'), ake($options, 'label', 'label'));

                }

                if(is_array($array[$name])){

                    foreach($array[$name] as &$array_value){

                        if(!array_key_exists('__hz_value', $array_value))
                           $array_value = ['__hz_value' => $array_value, '__hz_label' => ake($options, $array_value, $array_value)];

                    }

                }else{

                    $array[$name] = ['__hz_value' => $array[$name], '__hz_label' => ake($options, $array[$name], $array[$name])];

                }

            }

            //Format date for output to the form
            if($array[$name] instanceof \Hazaar\Date){

                if(ake($field, 'org_type', 'date') === 'datetime')
                    $array[$name] = $array[$name]->format('Y-m-d\TH:i');
                else
                    $array[$name] = $array[$name]->format('Y-m-d');

            }

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

        $form = $this->getFormDefinition(true);

        //Field defs need to be arrays.  Their contents do not however.
        array_walk($form->fields, function(&$array){
            if(is_array($array)) settype($array, 'object');
        });

        settype($form->fields, 'object');

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

        if(!is_object($page) || (property_exists($page, 'show') && $this->evaluate($page->show, true) !== true))
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

        if(!is_object($section) || (property_exists($section, 'show') && $this->evaluate($section->show, true) !== true))
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

    private function __group($fields, &$form, $item_value = null, $parent_key = null){

        if(is_array($fields)){

            $items = array();

            foreach($fields as $item){

                if($item = $this->__group($item, $form, $item_value, $parent_key))
                    $items[] = $item;

            }

            return $items;

        }elseif($fields instanceof \stdClass && property_exists($fields, 'fields')){

            $value_key = property_exists($fields, 'name') ? $fields->name : $parent_key;

            if(property_exists($fields, 'show') && $this->evaluate($fields->show, true, $value_key) !== true)
                return null;

            $items = array();

            foreach($fields->fields as $field_name => $field_item){

                if($field_item instanceof \stdClass
                    && property_exists($fields, 'name')
                    && !property_exists($field_item, 'name'))
                    $field_item->name = $fields->name . '.' . $field_name;

                if($item = $this->__group($field_item, $form, null, $parent_key))
                    $items[] = $item;

            }

            return $items;

        }

        return $this->__field($fields, $form, true, $item_value, $parent_key);

    }

    private function __resolve_field_layout($name, $layout, $fields) {

        foreach($layout as $object_key => &$field) {

            if (is_array($field) || ($field instanceof \stdClass && property_exists($field, 'fields'))) {

                $field = $this->__resolve_field_layout($name, $field, $fields);

            }elseif(is_string($field) && ($field_obj = ake($fields, $field)) && $field_obj instanceof \stdClass){

                if (!property_exists($field_obj, 'name'))
                    $field_obj->name = $name . '.' . $field;

                $field = $field_obj;

            }elseif($field instanceof \stdClass){

                if (property_exists($field, 'type') && !property_exists($field, 'name'))
                    $field->name = $name . (is_int($object_key) ? '' : '.' . $object_key);

            }

            if($field instanceof \stdClass && property_exists($field, 'type')){

                if($field->type === 'button')
                    return null;
                elseif(property_exists($this->__form, 'types') && property_exists($this->__form->types, $field->type)){

                    $field = $this->smart_merge_recursive_override(ake($this->__form->types, $field->type), $field);

                    if(property_exists($field, 'fields')){

                        $field->fields = (array)$this->__resolve_field_layout($field->name, (property_exists($field, 'layout') ? $field->layout : $field->fields), $field->fields);

                        if(property_exists($field, 'layout')) unset($field->layout);

                    }

                }

            }

        }

        return $layout;

    }

    private function __field($field, $form, $evaluate = true, $item_value = null, $parent_key = null){

        if(is_string($field)){

            if(ake($form, 'fields.' . $field) === null)
                return null;

            $name = $field;

            $field = ake($form->fields, $field, (object)array('type' => 'text'));

            $field->name = ($parent_key ? $parent_key . '.' : null) . $name;

        }elseif(is_object($field) || is_array($field)){

            if($name = ake($field, 'name'))
                $field = $this->smart_merge_recursive_override(ake($form->fields, $name), $field);

        }else{

            return null;

        }

        if(property_exists($field, 'type')){

            if($field->type === 'button')
                return null;
            elseif(property_exists($this->__form, 'types') && property_exists($this->__form->types, $field->type))
                $field = $this->smart_merge_recursive_override(ake($this->__form->types, $field->type), $field);

        }

        $value = ($field_key = ake($field, 'name', $parent_key)) ? ake($field, 'value', $this->get($field_key)) : $item_value;

        $output = ake($field, 'output', array('empty' => true));

        if(!$value && ake($output, 'empty', true) === false)
            return null;

        if($value && !($value instanceof \Hazaar\Model\Strict
            || $value instanceof \Hazaar\Model\ChildArray
            || $value instanceof \Hazaar\Model\DataBinderValue)
            && (($options = ake($field, 'options')) || ($options = ake($field, 'lookup')))){

            if(is_string($options))
                $options = (object)array('url' => $options);

            if($options instanceof \stdClass && property_exists($options, 'url')){

                if($data = $this->api($this->matchReplace($options->url), $options))
                    $field->options = $this->__convert_data($data, ake($options, 'value', 'value'), ake($options, 'label', 'label'));

            }

            $value = \Hazaar\Model\DataBinderValue::create($value, ake($field->options, $value, $value));

            $this->set($field_key, $value);

        }

        if($evaluate === true
            && (!is_object($field) || (property_exists($field, 'show') && $this->evaluate($field->show, true, $field_key) !== true)))
            return null;

        if($value === null){

            $value = ake($output, 'content');

        }elseif(ake($field, 'type') == 'array'){

            if(property_exists($field, 'fields') && $field->fields instanceof \stdClass){

                $items = array();

                for($i = 0; $i < $value->count(); $i++){

                    $keys = ake($field, 'fields', array());

                    foreach($keys as $key => $def){

                        $def->name = $key;

                        $def->value = ake($value[$i], $key);

                        $items[$i][$key] = $this->__field($def, $form, false);

                    }

                }

                $value = $items;

            }elseif(property_exists($field, 'fields')
                && $field->fields instanceof \stdClass
                && $value instanceof \Hazaar\Model\ChildArray){

                foreach($value as $item){

                    foreach($field->fields as $key => &$def)
                        $def->value = ake($item, $key);

                }

            }elseif($options = ake($field, 'options')){

                if(is_string($options))
                    $options = (object)array('url' => $options);

                if($options instanceof \stdClass && property_exists($options, 'url')){

                    if($data = $this->api($this->matchReplace($options->url), $options))
                        $field->options = $this->__convert_data($data, ake($options, 'value', 'value'), ake($options, 'label', 'label'));

                }

            }

        }elseif(ake($field, 'type') === 'file'){

            if($this->__controller instanceof \Hazaar\Controller\Form){

                $files = $this->__controller->__attachments($field->name);

                $value = array();

                foreach($files as $file){

                    $value[] = array(
                        'name' => $file->basename(),
                        'url' => (string)$file->media_uri()
                    );
                }

            }

        }elseif(property_exists($field, 'fields')){

            $layout = (array)$this->__resolve_field_layout($field->name, (property_exists($field, 'layout') ? $field->layout : $field->fields), $field->fields);

            $field->horizontal = false;

            $field->fields = $this->__group($layout, $field, $value, $field->name);

            return $field;

        }elseif ($value instanceof \Hazaar\Model\Strict
            || $value instanceof \Hazaar\Model\ChildArray){

            $value = null;

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

        if(property_exists($field, 'prefix') && ($sf = $this->getFormFieldDefinition($field->prefix)))
            $field->prefix = $this->get($field->prefix);

        if(property_exists($field, 'suffix') && ($sf = $this->getFormFieldDefinition($field->suffix)))
            $field->suffix = $this->get($field->suffix);

        return $field;

    }

    private function __convert_data($data, $valueKey, $labelKey){

        if(!is_array($data))
            return array();

        //Convert multi-dimensional arrays to single dimension
        if(is_array(reset($data)) || $data instanceof \stdClass){

            $result = array();

            foreach($data as $k => &$v){

                if(!is_int($k)) break;

                $result[ake($v, $valueKey)] = (strpos($labelKey, '{{') !== false) ? $this->matchReplace($labelKey, false, null, null, $v) : ake($v, $labelKey);

            }

        }else $result = $data;

        return $result;

    }

    public function evaluate($code, $default = null, $key = null){

        if(is_bool($code)) return $code;

        if($this->__use_node === true){

            $s = ($this->__script_server instanceof Script) ? $this->__script_server : new Script($this->values);

            return $s->evaluate($code, $key, array('tags' => $this->__tags));

        }

        $tokens = token_get_all('<?php ' . $code);

        $code = '';

        foreach($tokens as $i => $token){

            if(is_array($token)){

                switch($token['0']){

                    case T_OPEN_TAG: continue 2;

                    case T_STRING:

                        if(!($token[1] === 'true' || $token[1] === 'false' || $token[1] === 'null')){

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

        $model = $this;

        $eval_code = function($evaluate, $key) use($model){

            $export = null; //Hack to allow use($export) to work

            $export = function($value, $quote = true) use(&$export) {

                if($value instanceof \Hazaar\Model\DataBinderValue)
                    $value = $value->value;
                elseif($value instanceof \Hazaar\Model\Strict || $value instanceof \Hazaar\Model\ChildModel)
                    $value = array_to_object($value->toArray());
                elseif($value instanceof \Hazaar\Model\ChildArray){

                    $values = array();

                    foreach($value as $key => $subValue)
                        $values[$key] = $export($subValue, false);

                    $value = $values;

                }

                if($value instanceof \Hazaar\Date)
                    $value = $value->sec();
                elseif(is_bool($value))
                    $value = strbool($value);
                elseif(is_null($value))
                    $value = 'null';
                elseif ((is_array($value) || $value instanceof \stdClass) && $quote)
                    $value = var_export($value, true);
                elseif ((is_string($value) || is_object($value)) && $quote)
                    $value = "'" . addslashes((string)$value) . "'";

                return $value;

            };

            $__hz_code = '';

            foreach($model->values as $var_key => $value)
                $__hz_code .= '$' . $var_key . ' = ' . $export($value) . ";\n";

            $eval_item = null;

            $eval_value = $model;

            if($key){

                $eval_item = (($pos = strrpos($key, '.')) === false) ? $model : $model->get(substr($key, 0, $pos));

                $eval_value = $model->get($key);

                if(!($eval_value instanceof \Hazaar\Model\Strict
                    || $eval_value instanceof \Hazaar\Model\ChildArray
                    || $eval_value instanceof \Hazaar\Model\DataBinderValue))
                    $eval_value = \Hazaar\Model\DataBinderValue::create($eval_value);

            }

            $__hz_code .= "return ( " . $evaluate . " );\n";

            try{

                $tags = new class($this->__tags){
                    private $items = array();
                    function __construct($items){ $this->items = $items; }
                    function indexOf($value){ return (($index = array_search($value, $this->items)) !== false) ? $index : -1; }
                };

                $eval = function($form, $value, $formValue, $item, $formItem, $tags) use($__hz_code) { return @eval($__hz_code); };

                return $eval($this,
                    ($eval_value ? array_to_object($eval_value->toArray()) : null), $eval_value,
                    ($eval_item ? array_to_object($eval_item->toArray()) : null), $eval_item,
                    $tags);

            }
            catch(\ParseError $e){

                die($__hz_code);

            }

        };

        try{

            ob_start();

            $result = $eval_code($code, $key);

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

    public function matchReplace($string, $use_label = false, $params = array(), $default_value = null, $data = null){

        $settings = array_to_dot_notation(array('params' => $params));

        while (preg_match('/\{\{([\W]*)([\w\.]+)\}\}/', $string, $match)){

            $modifiers = ($match[1] ? str_split($match[1]) : array());

            if($default_value === null){

                $value = (is_array($data) || $data instanceof \stdClass) ? ake($data, $match[2]) : $this->get($match[2]);

                if (substr($match[2], 0, 5) === 'this.')
                    $value = ake($settings, substr($match[2], 5));

                if(is_object($value) && !method_exists($value, '__toString'))
                    $value = '';

                $value = ((in_array(':', $modifiers) || !$use_label) && $value instanceof \Hazaar\Model\DataBinderValue) ? $value->value : (string)$value;

            } else $value = $default_value;

            $string = str_replace($match[0], $value, $string);

        }

        if(is_array($params) && count($params) > 0){

            while (preg_match('/\$([a-zA-Z]\S+)/', $string, $match))
                $string = str_replace($match[0], ake($params, $match[1], 'null'), $string);

        }

        return $string;

    }

    public function api($target, $args = array()){

        $params = array(
            'form' => $this->toArray(),
            'def' => $this->getFormDefinition(true),
            'name' => $this->getName()
        );

        if(strpos($target, ':') !== false){

            $url = new \Hazaar\Application\Url($target);

            $url->setParams($params);

            if(!($result = json_decode(file_get_contents((string)$url), true)))
                throw new \Exception('Form API call failed.  Invalid response!');

        }else{

            $router = new \Hazaar\Application\Router(new \Hazaar\Application\Config);

            $request = new \Hazaar\Application\Request\Http($params, false, ake($args, 'method', strtoupper(ake($args, 'method', 'GET'))));

            if($pos = strpos($target, '?')){

                parse_str(substr($target, $pos + 1), $url_params);

                $request->setParams($url_params);

                $target = substr($target, 0, $pos);

            }

            try{

                $app = \Hazaar\Application::getInstance();

                $response_type = $app->getResponseType();

                $request->setPath($target);

                $router->evaluate($request);

                $loader = \Hazaar\Loader::getInstance();

                if(!($controller = $loader->loadController($router->getController())))
                    throw new \Exception("Controller for target '$target' could not be found!", 404);

                $controller->__initialize($request);

                $response = $controller->__run();

                if(!$response instanceof \Hazaar\Controller\Response\Json)
                    throw new \Exception('Only JSON API responses are currently supported!');

                if($response->getStatus()!= 200)
                    throw new \Exception('API endpoint returned status code ' . $response->getStatus() . ' - ' . $response->getStatusMessage());

                $result = $response->toArray();

                $app->setResponseType($response_type);

            }
            catch(\Exception $e){

                $result = false;

                $this->__last_api_error = $e->getMessage();

            }

        }

        return $result;

    }

    public function getPDFTitle($params = null){

        if(!(property_exists($this->__form, 'pdf')
            && property_exists($this->__form->pdf, 'title')))
            return 'Form Document';

        return $this->matchReplace($this->__form->pdf->title, true, $params);

    }

    public function renderHTML($settings = array()){

        $pdf = new \Hazaar\Forms\Output\HTML($this);

        return $pdf->render($settings);

    }

    public function renderPDF($settings = array()){

        if(!in_array('pdf', $this->__tags)) $this->__tags[] = 'pdf';

        $pdf = new \Hazaar\Forms\Output\PDF($this);

        return $pdf->render($settings);

    }

    public function validate(){

        $errors = array();

        foreach($this->__form->fields as $key => $field){

            if (!array_key_exists('name', $field))
                $field['name'] = $key;

            if(($result = $this->__validate_field($field)) !== true)
                $errors = array_merge($errors, $result);

        }

        if(count($errors) === 0)
            return true;

        return $errors;

    }

    private function __validate_field($field, $value = null){

        if(!is_array($field))
            return 'Not a valid form field!';

        if($value === null)
            $value = $this->get($field['name']);

        if(array_key_exists('required', $field)){

            if($this->evaluate($field['required'], true, $field['name']) === true
                && (($value instanceof \Hazaar\Model\ChildArray && $value->count() === 0) || $value === null))
                return $this->__validation_error($field['name'], $field, 'required');

        }

        if (ake($field, 'protected') === true
            || array_key_exists('disabled', $field)
            && $this->evaluate($field['disabled'], false, $field['name'])){

            return true;

        }elseif(array_key_exists('fields', $field)){

            $itemResult = array();

            if(ake($field, 'type') === 'array' && $value instanceof \Hazaar\Model\ChildArray){

                foreach($value as $subItem){

                    if(($result = $this->__validate_field($field, $subItem)) !== true)
                        $itemResult = array_merge($itemResult, $result);

                }

            }else{

                foreach($field['fields'] as $key => &$subField){

                    $subField = (array)$subField;

                    if(!array_key_exists('name', $subField))
                        $subField['name'] = $field['name'] . '.' . $key;

                    if(($result = $this->__validate_field($subField, ake($value, $key))) !== true)
                        $itemResult = array_merge($itemResult, $result);

                }

            }

            return (count($itemResult) > 0) ? $itemResult : true;

        }

        return $this->__validate_rule($field, $value);

    }

    private function __validate_rule($field, $value) {

        if(!array_key_exists('validate', $field))
            return true;

        if(!$field['validate'] instanceof \stdClass)
            $field['validate'] = (object)array('custom' => $field['validate']);

        foreach($field['validate'] as $type => $data){

            switch($type){

                case 'min':

                    if (intval($value) < $data)
                        return $this->__validation_error($field['name'], $field, "too_small");

                    break;
                case 'max':

                    if (intval($value) > $data)
                        return $this->__validation_error($field['name'], $field, "too_big");

                    break;

                case 'with':

                    if(!(is_string($value) && preg_match($data, $value)))
                        return $this->__validation_error($field['name'], $field, "regex_failed");

                    break;

                case 'equals':

                    if ($value !== $data)
                        return $this->__validation_error($field['name'], $field, "not_equal");

                    break;

                case 'minlen':

                    if ($value && strlen($value) < $data)
                        return $this->__validation_error($field['name'], $field, "too_short");

                    break;

                case 'maxlen':

                    if ($value && strlen($value) > $data)
                        return $this->__validation_error($field['name'], $field, "too_long");

                    break;

                case 'url':

                    if($value === null)
                        return true;

                    $data = $this->matchReplace($data, false, array(), $value);

                    $result = $this->api($data);

                    if(ake($result, 'ok', false) !== true)
                        return $this->__validation_error($field['name'], $field, "api_failed($data)");

                    break;

                case 'custom':

                    if (!$this->evaluate($data, true, $field['name']))
                        return $this->__validation_error($field['name'], $field, "custom");

                    break;

                default:

                    throw new \Exception('Unknown validation: ' . $type);

            }

        }

        return true;

    }

    private function __validation_error($name, $def, $status) {

        return array($name => array('field' => $def, 'status' => $status));

    }

    public function lastAPIError(){

        return $this->__last_api_error;
        
    }

}
