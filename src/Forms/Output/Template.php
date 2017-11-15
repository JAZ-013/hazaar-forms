<?php

namespace Hazaar\Forms\Output;

/**
 * PDF Template Render Class
 *
 * The PDF Template render class is a container that will render a
 *
 * @version 1.0
 * @author JamieCarl
 */
class Template {

    private $form;

    private $source;

    private $html;

    function __construct(\Hazaar\Forms\Model $model, $file){

        if(substr($file, -5) !== '.phtml')
            $file .= '.phtml';

        if(!($this->source = \Hazaar\Application::getInstance()->filePath('forms', $file, true)))
            throw new \Exception('Form template not found: ' . $file, 404);

        $this->form = $model;

    }

    public function render(){

        $this->html = new \Hazaar\View\Helper\Html();

        ob_start();

        include($this->source);

        $template = ob_get_clean();

        return $this->form->matchReplace($template, true);

    }

    private function url(){

        $url = new \Hazaar\Application\Url();

        call_user_func_array(array($url, '__construct'), func_get_args());

        return $url;

    }

}