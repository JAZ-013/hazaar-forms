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

    public function render(){

        $form = $this->model->resolve();

        $div = (new \Hazaar\Html\Div())->class('form-output');

        $div->add(new \Hazaar\Html\H1(ake($form, 'name', 'Unnamed Form')));

        foreach($form['pages'] as $page)
            $div->add($this->exportPage($page));

        return $div;

    }

    private function exportPage($page){

        $html = (new \Hazaar\Html\Div())->class('form-page');

        if($label = ake($page, 'label'))
            $html->add(new \Hazaar\Html\H2($label));

        foreach($page['sections'] as $section)
            $html->add($this->exportSection($section));

        return $html;

    }

    private function exportSection($section){

        $html = (new \Hazaar\Html\Div())->class('well form-panel');

        if($label = ake($section, 'label'))
            $html->add(new \Hazaar\Html\H3($label));

        foreach($section['fields'] as $name => $field)
            $html->add($this->exportField($name, $field));

        return $html;

    }

    private function exportField($name, $field){

        $group = (new \Hazaar\Html\Div())->class('row form-field');

        if($label = ake($field, 'label'))
            $group->add((new \Hazaar\Html\Div(new \Hazaar\Html\Label($label)))->class('col-md-4 form-label'));

        $value = $field['value'];

        if($field['type'] == 'boolean')
            $value = yn($value);

        $group->add((new \Hazaar\Html\div($value))->class('col-md-8 form-value'));

        return $group;

    }

}