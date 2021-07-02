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

            if(isset($this->__form->types)){

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
                        if($items) foreach($items as &$item) if(is_string($item)) $item = array('name' => $item, 'type' => 'text/text');
                        return $items;
                    };

                    break;

                case 'bool':
                case 'boolean':

                    $def['type'] = 'boolean';

                    break;

                case 'int':
                case 'integer':
                case 'number':

                    $def['type'] = 'integer';

                    break;

                case 'array':
                case 'list':

                    $def['type'] = 'array';

                    break;

                case 'text';
                case 'string':
                default:

                    $def['type'] = 'text';

                    if($def['type'] !== $def['org_type'])
                        echo '';

                    break;

            }

        }else{

            $def['type'] = 'text';

        }

        if(isset($def['fields']) && !isset($def['arrayOf'])){

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

        if(isset($def['value']) && !($def['type'] === 'array' || $def['type'] === 'object')
            && array_key_exists('value', $def)
            && is_array($def['value'])){

            $def['value'] = new \Hazaar\Model\DataBinderValue(ake($def['value'], 0), ake($def['value'], 1), ake($def['value'], 2));

        }

        if(isset($def['exportLabel'])){

            if(!isset($def['prepare'])) $def['prepare'] = [];

            $def['prepare'][] = function($value, $key, $def){

                if(array_key_exists('options', $def)){

                    $options = $def['options'];

                    if(is_string($options))
                        $options = ['url' => $options];
                    
                    if($url = ake($options, 'url')){

                        if($data = $this->api($this->matchReplace($url), $options))
                            $options = $this->__convert_data($data, ake($options, 'value', 'value'), ake($options, 'label', 'label'));
    
                    }

                    if($v = array_search($value, $options, true))
                        $value = new \Hazaar\Model\DataBinderValue($v, ake($options, $v));

                }

                return $value;

            };

        }

        if(isset($def['options']) && !(isset($def['options']->url) || is_string($def['options'])) && ake($def, 'allowAny', false) !== true){

            if(!isset($def['prepare'])) $def['prepare'] = [];

            //Filter out any not-allowed values using the available options
            $def['prepare'][] = function($value, $key, $def){

                if(ake($def, 'other') === true)
                    return $value;

                if(is_array($value)){

                    if(!isset($value['__hz_value']))
                        return $value;

                    $sVal = $value['__hz_value'];

                }elseif($value instanceof \stdClass && isset($value->__hz_value))
                    $sVal = $value->__hz_value;
                elseif($value instanceof \Hazaar\Model\DataBinderValue)
                    $sVal = $value->value;
                else
                    $sVal = $value;

                $options = $this->__convert_data((isset($def['options']->data) ? $def['options']->data : $def['options']), ake($def['options'], 'value', 'value'), ake($def['options'], 'label', 'label'));

                $type = ake($def, 'type');

                if($type === 'boolean' || $type === 'bool')
                    $sVal = strbool($sVal);

                if(!isset($options[$sVal]))
                    return null;

                return $value;

            };

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

                        $sub_item = (array)ake($item, $key);

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

        $form = (is_object($this->__form) ? clone $this->__form : $this->__form);

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
     * Return form data as an array but filter fields by tags
     * 
     * This is the secure form of Model::toArray() which has had all the tagged fields removed.
     * 
     * @param bool $use_labels If TRUE, use labels if available instead of values.
     */
    public function toSecureArray($use_labels = false){

        return $this->toFormArray(null, null, true, $use_labels);

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
    public function toFormArray($array = null, $fields = null, $export = false, $use_labels = false){

        if($array === null)
            $array = parent::toArray(false, null, true, true);

        if($fields === null)
            $fields = $this->fields;

        foreach($fields as $name => $field){

            if($tags = ake($field, 'tag')){

                if(!is_array($tags))
                    $tags = array($tags);

                if(count(array_intersect($tags, $this->__tags)) === 0){

                    unset($array[$name]);

                    continue;

                }

            }

            $type = ake($field, 'type');

            if($type === 'array' && is_array(ake($field, 'arrayOf'))){

                if(!ake($array, $name)) continue;

                foreach($array[$name] as $index => $item)
                    $array[$name][$index] = $this->toFormArray($array[$name][$index], ake($field, 'arrayOf'), $export, $use_labels);

            }elseif($type === 'model'){

                $array[$name] = $this->toFormArray($array[$name], ake($field, 'items'), $export, $use_labels);

            }else{

                $this->exportField($name, $field, $array, $export, $use_labels);

            }

        }

        return $array;

    }

    private function exportField($name, $field, &$array, $export = false, $use_label = false){

        if(!(is_array($array) && array_key_exists($name, $array))) return;

        if($field instanceof \stdClass)
            $field = (array)$field;

        if(is_array($field) && $array[$name] !== null){

            //Look into sub-fields
            if(array_key_exists('items', $field)){

                settype($field['items'], 'array');

                foreach($field['items'] as $sub_name => $sub_field){

                    if(is_array($array[$name]))
                        $this->exportField($sub_name, (array)$sub_field, $array[$name], $export);
                    else
                        $array[$name] = array(); //Ensure list fields are always an array

                }

            }elseif(array_key_exists('default', $field)
                && !(is_array($array[$name]) && array_key_exists('__hz_value', $array[$name]))
                && ($options = ake($field, 'options'))){

                if(is_string($options))
                    $options = (object)array('url' => $options);

                if($url = ake($options, 'url')){

                    if(!($data = $this->api($this->matchReplace($url), $options)))
                        return false;

                    $options = $this->__convert_data($data, ake($options, 'value', 'value'), ake($options, 'label', 'label'));

                }

                if(is_array($array[$name])){

                    foreach($array[$name] as &$array_value){

                        if(!(is_array($array_value) && array_key_exists('__hz_value', $array_value)))
                           $array_value = $export ? $array_value : ['__hz_value' => $array_value, '__hz_label' => ake($options, $array_value, $array_value)];

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

            if(array_key_exists('exportLabel', $field))
                $use_label = boolify($field['exportLabel']);

            if($export === true && is_array($array[$name])){

                if(array_key_exists('__hz_value', $array[$name])){

                    $array[$name] = ake($array[$name], ($use_label ? '__hz_label' : '__hz_value'));

                }else{

                    foreach($array[$name] as &$item)
                        $item = is_array($item) && array_key_exists('__hz_value', $item) ? ake($item, ($use_label ? '__hz_label' : '__hz_value')) : $item;
                    
                }

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

        unset($form->fields);

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

            foreach($fields->fields as $field_name => &$field_item){

                if(!is_numeric($field_name) && is_object($field_item))
                    $field_item->name = $field_name;

                $field_item = $this->__field($field_item, $item_value, true, null, $parent_key);

            }

            return $fields;

        }

        return $this->__field($fields, $form, true, $item_value, $parent_key);

    }

    private function __field($field, $form, $evaluate = true, $item_value = null, $parent_key = null){

        /*
         * If the field is a string, find it's object from the form fields.
         * If the field is an object and has a name, find it's object from the form fields and make a merged copy.
         * If the field is an object with no name, use it "as-is".
         */
        if(is_string($field)){

            $name = $field;

            if(($field = ake($form, 'fields.' . implode('.fields.', explode('.', $field)))) === null)
                return null;

            if(!ake($field, 'type', null, true))
                $field->type = 'text';

            $field->name = ($parent_key ? $parent_key . '.' : null) . $name;

        }elseif(!is_object($field)){
            
            return null;

        }elseif($name = ake($field, 'name')){

            $field = (object)replace_recursive(ake($form->fields, $name), $field);
            
        }

        if($parent_key && property_exists($field, 'name'))
            $field->name = $parent_key . '.' . $field->name;

        if(property_exists($field,'hidden'))
            $field->hidden = $this->evaluate($field->hidden, false);

        /**
         * Check if the 'type' is a custom type and merge the field in with the type definition object 
         * Unless it's a button, then skip it.
         */
        if(property_exists($field, 'type')){

            if($field->type === 'button')
                return null;
            elseif(property_exists($this->__form, 'types') && property_exists($this->__form->types, $field->type))
                $field = replace_recursive(deep_clone(ake($this->__form->types, $field->type)), $field);

        }

        //Grab the field value (and while we're at it, resolve the field key).
        $value = ($field_key = ake($field, 'name', $parent_key)) ? ake($field, 'value', $this->get($field_key)) : $item_value;

        $output = ake($field, 'output', array('empty' => true));

        //Check if we're skipping output of empty values
        if(!$value && ake($output, 'empty', true) === false)
            return null;

        //Convert any plain values that have options into dataBinderValue object with the correct label
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

        //Run any evaluations now that we have the value, and see if we should even show this field.
        if($evaluate === true
            && (!is_object($field) || (property_exists($field, 'show') && $this->evaluate($field->show, true, $field_key) !== true)))
            return null;

        //If there is no value, just output the empty value content, which is null by default.
        if($value === null){

            $value = ake($output, 'content');

        //If the value is an array then we loop through each element and resolve each one recursively using the array's field definition
        }elseif(ake($field, 'type') == 'array'){

            if(property_exists($field, 'fields') 
                && ($field->fields instanceof \stdClass || is_array($field->fields))){

                $items = array();

                for($i = 0; $i < $value->count(); $i++){

                    $keys = ake($field, 'fields', array());

                    foreach($keys as $key => $def){

                        $itemDef = clone $def;

                        $itemDef->value = ake($value[$i], $key);

                        $items[$i][$key] = $this->__field($itemDef, $form, false);

                    }

                }

                $field->fields = $items;

            }else{
                
                if($options = ake($field, 'options')){

                    if(is_string($options))
                        $options = (object)array('url' => $options);

                    if($options instanceof \stdClass && property_exists($options, 'url')){

                        if($data = $this->api($this->matchReplace($options->url), $options))
                            $field->options = $this->__convert_data($data, ake($options, 'value', 'value'), ake($options, 'label', 'label'));

                    }

                }

                $field->value = $value;

            }

        //For files, we just resolve the file check it's valid and then resolve into an object with a name and URL.
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

                $field->value = $value;

            }

        //If this is an embedded object, resolve the sub-fields
        }elseif(property_exists($field, 'fields')){

            $this->__group($field, $field, $value, $field_key);

        //Otherwise, set the field value
        }else{
        
            /* However, if we don't know what's going on so if we have certain data, we clean it up first.
             * This can happen when resolving a form definition that has a different structure the data. ie: the def has changed so data structure is out-dated.
             */

            if ($value instanceof \Hazaar\Model\Strict || $value instanceof \Hazaar\Model\ChildArray)
                $value = null;

            $field->value = $value;

        }

        if(property_exists($field, 'prefix') && ($sf = $this->getFormFieldDefinition($field->prefix)))
            $field->prefix = $this->get($field->prefix);

        if(property_exists($field, 'suffix') && ($sf = $this->getFormFieldDefinition($field->suffix)))
            $field->suffix = $this->get($field->suffix);

        return $field;

    }

    private function __convert_data($data, $valueKey, $labelKey){

        if(!is_array($data))
            $data = (array)$data;

        //Convert multi-dimensional arrays to single dimension
        $first = reset($data);

        if(is_array($first) || $first instanceof \stdClass){

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

    public function api($target, $args = array(), $params = null, $merge_params = false){

        if(!is_array($params) || $merge_params === true){

            $form_params = array(
                'form' => parent::toArray(),
                'def' => $this->getFormDefinition(true),
                'name' => $this->getName()
            );

            $params = $merge_params ? array_merge($form_params, $params) : $form_params;

        }
        
        if(strpos($target, ':') !== false){

            $url = new \Hazaar\Http\Uri($target);

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

                    $field['validate']['method'] = ake($field, 'validate.method', 'POST');

                    $result = $this->api($this->matchReplace($data, false, array(), $value), $field['validate']);

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

    static public function toJSONSchema($def){

        if(!$def instanceof \stdClass)
            return false;

        $schema = (object)[
            '$id' => (string)(new \Hazaar\Application\URL('schemas', str_replace(' ', '_', strtolower(ake($def, 'name')) . '.json'))),
            '$schema' => 'https://datatracker.ietf.org/doc/html/draft-wright-json-schema-00',
            'description' => ake($def, 'description')
        ];

        $def->type_map = (object)[
            'boolean' => 'boolean',
            'bool' => 'boolean',
            'text' => 'string',
            'string' => 'string',
            'number' => 'integer',
            'float' => 'numeric',
            'file' => 'string',
            'integer' => 'integer',
            'date' => 'string'
        ];

        if($def->fields){

            if(!($properties = self::exportJSONSchemaObject($def, $def)))
                throw new \Exception('Conversion of Hazaar Forms defintion to JSON-Schema has failed!');

            $schema = (object)array_merge((array)$schema, (array)$properties);

        }

        return $schema;

    }

    static private function exportJSONSchemaObject(&$def, $object){

        if(isset($object->json) && $object->json === false)
            return false;

        $property = new \stdClass;

        $type = ake($object, 'type', 'text');

        if($items = ake($object, 'fields')){

            $property->type = 'object';

            $property->properties = new \stdClass;

            foreach($items as $key => $item){

                if($child = self::exportJSONSchemaObject($def, $item)){

                    $property->properties->$key = $child;

                    if(ake($item, 'required', false) !== false){

                        if(!property_exists($property, 'required'))
                            $property->required = [];
            
                        $property->required[] = $key;
            
                    }

                }

            }

        }elseif($type === 'array'){

            $property->type = 'array';
            
            $property->items = ['type' => self::getJSONType($def, ake($object, 'arrayOf'))];

        }else{

            $property->type = self::getJSONType($def, $type);

        }

        if($label = ake($object, 'label'))
            $property->title = $label;
            
        if($hint = ake($object, 'hint'))
            $property->description = $hint;

        if(($options = ake($object, 'options')) && !isset($options->url) && $property->type !== 'boolean'){

            if(isset($options->data))
                $options = $options->data;

            //$property->enum = true;// is_object($options) ? get_object_vars($options) : array_keys($);

        }

        return $property;
        
    }

    static private function getJSONType(&$def, $type){

        while(isset($def->types) && property_exists($def->types, $type))
            $type = ake($def->types->$type, 'type', 'text');

        if(!property_exists($def->type_map, $type))
            throw new \Exception('Unknown JSON type: ' . $type);

        return ake($def->type_map, $type, 'string');

    }

}
