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

    public function render(){

        $html = (new \Hazaar\Html\Html())->class('form');

        $head = new \Hazaar\Html\Head();

        $style = $this->renderStyle();

        if($extraStyle = $this->model->getOutputStyle())
            $style .= "\n" . $extraStyle;

        $head->add(new \Hazaar\Html\Block('style', $style));

        $body = new \Hazaar\Html\Body();

        $html->add($head, $body);

        $body->add(parent::render());

        if($logo = $this->model->getOutputLogo()){

            $header = $body->find('.form-header');

            $header->prepend((new \Hazaar\Html\Img($logo))->class('form-logo'));

        }

        return $html;

    }

    private function renderStyle(){

        if($file = \Hazaar\Loader::getModuleFilePath('pdf.css'))
            return file_get_contents($file);

        return null;

    }

}