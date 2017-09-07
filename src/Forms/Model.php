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

    private $source;

    private $__form_name;

    private $__form = array();

    function __construct($form_name){

        $app = \Hazaar\Application::getInstance();

        $file = $form_name . '.json';

        if(!($source = $app->filePath('forms', $file, true)))
            throw new \Exception('Form model source not found: ' . $file, 404);

        $source_file = new \Hazaar\File($source);

        if(!$source_file->exists())
            throw new \Exception('Form model source file not found!', 500);

        $this->__form_name = $source_file->name();

        if(!($this->__form = $source_file->parseJSON(true)))
            throw new \Exception('An error ocurred parsing the form definition \'' . $source_file->name() . '\'');

        if(!array_key_exists('name', $this->__form))
            throw new \Exception('Form definition does have a name!');

        if(!array_key_exists('pages', $this->__form))
            throw new \Exception('Form definition does have any pages defined!');

        if(!array_key_exists('fields', $this->__form))
            throw new \Exception('Form definition does not contain any fields!');

        if(!is_assoc($this->__form['fields'])){

            $fields = array();

            foreach($this->__form['fields'] as $ext_fields){

                $ext_fields_file = $ext_fields . '.json';

                if(!($source = $app->filePath('forms', $ext_fields_file, true)))
                    throw new \Exception('Form include file not found: ' . $ext_fields_file, 404);

                $include_file = new \Hazaar\File($source);

                if(!($include_fields = $include_file->parseJSON(true)))
                    throw new \Exception('An error ocurred parsing the form definition \'' . $include_file->name() . '\'');

                $fields = array_merge($fields, $include_fields);

            }

            $this->__form['fields'] = $fields;

        }

        parent::__construct();

    }

    public function init(){

        return ake($this->__form, 'fields', array());

    }


    public function getName(){

        return $this->__form_name;

    }

    public function getForm(){

        return $this->__form;

    }

    public function resolve(){

        $form = $this->getForm();

        $out = array('name' => $form['name'], 'pages' => array());

        foreach($form['pages'] as $page_no => $page)
            $out['pages'][$page_no] = $this->resolvePage($page);

        return $out;

    }

    private function resolvePage($page){

        foreach($page as $page_key => $page_item){

            if($page_key == 'sections'){

                foreach($page_item as $section_no => $section)
                    $page_item[$section_no] = $this->resolveSection($section);

            }

            $page[$page_key] = $page_item;

        }

        return $page;

    }

    private function resolveSection($section){

        foreach($section as $section_key => $section_item){

            if($section_key == 'fields'){

                $section[$section_key] = $this->resolveFields($section_item);

            }else{

                $section[$section_key] = $section_item;

            }

        }

        return $section;

    }

    private function resolveFields($fields){

        $field_items = array();

        foreach($fields as $field_item){

            if(is_array($field_item)){

                if(!array_key_exists('name', $field_item))
                    continue;

                $field_item = array_merge(ake($this->__form['fields'], $field_item['name'], array()), $field_item);

            }else{

                $field_item = array_merge($this->__form['fields'][$field_item], array('name' => $field_item));

            }

            if($show = str_replace(' ', '', ake($field_item, 'show', ''))){

                if(!$this->evaluate($show))
                    continue;

            }

            $field_key = $field_item['name'];

            $field_item['value'] = $this->get($field_key);

            $field_items[$field_key] = $field_item;

        }

        return $field_items;

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

            foreach($values as $key => $value)
                $code .= '$' . $key . ' = ' . (is_string($value) ? "'$value'" : (is_bool($value) ? strbool($value) : (is_null($value) ? 'null' : $value))) . ";\n";

            $code .= "return ( " . $evaluate . " );\n";

            return eval($code);

        };

        return $func($this->values, implode(' ', $parts));

    }

    private function fixCodeItem($item){

        $keywords = array('true', 'false', 'null');

        if(!($item[0] == "'" && $item[-1] == "'") && !in_array(strtolower($item), $keywords))
            $item = '$' . $item;

        return $item;

    }

    public function items($target){

        $cache = new \Hazaar\Cache();

        $key = md5('form_api_' . $target);

        if(!($out = $cache->get($key))){

            $url = new \Hazaar\Application\Url($target);

            if(!($out = json_decode(file_get_contents((string)$url), true)))
                throw new \Exception('Form API call failed.  Invalid response!');

            $cache->set($key, $out);

        }

        return $out;

    }

}