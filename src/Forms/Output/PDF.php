<?php

namespace Hazaar\Forms\Output;

use \Hazaar\Html\Block;
use \Hazaar\Html\Inline;
use \Hazaar\Html\Div;
use \Hazaar\Html\Img;

/**
 * Model short summary.
 *
 * Model description.
 *
 * @version 1.0
 * @author jamiec
 */
class PDF extends HTML {

    private function renderItem($tag, $item){

        if(is_array($item)){

            foreach($item as &$i)
                $i = $this->renderItem($tag, $i);

            return $item;

        }

        $element = null;

        if(is_string($item)){

            $element = new Block($tag);

            $element->add($item);

        }else{

            $element = new Inline($tag);

            foreach(get_object_vars($item) as $attr => $content){

                if(($attr == 'href' || $attr == 'src') && strpos($content, ':') === false)
                    $content = (string)(new \Hazaar\Application\Url($content));

                $element->attr($attr, $content);

            }

        }

        return $element;

    }

    public function render($settings = array(), $form = null, $ixes = null){

        $html = $this->renderHTML($settings, $form, $ixes);

        $pdf = new \Hazaar\File\PDF(basename(ake($settings, 'name', uniqid()), '.pdf') . '.pdf');

        $pdf->set_contents($html);

        return $pdf;

    }

    public function renderHTML($settings = array(), $form = null, $ixes = null){

        $form = $this->model->resolve();

        if(property_exists($form, 'pdf')
            && property_exists($form->pdf, 'templates')){

            $form->pdf->templates->default = true;

            if(!($template_source = ake($form->pdf->templates, $template_name = ake($settings, 'template', 'default'))))
                throw new \Exception('Unknown output template: ' . $template_name);

            if($template_source !== true){

                $template = new Template($this->model, $template_source);

                return $template->render($this->params);

            }

        }

        $html = (new \Hazaar\Html\Html())->class('form');

        $head = new \Hazaar\Html\Head();

        $style = '';

        if($file = \Hazaar\Loader::getModuleFilePath('pdf.css'))
            $style = file_get_contents($file);

        $head->add(new Block('style', $style));

        $body = new \Hazaar\Html\Body();

        $html->add($head, $body);

        $body->add(parent::render((property_exists($form, 'pdf')? $form->pdf : null), $form));

        if(property_exists($form, 'pdf')){

            if(property_exists($form->pdf, 'head')){

                foreach($form->pdf->head as $tag => $items)
                    $head->add($this->renderItem($tag, $items));

            }

            if(property_exists($form->pdf, 'logo')){

                $header = $body->find('.form-header');

                $header->prepend((new Img($form->pdf->logo))->class('form-logo'));

            }

            if(property_exists($form->pdf, 'style'))
                $head->add(new Block('style', $form->pdf->style));

        }

        return $html;

    }

}