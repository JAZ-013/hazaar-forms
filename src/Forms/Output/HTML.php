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

    private $options;

    public function init(\Hazaar\Forms\Model $model){

        $this->options = ake($model->getFormDefinition(), 'html');

    }

    public function render($settings = array(), $form = null, $ixes = null){

        if(!$form instanceof \stdClass)
            $form = $this->model->resolve();

        $div = (new \Hazaar\Html\Div())->class(ake($settings, 'formClass', 'form-output'));

        if(ake($settings, 'showTitle', true) === true)
            $div->add((new \Hazaar\Html\Div(new \Hazaar\Html\H1(ake($form, 'name', 'Unnamed Form'))))
                ->class(ake($settings, 'titleClass', 'form-header')));

        if(!$ixes && property_exists($form, 'html'))
            $ixes = $form->html;

        if(ake($settings, 'showPrefix', true) === true && is_object($ixes) && property_exists($ixes, 'prefix'))
            $div->add((new \Hazaar\Html\Div($this->model->matchReplace((string)$ixes->prefix, true)))
                ->class(ake($settings, 'prefixClass', 'form-prefix')));

        foreach($form->pages as $page_num => $page)
            $div->add($this->__page($page, $page_num + 1, $settings));

        if(ake($settings, 'showSuffix', true) === true && is_object($ixes) && property_exists($ixes,  'suffix'))
            $div->add((new \Hazaar\Html\Div($this->model->matchReplace((string)$ixes->suffix, true)))
                ->class(ake($settings, 'suffixClass', 'form-suffix')));

        return $div;

    }

    private function __page($page, $page_num, $settings = null){

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

        if(is_object($section)){

            if(property_exists($section, 'label'))
                $html->add(new \Hazaar\Html\H3($this->model->matchReplace($section->label, true)));

            if(property_exists($section, 'fields'))
                $html->add($this->__group($section->fields));

        }

        return $html;

    }

    private function __group($fields, $horizontal = true){

        if(!is_array($fields))
            return null;

        $items = array();

        foreach($fields as $name => $field){

            if(is_array($field) && !array_key_exists('name', $field)){

                $html = new \Hazaar\Html\Div();

                if($horizontal === true){

                    $html->class('row');

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

                        $html->add((new \Hazaar\Html\Div($this->__group(array($field_col), !$horizontal)))->class('col-lg-' . $field_width));

                    }

                }else{

                    foreach($field as $field_col)
                        $html->add(new \Hazaar\Html\Div($this->__group(array($field_col), !$horizontal)));

                }

                $items[] = $html;

            }elseif(is_object($field) && property_exists($field, 'fields')){

                $group = new \Hazaar\Html\Div();

                if(property_exists($field, 'label'))
                    $group->add(new \Hazaar\Html\H4($field->label));

                $group->add($this->__group(array((array)$field->fields), (property_exists($field, 'layout') ? !$horizontal : $horizontal)));

                $items[] = $group;

            }else{

                $items[] = $this->__field($name, $field);

            }

        }

        return $items;

    }

    private function __field($name, $field){

        $group = (new \Hazaar\Html\Div())->class('form-group');

        if($label = ake($field, 'label'))
            $group->add(new \Hazaar\Html\H5($this->model->matchReplace($label, true)));

        $type = ake($field, 'type');

        if($type == 'button'){

            return null;

        }elseif($type == 'array' || $type == 'file'){

            if(property_exists($field, 'arrayOf') && is_array($field->arrayOf)){

                $table = (new \Hazaar\Html\Table())->class('table');

                $table->add(new \Hazaar\Html\Thead($hdrs = new \Hazaar\Html\Tr()));

                $rows = new \Hazaar\Html\Tbody();

                $count = 0;

                foreach(ake($field, 'arrayOf', array()) as $key => $def){

                    if(ake($def, 'hidden')) continue;

                    $hdrs->add(new \Hazaar\Html\Th(ake($def, 'label', $key)));

                    $count += ake($def, 'weight', 1);

                }

                foreach(ake($field, 'value', array()) as $items){

                    $row = new \Hazaar\Html\Tr();

                    foreach($items as $key => $item){

                        if(ake($item, 'hidden')) continue;

                        $value = (property_exists($item, 'html') ? $item->html : $item->value);

                        $td = new \Hazaar\Html\Td($value);

                        $td->style('width', (100 / $count ) * ake($item, 'weight', 1) . '%');

                        $row->add($td);

                    }

                    $rows->add($row);

                }

                $group->add($table->add($rows));

            }elseif(\Hazaar\Map::is_array($field->value)){

                $list = (new \Hazaar\Html\Ul())->class('form-value-group');

                $is_file = ake($field, 'file', false);

                foreach($field->value as $item){

                    if($is_file)
                        $item = new \Hazaar\Html\A($item['url'], $item['name']);
                    elseif(property_exists($field, 'options'))
                        $item = ake($field->options, $item, $item);

                    $list->add((new \Hazaar\Html\Li($item))->class('form-value'));

                }

                $group->add($list);

            }

        }elseif($type !== null){

            if($type == 'boolean')
                $field->value = yn($field->value);
            elseif($field->value instanceof \Hazaar\Date)
                $field->value = $field->value->date();

            $value_group = (new \Hazaar\Html\Div())->class('form-value');

            if($prefix = ake($field, 'prefix'))
                $value_group->add($this->model->matchReplace((string)$prefix) . ' ');

            if(($value = $field->value) === null && $null = (array)ake($this->options, 'null'))
                $value = is_array($null) ? ake($null, $type, ake($null, 'default')) : $null;

            $value_group->add($value);

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