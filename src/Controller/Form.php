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
    final protected function form($type, $params = array()){

        $this->view->addHelper('forms');

        $this->model = new \Hazaar\Forms\Model($type);

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

                $out->populate($this->model->api($target[0], ake($target, 1, array())));

                break;

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
            $settings['params'] = $this->params;

        $div = new \Hazaar\Html\Form('FORM: ' . $name);

        $this->view->jquery->exec("$('#$name').hzForm(" . $settings->toJSON() . ");");

        return $div->id($name);

    }

    final public function render(){

        $this->model->populate($this->load($this->request->getParams()));

        $output = new \Hazaar\Forms\Output\HTML($this->model);

        return $output->render();

    }

    final public function output($type = 'html'){

        if($this->request->getActionName() == 'output'){

            $this->model->populate($this->load($this->request->getParams()));

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

        $params = array_merge($this->params, array('form' => $this->model->getName()));

        return $this->url('output/' . $type, $params)->encode();

    }

    //Placeholder Methods
    protected function load(){

        throw new \Exception('To load form data you must override the form controller load() method.');

    }

    protected function save($data, &$params = array()){

        throw new \Exception('To save form data you must override the form controller save($data, $params = array()) method.');

    }

}