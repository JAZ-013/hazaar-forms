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
 use \Hazaar\Html\Ul;
 use \Hazaar\Html\Li;
 use \Hazaar\Html\A;

class HTML extends \Hazaar\Forms\Output {

    static public $pageClass = 'card card-default';

    static public $pageHeaderClass = 'card-header';

    static public $pageBodyClass = 'card-body';

    private $modal;

    private $settings;

    public function init(\Hazaar\Forms\Model $model){

        $this->modal = $model;

        $def = $model->getFormDefinition();

        $this->settings = replace_recursive(ake($def, 'settings', new \stdClass), ake($def, 'html'), (object)[ 'hz' => (object)[ 'left' => 3, 'right' => null ] ]);

        if (!ake($this->settings, 'hz.right')) $this->settings->hz->right = 12 - $this->settings->hz->left;

        if (!ake($this->settings, 'hz.left')) $this->settings->hz->left = 12 - $this->settings->hz->right;

    }

    public function render($settings = array(), $form = null, $ixes = null){

        if(!$form instanceof \stdClass)
            $form = $this->model->resolve();
        
        $div = (new Div)->class(ake($settings, 'formClass', 'form-output'));

        if(ake($settings, 'showTitle', true) === true)
            $div->add((new Div(new H1($this->model->matchReplace(ake($form, 'name', 'Unnamed Form'), true))))
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

            $body->add((new Div)->class('card-body')->add(sections));

        } else {

            $body->add($sections);

        }

        return $html->add($body);

    }

    function _section($section, $horizontal = null) {

        $group = new Div;

        if (is_array($section)) {

            $col_width = null;

            if ($horizontal === null) 
                $horizontal = true;

            if ($horizontal) {

                $group->addClass('row');

                $length = count($section);

                foreach($section as $section_item) {

                    if (!$section_item instanceof \stdClass) continue;

                    if (!property_exists($section_item, 'weight')) 
                        $section_item->weight = 1;

                    $length += ($section_item->weight - 1);

                }

                $col_width = 12 / $length;

            }

            foreach($section as $section_item)
                $group->add((new Div)
                    ->toggleClass('col-md-' . round(ake($section_item, 'weight', 1) * $col_width), $horizontal)
                    ->add($this->_section($section_item, !$horizontal))
                );

            return $group;

        }

        if (!$section instanceof \stdClass)
            return null;

        $fieldset = (new Div)->class('col col-12')->appendTo($group);

        if ($label = ake($section, 'label')) 
            $fieldset->add($this->_label($label, 'legend', $section));

        foreach($section->fields as $field)
            $fieldset->add($this->_form_field($field, null, ake($section, 'grid', false)));

        return $group->addClass('row');

    }

