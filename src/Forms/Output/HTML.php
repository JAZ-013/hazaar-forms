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

 use \Hazaar\Html\Block;
 use \Hazaar\Html\Div;
 use \Hazaar\Html\H1;
 use \Hazaar\Html\Fieldset;

class HTML extends \Hazaar\Forms\Output {

    static public $pageClass = 'card card-default';

    static public $pageHeaderClass = 'card-header';

    static public $pageBodyClass = 'card-body';

    private $modal;

    private $settings;

    public function init(\Hazaar\Forms\Model $model){

        $this->modal = $model;

        $def = $model->getFormDefinition();

        $this->settings = replace_recursive(ake($def, 'settings'), ake($def, 'html'), [ 'hz' => [ 'left' => 3, 'right' => null ] ]);

        if (!ake($this->settings, 'hz.right')) $this->settings->hz->right = 12 - $this->settings->hz->left;

        if (!ake($this->settings, 'hz.left')) $this->settings->hz->left = 12 - $this->settings->hz->right;

    }

    public function render($settings = array(), $form = null, $ixes = null){

        if(!$form instanceof \stdClass)
            $form = $this->model->resolve();

        $div = (new Div)->class(ake($settings, 'formClass', 'form-output'));

        if(ake($settings, 'showTitle', true) === true)
            $div->add((new Div(new H1($this->model->matchReplace(ake($form, 'name', 'Unnamed Form')))))
                ->class(ake($settings, 'titleClass', 'form-header')));

        if(!$ixes && property_exists($form, 'html'))
            $ixes = $form->html;

        if(ake($settings, 'showPrefix', true) === true && is_object($ixes) && property_exists($ixes, 'prefix'))
            $div->add((new Div($this->model->matchReplace((string)$ixes->prefix, true)))
                ->class(ake($settings, 'prefixClass', 'form-prefix')));

        foreach($form->pages as $page_num => $page)
            $div->add($this->_page($page, $page_num + 1, $settings));

        if(ake($settings, 'showSuffix', true) === true && is_object($ixes) && property_exists($ixes,  'suffix'))
            $div->add((new Div($this->model->matchReplace((string)$ixes->suffix, true)))
                ->class(ake($settings, 'suffixClass', 'form-suffix')));

        return $div;

    }

    private function _label($label, $default_label, $def) {

        $labelType = ake($def, 'labelType', ($default_label ? $default_label : 'label'));

        $o = (new Block($labelType))->class('control-label')->set($this->model->matchReplace($label, true));

        if ($label_class = ake($def, 'labelClass')) 
            $o->addClass($label_class);

        return $o;

    }

    //Render a page
    private function _page($page, $page_num, $settings) {

        $html = (new \Hazaar\Html\Div())->class(HTML::$pageClass . ' form-page page-' . $page_num);

        if(property_exists($page, 'label'))
            $html->add((new \Hazaar\Html\Div($this->model->matchReplace($page->label, true)))->class(HTML::$pageHeaderClass));

        $body = (new \Hazaar\Html\Div())->class(HTML::$pageBodyClass);

        $sections = [];

        foreach($page->sections as $section)
            $sections[] = $this->_section($section, true);

        if (ake($this->settings, 'cards') === true || ake($page, 'cards') === true) {

            $body->addClass('card');

            if ($label = ake($page, 'label')) 
                $body->add($this->_label($label, 'div', $page)->addClass('card-header'));

            $body->add((new Div)->class('card-body')->add(sections));

        } else {

            if ($label = ake($page, 'label')) 
                $body->add($this->_label($label, 'h1', $page));

            $body->add($sections);

        }

        return $html->add($body);

    }

    //Render a page section
    private function _section($section, $p = true) {

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

        if ($section instanceof \stdClass){

            if ($label = ake($section, 'label')) 
                $html->add($this->_label($label, 'legend', $section));

            if($fields = ake($section, 'fields')){

                foreach($section->fields as $field) 
                    $html->add($this->_form_field($field, $p, ake($section, 'grid', false)));

            }

        }

        return $html;

    }

