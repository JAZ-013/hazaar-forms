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
class PDF extends \Hazaar\Forms\Output {

    public function render(){

        $form = $this->model->resolve();

        $html = (new \Hazaar\Html\Html())->class('form');

        $head = new \Hazaar\Html\Head();

        $head->add(new \Hazaar\Html\Block('style', $this->renderStyle()));

        $body = new \Hazaar\Html\Body();

        $html->add($head, $body);

        $body->add(new \Hazaar\Html\H1(ake($form, 'name', 'Unnamed Form')));

        foreach($form['pages'] as $page)
            $body->add($this->exportPage($page));

        $response = new \Hazaar\Controller\Response\PDF();

        $response->setHtml($html);

        return $response;

    }

    private function renderStyle(){

        $style = 'body {
            font-family: Arial;
        }
        h1, h2, h3 {
            border-bottom: 1px solid #ddd;
            margin-top: 0;
        }
        .form_section {
            background: #eee; padding: 25px;
            margin-bottom: 15px;
        }
        .field_group {
            margin-bottom: 5px;
        }
        .field_group > label {
            display: inline-block;
            width: 25%;
            font-weight: bold;
        }
        .field_item {
            display: inline-block;
            width: 75%;
        }';

        return $style;

    }

    private function exportPage($page){

        $html = (new \Hazaar\Html\Div())->class('form_page');

        if($label = ake($page, 'label'))
            $html->add(new \Hazaar\Html\H2($label));

        foreach($page['sections'] as $section)
            $html->add($this->exportSection($section));

        return $html;

    }

    private function exportSection($section){

        $html = (new \Hazaar\Html\Div())->class('form_section');

        if($label = ake($section, 'label'))
            $html->add(new \Hazaar\Html\H3($label));

        foreach($section['fields'] as $name => $field)
            $html->add($this->exportField($name, $field));

        return $html;

    }

    private function exportField($name, $field){

        $group = (new \Hazaar\Html\Div())->class('field_group');

        if($label = ake($field, 'label'))
            $group->add(new \Hazaar\Html\Label($label));

        $value = $field['value'];

        if($field['type'] == 'boolean')
            $value = yn($value);

        $group->add((new \Hazaar\Html\Span($value))->class('field_item'));

        return $group;

    }

}