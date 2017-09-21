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

    public function render($form = null){

        if($form === null)
            $form = $this->model->resolve();

        $div = (new \Hazaar\Html\Div())->class('form-output');

        $div->add((new \Hazaar\Html\Div(new \Hazaar\Html\H1(ake($form, 'name', 'Unnamed Form'))))->class('form-header'));

        foreach($form->pages as $page)
            $div->add($this->__page($page));

        return $div;

    }

    private function __page($page){

        $html = (new \Hazaar\Html\Div())->class('panel panel-default');

        if(property_exists($page, 'label'))
            $html->add((new \Hazaar\Html\Div((new \Hazaar\Html\H2($page->label))->class('panel-title')))->class('panel-heading'));

        $body = (new \Hazaar\Html\Div())->class('panel-body');

        foreach($page->sections as $section)
            $body->add($this->__section($section));

        return $html->add($body);

    }

    private function __section($section){

        $html = (new \Hazaar\Html\Div())->class('form-section');

        if(property_exists($section, 'label'))
            $html->add(new \Hazaar\Html\H3($section->label));

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

                foreach($field as $field_col)
                    $html->add((new \Hazaar\Html\Div($this->__group(array($field_col))))->class('col-lg-' . (12 / count($field))));

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
            $group->add(new \Hazaar\Html\H4($label));

        $value = $field['value'];

        if($field['type'] == 'boolean')
            $value = yn($value);

        $value_group = (new \Hazaar\Html\Div())->class('field-value');

        if($prefix = ake($field, 'prefix'))
            $value_group->add($prefix . ' ');

        $value_group->add($value);

        if($suffix = ake($field, 'suffix'))
            $value_group->add(' ' . $suffix);

        $group->add($value_group);

        return $group;

    }

}