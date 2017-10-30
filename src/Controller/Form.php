<?php

namespace Hazaar\Controller;

/**
 * Form short summary.
 *
 * Form description.
 *
 * @version 1.0
 * @author jamiec
 */
abstract class Form extends Action {

    private $model;

    private $params;

    /**
     * Define the form definition to use.
     *
     * @param mixed $type
     */
    final protected function form($name, $params = array()){

        $this->view->addHelper('forms');

        if(!($model = $this->get($name)) instanceof \Hazaar\Forms\Model)
            throw new \Exception(__CLASS__ . '::get() MUST return a form a Hazaar\Forms\Model object!');

        $this->model = $model;

        $this->params = $params;

    }

    final public function interact($method){

        if(!$this->request->has('name'))
            throw new \Exception('Missing form name in request!');

        $this->form($this->request->name, $this->request->get('params', array()));

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        if(!$this->request->isPOST())
            throw new \Exception('Method not allowed!', 405);

        $out = new \Hazaar\Controller\Response\Json(array('name' => $this->request->name));

        switch($method){
            case 'init':

                $out->form = $this->model->getForm();

                break;

            case 'post':

                $postdata = $this->request->getParams();

                $this->model->populate(ake($postdata, 'form', array()));

                $params = ake($postdata, 'params');

                $result = $this->save($this->model, $params);

                $out->params = $params;

                if(is_array($result) && count($result) > 0)
                    $out->form = $result;

                break;

            case 'load':

                $this->model->populate($this->load($this->request->get('params', array())));

                $out->form = $this->model->toArray();

                break;

            case 'api':

                if(!($target = $this->request->get('target')))
                    throw new \Exception('Form API call failed.  No target specified!');

                $args = array();

                if($info = ake($target, 1, array())){

                    $name = ake($info, 'name');

                    $this->model->set($name, ake($info, 'value'));

                    $args[$name] = $this->model->get($name);

                }

                $out->populate($this->model->api($target[0], $args));

                return $out;

            case 'update':

                if($target = $this->request->get('api'))
                    $out->populate($this->model->api($target, array('originator' => $this->request->get('originator'), 'form' => $this->request->get('form'))));

                elseif(method_exists($this, 'update'))
                    $out->populate((array)$this->update($this->request->get('originator'), $this->request->get('form')));

                break;

            default:

                throw new \Exception('Unknown method: ' . $method, 406);

        }

        $out->ok = true;

        return $out;

    }

    final public function layout($name, $settings = array()){

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $settings = new \Hazaar\Map($settings, array(
            'form' => $this->model->getName(),
            'controller' => strtolower($this->getName()),
            'update' => method_exists($this, 'update')
        ));

        if($this->params)
            $settings->params = $this->params;

        $div = new \Hazaar\Html\Form('FORM: ' . $name);

        $this->view->jquery->exec("$('#$name').hzForm(" . $settings->toJSON() . ");");

        return $div->id($name);

    }

    final public function render(){

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $this->model->populate($this->load($this->request->getParams()));

        $output = new \Hazaar\Forms\Output\HTML($this->model);

        return $output->render();

    }

    final public function output($type = 'html'){

        if($this->request->getActionName() == 'output'){

            if(!($name = $this->request->get('name')))
                throw new \Exception('No form name specified!');

            $this->form($name);

            $this->model->populate($this->load(unserialize($this->request->get('params'))));

            if($type == 'html'){

                $output = new \Hazaar\Forms\Output\HTML($this->model);

                $response = new \Hazaar\Controller\Response\HTML();

                $response->setContent($output->render());

            }else if($type == 'pdf'){

                $output = new \Hazaar\Forms\Output\PDF($this->model);

                $response = new \Hazaar\Controller\Response\PDF();

                $response->setContent($output->render());

            }

            if(!isset($response))
                throw new \Exception('Unknown response type requested: ' . $type);

            return $response;

        }

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $params = array('name' => $this->model->getName(), 'params' => serialize($this->params));

        return $this->url('output/' . $type, $params)->encode();

    }

    //Placeholder Methods
    protected function load(){

        throw new \Exception('To load form data you must override the form controller load() method.');

    }

    protected function save($data, &$params = array()){

        throw new \Exception('To save form data you must override the form controller save($data, $params = array()) method.');

    }

    protected function get($name){

        $app = \Hazaar\Application::getInstance();

        $file = $name . '.json';

        if(!($source = $app->filePath('forms', $file, true)))
            throw new \Exception('Form model source not found: ' . $file, 404);

        $source_file = new \Hazaar\File($source);

        if(!$source_file->exists())
            throw new \Exception('Form model source file not found!', 500);

        if(!($form = $source_file->parseJSON()))
            throw new \Exception('An error ocurred parsing the form definition \'' . $source_file->name() . '\'');

        return new \Hazaar\Forms\Model($name, $form);

    }

}