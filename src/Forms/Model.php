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

        $this->__form = $form;

        if(!array_key_exists('name', $this->__form))
            throw new \Exception('Form definition does not have a name!');

        if(!array_key_exists('pages', $this->__form))
            throw new \Exception('Form definition does not have any pages defined!');

        if(!array_key_exists('fields', $this->__form))
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

    private function import(&$item){

        if(!(is_object($item) || is_array($item)))
            return false;

        if($item instanceof \stdClass && property_exists($item, 'import')){

            if(!$this->__form_import_path instanceof \Hazaar\File\Dir)
                throw new \Exception('No import path set on this form model.  Imports are not supported.');

            $import = is_array($item->import) ? $item->import : array($item->import);

            unset($item->import);

            foreach($import as $ext_item)
                $this->importItem($item, $ext_item);

        }

        foreach($item as &$field)
            $this->import($field);

        return true;

    }

    private function importItem(&$item, $ext_item){

        if(strtolower(substr($ext_item, -5)) !== '.json')
            $ext_item .= '.json';

        if(in_array($ext_item, $this->__form_imported))
            throw new \Exception($ext_item . ' has already been imported.  Cyclic reference?');

        if(!($source = $this->__form_import_path->get($ext_item)))
            throw new \Exception('Form import file not found: ' . $ext_item, 404);

        $import_file = new \Hazaar\File($source);

        if(!($import_items = $import_file->parseJSON()))
            throw new \Exception('An error ocurred parsing the form definition \'' . $import_file->name() . '\'');

        if(!is_object($import_items))
            throw new \Exception('Error importing from ' . $import_file);

        foreach($import_items as $key => $value){

            if(property_exists($item, $key))
                $value = (object)replace_recursive((array)$value, (array)$item->$key);

            $item->$key = $value;

        }

        $this->__form_imported[] = $ext_item;

        return true;

    }

    public function init(){

        if(!(property_exists($this->__form, 'fields') && is_array($this->__form->fields)))
            $this->__form->fields == array();

        $fields = $this->__form->fields;

        //Make any changes to the field defs for use in strict models.
        foreach($fields as &$def)
            $this->convert_definition($def);

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

            if(ake($def, 'type') !== 'array'){

                $extra = array();

                if(array_key_exists('disabled', $def))
                    $extra['disabled'] = $def['disabled'];

                if(array_key_exists('protected', $def))
                    $extra['protected'] = $def['protected'];

                if(array_key_exists('required', $def))
                    $extra['required'] = $def['required'];

                foreach($def[$target] as &$field){

                    $field = $this->array_merge_recursive_override($extra, $field);

                    $this->convert_definition($field);

                }

            }

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

                if(!(array_key_exists('currencies', $item) && is_array($item['currencies'])))
                    $item['currencies'] = array($temp->getCurrencyCode());

                foreach($item['currencies'] as &$currency)
                    $currency = (object)$temp->getCurrencyInfo($currency);

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

        if(is_array($field)){

            //Look into sub-fields
            if(array_key_exists('items', $field)){

                settype($field['items'], 'array');

                foreach($field['items'] as $sub_name => $sub_field){

                    if(is_array($array[$name]))
                        $this->exportField($sub_name, (array)$sub_field, $array[$name]);
                    else
                        $array[$name] = array(); //Ensure list fields are always an array

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

        $form = $this->getFormDefinition();

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

            if(property_exists($fields, 'show') && $this->evaluate($fields->show, true, $item_value, $parent_key) !== true)
                return null;

            $items = array();

            foreach($fields->fields as $field_item){

                if($item = $this->__group($field_item, $form, $parent_key))
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

            }elseif(is_string($field) && array_key_exists($field, $fields)){

                if (!property_exists($fields->$field, 'name'))
                    $fields->$field->name = $name . '.' . $field;

                $field = $fields->$field;

            }elseif($field instanceof \stdClass){

                if (!property_exists($field, 'name'))
                    $field->name = $name . (is_int($object_key) ? '' : '.' . $object_key);

            }

        }

        return $layout;

    }

    private function __field($field, $form, $evaluate = true, $item_value = null, $parent_key = null){

        if(is_string($field)){

            if(!(property_exists($form, 'fields') && array_key_exists($field, $form->fields)))
                return null;

            $name = $field;

            $field = ake($form->fields, $field, (object)array('type' => 'text'));

            $field->name = ($parent_key ? $parent_key . '.' : null) . $name;

        }elseif(is_object($field) || is_array($field)){

            if(ake($field, 'name') === null)
                return $field;

            $field = $this->smart_merge_recursive_override(ake($form->fields, ake($field, 'name')), $field);

        }else{

            return null;

        }

        if(property_exists($field, 'type')
            && property_exists($this->__form, 'types')
            && property_exists($this->__form->types, $field->type))
            $field = $this->smart_merge_recursive_override(ake($this->__form->types, $field->type), $field);

        $value = ($field_key = ake($field, 'name')) ? ake($field, 'value', $this->get($field_key)) : $item_value;

        $output = ake($field, 'output', array('empty' => true));

        if(!$value && ake($output, 'empty', true) === false)
            return null;

        if($evaluate === true
            && (!is_object($field) || (property_exists($field, 'show') && $this->evaluate($field->show, true, $value, $field_key) !== true)))
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

            }elseif(property_exists($field, 'fields')
                && $field->fields instanceof \stdClass
                && $value instanceof \Hazaar\Model\ChildArray){

                foreach($value as $item){

                    foreach($field->fields as $key => &$def)
                        $def->value = ake($item, $key);

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

    public function evaluate($code, $default = null, $item_data = null, $key = null){

        if(is_bool($code)) return $code;

        if($this->__use_node === true){

            $s = ($this->__script_server instanceof Script) ? $this->__script_server : new Script($this->values);

            return $s->evaluate($code, $key);

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

        $func = function($values, $evaluate, $item_value){

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

                $item = $item_value;

                $tags = new class($this->__tags){
                    private $items = array();
                    function __construct($items){ $this->items = $items; }
                    function indexOf($value){ return (($index = array_search($value, $this->items)) !== false) ? $index : -1; }
                };

                return @eval($code);

            }
            catch(ParseError $e){

                die($code);

            }

        };

        try{

            ob_start();

            $result = $func($this->values, $code, $item_value);

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

    public function matchReplace($string, $use_label = false, $params = array(), $default_value = null){

        $settings = array_to_dot_notation(array('params' => $params));

        while (preg_match('/\{\{([\W]*)([\w\.]+)\}\}/', $string, $match)){

            $modifiers = ($match[1] ? str_split($match[1]) : array());

            if($default_value === null){

                $value = $this->get($match[2]);

                if (substr($match[2], 0, 5) === 'this.')
                    $value = ake($settings, substr($match[2], 5));

                if(is_object($value) && !method_exists($value, '__toString'))
                    $value = '';

                $value = ((in_array(':', $modifiers) || !$use_label) && $value instanceof \Hazaar\Model\dataBinderValue) ? $value->value : (string)$value;

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

            $router = new \Hazaar\Application\Router(new \Hazaar\Application\Config);

            $request = new \Hazaar\Application\Request\HTTP($args, false, 'POST');

            if($pos = strpos($target, '?')){

                parse_str(substr($target, $pos + 1), $params);

                $request->setParams($params);

                $target = substr($target, 0, $pos);

            }

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

            if($this->evaluate($field['required'], true, $value, $field['name']) === true
                && (($value instanceof \Hazaar\Model\ChildArray && $value->count() === 0) || $value === null))
                return $this->__validation_error($field['name'], $field, 'required');

        }

        if (ake($field, 'protected') === true
            || array_key_exists('disabled', $field)
            && $this->evaluate($field['disabled'], false, $value, $field['name'])){

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

                    if (!$this->evaluate($data, true, $value, $field['name']))
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

}
