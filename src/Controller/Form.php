<?php

namespace Hazaar\Controller;

/**
 * The Hazaar "smart forms" application controller.
 *
 * @version 1.0
 * @author Jamie Carl
 */
abstract class Form extends Action {

    protected $form_model;

    protected $form_params;

    private $__tags = array();

    protected $__initialized = false;

    protected $__form_path;

    function __construct($name, \Hazaar\Application $application, $use_app_config = true) {

        parent::__construct($name, $application, $use_app_config);

        if(!($path = $this->application->config->paths->get('forms')))
            $path = 'forms';

        $this->setFormPath($path);

    }

    public function __initialize(\Hazaar\Application\Request $request) {

        $response = parent::__initialize($request);

        $this->__initialized = true;

        return $response;

    }

    /**
     * Define the form definition to use.
     *
     * @param mixed $type
     */
    final public function form($name, $params = array(), $tags = null){

        if($tags !== null){

            if(!is_array($tags))
                $tags = array($tags);

            $this->__tags = array_merge($this->__tags, $tags);

        }

        if(!($model = $this->form_get($name, $this->__tags, $params)) instanceof \Hazaar\Forms\Model)
            throw new \Exception(__CLASS__ . '::get() MUST return a form a Hazaar\Forms\Model object!');

        $model->registerController($this);

        $this->form_params = $params;

        $this->form_model = $model;

        $this->form_model->populate($this->form_load($params));

        $this->form_model->lock();

        $this->view->addHelper('gui');

        $this->view->addHelper('forms', array('model' => $model), 'form');

        return $this->form_model;

    }

    final public function interact($method){

        if(!$this->request->isPOST())
            throw new \Exception('Method not allowed!', 405);

        if(!$this->request->has('name'))
            throw new \Exception('Missing form name in request!');

        $this->__tags[] = 'interact';

        $params = $this->request->get('params', array());

        if(!($this->form_model = $this->form_get($this->request->name, $this->__tags, $params)) instanceof \Hazaar\Forms\Model)
            throw new \Exception(__CLASS__ . '::get() MUST return a form a Hazaar\Forms\Model object!');

        $out = new \Hazaar\Controller\Response\Json(array( 'ok' => false, 'name' => $this->request->name));

        switch($method){
            case 'init':

                $out->form = $this->form_model->getFormDefinition(true);

                $out->tags = $this->__tags;

                $out->ok = true;

                break;

            case 'save':

                $postdata = $this->request->getParams();

                $this->form_model->populate($this->form_load($params));

                $this->form_model->lock();

                $this->form_model->populate(ake($postdata, 'form', array()));

                $params = ake($postdata, 'params');

                $out->params = $params;

                if($url = ake($postdata, 'url')){

                    $args = array('params' => $params);

                    if($result = $this->form_model->api($url, array('method' => 'POST'), $args, true)){

                        $out->ok = true;

                        $out->result = $result;

                    }else{

                        $out->ok = false;

                        if(!($reason = $this->form_model->lastAPIError()))
                            $reason = 'There was an unknown error saving to the custom save URL';

                        $out->reason = $reason;

                    }

                }else{

                    if($result = $this->form_save($this->form_model, $params)){

                        $out->ok = true;

                        $out->result = $result;

                    }else{

                        $out->ok = false;

                        $out->reason = 'An error ocurred saving the form.';

                    }

                }

                break;

            case 'load':

                $params = $this->request->get('params', array());

                $this->form_model->populate($this->form_load($params));

                $this->form_model->lock();

                $out->form = $this->form_model->toFormArray();

                $out->ok = true;

                break;

            case 'api':

                if(!($target = $this->request->get('target')))
                    throw new \Exception('Form API call failed.  No target specified!');

                $args = array();

                if($info = ake($target, 1, array())){

                    $name = ake($info, 'name');

                    $args = array_merge(array('method' => 'POST'), (array)ake($this->form_model->getDefinition($name), 'validate', array()));

                    $this->form_model->set($name, ake($info, 'value'));

                }

                $result = $this->form_model->api($target[0], $args, $params, true);

                if(!is_bool($result)){

                    if(ake($result, 'ok') === null)
                        throw new \Exception('API calls must return a boolean or a validation object result!', 400);

                    $out->populate($result);

                }else $out->ok = $result;

                return $out;

            case 'update':

                $updates = array();

                $this->form_model->lock();

                $this->form_model->populate($this->request->get('form', array()));

                $params = $this->request->get('params');

                if($this->request->get('save') === true)
                    $this->form_save($this->form_model, $params);

                $out->params = $params;

                if($target = $this->request->get('api')){

                    $args = array('originator' => $this->request->get('originator'));

                    $updates = $this->form_model->api($target, array('method' => 'POST'), $args, true);

                }elseif(method_exists($this, 'form_update')){

                    $updates = (array)$this->form_update($this->request->get('originator'), $this->form_model, $params);

                }

                if(is_array($updates)){

                    $this->form_model->populate($updates);

                    $out->updates = array_intersect_key($this->form_model->toFormArray(), $updates);

                }

                $out->ok = true;

                break;

            case 'fileinfo':

                $params = $this->request->getParams();

                $name = ake($params, 'field');

                $filelist = $this->file_list($name, ake($params, 'params'));

                if(is_array($filelist)){

                    $out->files = array();

                    foreach($filelist as $file){

                        if(!$file instanceof \Hazaar\File)
                            continue;

                        $url = $file->media_uri();

                        $info = array(
                            'lastModified' => $file->mtime(),
                            'name' => $file->basename(),
                            'size' => $file->size(),
                            'type' => $file->mime_content_type(),
                            'url'  => (string)$url
                        );

                        if(substr($info['type'], 0, 5) == 'image'){

                            $info['thumbnail'] = 'true';

                            $info['preview'] = (string)$url;

                        }

                        $out->files[] = $info;

                    }

                    $out->ok = true;

                    $out->field = $this->request->field;

                }

                break;

            default:

                throw new \Exception('Unknown method: ' . $method, 406);

        }

        return $out;

    }

