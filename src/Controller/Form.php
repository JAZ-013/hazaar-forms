<?php

namespace Hazaar\Controller;

interface FormsInterface {

    public function load();

    public function save($data, $params = array());

}

/**
 * Form short summary.
 *
 * Form description.
 *
 * @version 1.0
 * @author jamiec
 */
abstract class Form extends Action implements FormsInterface {

    private $model;

    private $params;

    public function __initialize($request) {

        $this->view->addHelper('form');

        return parent::__initialize($request);

    }

    /**
     * Define the form definition to use.
     *
     * @param mixed $type
     */
    protected function form($type, $params = array()){

        $this->model = new \Hazaar\Forms\Model($type);

        $this->params = $params;

    }

    public function interact($method){

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        if(!$this->request->isPOST())
            throw new \Exception('Method not allowed!', 405);

        $out = new \Hazaar\Controller\Response\Json();

        switch($method){
            case 'post':

                $params = $this->request->getParams();

                $this->model->populate(ake($params, 'form', array()));

                unset($params['form']);

                $out->populate($params);

                $result = $this->save($this->model, $params);

                if(is_array($result) && count($result) > 0)
                    $out['form'] = $result;

                break;

            case 'load':

                $this->model->populate($this->load($this->request->getParams()));

                $out->populate($this->model->toArray());

                break;

            default:

                throw new \Exception('Unknown method: ' . $method, 406);

        }

        return $out;


    }

    public function layout(){

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $id = 'form_' . uniqid();

        $settings = array(
            'form' => $this->model->getName(),
            'controller' => strtolower($this->getName())
        );

        if($this->params)
            $settings['params'] = $this->params;

        $div = new \Hazaar\Html\Form('FORM: ' . $id);

        $this->view->jquery->exec("$('#$id').form(" . json_encode($settings) . ");");

        return $div->id($id);

    }

    public function output($type = 'pdf'){

        if($this->request->getActionName() == 'output'){

            if($type == 'pdf'){

                $this->model->populate($this->load($this->request->getParams()));

                $output = new \Hazaar\Forms\Output\PDF($this->model);

                $response = $output->render();

            }

            if(!isset($response))
                throw new \Exception('Unknown response type requested: ' . $type);

            return $response;

        }

        $params = array_merge($this->params, array('form' => $this->model->getName()));

        return $this->url('output/' . $type, $params)->encode();

    }

}