    function _form_field($info, $p = true, $grid = false) {

        if(is_array($info))
            $info = (object)['fields' => $info ];

        if ($grid && !(property_exits($info, 'grid'))) 
            $info->grid = grid;

        $p = ake($info, 'horizontal', $p);

        if ($render = ake($info, 'render')) {

            dump($render);

            $field = $this->modal->evaluate($render, $info->value, $info->name);

            if (!$field) 
                return;

            $field->attr('data-bind', $info->name);

        } else if (($layout = ake($info, 'fields')) && ake($info, 'type') !== 'array') {

            $length = count($layout);
            
            $fields = [];
            
            $col_width = 0;

            if (!$p === null)
                $p = $this->settings->horizontal ? false : !property_exists($info, 'layout');

            foreach($layout as $item) {

                if (!$item) continue;

                if ($p && !is_array($item)) {

                    if (!(property_exists($item, 'weight')))
                        $item->weight = 1;

                    $length = $length + ($item->weight - 1);

                }

                if (ake($info, 'protected') === true && _is_object($item)) 
                    $item->protected = true;

                if (property_exists($info, 'grid') && !property_exists($item, 'grid')) 
                    $item->grid = $info->grid;

                $fields[] = $item;

            }

            $col_width = 12 / $length;

            $field = (new Div)->class('form-section')->toggleClass('row', $p);

            if ($label = ake($info, 'label')) $field->add((new Div)->toggleClass('col-md-12', $p)->set($this->_label($label, 'h5', $info)));

            foreach($fields as $item) {

                if ($item instanceof \stdClass && ake($info, 'horizontal') === true) 
                    $item->row = true;

                $field_width = $col_width;
                
                if (!($child_field = $this->_form_field($item, !$p)))
                    continue;

                if($weight = ake($item, 'weight')) 
                    $field_width = round($field_width * $weight);

                $field->add($child_field->toggleClass('col-md-' . $field_width, $p));

                if ($item instanceof \stdClass && $p && !ake($info, 'row', false) && !$item->grid) 
                    $child_field->removeClass('row');

            }

        } else {

            $info->nolabel = false;

            $col = (new Div)->class('form-field');

            if ($info->grid = (ake($info, 'grid') || ake($this->settings, 'horizontal'))) {

                if ($info->nolabel !== true && $info->label) $col->addClass('col-sm-' . ake($this->settings, 'hz.right', 5));
                
                else $col->addClass('col-sm-12')->toggleClass('row', $info->row === true);

            }

            $field = (new Div)->class('form-group')->toggleClass('row', $info->grid);

            if (($title = ake($info, 'title')) || ($info->nolabel !== true && ($label = ake($info, 'label'))))
                $field->add($this->_label(($title ? $title : $label), 'label', $info)
                    ->toggleClass('col-sm-' . $this->settings->hz->left, $info->grid)
                    ->attr('for', '__hz_field_' . $info->name));

            $col->set($info->value);

            if ($css = ake($info, 'css')) 
                $input->css($css);

            if ($cssClass = ake($info, 'cssClass')) 
                $input->addClass($cssClass);

            $field->add($col);

        }

        if ($width = ake($info, 'width'))    
            $field->width($width);

        if ($max_width = ake($info, 'max-width')) 
            $field->style('max-width', $max_width);

        if ($height = ake($info, 'max-height')) 
            $field->style('height', $height);

        if ($max_height = ake($info, 'max-height')) 
            $field->style('max-height', $max_height);

        if ($html = ake($info, 'html')) {

            if (($label = ake($info, 'label')) && field.children().length === 0) 
                $field->add($this->_label($label, 'label', def));

            $field->add((new Div)->set($this->modal->_match_replace($html, null, true, true)));

        }

        if ($header = ake($info, 'header')) 
            $field->prepend($header);

        if ($footer = ake($info, 'footer')) 
            $field->add($footer);

        return $field;

    }

/*

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

            $horizontal = ake($field, 'horizontal', $horizontal);

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

            }elseif(is_object($field) && property_exists($field, 'fields') && ake($field, 'type') !== 'array'){

                $group = new \Hazaar\Html\Div();

                if(property_exists($field, 'label'))
                    $group->add(new \Hazaar\Html\H4($field->label));

                if ($horizontal === null) $p = !(property_exists($field, 'layout') && $field['layout']);

                $group->add($this->__group(array((array)$field->fields), $horizontal));

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

        $type = ake($field, 'type', 'text');

        if($type == 'button'){

            return null;

        }elseif($type == 'array' || $type == 'file'){

            if(property_exists($field, 'fields') && $field->fields instanceof \stdClass){

                $table = (new \Hazaar\Html\Table())->class('table');

                $table->add(new \Hazaar\Html\Thead($hdrs = new \Hazaar\Html\Tr()));

                $rows = new \Hazaar\Html\Tbody();

                $count = 0;

                foreach(ake($field, 'fields', array()) as $key => $def){

                    if(ake($def, 'hidden')) continue;

                    $hdrs->add(new \Hazaar\Html\Th(ake($def, 'label', $key)));

                    $count += ake($def, 'weight', 1);

                }

                foreach(ake($field, 'value', array()) as $items){

                    $row = new \Hazaar\Html\Tr();

                    foreach($items as $key => $item){

                        $td = new \Hazaar\Html\Td();

                        if($item){

                            if(ake($item, 'hidden')) continue;

                            $value = (property_exists($item, 'html') ? $item->html : $item->value);

                            $td->add($value);

                            $td->style('width', (100 / $count ) * ake($item, 'weight', 1) . '%');

                        }

                        $row->add($td);

                    }

                    $rows->add($row);

                }

                $group->add($table->add($rows));

            }elseif(\Hazaar\Map::is_array($field->value)){

                $list = (new \Hazaar\Html\Ul())->class('form-value-group');

                $is_file = (ake($field, 'type') === 'file');

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

            $value = ake($field, 'value');

            if($type == 'boolean'){

                $value = yn($value);

            }elseif($value instanceof \Hazaar\Date){

                if(ake($field, 'org_type', 'date') === 'datetime')
                    $value = $value->datetime();
                else
                    $value = $value->date();

            }

            $value_group = (new \Hazaar\Html\Div())->class('form-value');

            if($prefix = ake($field, 'prefix'))
                $value_group->add($this->model->matchReplace((string)$prefix) . ' ');

            if($value === null && $null = (array)ake($this->options, 'null'))
                $value = is_array($null) ? ake($null, $type, ake($null, 'default')) : $null;

            $value_group->add($value);

            if($suffix = ake($field, 'suffix'))
                $value_group->add(' ' . $this->model->matchReplace((string)$suffix));

            $group->add($value_group);

        }

        if($html = ake($field, 'html'))
            $group->add($this->model->matchReplace((string)$html, true));

        if($class = ake($field, 'output.class'))
            $group->addClass($class);

        return $group;

    }
    */

}