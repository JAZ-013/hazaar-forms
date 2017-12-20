<?php

namespace Hazaar\Forms\Output;

/**
 * Model short summary.
 *
 * Model description.
 *
 * @version 1.0
 * @author jamiec
 */
class HTML extends \Hazaar\Forms\Output {

    static public $pageClass = 'card card-default';

    static public $pageHeaderClass = 'card-header';

    static public $pageBodyClass = 'card-body';

    public function render($form = null, $ixes = null){

        if($form === null)
            $form = $this->model->resolve();

        $div = (new \Hazaar\Html\Div())->class('form-output');

        $div->add((new \Hazaar\Html\Div(new \Hazaar\Html\H1(ake($form, 'name', 'Unnamed Form'))))->class('form-header'));

        if(!$ixes && property_exists($form, 'html'))
            $ixes = $form->html;

        if(is_object($ixes) && property_exists($ixes, 'prefix'))
            $div->add((new \Hazaar\Html\Div($this->model->matchReplace((string)$ixes->prefix, true)))->class('form-prefix'));

        foreach($form->pages as $page_num => $page)
            $div->add($this->__page($page, $page_num + 1));

        if(is_object($ixes) && property_exists($ixes,  'suffix'))
            $div->add((new \Hazaar\Html\Div($this->model->matchReplace((string)$ixes->suffix, true)))->class('form-suffix'));

        return $div;

    }

    private function __page($page, $page_num){

        $html = (new \Hazaar\Html\Div())->class(HTML::$pageClass . ' form-page page-' . $page_num);

        if(property_exists($page, 'label'))
            $html->add((new \Hazaar\Html\Div($this->model->matchReplace($page->label, true)))->class(HTML::$pageHeaderClass));

        $body = (new \Hazaar\Html\Div())->class(HTML::$pageBodyClass);

        foreach($page->sections as $section)
            $body->add($this->__section($section));

        return $html->add($body);

    }

    private function __section($section, $p = true){

        if(is_array($section)){

            $col_width = null;

            $group = new \Hazaar\Html\Div();

            if($p){

                $group->addClass('row');

                $length = count($section);

                foreach ($section as &$s) {

                    if (!is_object($s)) continue;

                    if (!property_exists($s, 'weight')) $s->weight = 1;

                    $length = $length + ($s->weight - 1);

                }

                $col_width = (12 / $length);

            }

            foreach($section as &$s){

                $col = new \Hazaar\Html\Div($this->__section($s, !$p));

                if($p){

                    $field_width = (is_object($s) ? $s->weight : 1) * $col_width;

                    $col->class('col-lg-' . round($field_width));
                }

                $group->add($col);

            }

            return $group;

        }

        $html = (new \Hazaar\Html\Div())->class('form-section');

        if(property_exists($section, 'label'))
            $html->add(new \Hazaar\Html\H3($this->model->matchReplace($section->label, true)));

        $html->add($this->__group($section->fields));

        return $html;

    }

    private function __group($fields){

        if(!is_array($fields))
            return null;

        $items = array();

        foreach($fields as $name => $field){

            if(is_array($field) && !array_key_exists('name', $field)){

                $html = (new \Hazaar\Html\Div())->class('row');

                $length = count($field);

                foreach ($field as $field_col) {

                    if (!$field_col) continue;

                    if (!is_object($field_col))
                        $field_col = (object)array("name" => $field_col);

                    if (!property_exists($field_col, 'weight'))
                        $field_col->weight = 1;

                    $length = $length + ($field_col->weight - 1);

                }

                $col_width = (12 / $length);

                foreach($field as $field_col){

                    $field_width = $col_width;

                    if (is_object($field_col) && property_exists($field_col, 'weight'))
                        $field_width = round($field_width * $field_col->weight);

                    $html->add((new \Hazaar\Html\Div($this->__group(array($field_col))))->class('col-lg-' . $field_width));

                }

                $items[] = $html;

            }else{

                $items[] = $this->__field($name, $field);

            }

        }

        return $items;

    }

    private function __field($name, $field){

        $group = (new \Hazaar\Html\Div())->class('form-group');

        if($label = ake($field, 'label'))
            $group->add(new \Hazaar\Html\H4($this->model->matchReplace($label, true)));

        $type = ake($field, 'type');

        if($type == 'button'){

            return null;

        }elseif($type == 'array'){

            if(property_exists($field, 'fields')){

                $table = (new \Hazaar\Html\Table())->class('table');

                $table->add(new \Hazaar\Html\Thead($hdrs = new \Hazaar\Html\Tr()));

                $rows = new \Hazaar\Html\Tbody();

                foreach(ake($field, 'fields', array()) as $key => $def)
                    $hdrs->add(new \Hazaar\Html\Th(ake($def, 'label', $key)));

                foreach(ake($field, 'value', array()) as $items){

                    $row = new \Hazaar\Html\Tr();

                    foreach($items as $key => $item)
                        $row->add(new \Hazaar\Html\Td(ake($item, 'value')));

                    $rows->add($row);

                }

                $group->add($table->add($rows));

            }else{

                $list = (new \Hazaar\Html\Ul())->class('form-value-group');

                if(property_exists($field, 'options') && is_array($field->value)){

                    foreach($field->value as $item)
                        $list->add((new \Hazaar\Html\Li(ake($field->options, $item, $item)))->class('form-value'));

                }

                $group->add($list);

            }

        }elseif($type !== null){

            if($type == 'boolean')
                $field->value = yn($field->value);

            $value_group = (new \Hazaar\Html\Div())->class('form-value');

            if($prefix = ake($field, 'prefix'))
                $value_group->add($this->model->matchReplace((string)$prefix) . ' ');

            $value_group->add($field->value);

            if($suffix = ake($field, 'suffix'))
                $value_group->add(' ' . $this->model->matchReplace((string)$suffix));

            $group->add($value_group);

        }

        if($html = ake($field, 'html'))
            $group->add($this->model->matchReplace((string)$html, true));

        if($class = ake(ake($field, 'output'), 'class'))
            $group->addClass($class);

        return $group;

    }

}