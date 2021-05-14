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

        $this->settings = replace_recursive(ake($def, 'settings', new \stdClass), ake($def, 'html'), (object)[ 'hz' => (object)[ 'left' => 3, 'right' => null ] ]);

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
    private function _section($section, $horizontal = true) {

        if(is_array($section)){

            $col_width = null;

            $group = new \Hazaar\Html\Div();

            if($horizontal){

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

                $col = new \Hazaar\Html\Div($this->_section($s, !$horizontal));

                if($horizontal){

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
                    $html->add($this->_form_field($field, $horizontal, ake($section, 'grid', false)));

            }

        }

        return $html;

    }

    function _form_field($info, $horizontal = true, $grid = false) {

        if(is_array($info))
            $info = (object)['fields' => $info ];

        if ($grid && !(property_exists($info, 'grid'))) 
            $info->grid = $grid;

        $horizontal = ake($info, 'horizontal', $horizontal);

        if ($render = ake($info, 'render')) {

            dump($render);

            $field = $this->modal->evaluate($render, $info->value, $info->name);

            if (!$field) 
                return;

            $field->attr('data-bind', $info->name);

        } else if (property_exists($info, 'fields') && ake($info, 'type') !== 'array') {

            $layout = property_exists($info, 'layout') ? $this->__resolve_field_layout($info->fields, $info->layout) : $info->fields;

            $length = count($layout instanceof \stdClass ? get_object_vars($layout) : $layout);
            
            $fields = [];
            
            $col_width = 0;

            if (!$horizontal === null)
                $horizontal = $this->settings->horizontal ? false : !property_exists($info, 'layout');

            foreach($layout as $item) {

                if(!$item) 
                    continue;

                if(!$item instanceof \stdClass)
                    $item = (object)['fields' => $item];

                if ($horizontal) {

                    if (!(property_exists($item, 'weight')))
                        $item->weight = 1;

                    $length = $length + ($item->weight - 1);

                }

                if (ake($info, 'protected') === true) 
                    $item->protected = true;

                if (property_exists($info, 'grid') && !property_exists($item, 'grid'))
                    $item->grid = $info->grid;

                $fields[] = $item;

            }

            $col_width = 12 / max($length, 1);

            $field = (new Div)->class('form-section')->toggleClass('row', $horizontal);

            if ($label = ake($info, 'label')) $field->add((new Div)->toggleClass('col-md-12', $horizontal)->set($this->_label($label, 'h5', $info)));

            foreach($fields as $item) {

                if ($item instanceof \stdClass && ake($info, 'horizontal') === true) 
                    $item->row = true;

                $field_width = $col_width;
                
                if (!($child_field = $this->_form_field($item, !$horizontal, ake($info, 'grid'))))
                    continue;

                if($weight = ake($item, 'weight')) 
                    $field_width = round($field_width * $weight);

                $field->add($child_field->toggleClass('col-md-' . $field_width, $horizontal));

                if ($item instanceof \stdClass && $horizontal && !ake($info, 'row', false) && !$item->grid) 
                    $child_field->removeClass('row');

            }

        } else {

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
                    ->toggleClass('col-sm-' . $this->settings->hz->left, $info->grid)
                    ->attr('for', '__hz_field_' . $info->name));

            $col->set(ake($info, 'value'));

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

            $field->add((new Div)->set($this->modal->matchReplace($html, null, true, true)));

        }

        if ($header = ake($info, 'header')) 
            $field->prepend($header);

        if ($footer = ake($info, 'footer')) 
            $field->add($footer);

        return $field;

    }

}