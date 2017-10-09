<?php

namespace Hazaar\Forms;

/**
 * Controller short summary.
 *
 * Controller description.
 *
 * @version 1.0
 * @author jamiec
 */
class Controller extends \Hazaar\Controller {

    private $model;

    public function __initialize($request){

        if(!($name = $this->request->get('name')))
            throw new \Exception('Form name is required!', 400);

        $this->model = new \Hazaar\Forms\Model($name);

    }

    public function __run(){

        $response = new \Hazaar\Controller\Response\Http\OK();

        switch($action = $this->request->getActionName()){
            case 'load':

                $response = new \Hazaar\Controller\Response\JSON();

                $response->populate($this->model->getForm());

                break;

            default:

                throw new \Exception('Method not found: ' . $action, 404);

        }

        return $response;

    }

}