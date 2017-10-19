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

    private function renderItem($tag, $item){

        if(is_array($item)){

            foreach($item as &$i)
                $i = $this->renderItem($tag, $i);

            return $item;

        }

        $element = new \Hazaar\Html\Block($tag);

        if(is_string($item)){

            $element->add($item);

        }else{

            foreach(get_object_vars($item) as $attr => $content){

                if(($attr == 'href' || $attr == 'src') && strpos($content, ':') === false)
                    $content = (string)(new \Hazaar\Application\Url($content));

                $element->attr($attr, $content);

            }

        }
        return $element;

    }

    public function render($form = null, $inc_ixes = true){

        $form = $this->model->resolve();

        $html = (new \Hazaar\Html\Html())->class('form');

        $head = new \Hazaar\Html\Head();

        $style = '';

        if($file = \Hazaar\Loader::getModuleFilePath('pdf.css'))
            $style = file_get_contents($file);

        $head->add(new \Hazaar\Html\Block('style', $style));

        $body = new \Hazaar\Html\Body();

        $html->add($head, $body);

        $body->add(parent::render($form, (property_exists($form, 'pdf')? $form->pdf : null)));

        if(property_exists($form, 'pdf')){

            if(property_exists($form->pdf, 'head')){

                foreach($form->pdf->head as $tag => $items)
                    $head->add($this->renderItem($tag, $items));

            }

            if(property_exists($form->pdf, 'logo')){

                $header = $body->find('.form-header');

                $header->prepend((new \Hazaar\Html\Img($form->pdf->logo))->class('form-logo'));

            }

        }

        return $html;

    }

}