    final public function script(){

        $file = $this->__form_path->get($this->request->getPath());

        $out = new \Hazaar\Controller\Response\Javascript($file);

        return $out;

    }

    final public function __attachments($name){

        return $this->file_list($name, $this->form_params);

    }

    final public function layout($name, $settings = array()){

        if(!$this->form_model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $settings = new \Hazaar\Map($settings, array(
            'form' => $this->form_model->getName(),
            'controller' => strtolower($this->getName()),
            'update' => method_exists($this, 'update'),
            'maxUploadSize' => \Hazaar\File\Upload::getMaxUploadSize(),
            'url' => (string)$this->application->url()
        ));

        if($this->form_params)
            $settings->params = $this->form_params;

        $form = new \Hazaar\Html\Div();

        $this->view->jquery->exec("var hzForm = $('#$name').hzForm(" . $settings->toJSON() . ");", 1);

        return $form->id($name);

    }

    final public function render($settings = array()){

        if(!$this->form_model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $output = new \Hazaar\Forms\Output\HTML($this->form_model);

        return $output->render($settings);

    }

    final public function output($type = 'html'){

        if($this->getAction() == 'output'){

            if(!($name = $this->request->get('name')))
                throw new \Exception('No form name specified!');

            $params = ($this->request->has('params') ? $this->request->params : array());

            if(is_string($params)) $params = unserialize($params);

            $this->form($name, $params, $type);

            $this->form_model->lock();

            $template = $this->request->get('template');

            if($type == 'html'){

                $output = new \Hazaar\Forms\Output\HTML($this->form_model, $params);

                $response = new \Hazaar\Controller\Response\HTML();

                $response->setContent($output->render(array('template' => $template)));

            }else if($type == 'pdf'){

                $output = new \Hazaar\Forms\Output\PDF($this->form_model, $params);

                $response = new \Hazaar\Controller\Response\PDF();

                $response->setContent($output->renderHTML(array('template' => $template)));

                $response->setTitle($this->form_model->getPDFTitle($params));

            }

            if(!isset($response))
                throw new \Exception('Unknown response type requested: ' . $type);

            return $response;

        }

        if(!$this->form_model instanceof \Hazaar\Forms\Model)
            throw new \Exception('No form type has been set for this form controller');

        $params = array('name' => $this->form_model->getName(), 'params' => serialize($this->form_params));

        return $this->application->url($this->name, 'output/' . $type, $params)->encode();

    }

    //File attachment handlers
    final public function attach(){

        if(!$this->request->isPOST())
            throw new \Exception('Method not allowed!', 405);

        if(!$this->request->has('name'))
            throw new \Exception('Missing form name in request!');

        $params = $this->request->has('params') ? json_decode($this->request->get('params'), true) : null;

        $this->form($this->request->name, $params);

        $out = new \Hazaar\Controller\Response\Json(array( 'ok' => false, 'name' => $this->request->name));

        $files = new \Hazaar\File\Upload();

        if($files->uploaded()){

            $attachment = array_merge($this->request->get('attachment'), $files->getFile('attachment'));

            if(!$this->file_attach($attachment['field'], $attachment['file'], $params))
                throw new \Exception('Unknown error saving attachments!');

            $out->ok = true;

        }

        return $out;

    }

    //File attachment handlers
    final public function detach(){

        if(!$this->request->isPOST())
            throw new \Exception('Method not allowed!', 405);

        if(!$this->request->has('name'))
            throw new \Exception('Missing form name in request!');

        $params = $this->request->get('params');

        $this->form($this->request->name, $params);

        $out = new \Hazaar\Controller\Response\Json(array( 'ok' => false, 'name' => $this->request->name));

        $remove = $this->request->get('remove');

        if(is_array($remove) && count($remove) > 0){

            $out->removed = array();

            foreach($remove as $attachment){

                if(!(($field = ake($attachment, 'field')) && ($file = ake($attachment, 'file'))))
                    continue;

                if($this->file_detach($field, $file, $params))
                    $out->removed[] = $file;

            }

            $out->ok = true;

        }

        return $out;

    }

    final public function attachment(){

        if(method_exists($this, 'file_get')){

            $file = call_user_func_array(array($this, 'file_get'), func_get_args());

        }else{

            $args = func_get_args();

            $dir = $this->file_init($args[1], null, $args[0]);

            $file = $dir->get($args[2]);

        }

        if(substr($file->mime_content_type(), 0, 5) == 'image'){

            $response = new \Hazaar\Controller\Response\Image($file);

            if($this->request->get('thumbnail', false))
                $response->resize(120, 120, true);

        }else
            $response = new \Hazaar\Controller\Response\File($file);

        return $response;

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

    /*
     * Placeholder Methods
     *
     * The methods below this comment are placeholder methods and are intended to be overridden
     * by the extending application controller class.
     */

    protected function form_load(&$params = array()){

        if(!class_exists('Hazaar\Cache'))
            throw new \Exception('To load form data you must override the form controller form_load() method or install the Hazaar\Cache library.');

        $cache = new \Hazaar\Cache('file', array('use_pragma' => false));

        $key = md5($this->form_model->getName() . serialize($params));

        return $cache->get($key);

    }

    protected function form_save($data, &$params = array()){

        if(!class_exists('Hazaar\Cache'))
            throw new \Exception('To save form data you must override the form controller form_save($data, $params = array()) method.');

        $cache = new \Hazaar\Cache('file');

        $key = md5($this->form_model->getName() . serialize($params));

        return $cache->set($key, $data->toFormArray());

    }

    protected function form_get($name, $tags, &$params = array()){

        $file = $name . '.json';

        if(!$this->__form_path instanceof \Hazaar\File\Dir)
            throw new \Exception('This controller does not have a forms source directory!');

        $source_file = $this->__form_path->get($file);

        if(!$source_file->exists())
            throw new \Exception('Form model source file not found: ' . $file, 500);

        if(!($form = $source_file->parseJSON()))
            throw new \Exception('An error ocurred parsing the form definition \'' . $source_file->name() . '\'');

        return new \Hazaar\Forms\Model($name, $form, $tags, $this->__form_path);

    }

    protected function form_dir($include_hidden = false){

        if(!$this->__form_path instanceof \Hazaar\File\Dir)
            throw new \Exception('This controller does not have a forms source directory!');

        $list = array();

        $files = $this->__form_path->find('*.json');

        foreach($files as $file){

            $info = $file->parseJSON();

            if(!($info instanceof \stdClass
                && property_exists($info, 'name')
                && property_exists($info, 'pages')
                && property_exists($info, 'fields')))
                continue;

            if($include_hidden !== true && property_exists($info, 'hide')
                && $info->hide === true)
                continue;

            if(is_array($info->fields)){

                $fields = array();

                foreach($info->fields as &$import){

                    if(strtolower(substr($import, -5)) !== '.json')
                        $import .= '.json';

                    if($ext_fields = $dir->get($import)->parseJSON(true))
                        $fields = array_replace_recursive($fields, $ext_fields);

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

    private function file_init($name, $params, &$key = null){

        if(!$key){

            if(!$this->form_model)
                throw new \Exception('Unable to automatically determine file storage path without an initialised form!');

            $key = md5($this->form_model->getName() . $name . '_' . $params['id']);

        }

        $root = new \Hazaar\File\Dir($this->application->runtimePath('forms', true));

        $dir = $root->get('attachments/' . $key . '/' . $name, true);

        if(!$dir->exists())
            $dir->create(true);

        return $dir;

    }

    protected function file_list($name, $params = array()){

        $dir = $this->file_init($name, $params, $key);

        $filelist = array();

        while(($file = $dir->read()) !== false){

            if(!$file->exists())
                continue;

            $file->media_uri($this->url("attachment/$key/$name/" . $file->basename()));

            $filelist[] = $file;

        }

        return $filelist;

    }

    protected function file_detach($name, $files, $params = array()){

        $dir = $this->file_init($name, $params, $key);

        if(!is_array($files))
            $files = array($files);

        foreach($files as $file){

            $file = $dir->get($file);

            if($file->exists())
                $file->unlink();

        }

        return true;

    }

    protected function file_attach($name, $files, $params = array()){

        $dir = $this->file_init($name, $params, $key);

        if(!is_array($files)) $files = array($files);

        foreach($files as $file) if($file instanceof \Hazaar\File) $dir->put($file);

        return true;

    }

    /**
     * Set the path to load form definitions from, relative to the current application path.
     *
     * If you wish to load forms from a directory outside the application path, you are still
     * able to override the `Hazaar\Controller\Form::get_form()` method to build your own
     * form definition loader.
     *
     * @param string $path
     */
    protected function setFormPath($path){

        $this->__form_path = new \Hazaar\File\Dir(APPLICATION_PATH . DIRECTORY_SEPARATOR .$path);

    }

}