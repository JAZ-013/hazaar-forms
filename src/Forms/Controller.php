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

    private $form;

    public function __initialize($request){

        if(!($name = $this->request->get('name')))
            throw new \Exception('Form name is required!', 400);

        $file = $name . '.json';

        if(!($source = $this->application->filePath('forms', $file, true)))
            throw new \Exception('Form model source not found: ' . $file, 404);

        $this->form = new \Hazaar\Forms\Model(new \Hazaar\File($source));

    }

    public function __run(){

        $response = new \Hazaar\Controller\Response\JSON();

        $data = array(
            'ok' => true,
            'data' => $this->form->get()
        );

        $response->populate($data);

        return $response;

    }

}