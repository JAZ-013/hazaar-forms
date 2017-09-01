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

        if(!($name = $this->request->get('form')))
            throw new \Exception('Form name is required!', 400);

        $file = $name . '.json';

        if(!($source = $this->application->filePath('forms', $file, true)))
            throw new \Exception('Form model source not found: ' . $file, 404);

        $this->model = new \Hazaar\Forms\Model(new \Hazaar\File($source));

    }

    public function __run(){

        $response = new \Hazaar\Controller\Response\Http\OK();

        switch($action = $this->request->getActionName()){
            case 'load':

                $response = new \Hazaar\Controller\Response\JSON();

                $response->populate($this->model->get());

                break;

            default:

                throw new \Exception('Method not found: ' . $action, 404);

        }

        return $response;

    }

}