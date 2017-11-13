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

    private $__tags = array();

    protected $__initialized = false;

    public function __initialize(\Hazaar\Application\Request $request) {

        parent::__initialize($request);

        $this->__initialized = true;

    }

    /**
     * Define the form definition to use.
     *
     * @param mixed $type
     */
    final protected function form($name, $params = array(), $tags = array()){

        $this->view->addHelper('gui');

        $this->view->addHelper('forms');

        if(!($model = $this->get($name, $params, $this->__tags)) instanceof \Hazaar\Forms\Model)
            throw new \Exception(__CLASS__ . '::get() MUST return a form a Hazaar\Forms\Model object!');

        $this->model = $model;

        $this->params = $params;

    }

    final public function interact($method){

        if(!$this->request->isPOST())
            throw new \Exception('Method not allowed!', 405);

        if(!$this->request->has('name'))
            throw new \Exception('Missing form name in request!');

        $this->form($this->request->name, $this->request->get('params', array()));

        if(!$this->model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $out = new \Hazaar\Controller\Response\Json(array( 'ok' => false, 'name' => $this->request->name));

        switch($method){
            case 'init':

                $out->form = $this->model->getForm();

                $out->ok = true;

                break;

            case 'post':

                $postdata = $this->request->getParams();

                $this->model->populate($this->load($this->request->get('params', array())));

                $this->model->populate(ake($postdata, 'form', array()));

                $params = ake($postdata, 'params');

                $result = $this->save($this->model, $params);

                $out->params = $params;

                if(is_array($result) && count($result) > 0)
                    $out->form = $result;

                $out->ok = true;

                break;

            case 'load':

                $this->model->populate($this->load($this->request->get('params', array())));

                $out->form = $this->model->toFormArray();

                $out->ok = true;

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

                $out->ok = true;

                break;

            case 'fileinfo':

                $fileinfo = $this->file_info($this->request->field, $this->request->params);

                if(is_array($fileinfo)){

                    $out->ok = true;

                    $out->field = $this->request->field;

                    $out->files = $fileinfo;

                }

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
            'controller' => strtolower($this->getName()),
            'update' => method_exists($this, 'update'),
            'maxUploadSize' => \Hazaar\File\Upload::getMaxUploadSize()
        ));

        if($this->params)
            $settings->params = $this->params;

        $div = new \Hazaar\Html\Form();

        $this->view->jquery->exec("var hzForm = $('#$name').hzForm(" . $settings->toJSON() . ");", 1);

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

            $params = ($this->request->has('params') ? unserialize($this->request->params) : array());

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

                $response->setTitle($this->model->getTitle($params));

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

    //File attachment handlers
    final public function attach(){

        if(!$this->request->isPOST())
            throw new \Exception('Method not allowed!', 405);

        if(!$this->request->has('name'))
            throw new \Exception('Missing form name in request!');

        $this->form($this->request->name);

        $out = new \Hazaar\Controller\Response\Json(array( 'ok' => false, 'name' => $this->request->name));

        $params = json_decode($this->request->get('params'), true);

        $files = new \Hazaar\File\Upload();

        if($files->uploaded()){

            foreach($files->getFile() as $key => $attachments){

                if(!$this->file_attach($key, $attachments, $params))
                    throw new \Exception('Unknown error saving attachments!');

            }

        }

        if(count($remove = json_decode($this->request->get('remove'), true)) > 0){

            foreach($remove as $rm){

                if(!$this->file_detach(ake($rm, 'field'), array(ake($rm, 'file')), $params))
                    throw new \Exception('Unknown error saving attachments!');

            }

        }

        $out->ok = true;

        return $out;

    }

    /**
     * Set any field tags that available on the current instance of the form.
     *
     * @param mixed $tags A tag string or an array of tag strings.
     */
    final protected function setTags($tags){

        if($this->__initialized !== false)
            throw new \Exception('Failed to set form tags.  This controller has already been initiallised!');

        if(!is_array($tags))
            $tags = array($tags);

        $this->__tags = $tags;

    }

    //Placeholder Methods
    protected function load($params = array()){

        throw new \Exception('To load form data you must override the form controller load() method.');

    }

    protected function save($data, &$params = array()){

        throw new \Exception('To save form data you must override the form controller save($data, $params = array()) method.');

    }

    protected function get($name, $params = array(), $tags = array()){

        $app = \Hazaar\Application::getInstance();

        $file = $name . '.json';

        if(!($source = $app->filePath('forms', $file, true)))
            throw new \Exception('Form model source not found: ' . $file, 404);

        $source_file = new \Hazaar\File($source);

        if(!$source_file->exists())
            throw new \Exception('Form model source file not found!', 500);

        if(!($form = $source_file->parseJSON()))
            throw new \Exception('An error ocurred parsing the form definition \'' . $source_file->name() . '\'');

        return new \Hazaar\Forms\Model($name, $form, $tags);

    }

    protected function dir(){

        $list = array();

        $app = \Hazaar\Application::getInstance();

        if(!($source = $app->filePath('forms')))
            return $list;

        $dir = new \Hazaar\File\Dir($source);

        $files = $dir->find('*.json');

        foreach($files as $file){

            $info = $file->parseJSON();

            if(!($info instanceof \stdClass
                && property_exists($info, 'name')
                && property_exists($info, 'pages')
                && property_exists($info, 'fields')))
                continue;

            if(is_array($info->fields)){

                $fields = array();

                foreach($info->fields as &$import){

                    if(strtolower(substr($import, -5)) !== '.json')
                        $import .= '.json';

                    if($ext_fields = $dir->get($import)->parseJSON(true))
                        $fields = array_merge($fields, $ext_fields);

                }

                $info->fields = $fields;

            }

            $list[$file->name()] = array(
                'name' => $info->name,
                'description' => ake($info, 'description'),
                'version' => ake($info, 'version', 0),
                'author' => ake($info, 'author'),
                'pages' => count($info->pages),
                'fields' => count((is_array($info->fields) ? $info->fields : get_object_vars($info->fields))),
                'size' => $file->size(),
                'modified_on' => $file->mtime()
            );

        }

        ksort($list);

        return $list;

    }

    private function file_init($name, $params, &$dir, &$index, &$key){

        $manager = new \Hazaar\File\Manager('local', array('root' => $this->application->runtimePath('forms', true)));

        $dir = $manager->dir('/attachments');

        if(!$dir->exists())
            $dir->create(true);

        $index = new \Hazaar\Btree($manager->get('/fileindex.db'));

        $key = md5($this->model->getName() . $name . serialize($params));

    }

    protected function file_info($name, $params = array()){

        $this->file_init($name, $params, $dir, $index, $key);

        $fileindex = $index->get($key);

        if(!is_array($fileindex))
            return false;

        $filelist = array();

        foreach($fileindex as $filename){

            $file = $dir->get($filename);

            if(!$file->exists())
                continue;

            $info = array(
                'lastModified' => $file->mtime(),
                'name' => $file->basename(),
                'size' => $file->size(),
                'type' => $file->mime_content_type()
            );

            if(substr($info['type'], 0, 5) == 'image')
                $info['preview'] = (string)$this->url('preview/' . $this->model->getName() . '/' . $name . '/' . $file->basename(), $params);

            $filelist[] = $info;

        }

        return $filelist;

    }

    protected function file_detach($name, $files, $params = array()){

        $this->file_init($name, $params, $dir, $index, $key);

        $fileindex = $index->get($key);

        if(!is_array($fileindex))
            return false;

        if(!is_array($files))
            $files = array($files);

        foreach($files as $file){

            if(!in_array(ake($file, 'name'), $fileindex))
                continue;

            $dir->get($file['name'])->unlink();

            foreach(array_keys($fileindex, $file['name'], true) as $id)
                unset($fileindex[$id]);

        }

        $index->set($key, $fileindex);

        return true;

    }

    protected function file_attach($name, $files, $params = array()){

        $this->file_init($name, $params, $dir, $index, $key);

        $fileindex = $index->get($key);

        if(!is_array($fileindex))
            $fileindex = array();

        foreach($files as $file){

            if($file instanceof \Hazaar\File){

                $dir->put($file);

                $fileindex[] = $file->basename();

            }

        }

        $index->set($key, $fileindex);

        return true;

    }

    public function preview($form, $name, $file){

        if(!$form)
            throw new \Exception('Missing form name in request!');

        $this->form($form, $this->request->get('params', array()));

        $this->file_init($name, $this->request->getParams(), $dir, $index, $key);

        $file = $dir->get($file);

        if(!$file->exists())
            throw new \Exception('File not found!', 404);

        $out = new \Hazaar\Controller\Response\Image($file);

        $out->resize(120, 120, true);

        return $out;

    }

}