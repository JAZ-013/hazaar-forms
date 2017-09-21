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
class PDF extends HTML {

    final public function render(){

        $form = $this->model->resolve();

        $html = (new \Hazaar\Html\Html())->class('form');

        $head = new \Hazaar\Html\Head();

        $style = '';

        if($file = \Hazaar\Loader::getModuleFilePath('pdf.css'))
            $style = file_get_contents($file);

        if(property_exists($form, 'pdf')){

            if(property_exists($form->pdf, 'style'))
                $style .= "\n" . $form->pdf->style;

        }

        $head->add(new \Hazaar\Html\Block('style', $style));

        $body = new \Hazaar\Html\Body();

        $html->add($head, $body);

        $body->add(parent::render($form));

        if(property_exists($form, 'pdf')){

            if(property_exists($form->pdf, 'logo')){

                $header = $body->find('.form-header');

                $header->prepend((new \Hazaar\Html\Img($form->pdf->logo))->class('form-logo'));

            }

        }

        return $html;

    }

}