    function _form_field($info, $horizontal = null, $grid = false, $parent_layout = null) {

        if(is_array($info)){

            $info = (object)['fields' => $info ];

        }elseif(property_exists($info,'hidden')){

            if($this->model->evaluate($info->hidden, false) === true)
                return null;

        }

        if (!property_exists($info, 'grid'))
            $info->grid = $grid;

        if(property_exists($info, 'horizontal'))
            $horizontal = $info->horizontal;

        $type = ake($info, 'type', 'text');

        if ($render = ake($info, 'render')) {

            if(!($field = $this->modal->evaluate($render, $info->value, ake($info, 'name'))))
                return;

        } else if (property_exists($info, 'fields') && $type !== 'array') {

            if($parent_layout)
                $layout =  $this->__resolve_field_layout($info->fields, $parent_layout);
            else
                $layout = property_exists($info, 'layout') ? $this->__resolve_field_layout($info->fields, $info->layout) : $info->fields;

            $length = count($layout instanceof \stdClass ? get_object_vars($layout) : $layout);
            
            $fields = [];
            
            $col_width = 0;

            if ($horizontal === null)
                $horizontal = ake($this->settings, 'horizontal') ? false : !(property_exists($info, 'layout') && $info->layout);

            foreach($layout as $item) {

                if(!$item || ake($item,'hidden') === true){

                    $length--;

                    continue;

                }

                if(!$item instanceof \stdClass)
                    $item = (object)['fields' => $item];

                if ($horizontal) {

                    if (!(property_exists($item, 'weight')))
                        $item->weight = 1;

                    $length = $length + ($item->weight - 1);

                }

                if (ake($info, 'protected') === true) 
                    $item->protected = true;

                if(property_exists($info, 'grid') && !property_exists($item, 'grid'))
                    $item->grid = $info->grid;

                $fields[] = $item;

            }

            $col_width = 12 / max($length, 1);

            $field = (new Div)->class('form-section')->toggleClass('row', $horizontal);

            if ($label = ake($info, 'label')) $field->add((new Div)->toggleClass('col-md-12', $horizontal)->set($this->_label($label, 'h4', $info)));

            foreach($fields as $item) {

                if ($item instanceof \stdClass){

                    if(ake($item,'hidden') === true)
                        continue;

                    if(ake($info, 'horizontal') === true) 
                        $item->row = true;

                }

                $field_width = $col_width;
                
                if (!($child_field = $this->_form_field($item, !$horizontal, ake($info, 'grid', false))))
                    continue;

                if($weight = ake($item, 'weight')) 
                    $field_width = round($field_width * $weight);

                $field->add($child_field->toggleClass('col-md-' . $field_width, $horizontal));

                if ($item instanceof \stdClass && $horizontal && !ake($info, 'row', false) && !$item->grid) 
                    $child_field->removeClass('row');

            }

        }elseif(property_exists($info, 'fields') && $type === 'array'){

            $field = (new Div)->class('itemlist');

            if ($label = ake($info, 'label')) $field->add((new Div)->set($this->_label($label, 'h4', $info)));
            
            foreach($info->fields as $child_item)
                $field->add($this->_form_field($child_item, true, false, ake($info, 'layout')));

        } else {

            $value = ake($info, 'value');

            if($type == 'boolean'){

                $value = yn($value);

            }elseif($value instanceof \Hazaar\Date){

                if(ake($info, 'org_type', 'date') === 'datetime')
                    $value = $value->datetime();
                else
                    $value = $value->date();

            }elseif(is_array($value) || $value instanceof \Hazaar\Model\ChildArray){

                $list = new Ul();

                if($type === 'file'){

                    foreach($value as $sub_value)
                        $list->add(new Li(new A(ake($sub_value, 'url'), ake($sub_value, 'name'))));

                }else{

                    if($glue = ake($info, 'glue') ){

                        $value = implode($glue, (($value instanceof \Hazaar\Model\ChildArray) ? $value->toArray() : $value));

                    }else{

                        foreach($value as $sub_value)
                            $list->add(new Li((string)(is_array($sub_value) ? ake($sub_value, 'name', $sub_value) : $sub_value)));
                            
                    }

                }

                $value = $list;

            }

            $info->nolabel = false;

            $col = (new Div)->class('form-field');

            if ($info->grid = (ake($info, 'grid') || ake($this->settings, 'horizontal'))) {

                if ($info->nolabel !== true && ake($info, 'label')) 
                    $col->addClass('col-sm-' . ake($this->settings, 'hz.right', 5));
                else 
                    $col->addClass('col-sm-12')->toggleClass('row', ake($info, 'row') === true);

            }

            $field = (new Div)->class('form-group')->toggleClass('row', $info->grid);

            if (($title = ake($info, 'title')) || ($info->nolabel !== true && ($label = ake($info, 'label'))))
                $field->add($this->_label(($title ? $title : $label), 'label', $info)
                    ->toggleClass('col-sm-' . $this->settings->hz->left, $info->grid));

            if($prefix = ake($field, 'prefix'))
                $field->add($this->model->matchReplace((string)$prefix) . ' ', true);

            if($value === null && $null = (array)ake($this->settings, 'null'))
                $value = is_array($null) ? ake($null, $type, ake($null, 'default')) : $null;

            $col->add($value);

            if($suffix = ake($field, 'suffix'))
                $col->add(' ' . $this->model->matchReplace((string)$suffix, true));

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

            if (($label = ake($info, 'label')) && $field->count() === 0) 
                $field->add($this->_label($label, 'label', def));

            $field->add((new Div)->set($this->modal->matchReplace($html, true)));

        }

        if ($header = ake($info, 'header')) 
            $field->prepend($header);

        if ($footer = ake($info, 'footer')) 
            $field->add($footer);

        return $field;

    }

}