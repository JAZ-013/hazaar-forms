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

            case 'api':

                if(!($target = $this->request->get('target')))
                    throw new \Exception('Form API call failed.  No target specified!');

                $out->populate($this->model->items($target));

                break;

            default:

                throw new \Exception('Unknown method: ' . $method, 406);

        }

        return $out;

    }

    final public function layout($name, $settings = array()){

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $settings = new \Hazaar\Map($settings, array(
            'form' => $this->model->getName(),
            'controller' => strtolower($this->getName())
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

}