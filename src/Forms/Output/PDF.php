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

        if($logo = $this->model->getOutputLogo())
            $body->add((new \Hazaar\Html\Img($logo))->class('form-logo'));

        $html->add($head, $body);

        $body->add(parent::render());

        return $html;

    }

    private function renderStyle(){

        $style = 'body {
            font-family: Tahoma, Geneva, sans-serif;
        }
        h2, h3 { margin: 0 0 15px 0; }
        .form-header { float: left; width: 100%; }
        .form-header h1 { display: block; margin: 15px auto; }
        .form-page { float: left; width: 100%; }
        img.form-logo { float: left; margin-right: 25px; }
        .well {
            background: #eee;
            padding: 25px;
            margin-bottom: 25px;
            float: left;
            width: 100%;
        }
        .row {
            float: left;
            width: 100%;
        }
        .col-md-1,
        .col-md-2,
        .col-md-3,
        .col-md-4,
        .col-md-5,
        .col-md-6,
        .col-md-7,
        .col-md-8,
        .col-md-9,
        .col-md-10,
        .col-md-11,
        .col-md-12 {
            float: left;
        }
        .col-md-1  { width: 8.33333% }
        .col-md-2  { width: 16.66667% }
        .col-md-3  { width: 25% }
        .col-md-4  { width: 33.33333% }
        .col-md-5  { width: 41.66667% }
        .col-md-6  { width: 50% }
        .col-md-7  { width: 58.33333% }
        .col-md-8  { width: 66.66667% }
        .col-md-9  { width: 75% }
        .col-md-10 { width: 83.33333% }
        .col-md-11 { width: 91.66667% }
        .col-md-12 { width: 100% }
        ';

        return $style;

    }

}